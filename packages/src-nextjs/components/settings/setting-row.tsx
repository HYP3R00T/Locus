"use client";

import type { ReactNode } from "react";
import { useSettingsView } from "@/components/settings/settings-context";

export function SettingRow({ id, children }: { id: string; children: ReactNode }) {
  const { definitions, visible } = useSettingsView();
  const setting = definitions.find((setting) => setting.id === id);
  if (!setting) throw new Error(`Unknown setting: ${id}`);
  if (!visible.has(id)) return null;
  return (
    <section
      aria-labelledby={`${id}-label`}
      data-setting={id}
      className="my-2 w-full px-3 py-4 focus-within:bg-muted/25 hover:bg-muted/15"
    >
      <h3 id={`${id}-label`} className="text-sm font-medium">
        {setting.title}
        {setting.modified && <span className="sr-only"> (modified)</span>}
      </h3>
      <p id={`${id}-description`} className="mt-1 text-xs leading-5 text-muted-foreground">
        {setting.description}
      </p>
      <div className="mt-2 text-xs">{children}</div>
    </section>
  );
}
