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
                if !db_path.exists() {
                    if let Some(template) =
                        find_marker(&resource_dir, "template.db", 3)
                    {
                        std::fs::copy(&template, &db_path).ok();
                        println!("First run: database created from template");
                    }
                }

                // Locate the bundled runtime + backend entry inside resources
                let node_name = if cfg!(windows) { "bin/node.exe" } else { "bin/node" };
                let node_bin = find_marker(&resource_dir, node_name, 3);
                let server_js = find_marker(&resource_dir, "backend/dist/index.js", 3);

                let mut spawned: Option<Child> = None;
                match (node_bin, server_js) {
                    (Some(node), Some(server)) => {
                        if backend_healthy() {
                            println!("Existing backend on :5000 detected — reusing it");
                        } else {
                            let backend_dir = server.parent().unwrap().parent().unwrap().to_path_buf();
                            let log_path = app_data_dir.join("backend.log");
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
                            let child = Command::new(&node)
                                .arg(&server)
                                .arg(format!("--data-dir={}", app_data_dir.to_string_lossy()))
                                .env("DATABASE_URL", db_url)
                                .env("BACKUP_DIR", backups_dir.to_string_lossy().to_string())
                                .env("REPORT_DIR", reports_dir.to_string_lossy().to_string())
                                .current_dir(&backend_dir)
                                .stdout(out)
                                .stderr(err)
                                .spawn();
                            match child {
                                Ok(c) => {
                                    println!("Backend spawned via bundled node");
                                    spawned = Some(c);
                                }
                                Err(e) => {
                                    eprintln!("Failed to spawn backend: {e}");
                                }
                            }
                        }
                    }
                    _ => {
                        eprintln!(
                            "Bundled backend not found under {:?} — cannot start API",
                            resource_dir
                        );
                    }
                }

                app.manage(BackendProcess(Mutex::new(spawned)));

                // Probe health off the UI thread; reveal + navigate when ready
                let probe_app = app_handle.clone();
                std::thread::spawn(move || {
                    let mut attempts = 0;
                    const MAX_ATTEMPTS: u32 = 60; // 30s
                    loop {
                        attempts += 1;
                        if backend_healthy() {
                            let a = probe_app.clone();
                            let _ = probe_app.run_on_main_thread(move || show_app(&a));
                            break;
                        }
                        if attempts >= MAX_ATTEMPTS {
                            // Splash stays visible and shows its own
                            // "Backend failed to start" error state
                            break;
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
