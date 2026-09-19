use rdev::{listen, Event, EventType, Key};
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::{Duration, Instant};
use sysinfo::{System, SystemExt, ProcessExt};

#[cfg(target_os = "windows")]
use windows::Win32::UI::WindowsAndMessaging::{GetForegroundWindow, GetWindowTextW, GetWindowThreadProcessId};

pub fn start_daemon(db: Arc<Mutex<rusqlite::Connection>>) {
    // 1. Input Event Polling Thread
    let db_clone_rdev = db.clone();
    thread::spawn(move || {
        let mut destructive_count = 0;
        let mut action_count = 0;
        let mut mouse_moves = 0;
        let mut last_insert = Instant::now();

        let callback = move |event: Event| {
            match event.event_type {
                EventType::KeyPress(Key::Backspace) | EventType::KeyPress(Key::Delete) => {
                    destructive_count += 1;
                }
                EventType::KeyPress(Key::Return) | EventType::KeyPress(Key::Space) => {
                    action_count += 1;
                }
                EventType::MouseMove { .. } => {
                    mouse_moves += 1;
                }
                _ => {}
            }

            if last_insert.elapsed() >= Duration::from_secs(5) {
                let db = db_clone_rdev.lock().unwrap();
                if destructive_count > 0 {
                    let _ = db.execute(
                        "INSERT INTO telemetry_events (event_type, duration_ms) VALUES (?1, ?2)",
                        ("destructive_keystroke", destructive_count),
                    );
                    destructive_count = 0;
                }
                if action_count > 0 {
                    let _ = db.execute(
                        "INSERT INTO telemetry_events (event_type, duration_ms) VALUES (?1, ?2)",
                        ("action_keystroke", action_count),
                    );
                    action_count = 0;
                }
                if mouse_moves > 0 {
                    let _ = db.execute(
                        "INSERT INTO telemetry_events (event_type, duration_ms) VALUES (?1, ?2)",
                        ("mouse_movement", mouse_moves),
                    );
                    mouse_moves = 0;
                }
                last_insert = Instant::now();
            }
        };

        if let Err(error) = listen(callback) {
            eprintln!("Error: {:?}", error);
        }
    });

    // 2. Active Window Polling Thread
    #[cfg(target_os = "windows")]
    thread::spawn(move || {
        let mut sys = System::new_all();
        let mut last_title = String::new();
        let mut last_app = String::new();
        let mut window_start = Instant::now();

        loop {
            thread::sleep(Duration::from_millis(500));
            sys.refresh_processes();

            unsafe {
                let hwnd = GetForegroundWindow();
                if !hwnd.0.is_null() {
                    let mut buffer = [0u16; 512];
                    let len = GetWindowTextW(hwnd, &mut buffer);
                    let title = if len > 0 {
                        String::from_utf16_lossy(&buffer[..len as usize])
                    } else {
                        String::new()
                    };
                    
                    let mut pid = 0;
                    GetWindowThreadProcessId(hwnd, Some(&mut pid));
                    
                    let app_name = if let Some(process) = sys.process(sysinfo::Pid::from(pid as usize)) {
                        process.name().to_string()
                    } else {
                        "Unknown".to_string()
                    };

                    // Only trigger a switch if the window title or app changed
                    if title != last_title || app_name != last_app {
                        let duration = window_start.elapsed().as_millis() as i32;
                        
                        // Record previous window duration if it was tracked
                        if !last_app.is_empty() && duration > 100 {
                            let db = db.lock().unwrap();
                            let _ = db.execute(
                                "INSERT INTO telemetry_events (event_type, app_name, window_title, duration_ms) VALUES (?1, ?2, ?3, ?4)",
                                ("window_switch", &last_app, &last_title, duration),
                            );
                        }
                        
                        last_title = title;
                        last_app = app_name;
                        window_start = Instant::now();
                    }
                }
            }
        }
    });
}
