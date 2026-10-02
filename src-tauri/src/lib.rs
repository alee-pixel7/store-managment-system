// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::fs::OpenOptions;
use std::io::{Read, Write};
use std::net::{TcpStream, ToSocketAddrs};
use std::path::{Path, PathBuf};
use std::process::{Child, Command, Stdio};
use std::sync::Mutex;
use std::time::Duration;

use tauri::{Emitter, Manager};

/// The backend child process we spawned (None if an existing backend was reused).
struct BackendProcess(Mutex<Option<Child>>);

#[tauri::command]
fn get_app_data_dir(app: tauri::AppHandle) -> String {
    let dir = app
        .path()
        .app_data_dir()
        .expect("Failed to get app data dir");
    std::fs::create_dir_all(&dir).ok();
    dir.to_string_lossy().to_string()
}

#[tauri::command]
fn get_backend_url() -> String {
    "http://localhost:5000".to_string()
}

/// Depth-limited search for `relative` (e.g. "backend/dist/index.js") under `root`.
/// Covers both resource layouts Tauri may produce (contents->target and path-preserved).
fn find_marker(root: &Path, relative: &str, max_depth: u8) -> Option<PathBuf> {
    let direct = root.join(relative);
    if direct.is_file() {
        return Some(direct);
    }
    if max_depth == 0 {
        return None;
    }
    let entries = std::fs::read_dir(root).ok()?;
    for entry in entries.flatten() {
        let path = entry.path();
        if path.is_dir() {
            if let Some(found) = find_marker(&path, relative, max_depth - 1) {
                return Some(found);
            }
        }
    }
    None
}

/// Non-blocking health check against the local backend on port 5000.
fn backend_healthy() -> bool {
    let addrs = match "127.0.0.1:5000".to_socket_addrs() {
        Ok(a) => a.collect::<Vec<_>>(),
        Err(_) => return false,
    };
    let addr = match addrs.first() {
        Some(a) => *a,
        None => return false,
    };
    let mut stream = match TcpStream::connect_timeout(&addr, Duration::from_millis(600)) {
        Ok(s) => s,
        Err(_) => return false,
    };
    stream
        .set_read_timeout(Some(Duration::from_millis(1200)))
        .ok();
    stream
        .set_write_timeout(Some(Duration::from_millis(600)))
        .ok();
    if stream
        .write_all(b"GET /api/health HTTP/1.1\r\nHost: 127.0.0.1:5000\r\nConnection: close\r\n\r\n")
        .is_err()
    {
        return false;
    }
    let mut buf = String::new();
    if stream.read_to_string(&mut buf).is_err() {
        return false;
    }
    buf.contains("\"ok\"")
}

/// Append a timestamped diagnostic line to `backend.log`.
/// Windows release builds are `windows_subsystem = "windows"` (no console),
/// so this file is the only place diagnostics are visible.
#[allow(dead_code)]
fn append_log(log_path: &Path, msg: &str) {
    let ts = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0);
    if let Ok(mut f) = OpenOptions::new()
        .create(true)
        .append(true)
        .open(log_path)
    {
        let _ = writeln!(f, "[{ts}] {msg}");
    }
}

/// Non-blocking check: did the spawned backend child exit (crash)?
#[allow(dead_code)]
fn backend_exit_status(app: &tauri::AppHandle) -> Option<String> {
    let state = app.try_state::<BackendProcess>()?;
    let mut guard = state.0.lock().ok()?;
    let child = guard.as_mut()?;
    match child.try_wait() {
        Ok(Some(status)) => Some(format!("backend process exited ({status})")),
        _ => None,
    }
}

/// Navigate the main window to the backend-served app (splash -> real app).
fn show_app(app: &tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        if let Ok(url) = tauri::Url::parse("http://localhost:5000") {
            window.navigate(url).ok();
        }
        window.emit("backend-ready", ()).ok();
    }
}

