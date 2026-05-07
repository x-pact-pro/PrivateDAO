#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

forbidden_regex='^(404\.html|CNAME|__next\.|_next/|_not-found/|analytics/|assistant/|awards/|benefit/|command-center/|community/|dashboard/|developers/|diagnostics/|documents/|network/|products/|proof/|search/|security/|services/|start/|story/|tracks/|treasury/|viewer/|dist/|docs/index\.html|docs/assets/weekly-live-captures/|docs/assets/weekly-updates-live/|docs/assets/weekly-youtube-ready/|docs/assets/weekly-updates/private-dao-week-1-update\.mp4|docs/assets/weekly-updates/week-1-scene-[1-5]\.png)'

staged_paths="$(git -C "$REPO_ROOT" diff --cached --name-only)"

if [[ -z "$staged_paths" ]]; then
  echo "source preflight: no staged changes"
  exit 0
fi

staged_source_count="$(printf '%s\n' "$staged_paths" | sed '/^$/d' | wc -l | tr -d ' ')"

forbidden_paths="$(printf '%s\n' "$staged_paths" | grep -E "$forbidden_regex" || true)"

if [[ -n "$forbidden_paths" ]]; then
  echo "source preflight: staged mirror/export churn detected"
  printf '%s\n' "$forbidden_paths"
  exit 1
fi

echo "source preflight: staged changes are source-safe ($staged_source_count source path(s))"
echo "source preflight: inspect staged source with 'npm run status:source:staged'"
