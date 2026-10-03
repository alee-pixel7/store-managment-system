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
    strip_extended_prefix(dir).to_string_lossy().to_string()
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

/// Fetch `/api/health` from whatever listens on 127.0.0.1:5000 and return
/// the body when it answers like our backend (`"ok"` present).
fn fetch_health_body() -> Option<String> {
    let addrs = match "127.0.0.1:5000".to_socket_addrs() {
        Ok(a) => a.collect::<Vec<_>>(),
        Err(_) => return None,
    };
    let addr = *addrs.first()?;
    let mut stream = TcpStream::connect_timeout(&addr, Duration::from_millis(600)).ok()?;
    stream
        .set_read_timeout(Some(Duration::from_millis(1200)))
        .ok();
    stream
        .set_write_timeout(Some(Duration::from_millis(600)))
        .ok();
    stream
        .write_all(b"GET /api/health HTTP/1.1\r\nHost: 127.0.0.1:5000\r\nConnection: close\r\n\r\n")
        .ok()?;
    let mut buf = String::new();
    stream.read_to_string(&mut buf).ok()?;
    if buf.contains("\"ok\"") {
        Some(buf)
    } else {
        None
    }
}

fn backend_healthy() -> bool {
    fetch_health_body().is_some()
}

/// Best-effort extraction of a JSON string field (avoids serde for two fields).
fn json_str_field(body: &str, key: &str) -> Option<String> {
    let pat = format!("\"{key}\":\"");
    let start = body.find(&pat)? + pat.len();
    let rest = &body[start..];
    let end = rest.find('"')?;
    Some(rest[..end].to_string())
}

/// What is already answering on :5000 when the app starts.
enum ExistingBackend {
    /// Nothing healthy is listening.
    None,
    /// A backend of OUR version — safe to reuse.
    Current,
    /// A backend answers, but from an older install (or reports no version).
    Stale(String),
}

/// Probe `/api/health` of the process on :5000 and classify it against the
/// version this app ships. Older installs don't report a version at all, so
/// any pre-upgrade sidecar is treated as stale and replaced below.
fn probe_existing(app_version: &str) -> ExistingBackend {
    let Some(body) = fetch_health_body() else {
        return ExistingBackend::None;
    };
    match json_str_field(&body, "version") {
        Some(v) if v == app_version => ExistingBackend::Current,
        Some(v) => ExistingBackend::Stale(format!("version {v} != app {app_version}")),
        None => ExistingBackend::Stale("no version reported (old install)".to_string()),
    }
}

/// Is this pid a node/node.exe process? Guards against pid recycling so we
/// never kill an unrelated process recorded in the pid file.
fn process_is_node(pid: u32) -> bool {
    if cfg!(windows) {
        let filter = format!("PID eq {pid}");
        let out = Command::new("tasklist")
            .args(["/FI", filter.as_str(), "/FO", "CSV", "/NH"])
            .output();
        match out {
            Ok(o) => String::from_utf8_lossy(&o.stdout).to_lowercase().contains("node"),
            Err(_) => false,
        }
    } else {
        std::fs::read_to_string(format!("/proc/{pid}/comm"))
            .map(|c| c.starts_with("node"))
            .unwrap_or(false)
    }
}

/// Best-effort kill of a (caller-validated node) process.
fn kill_pid(pid: u32) -> bool {
    let pid_s = pid.to_string();
    let mut cmd = if cfg!(windows) {
        let mut c = Command::new("taskkill");
        c.args(["/PID", pid_s.as_str(), "/T", "/F"]);
        c
    } else {
        let mut c = Command::new("kill");
        c.args(["-9", pid_s.as_str()]);
        c
    };
    // Don't flash a console window from the GUI process.
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        cmd.creation_flags(0x08000000); // CREATE_NO_WINDOW
    }
    cmd.status().map(|s| s.success()).unwrap_or(false)
}

/// Clean up an orphaned sidecar recorded in `backend.pid` (previous run was
/// force-killed and its exit handler never fired).
fn kill_recorded_pid(pid_path: &Path, log_path: &Path) {
    let Ok(raw) = std::fs::read_to_string(pid_path) else {
        return;
    };
    std::fs::remove_file(pid_path).ok();
    let Ok(pid) = raw.trim().parse::<u32>() else {
        return;
    };
    if pid == std::process::id() || !process_is_node(pid) {
        return;
    }
    append_log(
        log_path,
        &format!("Killing orphaned backend from previous run (pid {pid})"),
    );
    if kill_pid(pid) {
        append_log(log_path, &format!("Orphaned backend (pid {pid}) killed"));
    }
}

