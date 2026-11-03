import { invoke, isTauri } from "@tauri-apps/api/core";

export { BUILTIN_THEMES, type Theme } from "@/lib/themes";

import type { Theme } from "@/lib/themes";
import { COMMANDS, type Preferences, parsePreferences, type ShortcutSort } from "@/lib/workbench";
export type Appearance = {
  version: 1;
  theme: string;
  lightTheme: string;
  darkTheme: string;
  whiteboardControlsVisible: boolean;
  primaryColumn: "left" | "right";
  primaryRow: "top" | "bottom";
  notificationDuration: number;
  shortcutSort: { column: ShortcutSort; direction: "asc" | "desc" };
};
export type Keybindings = { version: 1; bindings: Preferences["keybindings"] };
export type Configuration = {
  directory: string | null;
  preferences: Appearance;
  keybindings: Keybindings;
  themes: Theme[];
  warnings: string[];
};
export const DEFAULT_APPEARANCE: Appearance = {
  version: 1,
  theme: "system",
  lightTheme: "default-light",
  darkTheme: "default-dark",
  whiteboardControlsVisible: true,
  primaryColumn: "left",
  primaryRow: "top",
  notificationDuration: 3000,
  shortcutSort: { column: "binding", direction: "asc" },
};
export function workbenchPreferences(config: Configuration, mac: boolean): Preferences {
  if (
    Object.keys(config.keybindings.bindings).some(
      (id) => !COMMANDS.some((command) => command.id === id),
    )
  )
    throw new Error(
      "Unknown command in keybindings.json. The file was preserved; correct it and reload.",
    );
  return parsePreferences(
    JSON.stringify({
      version: 2,
      whiteboardControlsVisible: config.preferences.whiteboardControlsVisible,
      keybindings: config.keybindings.bindings,
    }),
    mac,
  );
}
export const configuration = {
  native: isTauri,
  load: (
    legacy: Pick<Configuration, "preferences" | "keybindings"> | null,
    migrationError: string | null = null,
  ) => invoke<Configuration>("load_configuration", { legacy, migrationError }),
  themes: () => invoke<Pick<Configuration, "themes" | "warnings">>("read_themes"),
  save: (
    file: "preferences" | "keybindings",
    expected: Appearance | Keybindings,
    value: Appearance | Keybindings,
  ) => invoke<void>("save_configuration", { file, expected, value }),
  openDirectory: () => invoke<void>("open_configuration_directory"),
};
