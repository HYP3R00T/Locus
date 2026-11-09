# Desktop frontend

## Scope

Source scope: `packages/src-nextjs/`. Follow [shared working rules](../getting-started.md#working-rules)
and [architecture](../architecture.md). Rust owns persistence; this package owns presentation and interaction.

## Source map and contracts

| Area                                                                      | Responsibility                                               |
| ------------------------------------------------------------------------- | ------------------------------------------------------------ |
| [App](../../packages/src-nextjs/app/)                                     | Routes, global layout, theme, and Tailwind styles            |
| [Layout components](../../packages/src-nextjs/components/layout/)         | App shell, navigation, title bar, normal close lifecycle     |
| [Workspace components](../../packages/src-nextjs/components/workspace/)   | Library actions, React-PDF reader, Excalidraw editor         |
| [Workbench components](../../packages/src-nextjs/components/workbench/)   | Command registry, preferences, shortcuts, title-bar controls |
| [Library bridge](../../packages/src-nextjs/lib/library.ts)                | Typed native actions and desktop/browser boundary            |
| [Drawing bridge](../../packages/src-nextjs/lib/drawings.ts)               | Ordered saves, pending edits, flush registration             |
| [Layout model](../../packages/src-nextjs/lib/study-layout.ts)             | Pane transformations and limits                              |
| [Asset preparation](../../packages/src-nextjs/scripts/prepare-assets.mjs) | Local PDF.js and Excalidraw runtime assets                   |

Keep the native bridge synchronized with Rust command names and serialized fields. Preserve stable material IDs,
independent PDF view state, one live editor per whiteboard, and failed-save recovery. Browser preview must remain
explicitly without a library backend. Do not introduce mock study data or upload behavior to disguise that boundary.

[Workbench](../workbench.md) owns interaction and preference details; [storage](../storage.md) owns persisted semantics.
The configuration provider consumes Rust-owned settings, scans themes while visible, and applies per-token palette fallback; [Configuration](../configuration.md)
owns its native bridge, migration, and recovery contract. Update both sides when changing these file schemas.
The [package manifest](../../packages/src-nextjs/package.json), [Next config](../../packages/src-nextjs/next.config.ts),
and [UI config](../../packages/src-nextjs/components.json) own exact dependencies, static export, and component setup.
Do not add request-time Next.js server features to the desktop architecture without an explicit architecture change.

## Development and verification

Working directory: repository root.

Development servers are started by the developer, not the agent. Follow the
[server ownership and handoff procedure](../getting-started.md#development-server-ownership).
If the required environment is unavailable, report it and wait for the developer to confirm startup before UI verification.

| Command          | Purpose and side effects                                                          |
| ---------------- | --------------------------------------------------------------------------------- |
| `mise run dev`   | Developer starts frontend plus Rust; native operations can change user study data |
| `mise run lint`  | Formats source and applies safe lint/import fixes; inspect the diff               |
| `mise run build` | Exports frontend assets and builds the native Debian installer                    |

CI runs `npm exec -- biome check .` and `npm run typecheck --workspace @locus/nextjs` from the repository root.
These checks do not apply source fixes; TypeScript checking generates framework route types.

Have the developer stop the checkout's development server before a production build, or use an isolated checkout. For bridge changes,
run native checks and exercise real desktop behavior as appropriate. Type checks do not prove file dialogs, rendering,
input devices, or save recovery. There is no separate frontend behavior-test command configured in the manifest.
Update this guide for local ownership changes, workbench/storage for behavior, and the public guide for usage changes.

Settings metadata and search live in `lib/settings.ts`. Shared settings rows render the same controls in
category pages and filtered results. Navigation is a flat list of implemented setting categories.

Use the shared `components/ui/checkbox` for standalone checkbox controls. Menu checkbox items keep their
existing Base UI menu primitives so menu keyboard behavior is preserved.

`lib/startup-timing.ts` emits bounded, deduplicated startup markers through a native command. The startup loading
layer records final readiness and reveal; PDF/whiteboard components record lazy imports, parsing, and painting.
Only fixed phases, elapsed milliseconds, anonymous pane slots, and a random navigation ID cross this bridge.
Diagnostics are fire-and-forget, never block startup, stop after reveal, and do nothing in the browser preview.
Navigation response start/end and DOM-interactive timestamps distinguish document delivery from frontend mounting.
The collector survives Fast Refresh and stops after reveal. Compare actual launches, not hot reloads;
keep cold development-route compilation separate from warm launches. Detailed investigation probes have been removed.

The PDF entry point dynamically imports `pdf-reader-content.tsx` without SSR. That component owns the
React-PDF document lifecycle, native range transport, virtualized page layers, links, zoom, and position saves.
`lib/pdf-layout.ts` contains page geometry and anchor conversion shared by scrolling and restoration.
Keep the direct PDF.js dependency aligned with React-PDF's engine so the local worker matches its API.
