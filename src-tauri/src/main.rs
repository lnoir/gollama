// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::{utils::config::AppUrl, WindowUrl};
use tauri_plugin_log::{LogTarget};

fn main() {
  let port = portpicker::pick_unused_port().expect("failed to find unused port");

  let mut context = tauri::generate_context!();
  let url = format!("http://localhost:{}", port).parse().unwrap();
  let window_url = WindowUrl::External(url);

  // rewrite the config so the IPC is enabled on this URL
  context.config_mut().build.dist_dir = AppUrl::Url(window_url.clone());

  tauri::Builder::default()
    .plugin(tauri_plugin_localhost::Builder::new(port).build())
    .plugin(tauri_plugin_sql::Builder::default().build())
    .plugin(tauri_plugin_log::Builder::default().targets([
      LogTarget::LogDir,
      LogTarget::Stdout,
      LogTarget::Webview,
    ]).build())
    .run(context)
    .expect("error while running tauri application");
}