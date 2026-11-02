"use client";

import { MonitorIcon, MoonIcon, SunIcon } from "lucide-react";
import { useTheme } from "next-themes";
import { AboutDialog } from "@/components/about-dialog";
import { AppVersion } from "@/components/app-version";
import { Button } from "@/components/ui/button";

const themes = [
  { value: "system", label: "System", icon: MonitorIcon },
  { value: "light", label: "Light", icon: SunIcon },
  { value: "dark", label: "Dark", icon: MoonIcon },
] as const;

export function AppearanceSettings() {
  const { theme, setTheme } = useTheme();

  return (
    <section
      aria-labelledby="appearance-heading"
      className="w-full max-w-3xl space-y-8 p-6 sm:p-10"
    >
      <div>
        <h1 id="appearance-heading" className="text-lg font-medium tracking-tight">
          Appearance
        </h1>
        <p className="mt-2 text-xs text-muted-foreground">
          Make this workspace comfortable for you.
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-5 border-b pb-6">
        <div>
          <h2 id="theme-heading" className="text-sm font-medium">
            Color theme
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Follow your system or choose a light or dark workspace.
          </p>
        </div>
        <fieldset aria-labelledby="theme-heading" className="flex gap-1">
          {themes.map(({ value, label, icon: Icon }) => (
            <Button
              key={value}
              variant={theme === value ? "secondary" : "outline"}
              aria-pressed={theme === value}
              onClick={() => setTheme(value)}
            >
              <Icon aria-hidden="true" />
              {label}
            </Button>
          ))}
        </fieldset>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-4 text-xs text-muted-foreground">
        <AppVersion />
        <AboutDialog />
      </div>
    </section>
  );
}
