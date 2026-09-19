// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
mod db;
mod daemon;
use tauri::Manager;
use std::sync::{Arc, Mutex};

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
fn insert_dummy_event(state: tauri::State<'_, db::DbState>) -> Result<String, String> {
    let db = state.db.lock().unwrap();
    db.execute(
        "INSERT INTO friction_events (event_type, intensity) VALUES (?1, ?2)",
        ("dummy_event", 5),
    ).map_err(|e| e.to_string())?;
    Ok("Dummy event inserted".to_string())
}

#[tauri::command]
fn get_events(state: tauri::State<'_, db::DbState>) -> Result<Vec<db::FrictionEvent>, String> {
    let db = state.db.lock().unwrap();
    let mut stmt = db.prepare("SELECT id, timestamp, event_type, intensity FROM friction_events ORDER BY timestamp DESC LIMIT 1000").map_err(|e| e.to_string())?;
    let event_iter = stmt.query_map([], |row| {
        Ok(db::FrictionEvent {
            id: row.get(0)?,
            timestamp: row.get(1)?,
            event_type: row.get(2)?,
            intensity: row.get(3)?,
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
        .invoke_handler(tauri::generate_handler![greet, insert_dummy_event, get_events])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
