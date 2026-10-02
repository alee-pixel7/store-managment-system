// Desktop entry point — delegates to the lib crate.
// Prevents an extra console window on Windows in release builds.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    store_management_system_lib::run();
}
