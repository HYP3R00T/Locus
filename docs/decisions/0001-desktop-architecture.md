---

status: accepted
date: 2026-11-03
scope: "desktop"
---

# Desktop architecture and package layout

Recorded retrospectively on the date above; the original approval date is not asserted.

## Context and problem statement

Locus needs web-based reading and drawing interfaces with native local-file access. The owner selected Tauri,
Next.js, and Rust and wanted application source outside the repository root.

## Decision drivers

- Native access to existing study files.
- Reuse of PDF.js, Excalidraw, and React UI.
- Clear frontend/native ownership and a root that stays navigable.

## Considered options

- Default layout: frontend at the repository root with `src-tauri/`.
- Separate desktop/frontend wrappers under `packages/`.
- Sibling `packages/src-nextjs/` and `packages/src-tauri/` directories.

## Decision outcome

Use Tauri as the native shell, Rust for local backend operations, and a statically exported Next.js frontend.
Keep application code in sibling `packages/src-nextjs/` and `packages/src-tauri/` directories. Keep their actual
package-specific configuration with the code; repository orchestration belongs at the root.

Runtime Next.js server features are outside this architecture. The installed app loads exported assets, not a
Next.js development server.

Approval evidence: Owner instruction in this project conversation: “Now we need to set up Tauri properly, okay, with Next.js.”
The owner subsequently approved the proposed sibling source layout. This records those existing choices, not a new stack selection.

### Consequences

- Web UI components can call native operations through a defined bridge.
- Static export excludes request-time SSR, Server Actions, and API handlers from the installed app.
- Custom source placement requires matching frontend hooks and bundle paths; it does not require custom CLI wrappers.

### Confirmation

Check exported asset paths and native command consumers together when changing the boundary. Verify packaged
launch separately from frontend checks.

Implementation evidence: [Next configuration](../../packages/src-nextjs/next.config.ts), [Tauri configuration](../../packages/src-tauri/tauri.conf.json),
and [native command handlers](../../packages/src-tauri/src/lib.rs). See [architecture](../architecture.md).

Verification evidence: Static export and native bundling previously completed in this working tree. Installed Debian launch remains
unverified: the owner deferred installation testing. This is not a claim of Windows validation.

## Related decisions

- [Reference original materials and persist associations by ID](0002-local-material-references.md)
- [Separate the public Astro website from developer documentation](0004-independent-astro-website.md)
