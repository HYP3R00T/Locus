# Configuration and themes

Rust owns the desktop configuration files. The frontend loads them through the configuration bridge,
validates shortcut semantics, and applies the selected palette. Study data remains separate in the
[application-data directory](storage.md).

## Location and files

Locus uses Tauri's platform config directory with a `locus` subfolder, creating missing directories:

| Platform | Default location                               |
| -------- | ---------------------------------------------- |
| Linux    | `$XDG_CONFIG_HOME/locus`, or `~/.config/locus` |
| Windows  | `%APPDATA%/locus` (Roaming AppData)            |
| macOS    | `~/Library/Application Support/locus`          |

```text
locus/
  preferences.json
  keybindings.json
  themes/
    default-light.json
    default-dark.json
    catppuccin-mocha.json
    nord.json
    dracula.json
    tokyo-night.json
```

**Settings → Configuration Files → Open config folder** opens this location. No broad frontend filesystem permission
is granted. The Window State plugin continues to maintain its own `.window-state.json` under Tauri's
identifier-based application-config directory; logs and study data also keep their existing locations.

## Preferences and key bindings

`preferences.json` defaults to:

```json
{
    "version": 1,
    "theme": "system",
    "lightTheme": "default-light",
    "darkTheme": "default-dark",
    "whiteboardControlsVisible": true,
    "whiteboardStrokeColor": "#1971c2",
    "whiteboardStrokeWidth": 1,
    "primaryColumn": "left",
    "primaryRow": "top",
    "notificationDuration": 3000,
    "shortcutSort": { "column": "binding", "direction": "asc" }
}
```

`theme` is `system` or a theme ID. Selecting a light/dark theme also remembers it as that mode's preferred
theme. Follow system chooses between `lightTheme` and `darkTheme`. The title-bar toggle switches between
the remembered pair. Missing or mismatched themes fall back to the default mode with an Appearance warning;
the stored selection is preserved.

`whiteboardStrokeColor` is an opaque `#RRGGBB` ink color. `whiteboardStrokeWidth` accepts Excalidraw's
three standard widths: `1` (thin), `2` (medium), or `4` (thick). Missing values in older files default to
blue and thin. **Settings → Whiteboard** provides the standard color palette, a hex field, and width buttons.
Defaults apply when opening a board, including restored boards; they do not rewrite existing marks or
replace tool choices in an already-open editor.

`primaryColumn` is `left` or `right`; `primaryRow` is `top` or `bottom`. Modifier-clicks target the
other side; these preferences do not lock ordinary pane selection. `notificationDuration` accepts 3000,
5000, 8000 milliseconds, or 0 for manual dismissal. Errors always use manual dismissal independently.
`shortcutSort` stores the table's `column` (`command`, `binding`, `when`, or `source`) and `direction`
(`asc` or `desc`). Defaults sort assigned keybindings first, with unassigned/disabled bindings last.
This display preference is independent of the shortcut assignments themselves.
Older files missing these fields receive defaults when loaded. Saves normalize those missing defaults
before stale-write comparison, preserving detection of actual external changes.

`keybindings.json` has an independent version and contains only overrides:

```json
{
    "version": 1,
    "bindings": {
        "palette": "Mod+Shift+P",
        "pane.close": "Mod+W"
    }
}
```

