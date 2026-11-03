mod configuration;
mod library;

use library::{Action, Library, PdfInfo, Snapshot};
use std::sync::Arc;
use tauri::{Manager, State};
use tauri_plugin_dialog::DialogExt;
use tauri_plugin_opener::OpenerExt;
use tauri_plugin_window_state::StateFlags;

type Store = Arc<Library>;
type Config = Arc<configuration::Configuration>;

#[tauri::command]
async fn load_configuration(
    config: State<'_, Config>,
    legacy: Option<configuration::LegacyConfiguration>,
    migration_error: Option<String>,
) -> Result<configuration::ConfigurationSnapshot, String> {
    let config = config.inner().clone();
    tauri::async_runtime::spawn_blocking(move || {
        if !config.exists()
            && let Some(reason) = migration_error
        {
            return Err(format!("Could not migrate browser preferences: {reason}"));
        }
        config.load(legacy)
    })
    .await
    .map_err(|e| e.to_string())?
    .inspect_err(|_| log::warn!("Could not load configuration"))
}

#[tauri::command]
async fn read_themes(config: State<'_, Config>) -> Result<configuration::ThemeSnapshot, String> {
    let config = config.inner().clone();
    tauri::async_runtime::spawn_blocking(move || config.read_themes())
        .await
        .map_err(|e| e.to_string())?
}

#[tauri::command]
async fn save_configuration(
    config: State<'_, Config>,
    file: String,
    expected: serde_json::Value,
    value: serde_json::Value,
) -> Result<(), String> {
    let config = config.inner().clone();
    tauri::async_runtime::spawn_blocking(move || config.save(&file, expected, value))
        .await
        .map_err(|e| e.to_string())?
        .inspect_err(|_| log::warn!("Could not save configuration"))
}

#[tauri::command]
async fn import_theme(
    app: tauri::AppHandle,
    config: State<'_, Config>,
) -> Result<Option<configuration::ConfigurationSnapshot>, String> {
    let config = config.inner().clone();
    tauri::async_runtime::spawn_blocking(move || {
        let Some(file) = app
            .dialog()
            .file()
            .add_filter("Locus theme", &["json"])
            .blocking_pick_file()
        else {
            return Ok(None);
        };
        config.import_theme(&file.into_path().map_err(|e| e.to_string())?)?;
        config.load(None).map(Some)
    })
    .await
    .map_err(|e| e.to_string())?
    .inspect_err(|_| log::warn!("Could not import theme"))
}

#[tauri::command]
async fn open_configuration_directory(
    app: tauri::AppHandle,
    config: State<'_, Config>,
) -> Result<(), String> {
    let config = config.inner().clone();
    tauri::async_runtime::spawn_blocking(move || {
        std::fs::create_dir_all(config.directory()).map_err(|e| e.to_string())?;
        app.opener()
            .open_path(
                config.directory().to_string_lossy().into_owned(),
                None::<&str>,
            )
            .map_err(|e| e.to_string())
    })
    .await
    .map_err(|e| e.to_string())?
    .inspect_err(|_| log::warn!("Could not open configuration directory"))
}

fn window_state_flags() -> StateFlags {
    let flags = StateFlags::SIZE | StateFlags::MAXIMIZED;
    // Wayland compositors control placement; querying a position can fail and prevent saving.
    #[cfg(target_os = "linux")]
    if std::env::var_os("WAYLAND_DISPLAY").is_some()
        || std::env::var("XDG_SESSION_TYPE").is_ok_and(|session| session == "wayland")
    {
        return flags;
    }
    flags | StateFlags::POSITION
}

#[tauri::command]
async fn read_drawing(store: State<'_, Store>, drawing_id: String) -> Result<String, String> {
    let store = store.inner().clone();
    tauri::async_runtime::spawn_blocking(move || store.read_drawing(&drawing_id))
        .await
        .map_err(|e| e.to_string())?
        .inspect_err(|_| log::warn!("Could not read drawing"))
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
        .inspect_err(|_| log::warn!("Could not save drawing"))
}

#[tauri::command]
async fn library_action(store: State<'_, Store>, action: Action) -> Result<Snapshot, String> {
    let store = store.inner().clone();
    tauri::async_runtime::spawn_blocking(move || store.apply(action))
        .await
        .map_err(|e| e.to_string())?
        .inspect_err(|_| log::warn!("Could not apply library action"))
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
    .inspect_err(|_| log::warn!("Could not attach or relink PDF"))
}
#[tauri::command]
async fn pdf_info(store: State<'_, Store>, document_id: String) -> Result<PdfInfo, String> {
    let store = store.inner().clone();
    tauri::async_runtime::spawn_blocking(move || store.info(&document_id))
        .await
        .map_err(|e| e.to_string())?
        .inspect_err(|_| log::warn!("Could not read PDF metadata"))
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
    .inspect_err(|_| log::warn!("Could not read PDF range"))
}

pub fn run() {
    tauri::Builder::default()
        .plugin(
            tauri_plugin_log::Builder::new()
                .level(log::LevelFilter::Info)
                .filter(|metadata| metadata.target() == module_path!())
                .max_file_size(1_000_000)
                .rotation_strategy(tauri_plugin_log::RotationStrategy::KeepSome(2))
                .build(),
        )
        .plugin(
            tauri_plugin_window_state::Builder::default()
                .with_state_flags(window_state_flags())
                .with_filter(|label| label == "main")
                .build(),
        )
        .plugin(tauri_plugin_dialog::init())
        .plugin(
            tauri_plugin_opener::Builder::new()
                .open_js_links_on_click(false)
                .build(),
        )
        .setup(|app| {
            app.manage(Arc::new(configuration::Configuration::new(
                app.path().config_dir()?.join("locus"),
            )));
            let directory = app.path().app_data_dir()?;
            std::fs::create_dir_all(&directory)?;
            let library = Library::open(&directory.join("library.sqlite"))
                .inspect_err(|_| log::error!("Could not open study library"))
                .map_err(std::io::Error::other)?;
            app.manage(Arc::new(library));
            log::info!("Locus {} initialized", app.package_info().version);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            load_configuration,
            read_themes,
            save_configuration,
            import_theme,
            open_configuration_directory,
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
