// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::Manager;
use tauri_plugin_shell::ShellExt;

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

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            let window = app.get_webview_window("main").unwrap();

            // Get app data directory for SQLite and backups
            let app_data_dir = app
                .path()
                .app_data_dir()
                .expect("Failed to get app data dir");
            std::fs::create_dir_all(&app_data_dir).ok();

            // Build the sidecar command
            let sidecar_command = app.shell().sidecar("backend").expect("Failed to create sidecar command");

            // Set environment variables for the backend
            let db_path = app_data_dir.join("store.db");
            let backups_dir = app_data_dir.join("backups");
            let reports_dir = app_data_dir.join("reports");

            std::fs::create_dir_all(&backups_dir).ok();
            std::fs::create_dir_all(&reports_dir).ok();

            // Spawn the backend sidecar
            let (_rx, child) = sidecar_command
                .args(["--data-dir", &app_data_dir.to_string_lossy()])
                .env("DATABASE_URL", format!("file:{}", db_path.to_string_lossy()))
                .env("BACKUP_DIR", backups_dir.to_string_lossy().to_string())
                .env("REPORT_DIR", reports_dir.to_string_lossy().to_string())
                .spawn()
                .expect("Failed to spawn backend sidecar");

            // Store the child process handle
            app.manage(child);

            // Poll health check until backend is ready
            let window_clone = window.clone();
            let app_handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                let client = reqwest::Client::new();
                let mut attempts = 0;
                let max_attempts = 60; // 30 seconds max

                loop {
                    attempts += 1;
                    if attempts > max_attempts {
                        eprintln!("Backend failed to start after {} attempts", max_attempts);
                        break;
                    }

                    match client.get("http://localhost:5000/api/health").send().await {
                        Ok(response) => {
                            if response.status().is_success() {
                                println!("Backend is ready!");
                                // Notify the frontend
                                window_clone.emit("backend-ready", ()).ok();
                                break;
                            }
                        }
                        Err(_) => {
                            // Backend not ready yet, wait and retry
                            tokio::time::sleep(std::time::Duration::from_millis(500)).await;
                        }
                    }
                }
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_app_data_dir,
            get_backend_url
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
