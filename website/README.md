# Locus website

Standalone Astro site based directly on [astro-project-template](https://github.com/HYP3R00T/astro-project-template)
(commit `517f110`). The template's Tailwind theme, section frames, typography, React integration, shadcn components,
header, mobile menu, footer, and MDX/code-block pipeline are retained. Product content and branding are adapted for Locus.

```bash
cd website
npm ci
npm run dev
npm run check
npm run build
```

The developer starts the preview server. Agents use the existing instance; if it is unavailable, they report it
and wait for developer confirmation instead of starting a server. See the
[development-server handoff](../docs/getting-started.md#development-server-ownership).

Configuration lives in `data/config.ts`, shared theme tokens in `src/styles/global.css`, reusable components in
`src/components/`, layouts in `src/layouts/`, and routes in `src/pages/`. `components.json` configures shadcn for this site.

Developer documentation and architecture notes live in [`docs/`](../docs/index.md).
The site has its own package and lockfile. It is not an app workspace or part of the desktop build.
Repository workflows, Mise, formatting, hooks, and licensing stay at the repository root rather than being duplicated.
The root `CHANGELOG.md` is rendered by the changelog page. GitHub Pages publishes `website/dist/` at `locus.hyperoot.dev`.
