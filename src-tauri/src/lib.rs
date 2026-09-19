mod db;
mod daemon;
use tauri::Manager;
use std::sync::{Arc, Mutex};

#[tauri::command]
fn get_events(state: tauri::State<'_, db::DbState>) -> Result<Vec<db::TelemetryEvent>, String> {
    let db = state.db.lock().unwrap();
    let mut stmt = db.prepare("SELECT id, timestamp, event_type, app_name, window_title, duration_ms FROM telemetry_events ORDER BY timestamp DESC LIMIT 2000").map_err(|e| e.to_string())?;
    
    let event_iter = stmt.query_map([], |row| {
        let id_val: i32 = row.get(0)?;
        Ok(db::TelemetryEvent {
            id: id_val.to_string(),
            timestamp: row.get(1)?,
            event_type: row.get(2)?,
            app_name: row.get(3).unwrap_or_else(|_| "".to_string()),
            window_title: row.get(4).unwrap_or_else(|_| "".to_string()),
            duration_ms: row.get(5).unwrap_or(0),
        })
    }).map_err(|e| e.to_string())?;

    let mut events = Vec::new();
    for event in event_iter {
        events.push(event.map_err(|e| e.to_string())?);
    }
    Ok(events)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let app_data_dir = app.path().app_data_dir().expect("Failed to get app data dir");
            let conn = db::init_db(app_data_dir).expect("Failed to initialize database");
            
            let db_state = db::DbState {
                db: Arc::new(Mutex::new(conn)),
            };

            // Start the OS event daemon in the background
            daemon::start_daemon(db_state.db.clone());

            app.manage(db_state);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![get_events])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
