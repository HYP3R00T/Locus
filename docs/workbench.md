# Workbench

Commands, preferences, and keyboard dispatch share one frontend workbench provider. The title bar is the common
entry point for every content type; individual PDF and whiteboard panes do not repeat application command menus.
The browser preview uses the same title-bar controls without native window buttons.

## Commands and layout

Click **Commands** or press **Ctrl+Shift+P** (**Command+Shift+P** on macOS). Search the command name and press Enter.
The palette includes material selection, whiteboard creation, navigation, preferences, pane focus, swapping,
closing, and **Split Vertically** / **Split Horizontally**. Split commands create empty panes; selecting a material is a separate action. Disabled actions remain visible with their current shortcut.
The maximum remains two columns, each with up to two rows.

Commands are grouped by Workspace, Layout, Navigation, Preferences, and the active PDF/Whiteboard scope.
Choose **Preferences: Color Theme** to open a searchable theme picker with System, Light themes, and Dark themes
groups and a marker for the saved choice. The picker starts on that choice; moving the highlighted item
previews its colors without writing preferences. Enter or click saves through the same configuration service as
Appearance. Escape, dismissing the picker, or Back restores the saved theme; Back returns to commands. The picker command has a
configurable `theme.select` key binding, unassigned by default.

Navigation and title-bar controls, theme/window buttons, and PDF toolbar fields use shadcn Base UI tooltips
on hover or keyboard focus. Command hints resolve the current preference binding, including custom overrides;
an unassigned shortcut is omitted. Ctrl/Command labels follow the platform. The shared provider uses a
400 ms hover delay. Native `title` hints are removed from these controls to avoid duplicate popups.

The miniature layout in the title bar shows each pane and highlights the active one. Click a cell to focus its pane.
Drag a non-empty cell onto another pane to swap views, or to an allowed edge to create a split. Materials can also
be dragged directly from the sidebar. Ctrl+click a material opens it in the secondary column;
Ctrl+Shift+click opens it in the secondary row of the active column. Command-click also works on macOS.
**Settings → Layout** chooses the primary column (left/right) and primary row (top/bottom); the defaults
are left and top. Modifier-click creates the missing split or replaces the secondary pane, preserving
its primary sibling. In a two-by-two layout, column targeting uses the corresponding row, or the sole
row if the other column has not been split. Empty active panes are filled before creating/reusing splits.
Plain clicks replace only the active pane. Already visible whiteboards receive focus; PDFs can have
independent views in multiple panes. Explicit Split commands still create empty panes and retain the
four-pane limit. Existing whiteboards dragged between panes move instead of opening competing editors.

The two navigation columns share one outer frame. Navigation, study panes, Preferences, and resize gutters use
square corners and thin borders, without inset editor padding. Sidebar toggles commit one target layout and let CSS interpolate
panel widths over 200 ms, avoiding per-frame React layout updates. Manual resizing remains immediate.
Reduced-motion preferences skip the animation. Rapid toggles reverse from the current width. The work area has a uniform four-pixel outer inset, including
the left edge of navigation and the space below the title bar. The active pane is marked in the title-bar map; container borders
remain unchanged when focus moves. Six-pixel gutters have three-dot grips and highlight across the entire gap
on hover, dragging, or keyboard focus, keeping their hit areas separate from content scroll containers.

Material folders expand as an accordion: one sibling folder can be open at each level. Opening another
closes the previous sibling; opening a subfolder keeps its parent open. Collapsing the materials panel
preserves that branch. Reopening reveals entries with a brief staggered depth/slide effect, capped so large
trees do not keep users waiting. Transforms clear after the reveal to keep resting text sharp.
Folder contents animate their height. Reduced-motion
preferences disable both content animations.

Workspace selection uses `workspace-active-background`, separate from the primary panel surface, without a selection border.
Right-click a workspace and choose **Edit Workspace** to change its name, icon, and color together.
The name field doubles as the live icon preview. Save validates and persists all values atomically; Cancel discards the draft.
Icon buttons retain accessible labels without hover tooltips.
The first color swatch restores theme-default foreground; other swatches save semantic palette references that follow theme changes.
Custom six-digit hex colors stay fixed. Appearance is saved per workspace in SQLite and shared by compact and expanded navigation.
Modal dialogs explicitly render a dimming backdrop even inside the navigation sheet's dialog context;
Base UI otherwise omits nested backdrops. No blur is applied to underlying text.
The icon picker uses fixed-size cells with equal row/column gaps and includes academic, scientific, and computing symbols.
Custom SVG uploads and emoji icons are not implemented.

