"use client";

import { MonitorIcon, MoonIcon, SunIcon, UploadIcon } from "lucide-react";
import { useConfiguration } from "@/components/configuration-provider";
import { SettingRow } from "@/components/settings/setting-row";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function AppearanceSettings() {
  const { appearance, selectTheme, themes, writable, native, importTheme, warnings } =
    useConfiguration();
  const selected = themes.find((theme) => theme.id === appearance.theme);

  return (
    <>
      <SettingRow id="appearance.theme">
        <Select
          value={appearance.theme}
          disabled={!writable}
          onValueChange={(value) => {
            if (value) void selectTheme(value);
          }}
        >
          <SelectTrigger
            aria-labelledby="appearance.theme-label"
            aria-describedby="appearance.theme-description"
            className="w-80 max-w-full"
          >
            <SelectValue>
              {appearance.theme === "system"
                ? "Follow system"
                : (selected?.name ?? "Unavailable theme")}
            </SelectValue>
          </SelectTrigger>
          <SelectContent alignItemWithTrigger={false}>
            <SelectItem value="system">
              <MonitorIcon className="size-3.5" />
              Follow system
            </SelectItem>
            {(["light", "dark"] as const).map((mode) => (
              <SelectGroup key={mode}>
                <SelectSeparator />
                <SelectLabel>{mode === "light" ? "Light themes" : "Dark themes"}</SelectLabel>
                {themes
                  .filter((theme) => theme.mode === mode)
                  .map((theme) => (
                    <SelectItem key={theme.id} value={theme.id}>
                      {mode === "light" ? (
                        <SunIcon className="size-3.5" />
                      ) : (
                        <MoonIcon className="size-3.5" />
                      )}
                      {theme.name}
                    </SelectItem>
                  ))}
              </SelectGroup>
            ))}
          </SelectContent>
        </Select>
        <p className="mt-2 text-muted-foreground">
          The title-bar toggle switches between your preferred light and dark themes.
        </p>
      </SettingRow>
      <SettingRow id="appearance.import">
        <Button
          variant="outline"
          disabled={!native || !writable}
          onClick={() => void importTheme()}
        >
          <UploadIcon />
          Import theme
        </Button>
      </SettingRow>
      {warnings.length > 0 && (
        <div role="status" className="space-y-1 px-3 text-xs text-muted-foreground">
          {warnings.map((warning) => (
            <p key={warning}>{warning}</p>
          ))}
        </div>
      )}
    </>
  );
}
