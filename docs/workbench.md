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
be dragged directly from the sidebar. Existing whiteboards move instead of opening competing editors.
The two navigation columns share one outer frame. Study panes and Preferences use the same thin borders and small
rounded corners, without inset editor padding. The work area has a uniform four-pixel outer inset, including
the left edge of navigation and the space below the title bar. The active pane is marked in the title-bar map; container borders
remain unchanged when focus moves. Six-pixel gutters have three-dot grips and highlight across the entire gap
on hover, dragging, or keyboard focus, keeping their hit areas separate from content scroll containers.

PDF fit-to-width follows its pane, reserves a vertical scrollbar lane, and suppresses temporary horizontal overflow
while resizing. Fixed zoom and fit-to-height still allow horizontal scrolling when the page is wider than its pane.

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
`Mod+=` / `Mod+-` for PDF zoom, `Alt+W` / `Alt+H` for PDF fitting, and `Alt+P` to show or hide the complete whiteboard interface.
`Mod` means Control on Linux/Windows and Command on macOS.

## Preferences

Open **Preferences** from the palette or Settings. Commonly Used shows theme and canvas controls; All Settings
shows every setting. Navigation groups Appearance, Key Bindings, and Canvas under Workbench, with Configuration
and About under Application. Search starts across all settings; choose a category to narrow the results.
Search matches titles, descriptions, theme names, and shortcut bindings. The Modified filter uses `@modified`
to show preferences and shortcuts changed from their defaults. Modified settings have a small left marker.
Only user settings exist; there are no workspace-level overrides.

`lib/settings.ts` owns setting metadata and filtering; shared rows keep titles, descriptions, and controls
consistent across category pages and search results. Configuration holds folder/reload/file management,
and About holds application information.
Key Bindings lists every registered command, including unassigned ones, in a searchable table with
Keybinding, When, and Source columns. When describes fixed dispatch scopes (PDF, whiteboard, or application),
not editable condition expressions. Source distinguishes Default from Custom overrides. Action availability
still applies. Double-click a row or activate its edit button to record a combination; Enter saves and
Escape cancels. The editor can remove a binding or reset it to its default. Different PDF and whiteboard
commands can use the same combination because their scopes do not overlap. Key Bindings search stays within
shortcuts; general settings search still spans categories. Conflicts are rejected for overlapping scopes.
Global printable shortcuts need a modifier
or a function key, so ordinary typing does not trigger application commands.

Desktop preferences and key bindings use separate versioned JSON files in the native configuration directory.
The [configuration guide](configuration.md) owns paths, file schemas, theme palettes, migration, and recovery.
The configuration provider supplies validated preferences to the workbench; command IDs remain unchanged.
Changes save immediately after validation. Malformed files and detected external edits are preserved;
correct the files and use Reload configuration. Legacy browser records remain available for recovery.

## Excalidraw controls

The Library trigger and sidebar remain hidden. **Toggle Canvas Controls** occupies a fixed title-bar slot left of
the pane map. It is also available in the palette, Canvas preferences, or with `Alt+P` while a whiteboard is active.
It hides or shows the whole Excalidraw UI layer: toolbar, properties, menus, zoom, undo/redo, help, and save status.
The drawing canvas and its content remain available. Menus and dialogs close when the controls are hidden.

Excalidraw's partial Zen mode is held off so it does not compete with this single visibility setting.
One scoped CSS adapter targets `.layer-ui__wrapper`; review it when upgrading Excalidraw.
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

The settings scrolling element is separate from the rounded frame and has an opaque background without
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