PDF fit-to-width follows its pane, reserves a vertical scrollbar lane, and suppresses temporary horizontal overflow
while resizing. Fixed zoom and fit-to-height still allow horizontal scrolling when the page is wider than its pane.
Fit modes follow pane resizing through PDF.js's delayed zoom API, temporarily reusing rendered canvases.
After 150 ms without resizing, the exact fit preset is restored and the PDF redraws sharply.
The fit calculation follows PDF.js's continuous, single-page layout padding (40px horizontal, 5px vertical);
review it if upgrading PDF.js or introducing spreads, horizontal page layout, or borderless pages.

## Keyboard scopes

`lib/workbench.ts` owns stable command IDs, names, scopes, defaults, and shortcut validation.
`components/workbench/workbench-context.ts` exposes the context and pane-registration hooks.
`components/workbench/workbench-provider.tsx` owns the registry, palette state, keyboard dispatch, and preference persistence.
The shell registers application commands; each mounted PDF reader registers its own handlers under its pane ID.
Toolbar buttons, palette items, and shortcuts invoke the same command handlers and availability checks.

| Scope      | Availability                                             |
| ---------- | -------------------------------------------------------- |
| Global     | Anywhere in the application when the action is available |
| PDF        | Only the active, loaded PDF reader                       |
| Whiteboard | Only when a whiteboard pane is active                    |

Global here means application-wide, not a system-wide hotkey while another application is focused.
Text fields keep their normal keys except the explicit palette, close-pane, and canvas-controls shortcuts.
Ctrl/Cmd+W dismisses the palette or Preferences first; in the study area it closes the active pane.
The final pane stays available as an empty surface rather than closing the application.
Keyboard composition is ignored. Excalidraw keeps its own local drawing shortcuts.
When the palette is open, its input owns the keyboard. A selected action runs after the dialog releases focus.