Omit a command to use its default, or assign an empty string to disable it. Command IDs, defaults, scope,
and conflict rules remain in `lib/workbench.ts`; see [Workbench](workbench.md#keyboard-scopes).

Valid legacy browser preferences (`locus-preferences`, or the version-1 `locus-preferences-v1`) and the old
light/dark/system selection migrate when native files are missing. Native files take precedence. Legacy
records remain untouched as a recovery source. Malformed legacy preferences block initial migration rather
than silently resetting them; existing complete native configuration remains usable.

## Add or edit a theme

Place a theme JSON file in `themes/`; no import step is required. The Themes selector and the command palette's **Preferences:
Color Theme** picker group files by their `mode` field. While Locus is visible, theme files are
checked every two seconds and on window focus. Adding, editing, or removing a JSON file updates the
selectors and active palette without a restart. This bounded, native theme-only scan does not read
or replace preferences/key bindings; hidden windows pause polling. Explicit reload remains available.
If the folder is temporarily unavailable, the last loaded palette stays active.

Each filename must match its immutable ID, such as `my-theme.json`:

```json
{
    "id": "my-theme",
    "name": "My Theme",
    "mode": "dark",
    "colors": {
        "titlebar-background": "#20242b",
        "popover": "#181c22",
        "popover-foreground": "#edf0f5",
        "primary": "#9bc7ff",
        "primary-foreground": "#181c22",
        "sidebar-accent": "#303844"
    }
}
```

IDs use lowercase ASCII letters, digits, and hyphens; `system` is reserved. Names must be nonempty.
`mode` must be `light` or `dark`. Every color is optional: omitted tokens inherit the **bundled**
default light/dark value for that token, independent of previously selected or locally edited themes.
An empty `colors` object is still valid. Values use `#RRGGBB` or `#RRGGBBAA` (alpha last).
Unknown tokens are rejected to catch typos. Arbitrary CSS, scripts, fonts, and remote resources are
not supported. These are Locus palettes, not VS Code theme files.

Copy a complete template from
[`default-dark.json`](../packages/src-nextjs/lib/themes/default-dark.json) or
[`default-light.json`](../packages/src-nextjs/lib/themes/default-light.json),
change `id` and `name`, and place it at `themes/<id>.json` in the config folder.
Source templates and installed templates contain the same explicit colors.

| Tokens                                                                                                       | Interface purpose                                              |
| ------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------- |
| `background`, `foreground`                                                                                   | General application surface and text                           |
| `titlebar-background`, `titlebar-foreground`                                                                 | Custom window title bar                                        |
| `toolbar-background`, `toolbar-foreground`                                                                   | PDF controls                                                   |
| `pane-background`, `pane-foreground`, `pane-border`                                                          | Study pane frame and inherited text                            |
| `client-surface`, `context-surface`                                                                          | Primary navigation and contextual surfaces                     |
| `card`, `card-foreground`                                                                                    | Card surfaces and text                                         |
| `popover`, `popover-foreground`                                                                              | Command palette, menus, and popovers                           |
| `primary`, `primary-foreground`                                                                              | Primary buttons and controls                                   |
| `secondary`, `secondary-foreground`                                                                          | Secondary controls                                             |
| `muted`, `muted-foreground`                                                                                  | Subdued surfaces and text                                      |
| `accent`, `accent-foreground`                                                                                | Hover/selected control surfaces and text                       |
| `destructive`                                                                                                | Destructive actions and errors                                 |
| `border`, `input`, `ring`                                                                                    | General borders, input borders, focus indicators               |
| `sidebar`, `sidebar-foreground`                                                                              | Sidebar-style controls                                         |
| `sidebar-primary`, `sidebar-primary-foreground`                                                              | Primary navigation controls                                    |
| `sidebar-accent`, `sidebar-accent-foreground`                                                                | Navigation hover/selection                                     |
| `sidebar-border`, `sidebar-ring`                                                                             | Navigation frame borders and focus indicators                  |
| `chart-1` through `chart-5`                                                                                  | Shared chart palette tokens                                    |
| `workspace-active-background`                                                                                | Active workspace fill, distinct from the primary panel surface |
| `icon-red`, `icon-orange`, `icon-yellow`, `icon-green`, `icon-cyan`, `icon-blue`, `icon-purple`, `icon-pink` | Theme-aware workspace icon palette                             |

These are semantic roles, not a separate property for every HTML element. Controls reuse the same
roles to keep contrast and selection behavior consistent. PDFs retain their original page colors.
Excalidraw's controls reuse interface roles through its supported CSS variables. Its on-screen canvas uses
a transparent drawing layer over `pane-background`, following the Locus palette in both modes.
Autosave preserves the file's background color and existing strokes. The canvas background picker is hidden;
built-in image exports have transparent paper because the CSS theme background is display-only.
The standard stroke color and width controls remain unchanged. Every whiteboard opens with the freehand pen
and the configured ink and width, overriding saved tool defaults. Blue ink and thin strokes are the initial
preferences. Tool changes remain local to an open editor; reopening a board restores the configured defaults.
Existing strokes retain their original colors and widths.

Earlier eight-role palettes remain readable. Their `surface`, `mutedForeground`, and
`accentForeground` keys identify the legacy mapping; legacy `accent` maps to `primary`.
Use the new templates for new themes; do not mix legacy and expanded token formats.

Bundled palettes are Locus adaptations of [Catppuccin](https://github.com/catppuccin/palette),
[Nord](https://www.nordtheme.com/docs/colors-and-palettes/), [Dracula](https://draculatheme.com/contribute),
and [Tokyo Night](https://github.com/folke/tokyonight.nvim). They are not official ports. The default palette
files live individually in `packages/src-nextjs/lib/themes/`. Their index supplies frontend previews;
Rust embeds the same JSON files when installing defaults. Unchanged earlier bundled templates (the eight-role and 33-token formats) are
expanded to the complete format on configuration load. Edited or custom files are preserved. Use a new ID for a variant or edit the existing file explicitly.

## Validation and recovery

Configuration and theme files are limited to 256 KiB each. Unsupported file versions, invalid structures,
and shortcut conflicts report an error without overwriting files. Correct the file and reload. Invalid theme
files are skipped with individual warnings, allowing valid themes to remain available.

Settings updates use a temporary file and rename after syncing its contents. Writes are serialized within
the process and compare the previously loaded JSON with disk before replacing it. A detected external edit
requires reload; this is not a cross-process transaction or a file-locking protocol. Avoid editing the same
settings in multiple app instances concurrently. Each settings file saves independently.

The browser layout preview retains its prior browser preference storage and bundled palette previews;
native directory and import controls remain disabled. This does not simulate native configuration files.
Linux checks do not establish Windows/macOS behavior; test those platforms before claiming support there.
