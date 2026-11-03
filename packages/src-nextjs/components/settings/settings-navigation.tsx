"use client";

import { NavigationAction } from "@/components/layout/navigation-action";
import { useSettingsCatalog } from "@/components/settings/settings-context";
import { type PreferenceSection, SETTINGS_SECTIONS, settingsInScope } from "@/lib/settings";
import { cn } from "@/lib/utils";

export function SettingsNavigation({
  section,
  query,
  onSelect,
}: {
  section: PreferenceSection;
  query: string;
  onSelect: (section: PreferenceSection) => void;
}) {
  const definitions = useSettingsCatalog();
  function item(id: PreferenceSection, title: string, nested = false) {
    const count = settingsInScope(definitions, id, query).length;
    return (
      <NavigationAction
        key={id}
        aria-current={section === id ? "page" : undefined}
        className={cn(
          "h-8 gap-2 font-normal",
          nested && "pl-6",
          section === id && "bg-sidebar-accent",
        )}
        onClick={() => onSelect(id)}
      >
        <span className="truncate">{title}</span>
        {query.trim() && (
          <span className="ml-auto text-[10px] tabular-nums text-muted-foreground">{count}</span>
        )}
      </NavigationAction>
    );
  }
  return (
    <nav aria-label="Settings categories" className="px-2">
      {item("common", "Commonly Used")}
      {item("all", "All Settings")}
      {(["Workbench", "Application"] as const).map((group) => (
        <div key={group} className="mt-5">
          <h3 className="px-3 pb-1 text-[11px] font-medium text-muted-foreground">{group}</h3>
          {SETTINGS_SECTIONS.filter((section) => section.group === group).map((section) =>
            item(section.id, section.title, true),
          )}
        </div>
      ))}
    </nav>
  );
}
