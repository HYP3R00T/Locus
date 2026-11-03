import { invoke, isTauri } from "@tauri-apps/api/core";

export type StartupPhase =
  | "frontend_mounted"
  | "navigation_response_started"
  | "navigation_response_completed"
  | "navigation_dom_interactive"
  | "configuration_ready"
  | "configuration_applied"
  | "library_ready"
  | "pdf_modules_started"
  | "pdf_engine_ready"
  | "pdf_viewer_ready"
  | "pdf_metadata_ready"
  | "pdf_document_ready"
  | "pdf_restored_page_ready"
  | "pdf_first_paint"
  | "pdf_viewer_initialized"
  | "whiteboard_module_started"
  | "whiteboard_module_ready"
  | "whiteboard_scene_loaded"
  | "whiteboard_first_paint"
  | "pane_ready"
  | "content_ready"
  | "reveal_complete"
  | "loading_slow"
  | "bypassed";

type StartupState = { bootId?: string; complete: boolean; sent: Set<string> };
function documentState(): StartupState {
  if (typeof window === "undefined") return { complete: false, sent: new Set() };
  const host = window as Window & { __locusStartupTiming?: StartupState };
  host.__locusStartupTiming ??= { complete: false, sent: new Set() };
  return host.__locusStartupTiming;
}
// Preserve one trace per document across Fast Refresh, which does not reset the time origin.
const state = documentState();

export function markStartupNavigation() {
  if (typeof window === "undefined" || state.complete || !isTauri()) return;
  const navigation = performance.getEntriesByType("navigation")[0] as
    | PerformanceNavigationTiming
    | undefined;
  if (!navigation) return;
  for (const [phase, at] of [
    ["navigation_response_started", navigation.responseStart],
    ["navigation_response_completed", navigation.responseEnd],
    ["navigation_dom_interactive", navigation.domInteractive],
  ] as const) {
    if (at > 0) markStartup(phase, undefined, at);
  }
}

/** Local milestones only; never record study identifiers, paths, or content. */
export function markStartup(phase: StartupPhase, paneSlot?: number, at?: number) {
  if (typeof window === "undefined" || state.complete || !isTauri()) return;
  const key = `${phase}:${paneSlot ?? "app"}`;
  if (state.sent.has(key)) return;
  state.sent.add(key);
  state.bootId ??= crypto.randomUUID();
  void invoke("startup_mark", {
    timing: {
      bootId: state.bootId,
      phase,
      webviewMs: at ?? performance.now(),
      paneSlot: paneSlot ?? null,
    },
  }).catch(() => {}); // Diagnostic failure must never block opening the workspace.
  if (phase === "reveal_complete") state.complete = true;
}