Useful defaults include `Mod+\` for a vertical split, `Mod+Shift+\` for a horizontal split,
`Mod+W` to close a pane, `Alt+ArrowLeft` / `Alt+ArrowRight` for pane focus, `Mod+G` for the PDF page field,
`Mod+=` / `Mod+-` for PDF zoom, `Alt+W` / `Alt+H` for PDF fitting, and `Mod+H` to show or hide the complete whiteboard interface.
`Mod` means Control on Linux/Windows and Command on macOS. Settings and tooltips resolve shortcut hints
from the current binding. Explicit custom overrides remain unchanged when defaults change. If a custom
binding already uses Mod+H, the canvas command keeps Alt+P where available, otherwise remains unassigned.

## Preferences

Open **Preferences** from the palette or Settings. Navigation lists Themes, Key Bindings, Layout,
Whiteboard, Notifications, Configuration Files, and About directly. The settings category column stays expanded on desktop, with its collapse toggle hidden and its
collapse command disabled. Returning to the workspace restores its previous navigation state. Narrow
windows retain the navigation drawer toggle. Settings pages share full-width rows
and consistent spacing; no aggregate pages or modification stripes are displayed. Search and Modified
filter the selected category. Navigation counts show matches in other categories while searching.

`lib/settings.ts` owns setting metadata and filtering. Shared rows render labels, descriptions, and controls.
Configuration Files holds folder/reload/file management; About holds application information.
Key Bindings lists every registered command, including unassigned ones, in a searchable table with
Keybinding, When, and Source columns. When describes fixed dispatch scopes (PDF, whiteboard, or application),
not editable condition expressions. Source distinguishes Default from Custom overrides. Action availability
still applies. Click Command, Keybinding, When, or Source headers to sort ascending or descending.
Sort column and direction persist in preferences. Keybinding ascending is the default; unassigned and
disabled bindings stay after assigned ones in either direction. Double-click a row or activate its edit button to record a combination; Enter saves and
Escape cancels. The editor can remove a binding or reset it to its default. Different PDF and whiteboard
commands can use the same combination because their scopes do not overlap. Key Bindings search stays within
shortcuts; settings search stays within its selected category. Conflicts are rejected for overlapping scopes.
Global printable shortcuts need a modifier
or a function key, so ordinary typing does not trigger application commands.

Desktop preferences and key bindings use separate versioned JSON files in the native configuration directory.
The [configuration guide](configuration.md) owns paths, file schemas, theme palettes, migration, and recovery.
The configuration provider supplies validated preferences to the workbench; command IDs remain unchanged.
Changes save immediately after validation. Malformed files and detected external edits are preserved;
correct the files and use Reload configuration. Legacy browser records remain available for recovery.

## Excalidraw controls

The Library trigger and sidebar remain hidden. **Toggle Canvas Controls** occupies a fixed title-bar slot left of
the pane map. It is also available in the palette, Whiteboard preferences, or with `Mod+H` while a whiteboard is active.
It hides or shows the whole Excalidraw UI layer: toolbar, properties, menus, zoom, undo/redo, help, and save status.
The drawing canvas and its content remain available. Menus and dialogs close when the controls are hidden.

Excalidraw's partial Zen mode is held off so it does not compete with this single visibility setting.
One scoped CSS adapter targets the desktop `.layer-ui__wrapper` and compact `.App-top-bar` / `.App-bottom-bar`.
Excalidraw chooses its compact layout from each pane's width and height, independently of the application window.
Review these selectors when upgrading Excalidraw.
These UI preferences do not alter drawing elements or saved scene files.

## PDF links and wheel zoom

PDF.js's annotation layer and `PDFLinkService` handle document destinations, including contents-page links.
Click or Ctrl+click navigates within the same PDF pane while retaining its current zoom. External HTTP,
HTTPS, email, and telephone links open in their system default applications through Tauri's opener plugin.
Its capability grants URL opening only, without file-opening or directory-reveal access. Failed opens show
an error in the viewer. The source PDF remains unchanged.

Ctrl+scroll zooms the PDF under the pointer from 25% to 500%, leaving fit mode and keeping the pointer as
the zoom origin. Ordinary scrolling remains unchanged. The listener is non-passive and limited to the PDF
scroll area, preventing the WebView's document-level zoom. High-frequency gestures defer canvas redraws
briefly through PDF.js's zoom API, then rerender at the final scale.

## Overlay rendering

Dialogs and navigation sheets dim their backdrop without blurring it. Dialogs use the Base UI viewport
for layout rather than translated centering or scale animations, keeping text out of a scaled popup layer.
Command palettes use the same viewport with upper placement.

## Text rendering

The settings scrolling element is separate from its frame and has an opaque background without
transforms. Shortcut rows use consistent line heights and fixed control widths. Navigation widths settle
on device-pixel boundaries after dragging.

On the affected Linux system, both HTML settings text and PDF canvases alternated between sharp and blurry
at different scroll positions, even at 100% display scaling. Disabling accelerated compositing removed the
blur; disabling only DMA-BUF also removed it. The latter keeps accelerated compositing available.

Linux startup supplies `WEBKIT_DISABLE_DMABUF_RENDERER=1` before GTK initialization, unless the environment
explicitly overrides it. Windows and macOS are unchanged. Set the value to `0` to test the original buffer path.
No font-rendering overrides or full compositing disable are applied. This workaround resolved interface blur,
but later checks still showed soft PDF rendering. See
[Tauri's Linux graphics guidance](https://tauri-v2.netlify.app/develop/debug/linux-graphics/) for the tradeoffs.

PDF.js page dimensions describe the content box, including when rounded to its canvas pixel grid.
The scoped `.locus-pdf-viewer .page` rule restores `box-sizing: content-box` against Tailwind Preflight.
Without it, PDF.js's 9px page borders reduce the canvas wrapper by 18px in each dimension, rescaling the
bitmap and misaligning the text layer. Native Linux scrolling was confirmed sharp and consistent after
this correction. The rule applies on every platform; native Windows rendering still needs verification
on Windows hardware.

Whiteboard files load from a mounted effect. Results from cancelled loads are ignored; a failed load offers a retry
and never opens an empty editable canvas that could overwrite the original drawing.

## Notifications

A shared shadcn Base UI toaster displays operation failures at the bottom right without changing pane size.
Errors have no timeout and include a manual close button. Warnings, information, and future success messages
use **Settings → Notifications → Notification Duration**: 3 seconds (default), 5 seconds, 8 seconds, or until
dismissed. Hover/focus pauses automatic dismissal. Preview notification exercises the current duration.
One notice is emitted per source/message change, avoiding repeats during rerenders or theme previews.
Field-validation messages stay beside their fields, and unavailable-document surfaces keep their local
recovery controls. There is no automatic success toast for every drawing autosave.
