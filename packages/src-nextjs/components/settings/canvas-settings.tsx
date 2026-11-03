"use client";

import { SettingRow } from "@/components/settings/setting-row";
import { useWorkbench } from "@/components/workbench/workbench-context";
import { bindingFor } from "@/lib/workbench";

export function CanvasSettings() {
  const { preferences, updatePreferences, preferencesReady, preferencesWritable, mac } =
    useWorkbench();
  const shortcut =
    bindingFor("drawing.controls", preferences).replace("Mod", mac ? "Command" : "Ctrl") ||
    "the command palette";
  return (
    <SettingRow id="canvas.controls">
      <label className="inline-flex items-center gap-2">
        <input
          type="checkbox"
          aria-labelledby="canvas.controls-label"
          aria-describedby="canvas.controls-description"
          disabled={!preferencesReady || !preferencesWritable}
          checked={preferences.whiteboardControlsVisible}
          onChange={(event) =>
            void updatePreferences({
              ...preferences,
              whiteboardControlsVisible: event.target.checked,
            })
          }
        />
        <span>Show the drawing interface</span>
      </label>
      <p className="mt-2 text-muted-foreground">
        Toggle with {shortcut} while a whiteboard is active.
      </p>
    </SettingRow>
  );
}
