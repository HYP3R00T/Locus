# Project direction

## Purpose

Locus is a personal workspace for studying books and papers, taking handwritten or typed notes,
and connecting ideas across materials. It should support independent study first, with optional agent assistance later.

**Current implementation: PDF and whiteboard workspace.** The desktop app creates workspaces and one-level logical folders,
attaches existing PDFs without copying them, and restores per-workspace reading positions.
PDF.js provides continuous vertical reading with nearby-page rendering, selectable text, Enter-to-jump page entry,
zoom, and password entry. Context menus support display-name changes and removal; PDFs can move between
logical folders and the workspace root by dragging or using the menu.
SQLite stores references and reading state; original PDFs remain outside application storage.
Excalidraw whiteboards save locally and share the resizable pane layout with PDFs. PDF pins, Markdown editing, and AI are not implemented.

## Planned linked-note workflow

A PDF reader and an Excalidraw canvas sit side by side. Each pane scrolls independently.
Readers create notes wherever they need them, without having to define chapters or sections first.
A marker on the PDF opens the associated drawing.

This planned workflow must preserve the reading position, linked drawings, and their content across application restarts.
The first implementation may use page-level links before introducing more precise location anchors.

### Planned acceptance test

1. Open a PDF and navigate to a page.
2. Create a linked drawing and write or sketch on its canvas.
3. Navigate elsewhere, then use the original page's marker to reopen the drawing.
4. Close and reopen the application.
5. Confirm that the last reading position and the saved drawing are restored and their link still works.

Drawing input must also be checked with the intended tablet or mouse before treating the prototype as usable.

## Persistent material and study sessions

A book or paper owns its reading state and associated notes. A study session represents a visit to that material;
starting another session should not split or hide existing notes.

Registered documents have stable IDs and support explicit relinking after a file move. SQLite stores library
metadata and whiteboard references; drawing content lives in standard Excalidraw files. Precise PDF anchors and
the model for future study sessions remain design work.

## Architecture boundaries

- Tauri provides the desktop shell and native integration.
- Next.js exports the frontend as static assets; React supplies the interactive workspace.
- Rust handles local file access and persistence through Tauri commands.
- Excalidraw supplies the drawing canvas.

A static frontend can still load documents, update the interface, and call Rust while the application runs.
Next.js runtime server features are outside this architecture: backend operations belong in Rust rather than
Server Actions or request-time Next.js handlers. Build-time rendering remains possible.

PDF.js provides rendering; SQLite stores library metadata. See [Storage](storage.md) for ownership and schema. The frontend lives in `packages/src-nextjs/`,
with the Rust application directly in `packages/src-tauri/`. See [Getting started](getting-started.md) for development and build commands.

## Later capabilities

- Typed notes alongside handwritten drawings.
- Pinning and richer connections across materials; splitting and swapping panes are already implemented.
- Reference reading and connections across books, papers, and notes.
- Optional assistance using explicitly selected source material. An AI tutor is not part of the current scope.

Agents and cloud synchronization are outside the current implementation. The existing pane system already
supports up to four independently resizable views.
