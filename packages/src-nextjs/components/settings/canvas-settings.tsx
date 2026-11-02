"use client";

import { useWorkbench } from "@/components/workbench/workbench-context";
import { bindingFor } from "@/lib/workbench";

export function CanvasSettings() {
  const { preferences, updatePreferences, preferencesReady, preferencesWritable, mac } =
    useWorkbench();
  const shortcut =
    bindingFor("drawing.controls", preferences).replace("Mod", mac ? "Command" : "Ctrl") ||
    "the command palette";
  return (
    <section
      aria-labelledby="canvas-settings-heading"
      className="w-full max-w-3xl space-y-8 p-6 sm:p-10"
    >
      <div>
        <h1 id="canvas-settings-heading" className="text-lg font-medium tracking-tight">
          Canvas
        </h1>
        <p className="mt-2 text-xs text-muted-foreground">
          Choose how much of the whiteboard interface stays visible.
        </p>
      </div>
      <label className="flex items-start gap-3 text-sm">
        <input
          type="checkbox"
          className="mt-1"
          disabled={!preferencesReady || !preferencesWritable}
          checked={preferences.whiteboardControlsVisible}
          onChange={(event) =>
            updatePreferences({ ...preferences, whiteboardControlsVisible: event.target.checked })
          }
        />
        <span>
          Show canvas controls
          <span className="mt-1 block text-xs text-muted-foreground">
            Includes tools, drawing properties, menus, zoom, undo, and status. Toggle everything
            with {shortcut} while a whiteboard is active, or change the shortcut in Key Bindings.
          </span>
        </span>
      </label>
    </section>
  );
}
