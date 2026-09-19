use rdev::{listen, Event, EventType, Key};
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::{Duration, Instant};

pub fn start_daemon(db: Arc<Mutex<rusqlite::Connection>>) {
    thread::spawn(move || {
        let db_clone = db.clone();
        
        // We will keep a local buffer to batch inserts and avoid locking the DB on every keystroke
        let mut backspace_count = 0;
        let mut mouse_moves = 0;
        let mut last_insert = Instant::now();

        let callback = move |event: Event| {
            let mut should_insert = false;

            match event.event_type {
                EventType::KeyPress(Key::Backspace) => {
                    backspace_count += 1;
                }
                EventType::MouseMove { .. } => {
                    mouse_moves += 1;
                }
                EventType::ButtonPress(_) => {
                    // Track clicks if needed
                }
                _ => {}
            }

            // Batch insert every 5 seconds or if we hit a threshold
            if last_insert.elapsed() >= Duration::from_secs(5) {
                if backspace_count > 0 || mouse_moves > 0 {
                    let db = db_clone.lock().unwrap();
                    
                    if backspace_count > 0 {
                        let _ = db.execute(
                            "INSERT INTO friction_events (event_type, intensity) VALUES (?1, ?2)",
                            ("backspace", backspace_count),
                        );
                        backspace_count = 0;
                    }
                    
                    if mouse_moves > 0 {
                        let _ = db.execute(
                            "INSERT INTO friction_events (event_type, intensity) VALUES (?1, ?2)",
                            ("mouse_movement", mouse_moves),
                        );
                        mouse_moves = 0;
                    }
                }
                last_insert = Instant::now();
            }
        };

        if let Err(error) = listen(callback) {
            eprintln!("Error: {:?}", error);
        }
    });
}
