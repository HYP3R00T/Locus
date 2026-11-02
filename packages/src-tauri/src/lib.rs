mod library;

use library::{Action, Library, PdfInfo, Snapshot};
use std::sync::Arc;
use tauri::{Manager, State};
use tauri_plugin_dialog::DialogExt;

type Store = Arc<Library>;

#[tauri::command]
async fn read_drawing(store: State<'_, Store>, drawing_id: String) -> Result<String, String> {
    let store = store.inner().clone();
    tauri::async_runtime::spawn_blocking(move || store.read_drawing(&drawing_id))
        .await
        .map_err(|e| e.to_string())?
}

#[tauri::command]
async fn save_drawing(
    store: State<'_, Store>,
    drawing_id: String,
    scene: String,
) -> Result<(), String> {
    let store = store.inner().clone();
    tauri::async_runtime::spawn_blocking(move || store.save_drawing(&drawing_id, &scene))
        .await
        .map_err(|e| e.to_string())?
}

#[tauri::command]
async fn library_action(store: State<'_, Store>, action: Action) -> Result<Snapshot, String> {
    let store = store.inner().clone();
    tauri::async_runtime::spawn_blocking(move || store.apply(action))
        .await
        .map_err(|e| e.to_string())?
}
#[tauri::command]
async fn attach_pdf(
    app: tauri::AppHandle,
    store: State<'_, Store>,
    workspace_id: String,
    folder_id: Option<String>,
    relink_document_id: Option<String>,
) -> Result<Option<Snapshot>, String> {
    let store = store.inner().clone();
    tauri::async_runtime::spawn_blocking(move || {
        let Some(file) = app
            .dialog()
            .file()
            .add_filter("PDF documents", &["pdf"])
            .blocking_pick_file()
        else {
            return Ok(None);
        };
        let path = file.into_path().map_err(|e| e.to_string())?;
        store
            .attach(
                &workspace_id,
                folder_id.as_deref(),
                &path,
                relink_document_id.as_deref(),
            )
            .map(Some)
    })
    .await
    .map_err(|e| e.to_string())?
}
#[tauri::command]
async fn pdf_info(store: State<'_, Store>, document_id: String) -> Result<PdfInfo, String> {
    let store = store.inner().clone();
    tauri::async_runtime::spawn_blocking(move || store.info(&document_id))
        .await
        .map_err(|e| e.to_string())?
}
#[tauri::command]
async fn read_pdf_range(
    store: State<'_, Store>,
    document_id: String,
    begin: u64,
    end: u64,
) -> Result<tauri::ipc::Response, String> {
    let store = store.inner().clone();
    tauri::async_runtime::spawn_blocking(move || {
        store
            .read_range(&document_id, begin, end)
            .map(tauri::ipc::Response::new)
    })
    .await
    .map_err(|e| e.to_string())?
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(
            tauri_plugin_opener::Builder::new()
                .open_js_links_on_click(false)
                .build(),
        )
        .setup(|app| {
            let directory = app.path().app_data_dir()?;
            std::fs::create_dir_all(&directory)?;
            let library =
                Library::open(&directory.join("library.sqlite")).map_err(std::io::Error::other)?;
            app.manage(Arc::new(library));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            library_action,
            attach_pdf,
            pdf_info,
            read_pdf_range,
            read_drawing,
            save_drawing
        ])
        .run(tauri::generate_context!())
        .expect("failed to run Locus");
}
