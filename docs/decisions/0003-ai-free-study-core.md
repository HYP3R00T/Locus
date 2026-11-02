---

status: accepted
date: 2026-11-03
scope: "product"
---

# Keep independent study usable without AI

Recorded retrospectively on the date above; the original approval date is not asserted.

## Context and problem statement

The owner wants an organized place to read, write, and solve problems independently. Agent-driven probing,
planning, or tutoring could create distraction, cost, and provider dependencies.

## Decision drivers

- Reading and handwritten working must stand on their own.
- No AI account or subscription should be required for core use.
- Any later assistance should use deliberately selected context rather than entire books by default.

## Considered options

- Build an AI tutor with learning plans, probing, and teaching modes.
- Build the study workspace first, with optional contextual assistance considered later.

## Decision outcome

Keep the study core usable without AI. Do not make tutoring, provider authentication, or agent orchestration
part of the reading/drawing requirements. Optional assistance may be considered later using selected pages,
excerpts, or snapshots, but it is not a current implementation commitment.

No Pi Durable integration, provider, subscription mechanism, mastery graph, or learning-measurement schema has
been selected by this decision.

Approval evidence: Owner instruction in this project conversation: “let's not create an AI tutor, but we could create an AI assistant.”
The owner also stated that installation and independent study should not require AI.

### Consequences

- The app remains useful without network access to an AI service.
- A future assistant needs a separate proposal for context access, provider boundaries, and user control.
- The existing app should not be described as measuring understanding or teaching the user.

### Confirmation

Core reading, drawing, and persistence must work without AI configuration. Review any proposed AI feature
against this boundary before introducing dependencies or data transmission.

Implementation evidence: The current [frontend manifest](../../packages/src-nextjs/package.json),
[native entry point](../../packages/src-tauri/src/lib.rs), and [project direction](../project-direction.md)
describe the study workspace; agent integration is not implemented.

Verification evidence: There is no implemented assistant or tutor to verify. Automated library checks cover persistence, not learning
outcomes. Offline installed-app behavior still requires the deferred manual installation test.

## Related decisions

- [Reference original materials and persist associations by ID](0002-local-material-references.md)
