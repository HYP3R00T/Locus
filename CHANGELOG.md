# Changelog

Changes that matter when you use Locus. Planned features live on the [roadmap](https://locus.hyperoot.dev/roadmap/).

Locus is in early development. The current development version is **0.1.0**; it has not been publicly released.

## Unreleased

### Added

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

- Include the developer's name, license, project links, and application details in Debian packaging metadata.
- Correct PDF page sizing to keep text sharp instead of shrinking the rendered page.
- Work around a Linux rendering issue that blurred the interface at certain scroll positions.
- Keep drawings open when a save fails during normal window closing, so you can retry.
