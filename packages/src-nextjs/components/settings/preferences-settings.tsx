"use client";

import { AppearanceSettings } from "@/components/settings/appearance-settings";
import { CanvasSettings } from "@/components/settings/canvas-settings";
import { KeyboardShortcutsSettings } from "@/components/settings/keyboard-shortcuts-settings";
import { Button } from "@/components/ui/button";
import { useWorkbench } from "@/components/workbench/workbench-context";

export type PreferenceSection = "appearance" | "keybindings" | "canvas";
export function PreferencesSettings({ section }: { section: PreferenceSection }) {
  const { preferenceError, resetPreferences } = useWorkbench();
  return (
    <>
      {preferenceError && (
        <div
          role="alert"
          className="flex flex-wrap items-center gap-3 p-6 text-xs text-destructive"
        >
          <p>{preferenceError}</p>
          <Button variant="outline" size="sm" onClick={resetPreferences}>
            Reset workspace preferences
          </Button>
        </div>
      )}
      {section === "appearance" ? (
        <AppearanceSettings />
      ) : section === "keybindings" ? (
        <KeyboardShortcutsSettings />
      ) : (
        <CanvasSettings />
      )}
    </>
  );
}
