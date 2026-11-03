export const SETTINGS_SECTIONS = [
  { id: "appearance", title: "Themes" },
  { id: "keybindings", title: "Key Bindings" },
  { id: "layout", title: "Layout" },
  { id: "canvas", title: "Whiteboard" },
  { id: "notifications", title: "Notifications" },
  { id: "configuration", title: "Configuration Files" },
  { id: "about", title: "About" },
] as const;
export type SettingsCategory = (typeof SETTINGS_SECTIONS)[number]["id"];
export type PreferenceSection = SettingsCategory;
export type SettingDefinition = {
  id: string;
  section: SettingsCategory;
  title: string;
  description: string;
  keywords?: string[];
  modified?: boolean;
};
export function settingsCatalog(input: {
  themeNames: string[];
  theme: string;
  controlsVisible: boolean;
  directory: string | null;
  primaryColumn?: "left" | "right";
  primaryRow?: "top" | "bottom";
  notificationDuration?: number;
  shortcuts: { id: string; title: string; scope: string; binding: string; modified: boolean }[];
}): SettingDefinition[] {
  return [
    {
      id: "layout.primaryColumn",
      section: "layout",
      title: "Primary Column",
      description:
        "Ctrl+click creates or replaces the other column. Plain clicks still replace the active pane. With two rows, the corresponding row is used.",
      keywords: ["split", "vertical", "left", "right"],
      modified: (input.primaryColumn ?? "left") !== "left",
    },
    {
      id: "layout.primaryRow",
      section: "layout",
      title: "Primary Row",
      description:
        "Ctrl+Shift+click creates or replaces the other row in the active column. Empty active panes are filled before splitting.",
      keywords: ["split", "horizontal", "top", "bottom"],
      modified: (input.primaryRow ?? "top") !== "top",
    },
    {
      id: "notifications.duration",
      section: "notifications",
      title: "Notification Duration",
      description:
        "Dismiss warnings and informational messages after this interval. Errors always stay until you dismiss them. Hover or focus pauses the timer.",
      keywords: ["toast", "error", "warning", "timeout"],
      modified: (input.notificationDuration ?? 3000) !== 3000,
    },
    {
      id: "appearance.theme",
      section: "appearance",
      title: "Color Theme",
      description:
        "Choose the interface colors. Follow system uses your preferred light and dark themes.",
      keywords: ["palette", "system", "color", ...input.themeNames],
      modified: input.theme !== "system",
    },
    {
      id: "canvas.controls",
      section: "canvas",
      title: "Show Canvas Controls",
      description: "Show drawing tools, properties, menus, zoom, and undo/redo on whiteboards.",
      keywords: ["whiteboard", "Excalidraw", "drawing", "pen", "interface"],
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
  return settings.filter((setting) => setting.section === scope && settingMatches(setting, query));
}