/// Free :5000 by killing whatever **node** process is listening there (stale
/// sidecar from a previous install whose pid file we no longer have).
/// Never touches non-node processes — if the listener isn't ours we log and
/// let the spawn below surface the EADDRINUSE error instead.
fn kill_stale_listener(log_path: &Path) {
    let (program, args): (&str, Vec<String>) = if cfg!(windows) {
        let script = concat!(
            "$c = Get-NetTCPConnection -LocalPort 5000 -State Listen -ErrorAction SilentlyContinue; ",
            "foreach ($x in $c) { $p = Get-Process -Id $x.OwningProcess -ErrorAction SilentlyContinue; ",
            "if ($p -and $p.ProcessName -like 'node*') { Stop-Process -Id $p.Id -Force } }"
        );
        (
            "powershell",
            ["-NoProfile", "-NonInteractive", "-Command", script]
                .iter()
                .map(|s| s.to_string())
                .collect(),
        )
    } else {
        let script = concat!(
            "for pid in $(lsof -t -iTCP:5000 -sTCP:LISTEN 2>/dev/null); do ",
            "c=$(cat /proc/$pid/comm 2>/dev/null); ",
            "case \"$c\" in node*) kill -9 \"$pid\" 2>/dev/null;; esac; done"
        );
        ("sh", vec!["-c".to_string(), script.to_string()])
    };
    let mut cmd = Command::new(program);
    cmd.args(&args);
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        cmd.creation_flags(0x08000000); // CREATE_NO_WINDOW
    }
    match cmd.output() {
        Ok(o) => {
            let so = String::from_utf8_lossy(&o.stdout).trim().to_string();
            let se = String::from_utf8_lossy(&o.stderr).trim().to_string();
            append_log(
                log_path,
                &format!(
                    "stale-listener kill: exit={:?}{}{}",
                    o.status.code(),
                    if so.is_empty() { String::new() } else { format!(" out={so}") },
                    if se.is_empty() { String::new() } else { format!(" err={se}") },
                ),
            );
        }
        Err(e) => append_log(
            log_path,
            &format!("ERROR: could not run {program} to free :5000: {e}"),
        ),
    }
}

/// Windows: Tauri's `resource_dir()` / `app_data_dir()` can return
/// extended-length paths (`\\?\C:\...`). Node.js crashes on those at module
/// load (`EISDIR: lstat 'C:'`), so normalize them to plain Win32 paths.
fn strip_extended_prefix(p: PathBuf) -> PathBuf {
    let stripped = {
        let s = p.to_string_lossy();
        s.strip_prefix(r"\\?\").map(|r| r.to_string())
    };
    match stripped {
        Some(r) if r.starts_with(r"UNC\") => PathBuf::from(format!(r"\\{}", &r[4..])),
        Some(r) => PathBuf::from(r),
        None => p,
    }
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
            let app_data_dir = strip_extended_prefix(
                app.path()
                    .app_data_dir()
                    .expect("Failed to get app data dir"),
            );
            std::fs::create_dir_all(&app_data_dir).ok();
            let backups_dir = app_data_dir.join("backups");
            let reports_dir = app_data_dir.join("reports");
            std::fs::create_dir_all(&backups_dir).ok();
            std::fs::create_dir_all(&reports_dir).ok();

            #[cfg(not(debug_assertions))]
            {
                let resource_dir =
                    strip_extended_prefix(app.path().resource_dir().expect("resource dir"));

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

                let app_version = env!("CARGO_PKG_VERSION");
                let pid_path = app_data_dir.join("backend.pid");

                let mut spawned: Option<Child> = None;
                match (&node_bin, &server_js) {
                    (Some(node), Some(server)) => {
                        // Decide what to do with whatever is already on :5000.
                        // Only a same-version backend is reused; anything else
                        // (old install, no version, hung) is killed + replaced
                        // so an upgrade can never keep serving stale code.
                        let mut reuse = false;
                        match probe_existing(app_version) {
                            ExistingBackend::Current => {
                                reuse = true;
                                append_log(
                                    &log_path,
                                    &format!(
                                        "Existing backend on :5000 detected — reusing it (v{app_version})"
                                    ),
                                );
                            }
                            ExistingBackend::Stale(detail) => {
                                append_log(
                                    &log_path,
                                    &format!("Stale backend on :5000 ({detail}) — replacing it"),
                                );
                                kill_recorded_pid(&pid_path, &log_path);
                                kill_stale_listener(&log_path);
                                let mut waited_ms = 0u32;
                                while backend_healthy() && waited_ms < 4000 {
                                    std::thread::sleep(Duration::from_millis(200));
                                    waited_ms += 200;
                                }
                                if backend_healthy() {
                                    append_log(
                                        &log_path,
                                        "WARNING: :5000 still busy after stale kill — will try to spawn anyway",
                                    );
                                } else {
                                    append_log(
                                        &log_path,
                                        &format!("Port 5000 free after {waited_ms}ms"),
                                    );
                                }
                            }
                            ExistingBackend::None => {
                                kill_recorded_pid(&pid_path, &log_path);
                            }
                        }
                        if !reuse {
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
                                .env("APP_VERSION", app_version)
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
                                    // Record the pid so a force-killed app can
                                    // clean up its orphaned sidecar next run.
                                    std::fs::write(&pid_path, c.id().to_string()).ok();
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
                            let pid = child.id();
                            let _ = child.kill();
                            let _ = child.wait();
                            // Drop OUR pid file (a reused backend belongs to
                            // another instance — leave its record alone).
                            if let Ok(dir) = app_handle.path().app_data_dir() {
                                let pid_path = strip_extended_prefix(dir).join("backend.pid");
                                if let Ok(raw) = std::fs::read_to_string(&pid_path) {
                                    if let Ok(recorded) = raw.trim().parse::<u32>() {
                                        if recorded == pid {
                                            std::fs::remove_file(&pid_path).ok();
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        });
}