pub fn run() {
    // WebKitGTK on some Wayland/GPU setups aborts with
    // "Could not create default EGL display: EGL_BAD_PARAMETER"
    // before the window can render — force the non-dmabuf path.
    #[cfg(target_os = "linux")]
    std::env::set_var("WEBKIT_DISABLE_DMABUF_RENDERER", "1");

    tauri::Builder::default()
        .setup(|app| {
            let app_handle = app.handle().clone();

            // App data directory (SQLite + backups + reports live here)
            let app_data_dir = app
                .path()
                .app_data_dir()
                .expect("Failed to get app data dir");
            std::fs::create_dir_all(&app_data_dir).ok();
            let backups_dir = app_data_dir.join("backups");
            let reports_dir = app_data_dir.join("reports");
            std::fs::create_dir_all(&backups_dir).ok();
            std::fs::create_dir_all(&reports_dir).ok();

            #[cfg(not(debug_assertions))]
            {
                let resource_dir = app.path().resource_dir().expect("resource dir");

                // First run: seed a fresh database from the bundled template
                let db_path = app_data_dir.join("store.db");
                let log_path = app_data_dir.join("backend.log");
                if !db_path.exists() {
                    match find_marker(&resource_dir, "template.db", 3) {
                        Some(template) => match std::fs::copy(&template, &db_path) {
                            Ok(n) => append_log(
                                &log_path,
                                &format!("First run: database created from template ({n} bytes)"),
                            ),
                            Err(e) => {
                                append_log(&log_path, &format!("ERROR: could not copy template.db: {e}"))
                            }
                        },
                        None => append_log(&log_path, "ERROR: template.db not found in resources"),
                    }
                }

                // Locate the bundled runtime + backend entry inside resources
                let node_name = if cfg!(windows) { "bin/node.exe" } else { "bin/node" };
                let node_bin = find_marker(&resource_dir, node_name, 3);
                let server_js = find_marker(&resource_dir, "backend/dist/index.js", 3);

                let mut spawned: Option<Child> = None;
                match (&node_bin, &server_js) {
                    (Some(node), Some(server)) => {
                        if backend_healthy() {
                            append_log(&log_path, "Existing backend on :5000 detected — reusing it");
                        } else {
                            let backend_dir = server.parent().unwrap().parent().unwrap().to_path_buf();
                            let out = OpenOptions::new()
                                .create(true)
                                .append(true)
                                .open(&log_path)
                                .ok()
                                .map(Stdio::from)
                                .unwrap_or(Stdio::null());
                            let err = OpenOptions::new()
                                .create(true)
                                .append(true)
                                .open(&log_path)
                                .ok()
                                .map(Stdio::from)
                                .unwrap_or(Stdio::null());

                            let db_url = format!(
                                "file:{}",
                                db_path.to_string_lossy().replace('\\', "/")
                            );
                            let mut cmd = Command::new(node);
                            cmd.arg(server)
                                .arg(format!("--data-dir={}", app_data_dir.to_string_lossy()))
                                .env("DATABASE_URL", db_url)
                                .env("BACKUP_DIR", backups_dir.to_string_lossy().to_string())
                                .env("REPORT_DIR", reports_dir.to_string_lossy().to_string())
                                .current_dir(&backend_dir)
                                .stdout(out)
                                .stderr(err);
                            // Don't flash a console window from the GUI process.
                            #[cfg(windows)]
                            {
                                use std::os::windows::process::CommandExt;
                                cmd.creation_flags(0x08000000); // CREATE_NO_WINDOW
                            }
                            match cmd.spawn() {
                                Ok(c) => {
                                    append_log(
                                        &log_path,
                                        &format!(
                                            "Backend spawned (pid {}): {} {}",
                                            c.id(),
                                            node.display(),
                                            server.display()
                                        ),
                                    );
                                    spawned = Some(c);
                                }
                                Err(e) => {
                                    append_log(&log_path, &format!("ERROR: failed to spawn backend: {e}"));
                                    eprintln!("Failed to spawn backend: {e}");
                                }
                            }
                        }
                    }
                    _ => {
                        append_log(
                            &log_path,
                            &format!(
                                "ERROR: bundled backend not found under {:?} (node found: {}, server found: {})",
                                resource_dir,
                                node_bin.is_some(),
                                server_js.is_some()
                            ),
                        );
                    }
                }

                app.manage(BackendProcess(Mutex::new(spawned)));

                // Probe health off the UI thread; reveal + navigate when ready.
                // No attempt cap: slow first runs (e.g. antivirus scanning the
                // bundled node_modules) can exceed a minute — keep trying so the
                // app self-recovers the moment the backend is actually up.
                let probe_app = app_handle.clone();
                let probe_log = log_path.clone();
                std::thread::spawn(move || {
                    let mut attempts: u32 = 0;
                    let mut exit_reported = false;
                    loop {
                        attempts += 1;
                        if backend_healthy() {
                            append_log(
                                &probe_log,
                                &format!("Backend healthy after {attempts} probe(s) — navigating"),
                            );
                            let a = probe_app.clone();
                            let _ = probe_app.run_on_main_thread(move || show_app(&a));
                            break;
                        }
                        if !exit_reported {
                            if let Some(msg) = backend_exit_status(&probe_app) {
                                exit_reported = true;
                                append_log(&probe_log, &format!("ERROR: {msg}"));
                            }
                        }
                        if attempts % 120 == 0 {
                            append_log(
                                &probe_log,
                                &format!("still waiting for backend ({}s)...", attempts / 2),
                            );
                        }
                        std::thread::sleep(Duration::from_millis(500));
                    }
                });
            }

            #[cfg(debug_assertions)]
            {
                // Dev: backend comes from `npm run dev`, window loads the Vite devUrl
                let _ = &app_handle;
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_app_data_dir,
            get_backend_url
        ])
        .build(tauri::generate_context!())
        .expect("error while running tauri application")
        .run(|app_handle, event| {
            if let tauri::RunEvent::Exit = event {
                // Take down the backend we spawned (never a reused one)
                if let Some(state) = app_handle.try_state::<BackendProcess>() {
                    if let Ok(mut guard) = state.0.lock() {
                        if let Some(mut child) = guard.take() {
                            let _ = child.kill();
                            let _ = child.wait();
                        }
                    }
                }
            }
        });
}
