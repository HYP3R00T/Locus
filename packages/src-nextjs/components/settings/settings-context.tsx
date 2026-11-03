"use client";

import { createContext, useContext } from "react";
import { useConfiguration } from "@/components/configuration-provider";
import { useWorkbench } from "@/components/workbench/workbench-context";
import { type PreferenceSection, type SettingDefinition, settingsCatalog } from "@/lib/settings";
import { bindingFor, COMMANDS, platformBinding } from "@/lib/workbench";

export function useSettingsCatalog() {
  const { appearance, themes, directory } = useConfiguration();
  const { preferences, mac } = useWorkbench();
  return settingsCatalog({
    themeNames: themes.map((theme) => theme.name),
    theme: appearance.theme,
    controlsVisible: preferences.whiteboardControlsVisibleByDefault,
    strokeColor: appearance.whiteboardStrokeColor,
    strokeWidth: appearance.whiteboardStrokeWidth,
    directory,
    primaryColumn: appearance.primaryColumn,
    primaryRow: appearance.primaryRow,
    notificationDuration: appearance.notificationDuration,
    shortcuts: COMMANDS.map((command) => ({
      ...command,
      binding: bindingFor(command.id, preferences).replace("Mod", mac ? "Command" : "Ctrl"),
      modified:
        platformBinding(bindingFor(command.id, preferences), mac) !==
        platformBinding(command.binding, mac),
    })),
  });
}
export const SettingsViewContext = createContext<{
  section: PreferenceSection;
  query: string;
  definitions: SettingDefinition[];
  visible: Set<string>;
} | null>(null);
export function useSettingsView() {
  const value = useContext(SettingsViewContext);
  if (!value) throw new Error("SettingsViewContext is missing.");
  return value;
}
