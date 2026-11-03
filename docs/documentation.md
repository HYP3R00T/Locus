# Documentation maintenance

## One home for each responsibility

| Information                                  | Authoritative home                                                                 |
| -------------------------------------------- | ---------------------------------------------------------------------------------- |
| Short product introduction                   | [Root README](../README.md)                                                        |
| Public presentation, usage, and plans        | [Website](../website/README.md), `website/src/pages/`                              |
| Completed user-visible changes               | [Root changelog](../CHANGELOG.md), maintained manually and rendered by the website |
| Global agent instructions and reading routes | [AGENTS.md](../AGENTS.md)                                                          |
| Developer navigation and package scopes      | [Index](index.md)                                                                  |
| Setup, commands, shared working rules        | [Getting started](getting-started.md)                                              |
| Cross-unit ownership and contracts           | [Architecture](architecture.md)                                                    |
| Package internals and local checks           | [Package guides](index.md#package-map)                                             |
| Persistence details and workbench behavior   | [Storage](storage.md), [workbench](workbench.md)                                   |
| Configuration files and theme format         | [Configuration](configuration.md)                                                  |
| Versioning and Debian packaging              | [Releasing](releasing.md)                                                          |
| Significant tradeoffs and approvals          | [Decision records](decisions/index.md)                                             |
| Exact versions, interfaces, and task bodies  | Source, migrations, manifests, configuration, and tests                            |

The website and developer docs serve different readers. Link shared facts rather than duplicating manuals.
Keep developer Markdown filenames lowercase. Keep the established root README, changelog, and contribution files.

## Updating guidance

1. Identify affected units, contracts, requirements, and source evidence.
2. Update current guidance in the same reviewable change when behavior or workflow changes.
3. Add public usage changes to the website and completed user-visible changes to `Unreleased` when applicable.
4. Verify local links, source scopes, and configured Markdown checks. Inspect formatter changes.
5. Report what was updated and what remains uncertain, or explain why no documentation update was needed.

A code change requires an assessment, not an automatic documentation edit. Do not copy source listings, maintain
activity diaries, repeat exact dependency versions, or preserve stale audit counts as current facts.

## Expansion and decisions

- For a real new unit, copy [the package template](packages/template.md), register its source scope in the index,
  and update architecture when relationships change. Do not create guides for hypothetical packages.
- For a significant tradeoff, use [the decision template](decisions/template.md). Start as proposed; acceptance
  requires actual approval evidence. Approval, implementation, and verification are separate facts.
- Preserve accepted decision history. Supersede with a linked replacement rather than silently rewriting rationale.
- Add a detailed feature specification only when an issue cannot capture the requirements clearly. Label it
  proposed, approved, implemented, or retired; do not maintain it as a duplicate current-state manual.
- Split an oversized guide only when needed, updating all inbound routes and links together.

Source describes implementation, requirements describe intent, and tests establish only the behavior they cover.
Identify whether a disagreement is stale prose, a defect, or an unresolved choice; do not rewrite intent to hide bugs.
Documentation edits do not grant permissions, release authority, or unattended execution rights.
