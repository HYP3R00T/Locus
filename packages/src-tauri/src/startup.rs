use std::time::Instant;
use tauri::State;

pub(crate) struct StartupClock {
    started: Instant,
}
impl StartupClock {
    pub(crate) fn new() -> Self {
        Self {
            started: Instant::now(),
        }
    }
    pub(crate) fn elapsed_ms(&self) -> u128 {
        self.started.elapsed().as_millis()
    }
}
#[derive(serde::Deserialize, Debug)]
#[serde(rename_all = "snake_case")]
enum StartupPhase {
    FrontendMounted,
    NavigationResponseStarted,
    NavigationResponseCompleted,
    NavigationDomInteractive,
    ConfigurationReady,
    ConfigurationApplied,
    LibraryReady,
    PdfModulesStarted,
    PdfEngineReady,
    PdfViewerReady,
    PdfMetadataReady,
    PdfDocumentReady,
    PdfRestoredPageReady,
    PdfFirstPaint,
    PdfViewerInitialized,
    WhiteboardModuleStarted,
    WhiteboardModuleReady,
    WhiteboardSceneLoaded,
    WhiteboardFirstPaint,
    PaneReady,
    ContentReady,
    RevealComplete,
    LoadingSlow,
    Bypassed,
}
#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct StartupTiming {
    boot_id: String,
    phase: StartupPhase,
    webview_ms: f64,
    pane_slot: Option<u8>,
}
impl StartupTiming {
    fn validate(&self) -> Result<(), String> {
        if uuid::Uuid::parse_str(&self.boot_id).is_err()
            || !self.webview_ms.is_finite()
            || !(0.0..=86_400_000.0).contains(&self.webview_ms)
            || self.pane_slot.is_some_and(|slot| slot > 3)
        {
            return Err("Invalid startup timing.".into());
        }
        Ok(())
    }
}
#[tauri::command]
pub(crate) fn startup_mark(
    clock: State<'_, StartupClock>,
    timing: StartupTiming,
) -> Result<(), String> {
    timing.validate()?;
    log::info!(target: env!("CARGO_CRATE_NAME"),
        "startup boot={} phase={:?} webview_ms={:.1} native_ms={} pane_slot={:?}",
        timing.boot_id, timing.phase, timing.webview_ms, clock.elapsed_ms(), timing.pane_slot);
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn accepts_only_bounded_metrics_and_known_phases() {
        let mut timing = StartupTiming {
            boot_id: uuid::Uuid::new_v4().to_string(),
            phase: StartupPhase::ContentReady,
            webview_ms: 1234.5,
            pane_slot: Some(3),
        };
        assert!(timing.validate().is_ok());
        for value in [f64::NAN, f64::INFINITY, -1.0, 86_400_001.0] {
            timing.webview_ms = value;
            assert!(timing.validate().is_err());
        }
        timing.webview_ms = 1.0;
        timing.pane_slot = Some(4);
        assert!(timing.validate().is_err());
        timing.pane_slot = None;
        timing.boot_id = "invalid".into();
        assert!(timing.validate().is_err());
        assert!(
            serde_json::from_value::<StartupTiming>(serde_json::json!({
                "bootId": uuid::Uuid::new_v4().to_string(), "phase":"document_content",
                "webviewMs":1, "paneSlot":null
            }))
            .is_err()
        );
    }
}
