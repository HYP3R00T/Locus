"use client";

import type { ReactNode } from "react";
import { useSettingsView } from "@/components/settings/settings-context";
import { SETTINGS_SECTIONS } from "@/lib/settings";
import { cn } from "@/lib/utils";

export function SettingRow({ id, children }: { id: string; children: ReactNode }) {
  const { definitions, visible } = useSettingsView();
  const setting = definitions.find((setting) => setting.id === id);
  if (!setting) throw new Error(`Unknown setting: ${id}`);
  if (!visible.has(id)) return null;
  const section = SETTINGS_SECTIONS.find((section) => section.id === setting.section);
  return (
    <section
      aria-labelledby={`${id}-label`}
      data-setting={id}
      className={cn(
        "my-2 border-l-2 border-transparent px-3 py-4 focus-within:bg-muted/25 hover:bg-muted/15",
        setting.modified && "border-l-primary/70",
      )}
    >
      <h3 id={`${id}-label`} className="text-sm font-medium">
        <span className="text-muted-foreground">{section?.title}: </span>
        {setting.title}
        {setting.modified && <span className="sr-only"> (modified)</span>}
      </h3>
      <p
        id={`${id}-description`}
        className="mt-1 max-w-3xl text-xs leading-5 text-muted-foreground"
      >
        {setting.description}
      </p>
      <div className="mt-2 text-xs">{children}</div>
    </section>
  );
}
