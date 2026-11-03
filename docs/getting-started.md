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
5. Install workspace dependencies with `npm ci`.

The npm and Cargo lockfiles belong in version control. Use `npm ci` for clean, repeatable installs.
Node.js follows `lts` in `mise.toml`, with the resolved release recorded in `mise.lock`. Refresh it deliberately
with `mise lock node --bump` when updating the toolchain. The package engine fields declare minimum supported
Node/npm versions rather than imposing a conflicting upper limit. The stable Rust channel follows
`rust-toolchain.toml` and is not frozen by `mise.lock`.

## Daily commands

Run from the repository root:

| When you need to…                                         | Run                |
| --------------------------------------------------------- | ------------------ |
| Develop the desktop app with Rust and frontend hot reload | `mise run dev`     |
| Build an installable Debian package                       | `mise run build`   |
| Format source and apply safe lint/import fixes            | `mise run lint`    |
| Preview the separate public website                       | `mise run website` |

The developer runs `mise run dev` in their own terminal and keeps it running during development. Frontend edits use Fast Refresh; Rust edits rebuild and
restart the application. Persisted library data survives restarts; unsaved interface state may reset.
If dependency/tooling changes or a stopped watcher require a restart, the developer restarts it.

Desktop development uses port 3000. Stop any conflicting server first. Tauri manages its own frontend
server and uses the configured port consistently for the window and live reload. Stop development with Ctrl+C.
The frontend's npm development script exists for Tauri's startup hook; a standalone browser has no Rust
backend and cannot manage the library or open local PDFs. It is not a separate supported daily workflow.
See [Storage](storage.md) for persistent data and removal behavior.

### Development-server ownership

The developer starts and owns the development environment. Agents do not run `mise run dev`, `mise run website`,
or equivalent direct npm/Tauri/Astro development commands. Do not launch a temporary server, use another port,
or start a background replacement to get around this rule.

For an agent task that needs the running app or website:

1. Use the existing developer-started environment. Read-only checks of its availability are allowed.
2. If it is not running or cannot be reached, report which environment is unavailable. Ask the developer to run
   `mise run dev` for the desktop app or `mise run website` for the public site.
3. Wait for the developer's response confirming that they started the environment before continuing dependent
   UI verification. Elapsed time is not confirmation. Verify availability after the response; report any remaining failure.
4. Continue independent edits, documentation, and non-server checks while waiting. Do not report UI verification
   as passed until it was actually performed. A frontend HTTP response alone does not prove the native app is ready.

Agents must not stop or restart the developer's environment unless explicitly asked. If a restart is needed,
report the reason and wait for the developer to restart it and confirm. Linting, type checks, tests, and production
builds are separate from starting a development server. If a production build would conflict with the running
checkout, ask the developer to stop it or use an isolated checkout; do not stop it yourself.

### Linux rendering

Locus disables WebKitGTK's DMA-BUF buffer path at startup to avoid confirmed scroll-position-dependent blur
in settings and PDFs. Accelerated compositing stays enabled; other platforms are unchanged.
The workaround also applies to packaged desktop builds. It may cost performance on otherwise unaffected systems.

Explicit environment values take precedence. To test the original DMA-BUF path, start with
`WEBKIT_DISABLE_DMABUF_RENDERER=0 mise run dev`.
`WEBKIT_DISABLE_COMPOSITING_MODE=1` was used only to diagnose the issue; do not keep that variable set
for normal development, since it disables accelerated compositing entirely.

In the PDF reader, click or Ctrl+click a document link to navigate within the current pane. External web
links open in the system browser. Hold Ctrl while scrolling over a PDF to zoom around the pointer;
release Ctrl to scroll normally. Wheel zoom switches out of fit-to-width or fit-to-height mode.

## Verification and builds

