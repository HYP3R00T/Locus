---
icon: lucide/database
---

# Storage

**Implemented:** workspace/folder creation, referenced PDFs, per-workspace reading positions, removal,
and missing-file relinking. Drawing files, pins, Markdown roots, relocation, and agents remain planned.

## Ownership

Rust stores `library.sqlite` in Tauri's platform-specific application-data directory
(`$XDG_DATA_HOME/dev.hyperoot.locus` on Linux, normally `~/.local/share/dev.hyperoot.locus`).
PDFs remain at their original locations. The application never copies, edits, renames, or deletes them.
The desktop file picker is the only attachment/relink entry point; the reader requests registered document IDs,
not arbitrary paths. Browser development is a layout-only preview: library actions are disabled, with no
in-memory replacement backend or browser upload workflow. All real library and file operations use Tauri.

The database enables foreign keys, uses WAL, and applies numbered migrations transactionally. A newer schema
version is refused rather than overwritten. Backups must include both the metadata database and separately
stored PDFs; references alone do not preserve books. Back up the database while Locus is closed, or use SQLite's
backup facilities; copying an active WAL database file alone is insufficient.

## Current schema

The authoritative DDL is `packages/src-tauri/migrations/` (versions 1 and 2).

| Table                 | Responsibility                                                                                                              |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `workspaces`          | UUID and display title                                                                                                      |
| `folders`             | UUID, workspace, and display title; no nested parent                                                                        |
| `documents`           | UUID, canonical path, title, SHA-256 fingerprint, size, modification time                                                   |
| `workspace_documents` | Workspace/document association, optional folder and display-title override; cross-workspace folder assignment is rejected   |
| `reading_positions`   | Zero-based physical page index, page-relative vertical fraction, and offset format version for each workspace/document pair |

Titles and file paths are not identities. Attaching the same canonical path reuses its document record;
attaching it again within one workspace updates its folder placement. The same PDF can be referenced in
multiple workspaces, each with its own reading position. Separate physical copies currently receive separate
IDs even when their contents match.

## Display names and placement

Right-click PDFs to open, rename, move, add another PDF, or remove their workspace reference. Folder context menus
provide attachment, rename, and removal; workspace context menus provide rename and removal. Empty tree space
provides PDF attachment and folder creation. Touch long-press and the keyboard context-menu key use the same menus.
PDF rows use a grab cursor, a drag preview, and highlighted drop targets. Drop onto a folder to move into it,
or onto empty tree space to move to the workspace root. The **Move to** submenu provides the same operation
without dragging. Arbitrary sibling reordering and nested folders are not supported; rows remain title-sorted.

PDF display names are workspace-specific overrides. Renaming and moving retain the document ID, original path,
reading state, and file contents. No filesystem rename or move takes place. Schema migration 2 adds these aliases
and tags legacy reading offsets. Existing page numbers survive migration; old within-page offsets are translated
approximately using current viewport geometry because the old viewport dimensions were not recorded.

## Reading and removal

PDF.js requests byte ranges through Rust, bounded to 1 MiB per native read. Its continuous viewer lays out
all pages but renders/caches nearby pages instead of allocating a canvas for every page.
The app disables eager full-file fetching, though a PDF's structure can still require substantial reads.
Workers, fonts, character maps, and WASM assets ship locally. Rendering is read-only: PDF scripts are not executed
and interactive annotations, internal-link navigation, search, and printing are not yet implemented.
Encrypted PDFs request a password in the reader; passwords are not persisted.

Page/scroll changes save after a short debounce and flush when the reader unmounts. An abrupt process exit can
lose the latest unsaved movement. Select the book again after reopening Locus to restore its saved location.
The page field uses physical PDF numbering; printed page labels may differ.

- Removing a PDF removes only that workspace's association and reading position.
- Removing a folder keeps its PDFs at the workspace root.
- Removing a workspace removes its folders, associations, and reading positions.
- Document metadata is removed once no workspace references it. Original files remain untouched.

Missing or changed files show an explicit reader error. **Locate PDF** opens the picker and verifies the original
SHA-256 fingerprint before updating the path; a different edition must be attached as a new document.
Ordinary reads check file size and modification time, not a fresh full hash for each range. Deliberate edits
that preserve both attributes are not detected. Changing the path or storage medium while reading may interrupt rendering.

## Verification

Rust tests cover reopening the database, stable IDs and reading positions, range bounds, unregistered IDs,
missing/changed files, relinking, invalid headers, cross-workspace folder rejection, and non-destructive removal.
Frontend checks cover lint/types/build. Manually exercise the native picker and rendering with representative
books on each target OS; a browser preview does not prove the platform's WebView or native dialog behavior.
