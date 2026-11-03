"use client";

import { ListFilterIcon, SearchIcon, XIcon } from "lucide-react";
import { useConfiguration } from "@/components/configuration-provider";
import { AboutSettings } from "@/components/settings/about-settings";
import { AppearanceSettings } from "@/components/settings/appearance-settings";
import { CanvasSettings } from "@/components/settings/canvas-settings";
import { ConfigurationSettings } from "@/components/settings/configuration-settings";
import { KeyboardShortcutsSettings } from "@/components/settings/keyboard-shortcuts-settings";
import { SettingsViewContext, useSettingsCatalog } from "@/components/settings/settings-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useWorkbench } from "@/components/workbench/workbench-context";
import { type PreferenceSection, SETTINGS_SECTIONS, settingsInScope } from "@/lib/settings";

export type { PreferenceSection } from "@/lib/settings";

const panels = {
  appearance: AppearanceSettings,
  keybindings: KeyboardShortcutsSettings,
  canvas: CanvasSettings,
  configuration: ConfigurationSettings,
  about: AboutSettings,
};
export function PreferencesSettings({
  section,
  query,
  onQueryChange,
  onSectionChange,
}: {
  section: PreferenceSection;
  query: string;
  onQueryChange: (value: string) => void;
  onSectionChange: (section: PreferenceSection) => void;
}) {
  const { preferenceError } = useWorkbench();
  const { reload } = useConfiguration();
  const definitions = useSettingsCatalog();
  const matching = settingsInScope(definitions, section, query);
  const visible = new Set(matching.map((setting) => setting.id));
  const modifiedOnly = query.toLowerCase().split(/\s+/).includes("@modified");
  const title =
    section === "common"
      ? "Commonly Used"
      : section === "all"
        ? query.trim()
          ? "Search Results"
          : "All Settings"
        : SETTINGS_SECTIONS.find((item) => item.id === section)?.title;
  function search(value: string) {
    if (section !== "keybindings" && !query.trim() && value.trim()) onSectionChange("all");
    onQueryChange(value);
  }
  return (
    <SettingsViewContext.Provider value={{ definitions, visible, section, query }}>
      <section aria-label="Settings editor" className="flex h-full min-h-0 flex-col">
        <header className="shrink-0 border-b px-6 py-4 sm:px-10">
          <div className="flex items-center gap-2">
            <div className="relative min-w-0 flex-1">
              <SearchIcon
                aria-hidden="true"
                className="pointer-events-none absolute top-2 left-2 size-4 text-muted-foreground"
              />
              <Input
                aria-label={section === "keybindings" ? "Search shortcuts" : "Search settings"}
                placeholder={
                  section === "keybindings" ? "Search commands or shortcuts" : "Search settings"
                }
                className="bg-muted/40 pr-8 pl-8"
                value={query}
                onChange={(event) => search(event.target.value)}
              />
              {query && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="absolute top-0.5 right-0.5"
                  aria-label="Clear settings search"
                  onClick={() => onQueryChange("")}
                >
                  <XIcon />
                </Button>
              )}
            </div>
            <Button
              variant={modifiedOnly ? "secondary" : "ghost"}
              aria-pressed={modifiedOnly}
              onClick={() =>
                search(
                  modifiedOnly
                    ? query
                        .split(/\s+/)
                        .filter((term) => term.toLowerCase() !== "@modified")
                        .join(" ")
                    : `${query} @modified`.trim(),
                )
              }
            >
              <ListFilterIcon />
              Modified
            </Button>
          </div>
          {query.trim() && (
            <p role="status" className="mt-2 text-[11px] text-muted-foreground">
              {matching.length} matching{" "}
              {section === "keybindings"
                ? matching.length === 1
                  ? "shortcut"
                  : "shortcuts"
                : matching.length === 1
                  ? "setting"
                  : "settings"}
            </p>
          )}
        </header>
        <div
          key={section}
          className="locus-settings-scroll min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-6 py-5 sm:px-10"
        >
          <div className={section === "keybindings" ? "w-full" : "max-w-4xl"}>
            <h1 className="mb-4 text-lg font-medium tracking-tight">{title}</h1>
            {preferenceError && (
              <div role="alert" className="mb-5 space-y-2 text-xs text-destructive">
                <p>{preferenceError}</p>
                <Button variant="outline" size="sm" onClick={() => void reload()}>
                  Reload configuration
                </Button>
              </div>
            )}
            {!matching.length && (
              <p className="py-8 text-sm text-muted-foreground">
                No {section === "keybindings" ? "shortcuts" : "settings"} match this search. Try
                another term or clear the filter.
              </p>
            )}
            {SETTINGS_SECTIONS.map((category) => {
              if (!matching.some((setting) => setting.section === category.id)) return null;
              const Panel = panels[category.id];
              return (
                <section key={category.id} aria-label={category.title}>
                  {section === "all" && !query.trim() && (
                    <h2 className="mt-6 mb-2 text-sm font-medium text-muted-foreground">
                      {category.group} / {category.title}
                    </h2>
                  )}
                  <Panel />
                </section>
              );
            })}
          </div>
        </div>
      </section>
    </SettingsViewContext.Provider>
  );
}
