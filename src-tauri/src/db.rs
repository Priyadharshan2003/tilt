use rusqlite::{Connection, Result};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use std::sync::{Arc, Mutex};

#[derive(Clone)]
pub struct DbState {
    pub db: Arc<Mutex<Connection>>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct TelemetryEvent {
    pub id: String,
    pub timestamp: String,
    pub event_type: String,
    pub app_name: String,
    pub window_title: String,
    pub duration_ms: i32,
}

pub fn init_db(app_data_dir: PathBuf) -> Result<Connection> {
    if !app_data_dir.exists() {
        fs::create_dir_all(&app_data_dir).expect("Failed to create app data directory");
    }
    let db_path = app_data_dir.join("tilt.db");
    
    let conn = Connection::open(db_path)?;
    
    // Phase 1: Drop old schema and create the robust telemetry schema
    let _ = conn.execute("DROP TABLE IF EXISTS friction_events", ());

    conn.execute(
        "CREATE TABLE IF NOT EXISTS telemetry_events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            event_type TEXT NOT NULL,
            app_name TEXT,
            window_title TEXT,
            duration_ms INTEGER
        )",
        (),
    )?;

    Ok(conn)
}
