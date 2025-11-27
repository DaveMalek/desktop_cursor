use tauri::{
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Manager, Runtime, WebviewWindow,
};
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutState};

// Get cursor position - Windows specific
#[cfg(target_os = "windows")]
fn get_cursor_position() -> (i32, i32) {
    use std::mem::MaybeUninit;
    
    #[repr(C)]
    struct POINT {
        x: i32,
        y: i32,
    }
    
    extern "system" {
        fn GetCursorPos(lp_point: *mut POINT) -> i32;
    }
    
    unsafe {
        let mut point = MaybeUninit::<POINT>::uninit();
        if GetCursorPos(point.as_mut_ptr()) != 0 {
            let point = point.assume_init();
            (point.x, point.y)
        } else {
            (100, 100)
        }
    }
}

#[cfg(not(target_os = "windows"))]
fn get_cursor_position() -> (i32, i32) {
    (100, 100)
}

// Toggle window visibility and position at cursor
fn toggle_window<R: Runtime>(window: &WebviewWindow<R>) {
    if window.is_visible().unwrap_or(false) {
        let _ = window.hide();
    } else {
        let (cursor_x, cursor_y) = get_cursor_position();

        // Get window size
        let window_size = window.outer_size().unwrap_or(tauri::PhysicalSize {
            width: 420,
            height: 500,
        });

        // Get current monitor
        if let Ok(Some(monitor)) = window.current_monitor() {
            let monitor_size = monitor.size();
            let monitor_pos = monitor.position();

            // Calculate position so window appears near cursor but stays on screen
            // Position window so cursor is near top-center of the window
            let mut x = cursor_x - (window_size.width as i32 / 2);
            let mut y = cursor_y - 20; // 20px below cursor

            // Ensure window stays within monitor bounds
            let max_x = monitor_pos.x + monitor_size.width as i32 - window_size.width as i32;
            let max_y = monitor_pos.y + monitor_size.height as i32 - window_size.height as i32;

            x = x.max(monitor_pos.x).min(max_x);
            y = y.max(monitor_pos.y).min(max_y);

            let _ = window.set_position(tauri::Position::Physical(tauri::PhysicalPosition { x, y }));
        } else {
            // Fallback if we can't get monitor info
            let _ = window.set_position(tauri::Position::Physical(tauri::PhysicalPosition {
                x: cursor_x - 210,
                y: cursor_y - 250,
            }));
        }

        let _ = window.show();
        let _ = window.set_focus();
    }
}

// Command to hide window from frontend
#[tauri::command]
fn hide_window(window: WebviewWindow) {
    let _ = window.hide();
}

// Command to get stored API keys
#[tauri::command]
async fn get_api_keys(app: tauri::AppHandle) -> Result<serde_json::Value, String> {
    use tauri_plugin_store::StoreExt;
    
    let store = app.store("config.json").map_err(|e| e.to_string())?;
    
    let openai_key = store.get("openai_api_key").unwrap_or(serde_json::Value::Null);
    let anthropic_key = store.get("anthropic_api_key").unwrap_or(serde_json::Value::Null);
    
    Ok(serde_json::json!({
        "openai": openai_key,
        "anthropic": anthropic_key
    }))
}

// Command to save API keys
#[tauri::command]
async fn save_api_keys(
    app: tauri::AppHandle,
    openai_key: Option<String>,
    anthropic_key: Option<String>,
) -> Result<(), String> {
    use tauri_plugin_store::StoreExt;

    let store = app.store("config.json").map_err(|e| e.to_string())?;

    if let Some(key) = openai_key {
        store.set("openai_api_key", serde_json::json!(key));
    }
    if let Some(key) = anthropic_key {
        store.set("anthropic_api_key", serde_json::json!(key));
    }

    store.save().map_err(|e| e.to_string())?;
    Ok(())
}

// Command to capture full screenshot
#[tauri::command]
async fn capture_screenshot() -> Result<String, String> {
    use screenshots::Screen;
    use image::ImageOutputFormat;
    use std::io::Cursor;

    // Get all screens
    let screens = Screen::all().map_err(|e| format!("Failed to get screens: {}", e))?;

    // Capture the primary screen (first screen)
    let screen = screens.get(0).ok_or("No screens found")?;
    let image = screen.capture().map_err(|e| format!("Failed to capture screen: {}", e))?;

    // Convert to PNG and base64
    let mut buffer = Cursor::new(Vec::new());
    image
        .write_to(&mut buffer, ImageOutputFormat::Png)
        .map_err(|e| format!("Failed to encode image: {}", e))?;

    let base64_img = base64::Engine::encode(&base64::engine::general_purpose::STANDARD, buffer.into_inner());
    Ok(format!("data:image/png;base64,{}", base64_img))
}

// Command to capture screenshot of specific area
#[tauri::command]
async fn capture_area_screenshot(x: i32, y: i32, width: u32, height: u32) -> Result<String, String> {
    use screenshots::Screen;
    use image::{ImageOutputFormat, GenericImageView};
    use std::io::Cursor;

    // Get all screens
    let screens = Screen::all().map_err(|e| format!("Failed to get screens: {}", e))?;

    // Find which screen contains the area
    let screen = screens.get(0).ok_or("No screens found")?;
    let full_image = screen.capture().map_err(|e| format!("Failed to capture screen: {}", e))?;

    // Crop the image to the specified area
    let cropped = full_image.view(x as u32, y as u32, width, height).to_image();

    // Convert to PNG and base64
    let mut buffer = Cursor::new(Vec::new());
    cropped
        .write_to(&mut buffer, ImageOutputFormat::Png)
        .map_err(|e| format!("Failed to encode image: {}", e))?;

    let base64_img = base64::Engine::encode(&base64::engine::general_purpose::STANDARD, buffer.into_inner());
    Ok(format!("data:image/png;base64,{}", base64_img))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            // Setup logging in debug mode
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            // Build system tray
            let _tray = TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .tooltip("Analyst - Press ` to toggle")
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            toggle_window(&window);
                        }
                    }
                })
                .build(app)?;

            // Register global shortcut for backtick (`)
            let shortcut = Shortcut::new(Some(Modifiers::empty()), Code::Backquote);
            let app_handle = app.handle().clone();
            
            app.handle().plugin(
                tauri_plugin_global_shortcut::Builder::new()
                    .with_handler(move |_app, _shortcut, event| {
                        if event.state() == ShortcutState::Pressed {
                            if let Some(window) = app_handle.get_webview_window("main") {
                                toggle_window(&window);
                            }
                        }
                    })
                    .build(),
            )?;
            
            app.global_shortcut().register(shortcut)?;

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            hide_window,
            get_api_keys,
            save_api_keys,
            capture_screenshot,
            capture_area_screenshot
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
