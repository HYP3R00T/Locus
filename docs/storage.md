# Storage

**Implemented:** workspace/folder creation, referenced PDFs, per-workspace reading positions, removal,
missing-file relinking, and persistent Excalidraw whiteboards. PDF pins, Markdown roots, relocation, and agents remain planned.

## Ownership

Rust stores `library.sqlite` in Tauri's platform-specific application-data directory
(`$XDG_DATA_HOME/dev.hyperoot.locus` on Linux, normally `~/.local/share/dev.hyperoot.locus`).
Preferences, key bindings, and interface themes live separately in the [configuration directory](configuration.md).
PDFs remain at their original locations. The application never copies, edits, renames, or deletes them.
The desktop file picker is the only attachment/relink entry point; the reader requests registered document IDs,
not arbitrary paths. Browser development is a layout-only preview: library actions are disabled, with no
in-memory replacement backend or browser upload workflow. All real library and file operations use Tauri.

The database enables foreign keys, uses WAL, and applies numbered migrations transactionally. A newer schema
version is refused rather than overwritten. Backups must include both the metadata database and separately
stored PDFs and managed drawings; references alone do not preserve content. Back up the database while Locus is closed, or use SQLite's
backup facilities; copying an active WAL database file alone is insufficient.

## Current schema

The authoritative DDL is `packages/src-tauri/migrations/` (versions 1 through 5).

| Table                  | Responsibility                                                                                                              |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `workspaces`           | UUID and display title                                                                                                      |
| `folders`              | UUID, workspace, title, and optional parent; one subfolder level                                                            |
| `documents`            | UUID, canonical path, title, SHA-256 fingerprint, size, modification time                                                   |
| `workspace_documents`  | Workspace/document association, optional folder and display-title override; cross-workspace folder assignment is rejected   |
| `workspace_navigation` | Per-workspace active folder, restored after reopening; deleting the folder resets it to the workspace root                  |
| `drawings`             | Stable drawing ID, workspace ID, and display title; scene content lives in standard `.excalidraw` files                     |
| `reading_positions`    | Zero-based physical page index, page-relative vertical fraction, and offset format version for each workspace/document pair |

Titles and file paths are not identities. Attaching the same canonical path reuses its document record;
attaching it again within one workspace updates its folder placement. The same PDF can be referenced in
multiple workspaces, each with its own reading position. Separate physical copies currently receive separate
IDs even when their contents match.

## Display names and placement

Right-click PDFs to open, rename, move, add another PDF, or remove their workspace reference. Folder context menus
provide attachment, subfolder creation (top-level folders only), rename, and removal; workspace context menus provide rename and removal. Empty tree space
provides PDF attachment and folder creation. Touch long-press and the keyboard context-menu key use the same menus.
PDF rows use a grab cursor, a drag preview, and highlighted drop targets. Drop onto a folder to move into it,
or onto empty tree space to move to the workspace root. The **Move to** submenu provides the same operation
without dragging. Rows remain title-sorted. Folders support a top-level folder and one subfolder level; deeper nesting and folder reparenting are not exposed.

PDF display names are workspace-specific overrides. Renaming and moving retain the document ID, original path,
reading state, and file contents. No filesystem rename or move takes place. Schema migration 2 adds these aliases
and tags legacy reading offsets. Existing page numbers survive migration; old within-page offsets are translated
approximately using current viewport geometry because the old viewport dimensions were not recorded.

## Reading and removal

PDF.js requests byte ranges through Rust, bounded to 1 MiB per native read. Its continuous viewer lays out
all pages but renders/caches nearby pages instead of allocating a canvas for every page.
The app disables eager full-file fetching, though a PDF's structure can still require substantial reads.
Workers, fonts, character maps, and WASM assets ship locally. Rendering is read-only: PDF scripts are not executed
and internal/external links use the PDF.js annotation layer and link service. Editing annotations, search, and
printing are not implemented. See [Workbench](workbench.md#pdf-links-and-wheel-zoom).
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

## Whiteboards

Drawing metadata lives in SQLite's `drawings` table (`id`, `workspace_id`, `title`). Standard Excalidraw JSON,
including embedded image files, lives beside the database at `drawings/<workspace-id>/<drawing-id>.excalidraw`.
Names are display metadata; renaming a whiteboard does not change its ID or path. Storage relocation and PDF pins are not implemented.

Saves are debounced, ordered per drawing, and replace files via a temporary file and atomic rename.
Pending edits survive pane remounts in memory. Normal window closing flushes pending edits and waits for saves;
a failure keeps the window open. Crashes or forced termination can still lose the latest unsaved edits.
Only registered drawing IDs can be read or saved; the backend validates the scene type and enforces a 64 MiB limit.

Removing a whiteboard or workspace removes its database references while retaining `.excalidraw` files on disk.
Those files can be opened externally; automatic orphan recovery and external-file change watching are not implemented.
Back up both `library.sqlite` and the drawing directory. Opening a whiteboard again reads the file unless an unsaved local edit needs recovery.

## Verification

Rust tests cover reopening the database, stable IDs and reading positions, range bounds, unregistered IDs,
missing/changed files, relinking, invalid headers, cross-workspace folder rejection, and non-destructive removal.
Drawing tests cover persistence, rename, validation, and preserving files after reference removal.
Frontend checks cover lint/types. Pane limits, mixed-content swaps, and drag-to-split behavior require focused
behavior verification; no separate frontend behavior-test command is configured. Manually exercise the native picker and rendering with representative
books on each target OS; a browser preview does not prove the platform's WebView or native dialog behavior.

## Navigation selection and subfolders

The primary sidebar highlights the current workspace; the material tree highlights the active folder. Selecting a folder or PDF updates the folder target. Pane focus follows a PDF's folder;
whiteboards use the workspace root. New Folder always creates at the workspace root. Right-click a top-level folder and choose Create subfolder
to create within it. The dialog shows the captured destination. Two folder levels is the current limit.
Selection is stored in SQLite per workspace, independent of the open-pane layout. Active ancestors expand
when needed so the selected folder is visible. Add PDF uses the same selected destination.

Migration 4 adds nullable `folders.parent_id`; migration 5 adds `workspace_navigation`. Each migration is transactional. Existing folders remain
at the root. SQL triggers reject cross-workspace parents, deeper nesting, and invalid active-folder targets.
Deleting a parent promotes its child folders to the workspace root and keeps PDFs in those child folders;
PDFs directly in the removed folder move to the root. Deleting the active folder clears that workspace's
navigation selection. Original files and authored drawings are preserved. Older app binaries refuse schema 5;
back up the library before upgrading if rollback to an older app is needed.
