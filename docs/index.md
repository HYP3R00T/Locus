# Locus

Developer documentation for Locus, a local workspace for study and research.

The standalone public website lives in [`website/`](../website/README.md) and is published at
[locus.hyperoot.dev](https://locus.hyperoot.dev/). This directory records development setup, architecture,
implementation details, and proposals; it is not a second published documentation site.

**Implemented:** referenced PDFs, persistent whiteboards, saved reading positions, resizable panes,
commands, and preferences. PDF pins, Markdown editing, and agents remain planned.

## Start here

- [Architecture](architecture.md): implemented units, ownership, relationships, and contracts.
- [Documentation maintenance](documentation.md): authoritative homes, update rules, and expansion.
- [Decision records](decisions/index.md): accepted choices, rationale, approval evidence, and unresolved boundaries.
- [Project direction](project-direction.md): planned workflow, architecture boundaries, and prototype acceptance criteria.
- [Storage](storage.md): file references, SQLite schema, and removal behavior.
- [Workbench](workbench.md): command dispatch, pane layout, preferences, and rendering.
- [Releasing](releasing.md): versioning, changelog, and Debian packaging.
- [Getting started](getting-started.md): commands, setup, developer-owned servers, and verification.
- [Contributing](../CONTRIBUTING.md): contribution and review workflow.

## Maintaining these documents

Update implementation notes with the code. Label proposals and acceptance criteria that are not implemented.
Keep public usage instructions in `website/` and release notes in the root [changelog](../CHANGELOG.md).
Record future architecture decisions in this directory, with the decision, rationale, and consequences.

## Package map

| Unit               | Source scope                           | Guide                                 |
| ------------------ | -------------------------------------- | ------------------------------------- |
| Desktop frontend   | `packages/src-nextjs/`                 | [Frontend](packages/frontend.md)      |
| Native application | `packages/src-tauri/`                  | [Native](packages/native.md)          |
| Public website     | `website/`                             | [Website](packages/website.md)        |
| Shared tooling     | Root manifests, `scripts/`, `.github/` | [Getting started](getting-started.md) |

For routine work, read shared working rules, architecture, and the affected guide. For a contract change, read both
producer and consumer guides. For documentation work, read the maintenance guide. The [package template](packages/template.md)
is only an authoring aid; it does not describe an implemented package.
