---

status: accepted
date: 2026-11-03
scope: "website and documentation"
---

# Separate the public Astro website from developer documentation

Recorded retrospectively on the date above; the original approval date is not asserted.

## Context and problem statement

The former documentation site served technical material but did not provide the desired product presentation.
The owner supplied an Astro template whose structure, theme, and Tailwind integration should be reused.

## Decision drivers

- A public product website with the supplied visual foundation.
- Developer architecture and setup notes retained as Markdown.
- No coupling between website dependencies and the installed app.

## Considered options

- Keep the former Zensical documentation site.
- Use Astro inside `docs/` and replace the developer Markdown.
- Use an independent `website/` Astro project and retain developer documentation in `docs/`.

## Decision outcome

Keep the template-based Astro project in root `website/`, with its own package and lockfile. Retain its theme,
Tailwind integration, and layout conventions when adapting product content. Keep developer setup, architecture,
and decision records in `docs/`. Do not add the website to the application's npm workspace or desktop build.

Root-level repository tooling is shared rather than copied into the website. The public site renders the root
`CHANGELOG.md` so release notes have one source. Developer filenames use lowercase.

Approval evidence: The owner requested moving Astro to `website/` while restoring developer Markdown, then approved it with:
“All right, let's do that then. Change all the references and everything everywhere.” The owner separately
required using the supplied template's structure and Tailwind theme.

### Consequences

- Public usage guidance and internal architecture have distinct audiences and locations.
- Website dependencies and builds are independent; both sets of links and workflows need maintenance.
- A redesign or new documentation engine is separate work, not implied by routine content edits.

### Confirmation

Check website isolation, local links, Astro types/build, and the root changelog import. Verify navigation and
themes against the developer-started preview when interface behavior changes.

Implementation evidence: [Website guide](../../website/README.md), [Astro configuration](../../website/astro.config.mjs),
[root workspace manifest](../../package.json), and [website workflow](../../.github/workflows/website.yml).

Verification evidence: Astro checking and static builds passed after the move and expanded Biome coverage. Template navigation and
themes were exercised earlier in this working tree. No website deployment was performed by these checks.

## Related decisions

- [Desktop architecture and package layout](0001-desktop-architecture.md)
- [Use minimal Mise tasks and developer-owned development servers](0005-minimal-developer-workflow.md)
- [Use official Tauri bundling and start with local Debian testing](0006-debian-release-baseline.md)
