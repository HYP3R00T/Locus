---
icon: lucide/compass
---

# Project direction

## Purpose

Locus is a personal workspace for studying books and papers, taking handwritten or typed notes,
and connecting ideas across materials. It should support independent study first, with optional agent assistance later.

**Status: planned.** This page records the intended design, not existing functionality.

## First prototype

A PDF reader and an Excalidraw canvas sit side by side. Each pane scrolls independently.
Readers create notes wherever they need them, without having to define chapters or sections first.
A marker on the PDF opens the associated drawing.

The prototype must preserve the reading position, linked drawings, and their content across application restarts.
The first implementation may use page-level links before introducing more precise location anchors.

### Acceptance test

1. Open a PDF and navigate to a page.
2. Create a linked drawing and write or sketch on its canvas.
3. Navigate elsewhere, then use the original page's marker to reopen the drawing.
4. Close and reopen the application.
5. Confirm that the last reading position and the saved drawing are restored and their link still works.

Drawing input must also be checked with the intended tablet or mouse before treating the prototype as usable.

## Persistent material and study sessions

A book or paper owns its reading state and associated notes. A study session represents a visit to that material;
starting another session should not split or hide existing notes.

Document identity must eventually survive file moves and renames. The storage format, file-management behavior,
and precise anchoring scheme remain open implementation decisions.

## Architecture boundaries

- Tauri provides the desktop shell and native integration.
- Next.js exports the frontend as static assets; React supplies the interactive workspace.
- Rust handles local file access and persistence through Tauri commands.
- Excalidraw supplies the drawing canvas.

A static frontend can still load documents, update the interface, and call Rust while the application runs.
Next.js runtime server features are outside this architecture: backend operations belong in Rust rather than
Server Actions or request-time Next.js handlers. Build-time rendering remains possible.

A PDF rendering library, database, and application directory layout have not been selected.
The repository does not yet contain Next.js or Tauri application scaffolding.

## Later capabilities

- Typed notes alongside handwritten drawings.
- Multiple documents and notes in a workspace, with panes that can be reordered, pinned, and swapped.
- Reference reading and connections across books, papers, and notes.
- Optional agents for explanations, teaching, and practice using selected source material.

Agents, cloud synchronization, and the broader pane system are outside the first prototype.
