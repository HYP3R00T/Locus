# Changelog

Changes that matter when you use Locus. Planned features live on the [roadmap](https://locus.hyperoot.dev/roadmap/).

Locus is in early development. The current development version is **0.1.0**; it has not been publicly released.

## Unreleased

### Added

- Choose between removing a whiteboard reference and permanently deleting its drawing file, with explanations in the removal dialog.
- Add PDFs and create whiteboards directly from the expanded materials panel header.
- Start whiteboards with controls hidden by default; configure opening visibility separately from per-board shortcut toggles.
- Match whiteboard controls and canvas paper to the app theme, retaining the standard drawing controls.
- Open whiteboards with the pen selected; choose default ink color and stroke width in Whiteboard settings.
- Record local millisecond startup timings for restoration, lazy imports, pane painting, and final reveal.
- Prepare the first and saved PDF pages concurrently when restoring a reading session.
- Avoid unnecessary whiteboard updates during session restoration and defer the settings editor until opened.
- Show one workspace-wide startup loading screen until restored content is ready, then fade into the study space.
- Resume each workspace's open PDFs and whiteboards, split proportions, active pane, PDF positions, and expanded folder branch after restarting.
- Edit a workspace's name, scientific or academic icon, and theme-aware or custom color together through the workspace context menu.
- Keep one material folder open per level, animate folder expansion, and reveal the tree when reopening its panel.
- Animate sidebar toggles smoothly while respecting reduced-motion preferences.
- Highlight the active workspace and creation folder, restore folder selection, and show the destination when creating folders. New Folder creates at the workspace root; subfolders use the context menu.
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

- Restore smooth Linux whiteboard drawing by removing the forced WebKitGTK DMA-BUF renderer override.
- Use square corners for navigation, study panes, resize gutters, and pane drop previews.
- Resize fitted PDFs continuously with their pane, then redraw sharply after resizing settles.
- Hide and restore whiteboard controls in compact panes as well as large panes using the configured shortcut (Ctrl+H by default).
- Expand unchanged older bundled theme files so title bars and study panes receive the selected palette instead of default-dark fallback colors.
- Keep equal spacing around the workspace containers, including the left navigation edge.
- Include the developer's name, license, project links, and application details in Debian packaging metadata.
- Correct PDF page sizing to keep text sharp instead of shrinking the rendered page.
- Work around a Linux rendering issue that blurred the interface at certain scroll positions.
- Keep drawings open when a save fails during normal window closing, so you can retry.
