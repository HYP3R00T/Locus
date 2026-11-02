---

status: accepted
date: 2026-11-03
scope: "development workflow"
---

# Use minimal Mise tasks and developer-owned development servers

Recorded retrospectively on the date above; the original approval date is not asserted.

## Context and problem statement

Duplicated npm orchestration, helper scripts, and many Mise aliases made routine work harder to navigate.
Browser-only development cannot exercise the Rust file/library backend. The owner manages the running environment.

## Decision drivers

- Few clear daily commands.
- Desktop development with the actual backend.
- No agent-owned development servers or background replacements.
- An LTS Node request with a recorded toolchain resolution.

## Considered options

- Custom CLI/port-selection scripts and many task aliases.
- Direct official commands behind a small Mise task list.
- Agent-started previews versus developer-owned development environments; exact Node pin versus LTS.

## Decision outcome

Keep root `package.json` declarative and put repository orchestration in `mise.toml`. Use `dev` for desktop
development, `build` for the Debian installer, and `lint` for formatting/safe fixes. Keep `website` separately
for the public site. Package-specific scripts remain in the packages. CI retains detailed verification directly.

The developer starts development servers. Agents use the existing environment; when unavailable, they report it
and wait for developer confirmation before dependent UI checks. Independent edits and non-server checks can
continue. Agents do not launch replacement or temporary development servers.

Request Node `lts` in Mise and record its resolved release in the lockfile. Deliberate toolchain updates still
need compatibility checks. Do not reintroduce custom Tauri launch/release helpers without an authorized need.

Approval evidence: Owner instructions in this project conversation: “We really don't need such a huge list of commands”;
“the dev server will be executed by the end user”; and “Stick with lts”. The owner explicitly requested removing
the development support scripts and documenting the startup handoff.

### Consequences

- Routine commands stay discoverable without mirroring every CI step as a task.
- Desktop startup currently requires the configured port to be free; automatic coordinated port selection was removed.
- UI verification can wait on developer startup. LTS updates can change major versions and require review.

### Confirmation

Validate the task list and documented references without starting servers. Check the resolved Node/npm
versions and preserve the explicit startup-confirmation boundary.

Implementation evidence: [Mise configuration](../../mise.toml), [root manifest](../../package.json),
[agent rules](../../AGENTS.md), and [startup handoff](../getting-started.md#development-server-ownership).

Verification evidence: Task references/dry runs, the combined lint task, frontend types, Rust formatting/Clippy/tests, and relevant
hooks passed during the preceding setup changes. The LTS alias resolved to the recorded installed release.
No server startup is needed to create this retrospective record.

## Related decisions

- [Desktop architecture and package layout](0001-desktop-architecture.md)
- [Separate the public Astro website from developer documentation](0004-independent-astro-website.md)
- [Use official Tauri bundling and start with local Debian testing](0006-debian-release-baseline.md)
