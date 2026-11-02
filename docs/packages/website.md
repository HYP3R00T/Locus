# Public website

## Scope

Source scope: `website/`. This standalone Astro site is not part of the app's npm workspace or desktop bundle.
Follow [shared working rules](../getting-started.md#working-rules) and [documentation maintenance](../documentation.md).

## Structure and local requirements

| Area                                           | Responsibility                                                      |
| ---------------------------------------------- | ------------------------------------------------------------------- |
| [Site config](../../website/data/config.ts)    | Product metadata and navigation                                     |
| [Layouts](../../website/src/layouts/)          | Shared SEO, header/footer, guide layout                             |
| [Components](../../website/src/components/)    | Template section frames, navigation, React UI and theme controls    |
| [Theme](../../website/src/styles/global.css)   | Template Tailwind design tokens and typography                      |
| [Pages](../../website/src/pages/)              | Product presentation, usage, roadmap, installation, changelog       |
| [Astro config](../../website/astro.config.mjs) | Tailwind, React, MDX, icons, code blocks, redirects and site domain |

Preserve the supplied template's theme and structure when making routine content changes. Site redesign is separate
scope. Keep implemented features, plans, and public downloads distinct; do not advertise untested installers.
The changelog route renders [the root changelog](../../CHANGELOG.md); do not create a second release-note source.
The [package](../../website/package.json) and its own lockfile own website dependencies. Do not merge them into the app.

## Development and verification

Working directory: repository root, unless noted.

Development servers are started by the developer, not the agent. Follow the
[server ownership and handoff procedure](../getting-started.md#development-server-ownership).
If the required environment is unavailable, report it and wait for the developer to confirm startup before UI verification.

| Command                          | Purpose and side effects                                                |
| -------------------------------- | ----------------------------------------------------------------------- |
| `npm --prefix website ci`        | Installs the locked site dependencies; modifies `website/node_modules/` |
| `mise run website`               | Developer starts Astro development; writes generated caches             |
| `npm --prefix website run check` | Astro/type checks; generates type metadata                              |
| `npm --prefix website run build` | Writes the static site to `website/dist/`                               |

Check affected routes, internal links, desktop/mobile navigation, and both themes using the developer-started site.
Do not start a temporary preview server. Production deployment is defined in [the website workflow](../../.github/workflows/website.yml);
a local check or build does not authorize publishing. Root Biome hooks format and lint Astro markup and embedded languages with experimental full HTML support,
and parse Tailwind directives. Astro checking remains necessary for framework-specific type diagnostics.
