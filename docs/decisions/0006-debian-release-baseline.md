---

status: accepted
date: 2026-11-03
scope: "distribution"
---

# Use official Tauri bundling and start with local Debian testing

Recorded retrospectively on the date above; the original approval date is not asserted.

## Context and problem statement

The owner needs a locally installable build for testing before public distribution. Other installer formats
were discussed, but maintaining several packaging paths is not the current goal.

## Decision drivers

- Produce a native Debian installer for local testing.
- Use official Tauri packaging rather than a custom release script.
- Keep building, testing, and publishing separate actions.

## Considered options

- Debian, AppImage, Flatpak, and Windows installers.
- Custom release/version scripting versus official Tauri build/bundle commands.
- Immediate public distribution versus a local test package first.

## Decision outcome

Use Tauri's official CLI and bundle configuration for packaging. Focus current local testing on Debian; defer
Windows and other formats without abandoning platform portability. Do not add a bespoke release script merely
to wrap the official process. Preparing or building a package does not authorize publication.

The current release procedure keeps user-facing notes manually in root `CHANGELOG.md` and versions in the
existing manifests. No Changesets adoption or permanent rejection was agreed; future changelog automation is
a separate choice if it becomes useful.

Approval evidence: Owner instructions in this project conversation: “We are only focusing on Debian at the moment so that I could
test it locally” and “You don't need to set up a separate release script.” The owner deferred the installation
check with “I’ll test installation later”.

### Consequences

- Local builds provide a concrete artifact without requiring release credentials or a public release.
- Linux library compatibility depends on the build baseline; other distributions and platforms need their own tests.
- Version/changelog preparation remains manual for now. Installed behavior must be tested before calling a package ready for distribution.

### Confirmation

Build the DEB, inspect package contents/dependencies, and separately test installation and launch without a
development server. Publishing requires explicit approval and a tested artifact.

Implementation evidence: [Release guide](../releasing.md), [Mise build task](../../mise.toml),
[Tauri bundle configuration](../../packages/src-tauri/tauri.conf.json), and
[manual Debian workflow](../../.github/workflows/debian.yml).

Verification evidence: A local DEB was built, inspected, extracted, and checked for unresolved shared libraries earlier in this
working tree. Installation and installed-app launch remain deferred by the owner. The GitHub workflow has not
been claimed as executed, and no public release was created.

## Related decisions

- [Desktop architecture and package layout](0001-desktop-architecture.md)
- [Separate the public Astro website from developer documentation](0004-independent-astro-website.md)
- [Use minimal Mise tasks and developer-owned development servers](0005-minimal-developer-workflow.md)
