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
pub struct FrictionEvent {
    pub id: i32,
    pub timestamp: String,
    pub event_type: String,
    pub intensity: i32,
}

pub fn init_db(app_data_dir: PathBuf) -> Result<Connection> {
    if !app_data_dir.exists() {
        fs::create_dir_all(&app_data_dir).expect("Failed to create app data directory");
    }
    let db_path = app_data_dir.join("tilt.db");
    
    let conn = Connection::open(db_path)?;
    
    conn.execute(
        "CREATE TABLE IF NOT EXISTS friction_events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            event_type TEXT NOT NULL,
            intensity INTEGER NOT NULL
        )",
        (),
    )?;

    Ok(conn)
}
