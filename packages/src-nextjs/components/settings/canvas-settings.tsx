"use client";

import { SettingRow } from "@/components/settings/setting-row";
import { Checkbox } from "@/components/ui/checkbox";
import { useWorkbench } from "@/components/workbench/workbench-context";
import { bindingFor } from "@/lib/workbench";

export function CanvasSettings() {
  const { preferences, updatePreferences, preferencesReady, preferencesWritable, mac } =
    useWorkbench();
  const shortcut = bindingFor("drawing.controls", preferences).replace(
    "Mod",
    mac ? "Command" : "Ctrl",
  );
  return (
    <SettingRow id="canvas.controls">
      <label htmlFor="canvas-controls-toggle" className="inline-flex items-center gap-2">
        <Checkbox
          id="canvas-controls-toggle"
          aria-labelledby="canvas.controls-label"
          aria-describedby="canvas.controls-description"
          disabled={!preferencesReady || !preferencesWritable}
          checked={preferences.whiteboardControlsVisible}
          onCheckedChange={(checked) =>
            void updatePreferences({
              ...preferences,
              whiteboardControlsVisible: checked,
            })
          }
        />
        <span>Show the drawing interface</span>
      </label>
      <p className="mt-2 text-muted-foreground">
        {shortcut ? (
          <>
            Shortcut: <kbd>{shortcut}</kbd> while a whiteboard is active.
          </>
        ) : (
          "No shortcut assigned. Use the command palette or assign one in Key Bindings."
        )}
      </p>
    </SettingRow>
  );
}
