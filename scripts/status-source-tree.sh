#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

git -C "$REPO_ROOT" status --short --untracked-files=all -- \
  .github \
  apps \
  docs \
  frontend \
  migrations \
  programs \
  scripts \
  sdk \
  tests \
  README.md \
  Anchor.toml \
  Cargo.toml \
  Cargo.lock \
  package.json \
  package-lock.json \
  tsconfig.json \
  | while IFS= read -r line; do
    path="${line:3}"
    path="${path#\"}"
    path="${path%\"}"
    case "$path" in
      404.html|CNAME|__next.*|_next/*|_not-found/*|analytics/*|assistant/*|awards/*|benefit/*|command-center/*|community/*|dashboard/*|developers/*|diagnostics/*|documents/*|network/*|products/*|proof/*|search/*|security/*|services/*|start/*|story/*|tracks/*|treasury/*|viewer/*|dist/*|docs/index.html|docs/assets/weekly-live-captures/*|docs/assets/weekly-updates-live/*|docs/assets/weekly-youtube-ready/*|docs/assets/weekly-updates/private-dao-week-1-update.mp4|docs/assets/weekly-updates/week-1-scene-1.png|docs/assets/weekly-updates/week-1-scene-2.png|docs/assets/weekly-updates/week-1-scene-3.png|docs/assets/weekly-updates/week-1-scene-4.png|docs/assets/weekly-updates/week-1-scene-5.png)
        continue
        ;;
    esac
    printf '%s\n' "$line"
  done
