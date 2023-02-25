#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

use tauri::{CustomMenuItem, Menu, Submenu};

#[derive(Clone, serde::Serialize)]
struct OpenPayload;

fn main() {
    let open = CustomMenuItem::new("open", "開く");
    let inquiry = CustomMenuItem::new("inquiry", "お問い合わせ");
    let about = CustomMenuItem::new("about", "このアプリについて");
    let file_submenu = Submenu::new("ファイル", Menu::new().add_item(open));
    let help_submenu = Submenu::new(
        "ヘルプ",
        Menu::new()
            .add_item(inquiry)
            .add_native_item(tauri::MenuItem::Separator)
            .add_item(about),
    );
    let menu = Menu::new()
        .add_submenu(file_submenu)
        .add_submenu(help_submenu);

    tauri::Builder::default()
        .menu(menu)
        .on_menu_event(|event| {
            let window = event.window();
            match event.menu_item_id() {
                "open" => {
                    window.emit("open", OpenPayload {}).unwrap();
                }
                "inquiry" => {
                    window.emit("inquiry", OpenPayload {}).unwrap();
                }
                "about" => {
                    window.emit("about", OpenPayload {}).unwrap();
                }
                _ => {}
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
