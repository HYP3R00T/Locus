# Decision records

These records capture choices explicitly approved by the project owner in this project conversation. They were
written retrospectively on 2026-11-03; that is the recording date, not an invented original approval date.
Each record includes the relevant owner instruction and separates the decision from implementation and verification.
Their wording remains reviewable with the current uncommitted change.

| Record                                                                                                     | Status   | Scope                     |
| ---------------------------------------------------------------------------------------------------------- | -------- | ------------------------- |
| [0001: Desktop architecture and package layout](0001-desktop-architecture.md)                              | Accepted | desktop                   |
| [0002: Reference original materials and persist associations by ID](0002-local-material-references.md)     | Accepted | storage                   |
| [0003: Keep independent study usable without AI](0003-ai-free-study-core.md)                               | Accepted | product                   |
| [0004: Separate the public Astro website from developer documentation](0004-independent-astro-website.md)  | Accepted | website and documentation |
| [0005: Use minimal Mise tasks and developer-owned development servers](0005-minimal-developer-workflow.md) | Accepted | development workflow      |
| [0006: Use official Tauri bundling and start with local Debian testing](0006-debian-release-baseline.md)   | Accepted | distribution              |

## What is not settled

Precise PDF anchors and pin schemas, Markdown filenames/wiki-link identity, configurable storage roots, relocation,
and optional agent/provider integration remain open. Do not infer an accepted implementation contract for them
from these records. Debian installation is still awaiting the owner's manual test.

## Adding decisions

Use the [minimal MADR template](template.md) for significant choices whose rationale should survive implementation.
New decisions begin as proposed; acceptance requires actual approval evidence. Record implementation and
verification separately. Routine commands and configuration flags belong in their guides, not one ADR per setting.
Continue the numeric sequence and keep names stable. Superseding decisions must link both records without
silently erasing the original rationale. Retrospective records must identify their historical approval evidence.