`mise run lint` modifies files. Biome handles supported web files, including complete Astro files, CSS with Tailwind
directives, SVG, YAML, and Markdown. Git-ignored output and generated package lockfiles are excluded. Astro
markup support is experimental in the pinned Biome version; keep Astro type checks as well. Rust formatting
remains with Cargo, and the existing Markdown, TOML, and shell hooks still apply. Review the diff before committing. CI separately checks Biome, frontend types,
Rust formatting, Clippy, and Rust tests without applying source fixes; see [the workflow](../.github/workflows/ci.yml).
For a documentation change, run relevant hooks with `prek run --files <changed-files>`.

`mise run build` exports the frontend and builds the native Debian package. The installed application does
not need a Next.js server or Node.js runtime. The developer stops the checkout's development server before a production build,
or build from an isolated checkout. See [Building and releasing](releasing.md) for prerequisites, output paths,
installation, and the release checklist. A successful build does not establish installed-app behavior.

## Structure and boundaries

| Path                                 | Responsibility                                                     |
| ------------------------------------ | ------------------------------------------------------------------ |
| `website/`                           | Standalone public Astro site and user-facing guides                |
| `docs/`                              | Developer documentation and architecture decisions                 |
| `scripts/`                           | Repository entry and setup scripts                                 |
| `packages/src-nextjs/app/`           | Next.js routes, root layout, and styles                            |
| `packages/src-nextjs/components/`    | Reusable React UI and client-side native integration               |
| `packages/src-nextjs/public/`        | Static assets and the source application icon                      |
| `packages/src-tauri/src/`            | Rust application entry points                                      |
| `packages/src-tauri/tauri.conf.json` | Desktop identity, window, development URL, build commands, and CSP |
| `packages/src-tauri/capabilities/`   | Permissions granted to specific windows                            |

The root npm manifest owns workspace membership, shared tooling dependencies, and dependency overrides.
Repository orchestration commands live in `mise.toml`; package-specific scripts stay with their packages.
Next.js configuration and dependencies belong to `packages/src-nextjs/`. Rust dependencies are managed separately
by `packages/src-tauri/Cargo.toml` and its Cargo lockfile; the Rust package does not need a `package.json`.
Run the commands above from the repository root.

