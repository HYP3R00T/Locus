---
icon: lucide/rocket
---

# Getting started

## Requirements

Install Git, [Mise](https://mise.jdx.dev/getting-started.html), and the
[Tauri prerequisites for your operating system](https://v2.tauri.app/start/prerequisites/).
Mise manages Node.js and the repository tools; `rust-toolchain.toml` selects the Rust toolchain.

On Ubuntu, Debian, or Pop!_OS, install the native development libraries before running Tauri:

```bash
sudo apt update
sudo apt install build-essential pkg-config libwebkit2gtk-4.1-dev libssl-dev \
  libxdo-dev libayatana-appindicator3-dev librsvg2-dev libdbus-1-dev
```

macOS needs Xcode Command Line Tools. Windows needs the Microsoft C++ build tools and WebView2.
Use the official prerequisites guide for current platform-specific instructions.
Browser-only development does not need these native libraries.

## Set up Locus

1. Clone [Locus](https://github.com/HYP3R00T/Locus), or your fork, and enter the repository.
2. Review `mise.toml`, then run `mise trust mise.toml` and `mise install`.
3. Activate Mise in your shell, following its installation guide.
4. Run `bash scripts/enter_project.sh` to configure Git hooks and Commitizen.
5. Install workspace dependencies with `npm ci` (or `mise run install`).

The npm and Cargo lockfiles belong in version control. Use `npm ci` for clean, repeatable installs.
Node.js is pinned in `mise.toml`; the stable Rust channel follows `rust-toolchain.toml` and is not frozen by `mise.lock`.

## Local development

| Command | Purpose |
| --- | --- |
| `npm run dev` / `mise run dev` | Frontend on an available loopback port |
| `npm run desktop:dev` / `mise run desktop` | Desktop window with the same frontend and Rust runtime |

The browser server starts at port 3000 and automatically tries the next available port if it is occupied.
Open the **Local** URL printed in the terminal. An explicitly supplied `--port` or `PORT` disables Next.js fallback.

The desktop command starts and manages its own Next.js server. Its launcher selects an available port,
then supplies that same port to Next.js, Tauri's development URL, and the live-reload security policy.
There is no need to edit configuration when another application occupies port 3000. Stop development with Ctrl+C.
Only one Next.js development server can use this checkout at a time; stop the browser preview before starting desktop development.
Frontend changes reload automatically; Rust changes rebuild the desktop runtime.

The browser preview is useful for layout and frontend work. Native APIs are available only inside Tauri;
the version footer detects the desktop runtime before requesting its version.

The current screen is a foundation, not the PDF reader or drawing prototype. See
[Project direction](project-direction.md) for the next product milestone.

## Verification

```bash
npm run check
npm run build
npm run desktop:check
prek run --all-files
```

`npm run check` runs ESLint, TypeScript, and the development port regression test, generating Next.js route types before type checking.
`npm run build` exports the frontend to `packages/src-nextjs/out/`.
`npm run desktop:check` checks Rust formatting, runs Clippy with warnings as errors, and runs Rust tests.
It requires the native development libraries above. `mise run check` runs both frontend and Rust checks.

CI runs repository checks and Linux application checks. Other desktop platforms require their own verification.

The current Next.js lint preset's plugins declare compatibility with ESLint 9, so the scaffold pins that version.
It is deprecated upstream, and npm reports moderate advisories in the preset's development-only dependency tree.
Do not use `npm audit fix --force` to downgrade Next.js or force incompatible lint dependencies; revisit this pin
when the preset's plugins support the current ESLint major.

## Desktop builds

```bash
# Compile a local debug desktop executable without producing installers.
npm run tauri -- build --debug --no-bundle -- --locked

# Build an optimized executable and the host platform's installable bundles.
npm run desktop:build
```

Both commands build the static frontend first. The packaged application loads those assets without a Next.js
server or Node.js runtime. Build outputs live under `packages/src-tauri/target/`.
Use the host operating system for its bundles; this setup does not promise cross-compilation.
Signing, update distribution, and release publishing are not configured yet. These commands are local build
entry points for future release automation; they do not create a GitHub release.

## Structure and boundaries

| Path | Responsibility |
| --- | --- |
| `packages/src-nextjs/app/` | Next.js routes, root layout, and styles |
| `packages/src-nextjs/components/` | Reusable React UI and client-side native integration |
| `packages/src-nextjs/public/` | Static assets and the source application icon |
| `packages/src-tauri/src/` | Rust application entry points |
| `packages/src-tauri/tauri.conf.json` | Desktop identity, window, development URL, build commands, and CSP |
| `packages/src-tauri/capabilities/` | Permissions granted to specific windows |

The root npm workspace owns the shared `package-lock.json`, Tauri CLI dependency, and orchestration commands.
Next.js configuration and dependencies belong to `packages/src-nextjs/`. Rust dependencies are managed separately
by `packages/src-tauri/Cargo.toml` and its Cargo lockfile; the Rust package does not need a `package.json`.
Run the commands above from the repository root.

Tauri's [documented default](https://v2.tauri.app/start/project-structure/) places the frontend at the root and Rust
in `src-tauri/`. Locus uses a custom layout to keep application code under `packages/` and leave room for shared packages.
`scripts/tauri.mjs` uses the CLI's supported `TAURI_APP_PATH` and `TAURI_FRONTEND_PATH` variables to select the Rust
package and root orchestration directory explicitly. This avoids depending on automatic directory discovery.
Additional JavaScript packages can be added to the root `workspaces` list when needed.

The frontend uses Next.js static export, following the [Tauri integration guide](https://v2.tauri.app/start/frontend/nextjs/).
Runtime Server Actions, request-time SSR, and dynamic Next.js API handlers are not part of this design.
Local backend operations belong in Rust and are called through Tauri's bridge.

Only reading the application version is currently permitted. Add native permissions deliberately when a feature needs them.
Production CSP restricts scripts and connections to the application; development CSP additionally allows Next.js
live reload. Tauri injects hashes for bundled inline scripts. External fonts and CDN scripts are not required.

Application version comes from `package.json` in the Tauri configuration; keep the Cargo package version aligned
when preparing a release. `dev.hyperoot.locus` is the desktop application identifier.

## Repository tools and documentation

- Mise declares the tool versions and development tasks.
- prek runs repository checks; Commitizen checks Conventional Commit messages.
- rumdl, ShellCheck, and Tombi check Markdown, shell scripts, and TOML.
- `tombi format --offline` formats TOML without schema lookups.
- `mise run docs` previews the documentation; `uvx zensical build --clean` builds it.
- Published documentation uses [locus.hyperoot.dev](https://locus.hyperoot.dev/).

See the [contribution guide](https://github.com/HYP3R00T/Locus/blob/main/CONTRIBUTING.md) for the review workflow.
