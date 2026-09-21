#!/usr/bin/env bash
# Copy the plugin files into a vault so Obsidian can load the current build.
# Usage: ./scripts/sync-to-vault.sh [path-to-plugin-folder-in-vault]
set -euo pipefail

DEFAULT_VAULT_PLUGIN="/c/Users/PauloVianna/Obsidian/ram-paulo/.obsidian/plugins/graph-filter-chips"
VAULT_PLUGIN="${1:-$DEFAULT_VAULT_PLUGIN}"

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

mkdir -p "$VAULT_PLUGIN"
cp "$REPO_ROOT/manifest.json" "$REPO_ROOT/main.js" "$REPO_ROOT/styles.css" "$VAULT_PLUGIN/"

echo "Synced to: $VAULT_PLUGIN"
echo "Reload Obsidian (Ctrl+P -> Reload app without saving) to pick up changes."