Tauri's [documented default](https://v2.tauri.app/start/project-structure/) places the frontend at the root and Rust
in `src-tauri/`. Locus uses a custom layout to keep application code under `packages/` and leave room for shared packages.
The Mise desktop tasks run in `packages/src-tauri/` and invoke the official Tauri CLI directly.
Frontend hooks select the Next.js workspace through npm. The root `scripts/` folder contains only project
entry and setup shell scripts.
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
npm run ui --workspace @locus/nextjs -- add button
```

The interface fills the viewport, with an independently collapsible application rail and contextual navigation,
a compact top bar, and an unrestricted content pane. Expand a navigation column, then drag its right edge
or use the focused separator's arrow keys to adjust its width. The primary column is bounded to 208–320 px,
and the study tree to 208–448 px. The content pane keeps at least 320 px; available viewport space can further
limit expansion. Collapsed columns stay at 56 px and cannot be dragged. Each column restores its last user-selected
expanded width during the current session. Resizing the first column preserves the study tree's width when space allows.
On narrow screens the navigation moves into a sheet.
Desktop windows use a custom draggable title bar with the theme toggle, minimize, maximize/restore, and close controls.
The browser preview keeps ordinary browser controls. Sidebar toggles animate their widths over 200 ms (instantly with reduced motion enabled); PDF width fitting
is deferred until width changes settle, avoiding repeated renders during resizing.
Settings stays at the bottom of the application rail; Appearance groups light/dark palettes and Follow system.

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
Preferences has searchable categories and a Modified filter. Key Bindings offers shortcut recording,
conflict checks, and per-command reset. Ctrl+W (Command+W on macOS) closes the active pane; the last one becomes empty.
PDF scrollbars reserve their own lane; fit-to-width suppresses transient horizontal scrollbars during resizing.
Excalidraw Library is hidden. Ctrl+H (Command+H on macOS) toggles the full canvas interface, including tools, properties, and footer controls. See [Workbench](workbench.md) for command scopes and preferences.
PDF pins, typed-note editing, and top-bar resizing remain planned.

Excalidraw loads only on the client, following its Next.js integration. The root npm overrides constrain
selected transitive dependencies; inspect the current dependency audit when changing them rather than relying
on a historical advisory count.

## Repository tools and documentation

- Mise declares the tool versions and development tasks.
- prek runs repository checks; Commitizen checks Conventional Commit messages.
- rumdl, ShellCheck, and Tombi check Markdown, shell scripts, and TOML.
- `tombi format --offline` formats TOML without schema lookups.
- Developer documentation is Markdown in `docs/`; start at [the index](index.md).
- The independent Astro site lives in `website/` and has its own package and lockfile.
- Run `npm --prefix website ci`, then `mise run website` to preview it; `npm --prefix website run build` builds it.
- The public website uses [locus.hyperoot.dev](https://locus.hyperoot.dev/).

See the [contribution guide](https://github.com/HYP3R00T/Locus/blob/main/CONTRIBUTING.md) for the review workflow.

## Working rules

Follow [CONTRIBUTING.md](../CONTRIBUTING.md) for issue readiness, branches, ownership, and review. Preserve unrelated
changes and use a feature branch. Complete authorized implementation and verification without repeatedly asking
permission; authorization for one action does not imply authorization for a later publication step.

Do not stage, commit, push, open a PR, merge, release, deploy, or send external messages without explicit authorization
for that action. No unattended task execution, retry budget, or automated rollback policy is configured by these docs.
Report missing requirements or failed checks in the current task; continue independent authorized work. Do not change
policy to authorize your own pending action, bypass checks, or reset unrelated work to make validation pass.

The GitHub Project distinguishes Backlog, Ready, In Progress, In Review, Blocked, Done, and Not Planned. Ready means
approved and unblocked; review feedback remains In Review. A board status is not a grant of commit or release authority.

### Commands and side effects

Working directory: repository root. Repository task definitions live in [mise.toml](../mise.toml); package scripts live in their respective manifests.
Root [package.json](../package.json) declares workspace metadata and tooling dependencies. Hook definitions live in [.pre-commit-config.yaml](../.pre-commit-config.yaml),
formatting/lint rules in [biome.json](../biome.json), and CI in [.github/workflows/](../.github/workflows/).
The site uses its own [package and lockfile](../website/package.json); Cargo uses its own manifest and lockfile.

| Command                          | Check or modification                                                                  |
| -------------------------------- | -------------------------------------------------------------------------------------- |
| `npm ci`                         | Installs the app's locked dependencies; replaces root `node_modules/`                  |
| `mise run dev`                   | Starts desktop development; native operations can change study data                    |
| `mise run build`                 | Builds the native Debian package and generated frontend assets                         |
| `mise run lint`                  | Intentionally formats source and applies safe lint/import fixes                        |
| `prek run --all-files`           | Checks tracked files; some hooks fix whitespace/formatting; inspect the resulting diff |
| `npm --prefix website run check` | Checks the standalone website; writes generated type metadata                          |
| `npm --prefix website run build` | Builds static website output; no local publication                                     |

Untracked new files are not covered by `prek run --all-files`; pass them explicitly with `prek run --files` when
verifying an uncommitted change. Checks do not authorize dependency upgrades. Run only relevant verification and
distinguish formatting, type checks, tests, builds, and manual desktop behavior in the report. Unavailable platforms
and installed-app tests remain unverified until exercised; do not infer them from CI configuration or a successful build.

The Quality Gate caches npm downloads in both jobs and Rust dependencies/build artifacts for the native crate.
`npm ci` still installs the locked dependencies, and all checks run on cache hits. Rust cache keys account for
the compiler, manifests, lockfile, and build environment; a runner-baseline key keeps Ubuntu build artifacts
separate. Update that key when changing the Linux runner baseline. The first run populates caches; compare
later runs with matching keys to assess savings. System packages are installed fresh.
