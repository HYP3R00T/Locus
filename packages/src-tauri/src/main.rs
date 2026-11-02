// Hide the console window in Windows release builds.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    // Avoid WebKitGTK's DMA-BUF path: it produced scroll-position-dependent blur
    // in both HTML and PDF canvases. Accelerated compositing remains enabled.
    #[cfg(target_os = "linux")]
    if std::env::var_os("WEBKIT_DISABLE_DMABUF_RENDERER").is_none() {
        // SAFETY: This runs before Tauri/GTK initialization or any application threads.
        unsafe { std::env::set_var("WEBKIT_DISABLE_DMABUF_RENDERER", "1") };
    }
    locus_lib::run();
}
