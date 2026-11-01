---
icon: lucide/terminal
---

# Initialize your Rust project

The template has no Cargo manifest or starter package. Choose the structure your project needs.
`rust-toolchain.toml` selects the stable Rust channel with the default profile, including rustfmt, Clippy, and local Rust docs.
`mise.toml` enables Mise to read that file and install Rustup and the requested toolchain when needed. Run `mise install`
after cloning. Keep Rust's channel, profile, components, and targets in `rust-toolchain.toml`, without a duplicate Rust entry
under Mise's `[tools]`.

Rustup also reads the same file when you run `cargo` directly. The `stable` channel moves over time; `mise.lock` does not
freeze its compiler version. Run `mise upgrade rust` to update it, then verify your project. If you need an exact compiler
version, set `channel` to that version in `rust-toolchain.toml`.

## Root package

From the repository root, choose one:

```bash
# Binary package (CLI or application).
cargo init --bin --name my-app .

# Library package.
cargo init --lib --name my-lib .
```

Cargo creates a root `Cargo.toml` and `src/` directory. Run a binary with `cargo run`, or test either package type
with `cargo test`. Set `license = "MIT"` in the package manifest if retaining the template's license,
and `publish = false` for a package that should stay private.

## Cargo workspace

First create the initial package from the repository root:

```bash
cargo new --bin --vcs none crates/my-app
```

For a library instead, use `cargo new --lib --vcs none crates/my-lib`.
`--vcs none` prevents Cargo from creating a nested Git repository; packages use the project's existing repository.
Then manually create a root `Cargo.toml` containing:

```toml
[workspace]
members = ["crates/*"]
resolver = "3"

[workspace.package]
edition = "2024"
license = "MIT"
```

In the initial package's `Cargo.toml`, replace its `edition` entry with `edition.workspace = true`
and add `license.workspace = true`. Set `publish = false` for packages that should stay private.
Keep at least one package in the workspace.

`crates/` is a directory convention, not the workspace's name. The root manifest defines the workspace.
Add more packages with `cargo new --bin --vcs none crates/my-cli` or `cargo new --lib --vcs none crates/my-lib`.
The `crates/*` pattern includes them automatically, so you don't need to edit the root manifest for each addition.
Check each package's manifest for the shared edition and license settings.

Run or test a package by the name in its `Cargo.toml`:

```bash
cargo run -p my-app
cargo test -p my-lib
```

Workspaces share a root `Cargo.lock` and `target/` directory.

## Add Rust checks

After initializing either structure, run `cargo generate-lockfile` and commit `Cargo.lock`.
Add this task to `mise.toml`:

```toml
[tasks.check]
description = "Check Rust formatting, lints, and tests"
run = [
  "cargo fmt --all -- --check",
  "cargo clippy --workspace --all-targets --locked -- -D warnings",
  "cargo test --workspace --locked",
]
```

Run `mise run check` locally. These commands work for a root package or a workspace.
Add a Rust job to `.github/workflows/ci.yml` that installs Rust through `jdx/mise-action@v4`
with `install_args: rust` and runs `mise run check`. The template's CI runs repository checks until you add that job.
Commit lockfile changes after adding packages or dependencies, and add tests for your application's behavior.
