"use client";

import { FolderOpenIcon, RefreshCwIcon } from "lucide-react";
import { useConfiguration } from "@/components/configuration-provider";
import { SettingRow } from "@/components/settings/setting-row";
import { Button } from "@/components/ui/button";

export function ConfigurationSettings() {
  const { directory, native, reload, openDirectory } = useConfiguration();
  return (
    <>
      <SettingRow id="configuration.folder">
        {directory ? (
          <p className="mb-3 break-all font-mono">{directory}</p>
        ) : (
          <p className="mb-3 text-muted-foreground">
            {native
              ? "Open the folder to repair your configuration files."
              : "Available in the desktop app."}
          </p>
        )}
        <Button variant="outline" disabled={!native} onClick={() => void openDirectory()}>
          <FolderOpenIcon />
          Open config folder
        </Button>
      </SettingRow>
      <SettingRow id="configuration.reload">
        <Button variant="outline" onClick={() => void reload()}>
          <RefreshCwIcon />
          Reload configuration
        </Button>
      </SettingRow>
      <SettingRow id="configuration.files">
        <dl className="space-y-2">
          {[
            ["preferences.json", "Appearance and canvas preferences"],
            ["keybindings.json", "Custom keyboard shortcuts"],
            ["themes/", "Light and dark palettes"],
          ].map(([file, description]) => (
            <div key={file} className="flex flex-wrap gap-x-6 gap-y-1">
              <dt className="w-36 font-mono">{file}</dt>
              <dd className="text-muted-foreground">{description}</dd>
            </div>
          ))}
        </dl>
      </SettingRow>
    </>
  );
}
