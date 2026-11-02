# Native application

## Scope and internals

Source scope: `packages/src-tauri/`. Follow [shared working rules](../getting-started.md#working-rules).
This Rust crate owns native integration, trusted file access, and persisted study data.

| Area                                                       | Responsibility                                                      |
| ---------------------------------------------------------- | ------------------------------------------------------------------- |
| [Main](../../packages/src-tauri/src/main.rs)               | Platform startup and Linux rendering workaround                     |
| [Library entry](../../packages/src-tauri/src/lib.rs)       | Tauri setup, command handlers, plugin initialization                |
| [Persistence](../../packages/src-tauri/src/library.rs)     | SQLite access, validation, PDF ranges, relinking, drawing IO, tests |
| [Migrations](../../packages/src-tauri/migrations/)         | Numbered schema changes                                             |
| [Capabilities](../../packages/src-tauri/capabilities/)     | Window/plugin permission declarations                               |
| [Tauri config](../../packages/src-tauri/tauri.conf.json)   | Identity, frontend hooks/output, CSP, windows and bundling          |
| [Application metadata](../../packages/src-tauri/metadata/) | Standard Linux software-center identity, descriptions and links     |

The frontend consumes native commands through its [library](../../packages/src-nextjs/lib/library.ts) and
[drawing](../../packages/src-nextjs/lib/drawings.ts) bridges. Update both sides when changing a contract.
Blocking filesystem/database work is dispatched through Tauri's blocking runtime boundary.

## Local requirements

Preserve original files, stable IDs, validation, bounded range reads, atomic drawing replacement, and transactional
schema migration. Do not expose arbitrary path reads where registered IDs are expected. Permission changes require
an actual feature need and authorized scope; do not broaden capabilities to bypass a frontend defect.
[Storage](../storage.md) owns the data layout, supported failures, size limits, and removal behavior.

Exact dependencies and edition are in [Cargo.toml](../../packages/src-tauri/Cargo.toml); keep its lockfile consistent.
Use the repository's [Rust toolchain](../../rust-toolchain.toml) and native prerequisites from
[getting started](../getting-started.md). Schema or storage changes need explicit compatibility and recovery consideration.

## Window state and local diagnostics

The official Window State plugin restores the main window's size and maximized state after a normal exit.
It also restores position on Windows, macOS, and X11. On Linux sessions advertising `WAYLAND_DISPLAY` or
`XDG_SESSION_TYPE=wayland`, position is excluded because the compositor controls placement. Visibility,
decorations, and fullscreen are not persisted, so a saved state cannot hide the app or replace its custom title bar.
Window state is stored as `.window-state.json` in Tauri's application-config directory, normally
`~/.config/dev.hyperoot.locus/` on Linux. This does not restore open panes or replace saved reading positions.

The official Log plugin writes to the terminal and Tauri's application-log directory. On Linux this is
`$XDG_DATA_HOME/dev.hyperoot.locus/logs`, normally `~/.local/share/dev.hyperoot.locus/logs`;
Windows uses `%LOCALAPPDATA%/dev.hyperoot.locus/logs`, and macOS uses `~/Library/Logs/dev.hyperoot.locus`.
Files rotate at 1 MB with at most two archived files plus the active log.

Only the native command module's Info/Warn/Error records are accepted. Records contain startup/version and
generic operation failures, without study contents, document IDs, file paths, or raw error messages. Frontend
console output and dependency logs are not forwarded. Nothing is uploaded. No new frontend plugin permissions
or JavaScript packages are needed for these Rust-managed integrations. Errors still reach the existing UI.

Verify manually by resizing and maximizing the window, closing normally, and reopening; check that the log
contains a startup record. Check placement on X11/Windows separately. Compilation does not establish desktop
restoration or log-file behavior on an installed build.

## Development and verification

Working directory: repository root.

Development servers are started by the developer, not the agent. Follow the
[server ownership and handoff procedure](../getting-started.md#development-server-ownership).
If the required environment is unavailable, report it and wait for the developer to confirm startup before UI verification.

| Command          | Purpose and side effects                                                         |
| ---------------- | -------------------------------------------------------------------------------- |
| `mise run dev`   | Developer starts the application; native operations can change actual study data |
| `mise run lint`  | Formats Rust and applies frontend formatting/lint fixes; modifies source         |
| `mise run build` | Production frontend/native build and Debian package; writes generated output     |

CI runs `cargo fmt --all -- --check`, `cargo clippy --all-targets --locked -- -D warnings`, and
`cargo test --locked` from `packages/src-tauri/`. These checks write generated build/test artifacts.

The configured tests exercise persistence and file-validation behavior; they are in `src/library.rs`.
Run frontend checks for command/schema consumer changes. Test dialogs, normal close/save recovery, and installed
launch manually when affected. Packaged builds currently share the development app's data directory; do not use
important study data as disposable fixtures. [Releasing](../releasing.md) owns packaging and installation procedures.
