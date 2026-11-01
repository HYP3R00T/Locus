#!/usr/bin/env bash
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

mise trust mise.toml
mise install

# Install the frontend and the project-local Tauri CLI from the lockfile.
mise exec -- npm ci
