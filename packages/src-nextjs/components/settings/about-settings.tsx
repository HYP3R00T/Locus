"use client";

import { AppVersion } from "@/components/app-version";
import { SettingRow } from "@/components/settings/setting-row";

export function AboutSettings() {
  return (
    <SettingRow id="about.application">
      <dl className="space-y-3">
        <div className="flex gap-6">
          <dt className="w-24 text-muted-foreground">Application</dt>
          <dd>
            <AppVersion />
          </dd>
        </div>
        <div className="flex gap-6">
          <dt className="w-24 text-muted-foreground">Developer</dt>
          <dd>Rajesh Das</dd>
        </div>
        <div className="flex gap-6">
          <dt className="w-24 text-muted-foreground">License</dt>
          <dd>MIT</dd>
        </div>
      </dl>
    </SettingRow>
  );
}
