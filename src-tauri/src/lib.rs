use std::sync::Mutex;
use tauri::{AppHandle, Emitter, State, Manager};

struct ClipboardState {
  last_text: Mutex<String>,
}

#[tauri::command]
fn get_clipboard_text() -> Result<String, String> {
  let mut clipboard = arboard::Clipboard::new().map_err(|e| e.to_string())?;
  clipboard.get_text().map_err(|e| e.to_string())
}

#[tauri::command]
fn set_clipboard_text(text: String) -> Result<(), String> {
  let mut clipboard = arboard::Clipboard::new().map_err(|e| e.to_string())?;
  clipboard.set_text(text).map_err(|e| e.to_string())
}

#[tauri::command]
fn start_clipboard_watch(app: AppHandle) {
  let app_clone = app.clone();
  std::thread::spawn(move || {
    loop {
      std::thread::sleep(std::time::Duration::from_millis(500));
      if let Ok(mut clipboard) = arboard::Clipboard::new() {
        if let Ok(text) = clipboard.get_text() {
          if let Some(state) = app_clone.try_state::<ClipboardState>() {
            let mut last = state.last_text.lock().unwrap();
            if text != *last {
              *last = text.clone();
              let _ = app_clone.emit("clipboard-changed", text);
            }
          }
        }
      }
    }
  });
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .manage(ClipboardState {
      last_text: Mutex::new(String::new()),
    })
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .invoke_handler(tauri::generate_handler![
      get_clipboard_text,
      set_clipboard_text,
      start_clipboard_watch
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
