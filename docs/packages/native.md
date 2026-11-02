# Native application

## Scope and internals

Source scope: `packages/src-tauri/`. Follow [shared working rules](../getting-started.md#working-rules).
This Rust crate owns native integration, trusted file access, and persisted study data.

| Area                                                     | Responsibility                                                      |
| -------------------------------------------------------- | ------------------------------------------------------------------- |
| [Main](../../packages/src-tauri/src/main.rs)             | Platform startup and Linux rendering workaround                     |
| [Library entry](../../packages/src-tauri/src/lib.rs)     | Tauri setup, command handlers, plugin initialization                |
| [Persistence](../../packages/src-tauri/src/library.rs)   | SQLite access, validation, PDF ranges, relinking, drawing IO, tests |
| [Migrations](../../packages/src-tauri/migrations/)       | Numbered schema changes                                             |
| [Capabilities](../../packages/src-tauri/capabilities/)   | Window/plugin permission declarations                               |
| [Tauri config](../../packages/src-tauri/tauri.conf.json) | Identity, frontend hooks/output, CSP, windows and bundling          |

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
