"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { useConfiguration } from "@/components/configuration-provider";
import { SettingRow } from "@/components/settings/setting-row";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { useWorkbench } from "@/components/workbench/workbench-context";
import { STROKE_COLORS, STROKE_WIDTHS } from "@/lib/whiteboard-defaults";
import { bindingFor } from "@/lib/workbench";

export function CanvasSettings() {
  const { preferences, updatePreferences, preferencesReady, preferencesWritable, mac } =
    useWorkbench();
  const { appearance, updateAppearance, writable } = useConfiguration();
  const { resolvedTheme } = useTheme();
  const [color, setColor] = useState(appearance.whiteboardStrokeColor);
  useEffect(() => setColor(appearance.whiteboardStrokeColor), [appearance.whiteboardStrokeColor]);
  const validColor = /^#[0-9a-f]{6}$/i.test(color);
  function saveColor() {
    if (validColor && color.toLowerCase() !== appearance.whiteboardStrokeColor.toLowerCase())
      void updateAppearance({ whiteboardStrokeColor: color.toLowerCase() });
  }
  const shortcut = bindingFor("drawing.controls", preferences).replace(
    "Mod",
    mac ? "Command" : "Ctrl",
  );
  return (
    <>
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
      <SettingRow id="canvas.strokeColor">
        <fieldset
          aria-labelledby="canvas.strokeColor-label"
          className="m-0 flex min-w-0 max-w-sm flex-wrap gap-1.5 border-0 p-0"
        >
          {STROKE_COLORS.map((group) => (
            <div key={group.name} className="flex flex-col gap-1.5">
              {group.colors.map((value) => (
                <Button
                  key={value}
                  variant="outline"
                  size="icon-xs"
                  disabled={!writable}
                  aria-label={`${group.name} ${value}`}
                  aria-pressed={appearance.whiteboardStrokeColor.toLowerCase() === value}
                  className="p-0.5 aria-pressed:ring-2 aria-pressed:ring-ring aria-pressed:ring-offset-1 aria-pressed:ring-offset-background"
                  onClick={() => void updateAppearance({ whiteboardStrokeColor: value })}
                >
                  <span
                    className="size-full border border-border"
                    style={{
                      backgroundColor: value,
                      filter:
                        resolvedTheme === "dark" ? "invert(93%) hue-rotate(180deg)" : undefined,
                    }}
                  />
                </Button>
              ))}
            </div>
          ))}
        </fieldset>
        <div className="mt-3 flex items-center gap-2">
          <label htmlFor="default-pen-color">Hex color</label>
          <Input
            id="default-pen-color"
            className="w-28 font-mono"
            value={color}
            disabled={!writable}
            aria-invalid={!validColor}
            aria-describedby="canvas.strokeColor-description"
            maxLength={7}
            spellCheck={false}
            onChange={(event) => setColor(event.target.value)}
            onBlur={saveColor}
            onKeyDown={(event) => {
              if (event.key === "Enter") saveColor();
              if (event.key === "Escape") setColor(appearance.whiteboardStrokeColor);
            }}
          />
          {!validColor && <span role="status">Use #RRGGBB.</span>}
        </div>
      </SettingRow>
      <SettingRow id="canvas.strokeWidth">
        <fieldset
          aria-labelledby="canvas.strokeWidth-label"
          className="m-0 flex min-w-0 flex-wrap gap-2 border-0 p-0"
        >
          {STROKE_WIDTHS.map(({ value, label }) => (
            <Button
              key={value}
              variant="outline"
              disabled={!writable}
              aria-pressed={appearance.whiteboardStrokeWidth === value}
              className="aria-pressed:bg-accent aria-pressed:text-accent-foreground aria-pressed:ring-1 aria-pressed:ring-ring"
              onClick={() => void updateAppearance({ whiteboardStrokeWidth: value })}
            >
              <svg aria-hidden="true" width="20" height="16" viewBox="0 0 20 16">
                <path d="M2 8h16" stroke="currentColor" strokeWidth={value} strokeLinecap="round" />
              </svg>
              {label}
            </Button>
          ))}
        </fieldset>
      </SettingRow>
    </>
  );
}
