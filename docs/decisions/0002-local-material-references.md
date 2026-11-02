---

status: accepted
date: 2026-11-03
scope: "storage"
---

# Reference original materials and persist associations by ID

Recorded retrospectively on the date above; the original approval date is not asserted.

## Context and problem statement

Books may already live elsewhere on the device. Drawings should remain portable, and renaming a displayed
item must not break its identity or associations.

## Decision drivers

- Avoid duplicate PDFs and preserve originals.
- Stable identity across display-name changes.
- Portable authored drawings and persistent reading state.

## Considered options

- Copy materials into an application-managed folder tree.
- Reference external originals and manage authored files separately.
- Use names/paths as identities versus stable IDs with metadata; JSON metadata versus SQLite.

## Decision outcome

Reference PDFs in place. Use stable IDs and SQLite for library metadata, workspace placement, and reading
positions. Store authored whiteboards as standard Excalidraw files, with their references in SQLite. Rust owns
validated file access and persistence. Removing references must not delete original PDFs or authored drawings.

The agreed future linked-note model allows multiple independent drawings for one PDF, attached where needed,
rather than one canvas for an entire book. That relationship is design intent; PDF pinning is not implemented.

The exact future Markdown filename scheme, configurable roots, relocation process, and PDF-pin schema remain
unsettled. The current drawing path is an implementation detail documented in storage guidance, not a decision
that all future notes must use one immutable directory layout.

Approval evidence: Owner statements in this project conversation: “We are just keeping the references” and “their ID would remain
the same.” The owner requested the SQL schema and then authorized implementing PDF attachment. Portable
Excalidraw files were explicitly requested for use outside Locus. For linked notes, the owner said:
“I don't want one PDF and one whiteboard.”

### Consequences

- Moving or replacing an original PDF can invalidate a reference and requires explicit relinking.
- Backups must include metadata, drawings, and referenced PDFs; metadata alone is not the content.
- Database migrations and file compatibility need care; the folder tree is a logical organization, not ownership of original PDFs.

### Confirmation

Verify stable IDs, persistence, missing/changed-file handling, and non-destructive removal. Keep frontend
bridge fields aligned with Rust serialization.

Implementation evidence: [Storage guide](../storage.md), [native library](../../packages/src-tauri/src/library.rs),
[migrations](../../packages/src-tauri/migrations/), and [frontend bridge](../../packages/src-nextjs/lib/library.ts).

Verification evidence: The seven native library tests passed in the preceding validation run, including reference identity, relinking,
migration, and portable drawings. Those tests do not validate a future pin or Markdown implementation.

## Related decisions

- [Desktop architecture and package layout](0001-desktop-architecture.md)
- [Keep independent study usable without AI](0003-ai-free-study-core.md)
