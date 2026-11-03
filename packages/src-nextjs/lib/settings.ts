export const SETTINGS_SECTIONS = [
  { id: "appearance", title: "Appearance", group: "Workbench" },
  { id: "keybindings", title: "Key Bindings", group: "Workbench" },
  { id: "canvas", title: "Canvas", group: "Workbench" },
  { id: "configuration", title: "Configuration", group: "Application" },
  { id: "about", title: "About", group: "Application" },
] as const;
export type SettingsCategory = (typeof SETTINGS_SECTIONS)[number]["id"];
export type PreferenceSection = SettingsCategory | "all" | "common";
export type SettingDefinition = {
  id: string;
  section: SettingsCategory;
  title: string;
  description: string;
  keywords?: string[];
  common?: boolean;
  modified?: boolean;
};
export function settingsCatalog(input: {
  themeNames: string[];
  theme: string;
  controlsVisible: boolean;
  directory: string | null;
  shortcuts: { id: string; title: string; scope: string; binding: string; modified: boolean }[];
}): SettingDefinition[] {
  return [
    {
      id: "appearance.theme",
      section: "appearance",
      title: "Color Theme",
      description:
        "Choose the interface colors. Follow system uses your preferred light and dark themes.",
      keywords: ["palette", "system", "color", ...input.themeNames],
      common: true,
      modified: input.theme !== "system",
    },
    {
      id: "appearance.import",
      section: "appearance",
      title: "Custom Themes",
      description:
        "Import a Locus theme JSON file. Use Configuration to manage and reload theme files.",
      keywords: ["import", "json", "palette"],
    },
    {
      id: "canvas.controls",
      section: "canvas",
      title: "Show Canvas Controls",
      description: "Show drawing tools, properties, menus, zoom, and undo/redo on whiteboards.",
      keywords: ["whiteboard", "Excalidraw", "drawing", "pen", "interface"],
      common: true,
      modified: !input.controlsVisible,
    },
    {
      id: "configuration.folder",
      section: "configuration",
      title: "Configuration Folder",
      description: "Open the folder containing your preferences, key bindings, and themes.",
      keywords: ["directory", "path", ".config", input.directory ?? ""],
    },
    {
      id: "configuration.reload",
      section: "configuration",
      title: "Reload Configuration",
      description:
        "Apply settings and theme files edited outside Locus. Invalid files are preserved.",
      keywords: ["refresh", "repair", "files"],
    },
    {
      id: "configuration.files",
      section: "configuration",
      title: "Settings Files",
      description: "Preferences, shortcuts, and palettes are stored separately.",
      keywords: ["preferences.json", "keybindings.json", "themes", "json"],
    },
    {
      id: "about.application",
      section: "about",
      title: "Application Information",
      description: "A local workspace for reading, writing, and research.",
      keywords: ["Locus", "version", "license", "MIT", "developer", "Rajesh Das"],
    },
    ...input.shortcuts.map(
      (command): SettingDefinition => ({
        id: `shortcut.${command.id}`,
        section: "keybindings",
        title: command.title,
        description:
          command.scope === "global"
            ? "Application-wide shortcut."
            : `Shortcut for the active ${command.scope === "drawing" ? "whiteboard" : "PDF"} pane.`,
        keywords: [
          "keyboard",
          "shortcut",
          "key binding",
          command.binding,
          command.id,
          command.scope,
        ],
        modified: command.modified,
      }),
    ),
  ];
}
export function settingMatches(setting: SettingDefinition, query: string) {
  const terms = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  if (terms.includes("@modified") && !setting.modified) return false;
  const section = SETTINGS_SECTIONS.find((section) => section.id === setting.section);
  const text = [
    setting.id,
    setting.title,
    setting.description,
    section?.title,
    section?.group,
    ...(setting.keywords ?? []),
  ]
    .join(" ")
    .toLowerCase();
  return terms.filter((term) => term !== "@modified").every((term) => text.includes(term));
}
export function settingsInScope(
  settings: SettingDefinition[],
  scope: PreferenceSection,
  query: string,
) {
  return settings.filter(
    (setting) =>
      (scope === "all" || (scope === "common" ? setting.common : setting.section === scope)) &&
      settingMatches(setting, query),
  );
}
