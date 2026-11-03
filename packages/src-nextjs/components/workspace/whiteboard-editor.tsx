"use client";

import { DefaultSidebar, Excalidraw, MainMenu, serializeAsJSON } from "@excalidraw/excalidraw";
import type { ExcalidrawImperativeAPI, ExcalidrawProps } from "@excalidraw/excalidraw/types";
import { useTheme } from "next-themes";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useWorkbench } from "@/components/workbench/workbench-context";
import { readDrawing, registerDrawingWriter, saveDrawing } from "@/lib/drawings";
import type { Drawing } from "@/lib/library";
import { useNotice } from "@/lib/notifications";

export function WhiteboardEditor({
  drawing,
  onError,
  paneId,
}: {
  drawing: Drawing;
  onError: (message: string) => void;
  paneId: string;
}) {
  const { preferences } = useWorkbench();
  const { resolvedTheme } = useTheme();
  const [status, setStatus] = useState("Opening…");
  const [ready, setReady] = useState(false);
  const [initialData, setInitialData] = useState<ExcalidrawProps["initialData"]>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const latest = useRef<Parameters<NonNullable<ExcalidrawProps["onChange"]>> | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const loaded = useRef(false);
  const lastScene = useRef<string | null>(null);
  const alive = useRef(true);
  const pending = useRef(Promise.resolve());
  const editor = useRef<ExcalidrawImperativeAPI | null>(null);
  const report = useRef(onError);
  report.current = onError;
  useEffect(() => {
    let cancelled = false;
    loaded.current = false;
    latest.current = null;
    setReady(false);
    setLoadError(null);
    setStatus(loadAttempt ? "Retrying…" : "Opening…");
    void readDrawing(drawing.id)
      .then((scene) => {
        if (cancelled) return;
        const initial = JSON.parse(scene);
        if (initial?.type !== "excalidraw" || !Array.isArray(initial.elements))
          throw new Error("Invalid Excalidraw scene.");
        lastScene.current = scene;
        setInitialData(initial);
        loaded.current = true;
        setReady(true);
      })
      .catch((error) => {
        if (cancelled) return;
        setStatus("Could not open whiteboard");
        setLoadError(String(error));
      });
    return () => {
      cancelled = true;
    };
  }, [drawing.id, loadAttempt]);
  useEffect(() => {
    if (!ready || preferences.whiteboardControlsVisible) return;
    editor.current?.updateScene({
      appState: { openMenu: null, openDialog: null, openSidebar: null },
    });
  }, [ready, preferences.whiteboardControlsVisible]);
  function flush(): Promise<void> {
    if (!loaded.current || !latest.current) return pending.current;
    const [elements, appState, files] = latest.current;
    const scene = serializeAsJSON(elements, appState, files, "local");
    if (scene === lastScene.current) {
      if (alive.current) setStatus("Saved");
      return pending.current;
    }
    lastScene.current = scene;
    pending.current = saveDrawing(drawing.id, scene)
      .then(() => {
        if (alive.current) setStatus("Saved");
      })
      .catch((error) => {
        lastScene.current = null;
        if (alive.current) setStatus("Save failed — edits kept in memory");
        report.current(`Could not save ${drawing.title}: ${String(error)}`);
        throw error;
      });
    return pending.current;
  }
  const flushRef = useRef(flush);
  flushRef.current = flush;
  useEffect(() => {
    alive.current = true;
    const unregister = registerDrawingWriter(() => flushRef.current());
    return () => {
      alive.current = false;
      clearTimeout(timer.current);
      void flushRef.current().catch(() => {});
      unregister();
    };
  }, []);
  useNotice(loadError, "Could not open the whiteboard");
  return (
    <div
      data-whiteboard-id={paneId}
      data-controls-visible={preferences.whiteboardControlsVisible}
      className="locus-whiteboard relative h-full min-h-0 min-w-0 overflow-hidden"
    >
      {loadError && (
        <div
          role="alert"
          className="flex h-full flex-col items-center justify-center gap-3 p-4 text-xs"
        >
          <p>This whiteboard is unavailable. Retry to load it again.</p>
          <Button variant="outline" onClick={() => setLoadAttempt((value) => value + 1)}>
            Retry whiteboard
          </Button>
        </div>
      )}
      {ready && (
        <Excalidraw
          excalidrawAPI={(api) => {
            editor.current = api;
          }}
          initialData={initialData}
          name={drawing.title}
          theme={resolvedTheme === "dark" ? "dark" : "light"}
          handleKeyboardGlobally={false}
          autoFocus={false}
          zenModeEnabled={false}
          onChange={(...scene) => {
            if (!loaded.current || scene[1].isLoading) return;
            latest.current = scene;
            setStatus("Saving…");
            clearTimeout(timer.current);
            timer.current = setTimeout(() => {
              void flushRef.current().catch(() => {});
            }, 400);
          }}
          UIOptions={{
            canvasActions: { loadScene: false, saveToActiveFile: false, toggleTheme: false },
          }}
        >
          <DefaultSidebar.Trigger style={{ display: "none" }} />
          <DefaultSidebar className="locus-disabled-library" />
          <MainMenu>
            <MainMenu.DefaultItems.Export />
            <MainMenu.DefaultItems.SaveAsImage />
            <MainMenu.DefaultItems.ClearCanvas />
            <MainMenu.DefaultItems.ChangeCanvasBackground />
          </MainMenu>
        </Excalidraw>
      )}
      {(preferences.whiteboardControlsVisible || !ready) && (
        <span
          role="status"
          className="pointer-events-none absolute right-3 bottom-3 text-[10px] text-muted-foreground"
        >
          {status}
        </span>
      )}
    </div>
  );
}
