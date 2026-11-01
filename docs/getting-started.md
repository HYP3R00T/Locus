---
icon: lucide/rocket
---

# Getting started

## Requirements

Install Git and [Mise](https://mise.jdx.dev/getting-started.html) on your development machine.

## Set up Locus

1. Clone [Locus](https://github.com/HYP3R00T/Locus), or your fork of it.
2. Open a terminal in the repository root.
3. Review `mise.toml`, then run `mise trust mise.toml` and `mise install`.
4. Activate Mise in your shell, following its installation guide.
5. Run `bash scripts/enter_project.sh` to configure Git hooks and Commitizen.
6. Run the environment checks below.

Application scaffolding is not present yet. See [Project direction](project-direction.md) for the planned
Tauri, Next.js, and Rust boundaries; there is no application to launch at this stage.

## Tools and workflows

Mise declares the project tools and provides tasks for running them.
Native dependencies for Tauri will be documented when the application is scaffolded.

- Rust uses the default profile, including rustfmt, Clippy, and local Rust docs.
- uv runs Python tools, including Commitizen and Zensical.
- The project entry script configures Git hooks and Commitizen.
- prek runs repository checks locally and in the pull-request quality gate.
- rumdl and ShellCheck check Markdown and shell scripts.
- Tombi formats TOML configuration files locally and in CI through the `tombi-format` hook.
- Git attributes and ignore rules handle Rust source and build artifacts.
- Zensical publishes developer documentation.
- Dependabot updates GitHub Actions dependencies.
- Issue forms, contribution guidance, security reporting, and code ownership support repository maintenance.

## Verify the environment

```bash
mise doctor
mise ls --current
prek run --all-files
```

CI currently checks repository files. Application builds, Rust checks, and frontend checks will be added
with their respective application scaffolding.

## Format TOML

```bash
tombi format --offline
tombi format --offline --check
```

The formatter uses `tombi.toml`, excludes generated Cargo and Mise lockfiles, and runs without schema lookups.
The pre-commit hook pins its own Tombi version so local hooks and CI use the same formatter.

## Preview documentation

```bash
mise run docs
```

See the [contribution guide](https://github.com/HYP3R00T/Locus/blob/main/CONTRIBUTING.md)
for the complete contribution workflow.
