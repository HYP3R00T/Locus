# Changelog

Changes that matter when you use Locus. Planned features live on the [roadmap](https://locus.hyperoot.dev/roadmap/).

Locus is in early development. The current development version is **0.1.0**; it has not been publicly released.

## Unreleased

### Added

- Highlight the active workspace and creation folder, restore folder selection, and show the destination when creating folders.
- Organize materials in folders with one subfolder level while keeping original files untouched.
- Remember shortcut sorting; assigned keybindings appear first by default.
- Sort keyboard shortcuts by command, keybinding, activation context, or source.
- Choose the primary split sides; modifier-clicks create or reuse the secondary pane without replacing the primary material.
- Show operation notifications in bottom toasts, with persistent errors and configurable warning/info duration.
- Open sidebar materials in a secondary column with Ctrl+click or a secondary row with Ctrl+Shift+click.
- Browse shortcuts in a compact table showing commands, bindings, activation contexts, and default/custom sources; double-click to edit.
- Customize individual interface color tokens with complete, copyable light/dark theme files; missing colors inherit defaults.
- Add or edit a theme JSON in the configuration folder and see it appear automatically while Locus is open.
- Choose themes from a compact command-palette picker, starting on your current theme with live previews as you browse. Enter saves; Escape restores the saved theme.
- Browse full-width settings pages with direct category navigation and a Modified filter.
- Keep preferences and key bindings in portable configuration files, migrating existing settings without replacing native files.
- Choose grouped light/dark palettes, add custom theme JSON files, and reload or open the configuration folder from Settings.
- Include Default Light/Dark, Catppuccin Mocha, Nord, Dracula, and Tokyo Night interface palettes.
- Show action hints and current keyboard shortcuts in tooltips on navigation, title-bar, and PDF controls.
- Restore the main window's size and maximized state between sessions, with position restoration where supported.
- Keep bounded local diagnostic logs for startup and native operation failures without recording study content.
- Debian packaging is available for local testing.
- Read the user guide, follow planned work, and review versioned changes on the new Locus website.
- Organize books and papers into workspaces and folders without moving or copying your PDFs.
- Return to your saved reading position when you reopen a document.
- Read PDFs continuously, jump to a page, follow document links, and open web links in your browser.
- Choose a zoom level, fit a page to its pane, or zoom around the pointer with Ctrl+scroll.
- Write and sketch on Excalidraw whiteboards that save locally as portable drawing files.
- Arrange up to four resizable panes for reading and drawing side by side.
- Find actions in the command palette, customize keyboard shortcuts, and switch between light and dark themes.
- Hide the drawing controls when you want more space to write.

### Fixed

- Expand unchanged older bundled theme files so title bars and study panes receive the selected palette instead of default-dark fallback colors.
- Keep equal spacing around the workspace containers, including the left navigation edge.
- Include the developer's name, license, project links, and application details in Debian packaging metadata.
- Correct PDF page sizing to keep text sharp instead of shrinking the rendered page.
- Work around a Linux rendering issue that blurred the interface at certain scroll positions.
- Keep drawings open when a save fails during normal window closing, so you can retry.
