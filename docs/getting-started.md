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

| Command                                    | Purpose                                                |
| ------------------------------------------ | ------------------------------------------------------ |
| `npm run dev` / `mise run dev`             | Frontend on an available loopback port                 |
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

Keep `mise run desktop` running during active development. It manages both the Next.js development server
and Rust application: frontend edits use Fast Refresh; Rust edits trigger an automatic rebuild and application
restart. You do not rerun the command for each edit. Persisted library data survives restarts; unsaved UI state
may reset. Restart the command after changing dependencies or development tooling, or if a watcher stops.

`mise run dev` is a layout-only browser preview. It has no Rust backend and cannot manage your library or open
local PDFs. Use desktop development for file/folder operations. See [Storage](storage.md) for persistence and removal behavior.

### Linux rendering

Locus disables WebKitGTK's DMA-BUF buffer path at startup to avoid confirmed scroll-position-dependent blur
in settings and PDFs. Accelerated compositing stays enabled; other platforms are unchanged.
The workaround also applies to packaged desktop builds. It may cost performance on otherwise unaffected systems.

Explicit environment values take precedence. To test the original DMA-BUF path, start with
`WEBKIT_DISABLE_DMABUF_RENDERER=0 mise run desktop`.
`WEBKIT_DISABLE_COMPOSITING_MODE=1` was used only to diagnose the issue; do not keep that variable set
for normal development, since it disables accelerated compositing entirely.

In the PDF reader, click or Ctrl+click a document link to navigate within the current pane. External web
links open in the system browser. Hold Ctrl while scrolling over a PDF to zoom around the pointer;
release Ctrl to scroll normally. Wheel zoom switches out of fit-to-width or fit-to-height mode.

## Verification

```bash
npm run check
npm run build
npm run desktop:check
prek run --all-files
```

`npm run check` runs the pinned project-local Biome formatter/linter/import checks and TypeScript.
Route types are generated before type checking.
Use `npm run format` for formatting and `npm run lint:fix` for safe lint/import fixes.
The pre-commit hook runs Biome on supported changed files; CI uses the same root check command.
`npm run build` exports the frontend to `packages/src-nextjs/out/`.
`npm run desktop:check` checks Rust formatting, runs Clippy with warnings as errors, and runs Rust tests.
It requires the native development libraries above. `mise run check` runs both frontend and Rust checks.

CI runs repository checks and Linux application checks. Other desktop platforms require their own verification.

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

| Path                                 | Responsibility                                                     |
| ------------------------------------ | ------------------------------------------------------------------ |
| `packages/src-nextjs/app/`           | Next.js routes, root layout, and styles                            |
| `packages/src-nextjs/components/`    | Reusable React UI and client-side native integration               |
| `packages/src-nextjs/public/`        | Static assets and the source application icon                      |
| `packages/src-tauri/src/`            | Rust application entry points                                      |
| `packages/src-tauri/tauri.conf.json` | Desktop identity, window, development URL, build commands, and CSP |
| `packages/src-tauri/capabilities/`   | Permissions granted to specific windows                            |

The root npm workspace owns the shared `package-lock.json`, Tauri CLI dependency, and orchestration commands.
Next.js configuration and dependencies belong to `packages/src-nextjs/`. Rust dependencies are managed separately
by `packages/src-tauri/Cargo.toml` and its Cargo lockfile; the Rust package does not need a `package.json`.
Run the commands above from the repository root.

Tauri's [documented default](https://v2.tauri.app/start/project-structure/) places the frontend at the root and Rust
in `src-tauri/`. Locus uses a custom layout to keep application code under `packages/` and leave room for shared packages.
`packages/src-tauri/scripts/tauri.mjs` uses the CLI's supported `TAURI_APP_PATH` and `TAURI_FRONTEND_PATH` variables to select the Rust
package and root orchestration directory explicitly. This avoids depending on automatic directory discovery.
The root `scripts/` folder contains only the project entry and setup shell scripts.
Additional JavaScript packages can be added to the root `workspaces` list when needed.

