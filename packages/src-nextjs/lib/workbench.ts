export type CommandScope = "global" | "pdf" | "drawing";
export const COMMANDS = [
  { id: "palette", title: "Show All Commands", scope: "global", binding: "Mod+Shift+P" },
  { id: "material.open", title: "Open Material", scope: "global", binding: "Mod+O" },
  { id: "workspace.new", title: "Create Workspace", scope: "global", binding: "" },
  { id: "folder.new", title: "Create Folder", scope: "global", binding: "" },
  { id: "pdf.add", title: "Add PDF", scope: "global", binding: "" },
  { id: "whiteboard.new", title: "New Whiteboard", scope: "global", binding: "" },
  { id: "layout.vertical", title: "Split Vertically", scope: "global", binding: "Mod+\\" },
  {
    id: "layout.horizontal",
    title: "Split Horizontally",
    scope: "global",
    binding: "Mod+Shift+\\",
  },
  { id: "pane.close", title: "Close Active Pane", scope: "global", binding: "Mod+W" },
  { id: "pane.next", title: "Focus Next Pane", scope: "global", binding: "Alt+ArrowRight" },
  { id: "pane.previous", title: "Focus Previous Pane", scope: "global", binding: "Alt+ArrowLeft" },
  { id: "pane.swap", title: "Swap Active Pane with Next", scope: "global", binding: "" },
  {
    id: "navigation.primary",
    title: "Toggle Primary Navigation",
    scope: "global",
    binding: "Mod+B",
  },
  {
    id: "navigation.materials",
    title: "Toggle Materials Navigation",
    scope: "global",
    binding: "Mod+Shift+B",
  },
  { id: "preferences", title: "Open Preferences", scope: "global", binding: "Mod+," },
  { id: "theme.select", title: "Preferences: Color Theme", scope: "global", binding: "" },
  { id: "pdf.page", title: "PDF: Go to Page", scope: "pdf", binding: "Mod+G" },
  { id: "pdf.zoomIn", title: "PDF: Zoom In", scope: "pdf", binding: "Mod+=" },
  { id: "pdf.zoomOut", title: "PDF: Zoom Out", scope: "pdf", binding: "Mod+-" },
  { id: "pdf.fitWidth", title: "PDF: Fit to Width", scope: "pdf", binding: "Alt+W" },
  { id: "pdf.fitHeight", title: "PDF: Fit to Height", scope: "pdf", binding: "Alt+H" },
  {
    id: "drawing.controls",
    title: "Whiteboard: Toggle Canvas Controls",
    scope: "drawing",
    binding: "Mod+H",
  },
] as const satisfies readonly { id: string; title: string; scope: CommandScope; binding: string }[];
export type CommandId = (typeof COMMANDS)[number]["id"];
export const COMMAND_GROUPS = [
  "Workspace",
  "Layout",
  "Navigation",
  "Preferences",
  "PDF",
  "Whiteboard",
] as const;
export function commandGroup(id: CommandId): (typeof COMMAND_GROUPS)[number] {
  if (id.startsWith("pdf.") && id !== "pdf.add") return "PDF";
  if (id.startsWith("drawing.")) return "Whiteboard";
  if (id.startsWith("layout.") || id.startsWith("pane.")) return "Layout";
  if (id === "palette" || id.startsWith("navigation.")) return "Navigation";
  if (id === "preferences" || id.startsWith("theme.")) return "Preferences";
  return "Workspace";
}
// Human-readable descriptions of the dispatch rules below the command registry.
export function shortcutWhen(id: CommandId): string {
  const command = COMMANDS.find((command) => command.id === id);
  if (command?.scope === "pdf") return "PDF pane active · outside text fields";
  if (command?.scope === "drawing") return "Whiteboard pane active";
  if (id === "palette" || id === "pane.close") return "Anywhere in Locus";
  return "Outside text fields · command palette closed";
}
export type ShortcutSort = "command" | "binding" | "when" | "source";
export function sortedCommands(
  preferences: Preferences,
  mac: boolean,
  column: ShortcutSort,
  direction: "asc" | "desc",
) {
  function value(command: (typeof COMMANDS)[number]) {
    if (column === "binding")
      return platformBinding(bindingFor(command.id, preferences), mac) ?? "";
    if (column === "when") return shortcutWhen(command.id);
    if (column === "source")
      return Object.hasOwn(preferences.keybindings, command.id) ? "Custom" : "Default";
    return command.title;
  }
  return [...COMMANDS].sort((a, b) => {
    const av = value(a),
      bv = value(b);
    // Keep unassigned and disabled shortcuts after assigned ones in either direction.
    if (column === "binding" && (!av || !bv) && av !== bv) return av ? -1 : 1;
    return (
      (direction === "asc" ? 1 : -1) *
        av.localeCompare(bv, undefined, { sensitivity: "base", numeric: true }) ||
      a.title.localeCompare(b.title)
    );
  });
}
export function commandsForScope(scope: CommandScope | null) {
  return COMMANDS.filter((command) => command.scope === "global" || command.scope === scope);
}
export type Preferences = {
  version: 2;
  keybindings: Partial<Record<CommandId, string>>;
  whiteboardControlsVisibleByDefault: boolean;
};
export const DEFAULT_PREFERENCES: Preferences = {
  version: 2,
  keybindings: {},
  whiteboardControlsVisibleByDefault: false,
};
export const PREFERENCES_KEY = "locus-preferences";
export const LEGACY_PREFERENCES_KEY = "locus-preferences-v1";

