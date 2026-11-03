import catppuccin_mocha from "./catppuccin-mocha.json";
import default_dark from "./default-dark.json";
import default_light from "./default-light.json";
import dracula from "./dracula.json";
import nord from "./nord.json";
import tokyo_night from "./tokyo-night.json";

export const BUILTIN_THEMES = [
  default_light,
  default_dark,
  catppuccin_mocha,
  nord,
  dracula,
  tokyo_night,
] as Theme[];

export type Theme = {
  id: string;
  name: string;
  mode: "light" | "dark";
  colors: Record<string, string>;
};
// Legacy palettes used accent for primary controls and surface for multiple panels.
const legacyRoles: Record<string, string> = {
  "titlebar-background": "surface",
  "titlebar-foreground": "foreground",
  "toolbar-background": "background",
  "toolbar-foreground": "foreground",
  "pane-background": "background",
  "pane-foreground": "foreground",
  "pane-border": "border",
  background: "background",
  foreground: "foreground",
  "client-surface": "muted",
  "context-surface": "surface",
  card: "surface",
  "card-foreground": "foreground",
  popover: "surface",
  "popover-foreground": "foreground",
  primary: "accent",
  "primary-foreground": "accentForeground",
  secondary: "muted",
  "secondary-foreground": "foreground",
  muted: "muted",
  "muted-foreground": "mutedForeground",
  accent: "muted",
  "accent-foreground": "foreground",
  border: "border",
  input: "border",
  ring: "accent",
  sidebar: "surface",
  "sidebar-foreground": "foreground",
  "sidebar-primary": "accent",
  "sidebar-primary-foreground": "accentForeground",
  "sidebar-accent": "muted",
  "sidebar-accent-foreground": "foreground",
  "sidebar-border": "border",
  "sidebar-ring": "accent",
};
export function resolveThemeColors(theme: Theme): Record<string, string> {
  const defaults = theme.mode === "dark" ? default_dark.colors : default_light.colors;
  const legacy = ["surface", "mutedForeground", "accentForeground"].some(
    (key) => key in theme.colors,
  );
  const overrides = legacy
    ? Object.fromEntries(
        Object.entries(legacyRoles).flatMap(([token, role]) =>
          theme.colors[role] ? [[token, theme.colors[role]]] : [],
        ),
      )
    : theme.colors;
  return { ...defaults, ...overrides };
}