The frontend uses Next.js static export, following the [Tauri integration guide](https://v2.tauri.app/start/frontend/nextjs/).
Runtime Server Actions, request-time SSR, and dynamic Next.js API handlers are not part of this design.
Local backend operations belong in Rust and are called through Tauri's bridge.

Native permissions cover application version, custom window controls, and close-event handling so whiteboards save before normal exit. Add permissions deliberately when a feature needs them.
Production CSP restricts scripts and connections to the application; development CSP additionally allows Next.js
live reload. Tauri injects hashes for bundled inline scripts. External fonts and CDN scripts are not required.

Application version comes from `package.json` in the Tauri configuration; keep the Cargo package version aligned
when preparing a release. `dev.hyperoot.locus` is the desktop application identifier.

## Frontend components and theme

Locus uses [shadcn/ui](https://ui.shadcn.com/docs) with the
[selected preset `bddBUJXM`](https://ui.shadcn.com/create?preset=bddBUJXM): Lyra style, Zinc theme and base color,
Geist font, Lucide icons, and default radius. The component primitives use Base UI.

Configuration lives in `packages/src-nextjs/components.json`, generated components in `components/ui/`,
and theme tokens in `app/globals.css`, all within the Next.js package. Tailwind CSS v4 uses its PostCSS plugin.
Geist is bundled through Fontsource rather than fetched from Google during builds. The interface follows the
system color scheme until a light/dark preference is selected; the preference is saved locally.

Add components from the repository root using the pinned frontend CLI:

```bash
npm run ui -- add button
```

The interface fills the viewport, with an independently collapsible application rail and contextual navigation,
a compact top bar, and an unrestricted content pane. Expand a navigation column, then drag its right edge
or use the focused separator's arrow keys to adjust its width. The primary column is bounded to 208–320 px,
and the study tree to 208–448 px. The content pane keeps at least 320 px; available viewport space can further
limit expansion. Collapsed columns stay at 56 px and cannot be dragged. Each column restores its last user-selected
expanded width during the current session. Resizing the first column preserves the study tree's width when space allows.
On narrow screens the navigation moves into a sheet.
Desktop windows use a custom draggable title bar with the theme toggle, minimize, maximize/restore, and close controls.
The browser preview keeps ordinary browser controls. Sidebar toggles update layout immediately; PDF width fitting
is deferred until width changes settle, avoiding repeated renders during resizing.
Settings stays at the bottom of the application rail; Appearance offers System, Light, and Dark modes.

Create a workspace with the plus button in the application rail. Right-click the study tree to create a folder or add a PDF at the workspace root.
Right-click a folder to add PDFs there. PDF, folder, and workspace context menus offer display-name changes
and removal without inline action buttons. Drag PDFs into folders or onto empty tree space to move them to the
workspace root; the **Move to** context submenu is a keyboard-accessible alternative.
The reader scrolls continuously through all pages. Type a physical page number and press Enter to jump;
the field also tracks scrolling. The zoom dropdown offers fixed percentages, fit to width, and fit to height.
Fit modes follow viewport changes; zoom buttons switch to a fixed scale. Selectable text and encrypted-PDF passwords are supported.
The title-bar command center contains **Split Vertically**, **Split Horizontally**, **Open Material**, and **Close Active Pane**. The study area allows two columns,
each with up to two rows, for a maximum of four panes. Drag the dividers or focus them and use the arrow keys to resize.
Click a pane to target sidebar selections. Drag a PDF or whiteboard from the tree onto a pane edge to split,
or drag a pane cell from the title-bar map onto another pane to swap views. Wider dividers keep resize targets outside content scroll areas.
Splitting always creates an empty pane. Choose a material there or from the sidebar; opening the same PDF
in multiple panes still gives each view independent scrolling and zoom. A whiteboard has one live editor to avoid competing saves;
opening an already visible whiteboard focuses its existing pane.
Closing a pane leaves its PDFs attached. Layouts and individual pane positions last for the current workspace session;
switching workspaces or restarting resets the layout. Only the active pane updates the document's saved resume location.
Removal dialogs explain which references will disappear; original PDF files are never deleted.

`components/layout` owns the shell, `components/workspace` owns library interactions and PDF rendering,
`lib/library.ts` is the native-command/browser-preview boundary, and Rust owns persistent data.
The small `scripts/prepare-assets.mjs` inside the frontend package publishes PDF.js workers, fonts, character maps,
and decoding WASM to versioned local assets. Preparation runs before development/build, skips a completed
version, and retries incomplete copies. It also copies Excalidraw fonts for local use. These runtime files are needed offline; no CDN or extra service
is required. Generated assets remain ignored by Git.
The sidebar colors, spacing, and tree connectors follow Console. Container frames use small rounded corners and solid borders.
Right-click the study tree or use **New Whiteboard** in the command palette to create an Excalidraw whiteboard. Whiteboards autosave as standard
`.excalidraw` files and reopen from the tree. Normal window closing waits for saves; failed saves keep the window open.
The title bar also offers a pane map, split controls, and the command palette (Ctrl+Shift+P, or Command+Shift+P on macOS).
Preferences has separate Appearance, Key Bindings, and Canvas pages. Key Bindings offers shortcut recording,
conflict checks, and per-command reset. Ctrl+W (Command+W on macOS) closes the active pane; the last one becomes empty.
PDF scrollbars reserve their own lane; fit-to-width suppresses transient horizontal scrollbars during resizing.
Excalidraw Library is hidden. Alt+P toggles the full canvas interface, including tools, properties, and footer controls. See [Workbench](workbench.md) for command scopes and preferences.
PDF pins, typed-note editing, and top-bar resizing remain planned.

Excalidraw loads only on the client, following its Next.js integration. The root npm overrides update its
Lodash and Nano ID dependencies to patched versions. The current runtime audit still reports four inherited
low-severity entries from Mermaid/KaTeX; it reports no moderate, high, or critical runtime advisories.

## Repository tools and documentation

- Mise declares the tool versions and development tasks.
- prek runs repository checks; Commitizen checks Conventional Commit messages.
- rumdl, ShellCheck, and Tombi check Markdown, shell scripts, and TOML.
- `tombi format --offline` formats TOML without schema lookups.
- `mise run docs` previews the documentation; `uvx zensical build --clean` builds it.
- Published documentation uses [locus.hyperoot.dev](https://locus.hyperoot.dev/).

See the [contribution guide](https://github.com/HYP3R00T/Locus/blob/main/CONTRIBUTING.md) for the review workflow.