export function bindingFor(id: CommandId, preferences: Preferences) {
  return preferences.keybindings[id] ?? COMMANDS.find((c) => c.id === id)?.binding ?? "";
}
const modifiers = ["Mod", "Ctrl", "Meta", "Alt", "Shift"];
export function normalizeBinding(value: string): string | null {
  if (value.trim() === "") return "";
  const parts = value.split("+").map((p) => p.trim());
  const key = parts.pop();
  if (!key || modifiers.some((m) => m.toLowerCase() === key.toLowerCase())) return null;
  const normalized = parts.map((p) => modifiers.find((m) => m.toLowerCase() === p.toLowerCase()));
  if (normalized.some((p) => !p) || new Set(normalized).size !== normalized.length) return null;
  if (normalized.includes("Mod") && (normalized.includes("Ctrl") || normalized.includes("Meta")))
    return null;
  const named = [
    "ArrowUp",
    "ArrowDown",
    "ArrowLeft",
    "ArrowRight",
    "PageUp",
    "PageDown",
    "Home",
    "End",
    "Enter",
    "Escape",
    "Tab",
    "Space",
    "Backspace",
    "Delete",
  ];
  const canonical =
    key.length === 1
      ? key.toUpperCase()
      : (named.find((k) => k.toLowerCase() === key.toLowerCase()) ??
        (/^f(?:[1-9]|1[0-9]|2[0-4])$/i.test(key) ? key.toUpperCase() : null));
  if (!canonical) return null;
  return [...modifiers.filter((m) => normalized.includes(m)), canonical].join("+");
}
export function eventBinding(
  event: Pick<KeyboardEvent, "key" | "code" | "ctrlKey" | "metaKey" | "altKey" | "shiftKey">,
): string | null {
  if (["Control", "Meta", "Alt", "Shift", "Dead", "Unidentified"].includes(event.key)) return null;
  // Use the physical base key for shifted punctuation, keeping Ctrl+Shift+\\ distinct from Ctrl+|.
  const punctuation: Record<string, string> = {
    Backslash: "\\",
    Equal: "=",
    Minus: "-",
    Comma: ",",
    Period: ".",
    Slash: "/",
    Semicolon: ";",
    BracketLeft: "[",
    BracketRight: "]",
    Quote: "'",
    Backquote: "`",
  };
  const key = punctuation[event.code] ?? (event.key === " " ? "Space" : event.key);
  return normalizeBinding(
    [
      event.ctrlKey && "Ctrl",
      event.metaKey && "Meta",
      event.altKey && "Alt",
      event.shiftKey && "Shift",
      key,
    ]
      .filter(Boolean)
      .join("+"),
  );
}
export function platformBinding(binding: string, mac: boolean) {
  return normalizeBinding(binding.replace(/^Mod\+/, mac ? "Meta+" : "Ctrl+"));
}
export function bindingProblem(
  id: CommandId,
  value: string,
  preferences: Preferences,
  mac: boolean,
): string | null {
  const binding = normalizeBinding(value);
  if (binding === null) return "Use modifiers and a key, for example Ctrl+Shift+P.";
  const command = COMMANDS.find((c) => c.id === id);
  if (!command) return "Unknown command.";
  if (binding && command.scope === "global" && !binding.includes("+") && !/^F\d+$/.test(binding))
    return "Global shortcuts need a modifier or a function key.";
  const conflict = COMMANDS.find(
    (other) =>
      other.id !== id &&
      (command.scope === "global" || other.scope === "global" || other.scope === command.scope) &&
      binding &&
      platformBinding(binding, mac) === platformBinding(bindingFor(other.id, preferences), mac),
  );
  return conflict ? `Already assigned to ${conflict.title}.` : null;
}
export function parsePreferences(raw: string, mac = false): Preferences {
  const parsed = JSON.parse(raw);
  // Former visibility values were live toggles, not an opening preference.
  const visibleByDefault =
    parsed?.version === 1
      ? false
      : parsed?.whiteboardControlsVisibleByDefault === undefined &&
          typeof parsed?.whiteboardControlsVisible === "boolean"
        ? false
        : parsed?.whiteboardControlsVisibleByDefault;
  if (
    (parsed?.version !== 1 && parsed?.version !== 2) ||
    (parsed.version === 1
      ? typeof parsed.whiteboardProperties !== "boolean"
      : typeof visibleByDefault !== "boolean") ||
    !parsed.keybindings ||
    typeof parsed.keybindings !== "object" ||
    Array.isArray(parsed.keybindings)
  )
    throw new Error("Unsupported or invalid preferences. Reset explicitly to use defaults.");
  const keybindings: Preferences["keybindings"] = {};
  for (const command of COMMANDS) {
    const value =
      parsed.keybindings[command.id] ??
      (parsed.version === 1 && command.id === "drawing.controls"
        ? parsed.keybindings["drawing.properties"]
        : undefined);
    if (value === undefined) continue;
    if (typeof value !== "string" || normalizeBinding(value) === null)
      throw new Error("Invalid saved keyboard shortcut.");
    keybindings[command.id] = normalizeBinding(value) ?? "";
  }
  // Preserve an existing custom use of Ctrl/Cmd+W when upgrading the old defaults.
  if (
    parsed.version === 1 &&
    keybindings["pane.close"] === undefined &&
    COMMANDS.some(
      (command) =>
        command.id !== "pane.close" &&
        keybindings[command.id] &&
        platformBinding(keybindings[command.id] ?? "", mac) === platformBinding("Mod+W", mac),
    )
  ) {
    keybindings["pane.close"] = "Alt+Shift+W";
  }
  const preferences: Preferences = {
    version: 2,
    whiteboardControlsVisibleByDefault: visibleByDefault,
    keybindings,
  };
  if (
    keybindings["drawing.controls"] === undefined &&
    bindingProblem(
      "drawing.controls",
      bindingFor("drawing.controls", preferences),
      preferences,
      mac,
    )
  ) {
    keybindings["drawing.controls"] = bindingProblem("drawing.controls", "Alt+P", preferences, mac)
      ? ""
      : "Alt+P";
  }
  for (const command of COMMANDS) {
    const problem = bindingProblem(
      command.id,
      bindingFor(command.id, preferences),
      preferences,
      mac,
    );
    if (problem) throw new Error(`Invalid saved shortcut for ${command.title}: ${problem}`);
  }
  return preferences;
}
