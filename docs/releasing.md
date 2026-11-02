# Building and releasing Locus

Locus uses one application version and a user-facing [changelog](../CHANGELOG.md). The Astro website in `website/`
is independent: it has its own package and lockfile, and is not part of the desktop build.

## Record changes as you work

Add completed, user-visible changes under `Unreleased` in `CHANGELOG.md` as part of the feature or fix PR.
Use `Added`, `Changed`, `Fixed`, `Removed`, or `Security` when applicable. Describe what a reader can do
or what now behaves better, rather than listing files or commit subjects.

Keep ideas and unfinished work on the website's Progress page. Do not put promises or delivery dates into
release notes. The changelog describes completed work; a dated entry means a version was prepared,
not that an installer has been published. GitHub Releases is the public download record.

## Versions

Use `MAJOR.MINOR.PATCH`, following [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
For Locus, compatibility includes saved study data, portable file formats, and documented user workflows.
While the app is below 1.0, use a new minor version for substantial features or compatibility changes,
and a patch version for compatible fixes. Describe any required migration clearly. Use prereleases
such as `0.2.0-alpha.1` when appropriate. Installer versions do not use `+build` metadata.

Follow Tauri's [distribution guide](https://tauri.app/distribute/) and
[Debian packaging guide](https://tauri.app/distribute/debian/). Tauri's CLI handles building and bundling;
there is no custom release script.

Tauri's `version` configuration points to the root `package.json`, which is a supported way to read the
application version. Before a release, update the npm package versions and lockfile with npm's built-in command:

```bash
# Replace 0.2.0 with the version being prepared.
npm version 0.2.0 --workspaces --include-workspace-root --no-git-tag-version
```

Set `[package].version` in `packages/src-tauri/Cargo.toml` to the same value. Run
`cargo check --manifest-path packages/src-tauri/Cargo.toml` to update the local package's Cargo lock entry,
then review the diff. The app's `getVersion()` API reports the version configured through Tauri.
The independent website package is not versioned with the app.

Move the completed notes from `Unreleased` into `## X.Y.Z - YYYY-MM-DD` and leave a fresh `Unreleased`
section for future changes. Review these changes in a PR before tagging or publishing anything.

## Set up the local build

Run the commands in this guide from the repository root unless a step explicitly changes directories.

Install [Mise](https://mise.jdx.dev/getting-started.html), activate it in your shell, then run `mise trust`
and `mise install` in the checkout. The Rust toolchain is selected by `rust-toolchain.toml`.
On Debian, Ubuntu, or Pop!_OS, install native development requirements:

```bash
sudo apt update
sudo apt install build-essential pkg-config libwebkit2gtk-4.1-dev libssl-dev \
  libxdo-dev libayatana-appindicator3-dev librsvg2-dev libdbus-1-dev
npm ci
bash scripts/enter_project.sh
```

Keep the native packages installed for future builds. The website's dependencies are not required.

## Build a Debian installer

```bash
mise run build
```

The package is written to `packages/src-tauri/target/release/bundle/deb/`. It includes the exported frontend
and the native application; it does not need a Next.js server or Node.js after installation. System
libraries such as WebKitGTK remain runtime dependencies, which the Debian package declares.

Production Next.js builds use the same frontend output tree as development. The developer stops their development server
before building in that checkout, or build from a separate clean checkout with `npm ci`. Do not point its
`node_modules` at another checkout: Turbopack requires dependencies inside its project filesystem root.
An isolated checkout lets the ongoing desktop development session remain open.

A package built on your machine may need newer system libraries than an older Debian or Ubuntu release
provides. For distributable builds, use a consistent baseline. The manual installer workflow uses Ubuntu
22.04; installing on other distributions still needs testing. A local build is not automatically a release.

### Application metadata

Tauri's bundle configuration supplies the publisher, license, descriptions, homepage, and Debian section.
Cargo's author supplies the Debian maintainer name. Keep these identities consistent when changing ownership.
The package also installs the existing license under `/usr/share/doc/locus/copyright`.

[AppStream metadata](../packages/src-tauri/metadata/dev.hyperoot.locus.metainfo.xml) is maintained in
`packages/src-tauri/metadata/` and installed under `/usr/share/metainfo/`. It describes the developer,
features, categories, search keywords, and homepage, help, issue tracker, and source links using the
[standard Linux format](https://www.freedesktop.org/software/appstream/docs/sect-Metadata-Application.html).
Its launchable ID must match Tauri's generated `Locus.desktop` entry. Software centers decide which fields
to display and may show less information for a local DEB than for a repository catalog entry.

After changing metadata, extract the generated package into a temporary directory and validate its contents:

```bash
dpkg-deb --extract packages/src-tauri/target/release/bundle/deb/Locus_0.1.0_amd64.deb /tmp/locus-package-check
appstreamcli validate-tree --no-net /tmp/locus-package-check
desktop-file-validate /tmp/locus-package-check/usr/share/applications/Locus.desktop
```

Use the actual package filename and a fresh temporary directory. These validators are provided by the
`appstream` and `desktop-file-utils` packages. Screenshots, content ratings, and dated release entries
are not supplied yet; add them only when assessed or available, without inventing publication history.

## Install and test locally

Use your actual generated filename:

```bash
sudo apt install ./packages/src-tauri/target/release/bundle/deb/Locus_0.1.0_amd64.deb
```

Then open Locus from your application launcher. Check the displayed version, add an existing PDF, scroll,
follow internal and external links, zoom with Ctrl+scroll, create a whiteboard, and close/reopen the app.
Check that the reading position and drawing survive. Also test launching without a development server.
No sample books or drawings are required or added to the repository.

Development and packaged builds currently use the same application identifier and data directory. Back up
important study data, and avoid editing the same whiteboard concurrently in both builds. Uninstalling the
package with `sudo apt remove locus` does not remove your original PDFs or your application data.

## Build an installer in GitHub Actions

After this workflow is merged, choose **Build Debian installer → Run workflow** in GitHub Actions. Select
the branch to build. The workflow checks the frontend and Rust, builds the DEB, checks
its archive, and uploads it with `SHA256SUMS` as a workflow artifact. The artifact name includes the source
commit. It expires after 14 days and is not a public download or a GitHub Release.

Only Debian packaging is configured. Windows, AppImage, and Flatpak distribution remain separate work.
No signing credentials or release publishing permissions are required by this build workflow.

## Publish only when ready

1. Review the dated notes and prepare the version in a PR.
2. Merge the approved PR and build the exact merged revision.
3. Install and test that installer. Check its version, architecture, and dependencies.
4. Create the matching `vX.Y.Z` tag and a draft GitHub Release for that revision.
5. Attach the tested installer and checksum, paste the version's changelog entry, then review and publish manually.

Copy the matching version's notes directly from `CHANGELOG.md` into the draft release.

Do not relabel an older artifact with a new version or publish untested platform builds. This process has
no automatic upload, public release, signing, or in-app updater. Add those independently when needed.

## Maintain the public website

```bash
cd website
npm ci
npm run dev
npm run check
npm run build
```

`website/` is a standalone Astro project based on the supplied Astro template. It serves the landing page,
user guide, progress page, and the root changelog. GitHub Pages builds and deploys the static `website/dist/`
on changes merged to `main`. The domain remains `locus.hyperoot.dev`.

Keep working features, planned features, and public downloads distinct. Replace the workspace illustration
with a real screenshot only when it contains material suitable for public distribution. A recorded introduction
can be added later; no placeholder video or download is advertised now.
