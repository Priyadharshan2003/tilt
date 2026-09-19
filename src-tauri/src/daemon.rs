use rdev::{listen, Event, EventType, Key};
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::{Duration, Instant};

#[cfg(target_os = "windows")]
use windows::Win32::UI::WindowsAndMessaging::{GetForegroundWindow, GetWindowTextW};

pub fn start_daemon(db: Arc<Mutex<rusqlite::Connection>>) {
    // 1. Input Event Polling Thread
    let db_clone_rdev = db.clone();
    thread::spawn(move || {
        let mut backspace_count = 0;
        let mut mouse_moves = 0;
        let mut last_insert = Instant::now();

        let callback = move |event: Event| {
            match event.event_type {
                EventType::KeyPress(Key::Backspace) => {
                    backspace_count += 1;
                }
                EventType::MouseMove { .. } => {
                    mouse_moves += 1;
                }
                _ => {}
            }

            if last_insert.elapsed() >= Duration::from_secs(5) {
                if backspace_count > 0 || mouse_moves > 0 {
                    let db = db_clone_rdev.lock().unwrap();
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

    // 2. Active Window Polling Thread
    #[cfg(target_os = "windows")]
    thread::spawn(move || {
        let mut last_title = String::new();
        let mut window_switches = 0;
        let mut last_insert = Instant::now();

        loop {
            thread::sleep(Duration::from_secs(1));

            unsafe {
                let hwnd = GetForegroundWindow();
                if !hwnd.0.is_null() {
                    let mut buffer = [0u16; 512];
                    let len = GetWindowTextW(hwnd, &mut buffer);
                    if len > 0 {
                        let title = String::from_utf16_lossy(&buffer[..len as usize]);
                        
                        if title != last_title {
                            window_switches += 1;
                            last_title = title.clone();
                        }
                    }
                }
            }

            if last_insert.elapsed() >= Duration::from_secs(5) {
                if window_switches > 0 {
                    let db = db.lock().unwrap();
                    let _ = db.execute(
                        "INSERT INTO friction_events (event_type, intensity) VALUES (?1, ?2)",
                        ("window_switch", window_switches),
                    );
                    window_switches = 0;
                }
                last_insert = Instant::now();
            }
        }
    });
}
