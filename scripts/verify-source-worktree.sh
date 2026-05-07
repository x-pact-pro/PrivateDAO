#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

forbidden_regex='^(404\.html|CNAME|__next\.|_next/|_not-found/|analytics/|assistant/|awards/|benefit/|command-center/|community/|dashboard/|developers/|diagnostics/|documents/|network/|products/|proof/|search/|security/|services/|start/|story/|tracks/|treasury/|viewer/|dist/|docs/index\.html|docs/assets/weekly-live-captures/|docs/assets/weekly-updates-live/|docs/assets/weekly-youtube-ready/|docs/assets/weekly-updates/private-dao-week-1-update\.mp4|docs/assets/weekly-updates/week-1-scene-[1-5]\.png)'

unstaged_paths="$(git -C "$REPO_ROOT" diff --name-only)"
staged_paths="$(git -C "$REPO_ROOT" diff --cached --name-only)"
untracked_paths="$(git -C "$REPO_ROOT" ls-files --others --exclude-standard)"

candidate_paths="$(printf '%s\n%s\n%s\n' "$unstaged_paths" "$staged_paths" "$untracked_paths" | sed '/^$/d' | sort -u)"
staged_forbidden_paths="$(printf '%s\n' "$staged_paths" | grep -E "$forbidden_regex" || true)"
local_forbidden_paths="$(printf '%s\n%s\n' "$unstaged_paths" "$untracked_paths" | sed '/^$/d' | grep -E "$forbidden_regex" || true)"

if [[ -z "$candidate_paths" ]]; then
  echo "source worktree preflight: no source hygiene issues"
  exit 0
fi

forbidden_paths="$(printf '%s\n' "$candidate_paths" | grep -E "$forbidden_regex" || true)"
source_paths="$(printf '%s\n' "$candidate_paths" | grep -Ev "$forbidden_regex" || true)"
source_count="$(printf '%s\n' "$source_paths" | sed '/^$/d' | wc -l | tr -d ' ')"

summarize_paths() {
  awk -F/ '
    {
      key = $1;
      if ($1 == "docs" && $2 != "") {
        key = $1 "/" $2;
      }
      counts[key]++;
    }
    END {
      for (key in counts) {
        printf "%6d  %s\n", counts[key], key;
      }
    }
  ' | sort -nr | sed -n '1,10p'
}

if [[ -n "$forbidden_paths" ]]; then
  forbidden_count="$(printf '%s\n' "$forbidden_paths" | wc -l | tr -d ' ')"
  staged_forbidden_count="$(printf '%s\n' "$staged_forbidden_paths" | sed '/^$/d' | wc -l | tr -d ' ')"
  local_forbidden_count="$(printf '%s\n' "$local_forbidden_paths" | sed '/^$/d' | wc -l | tr -d ' ')"
  echo "source worktree preflight: mirror/export churn detected"
  printf 'mirror/export paths: %s\n' "$forbidden_count"
  printf 'staged mirror/export paths: %s\n' "$staged_forbidden_count"
  printf 'unstaged or untracked mirror/export paths: %s\n' "$local_forbidden_count"
  printf 'source paths outside mirror/export scope: %s\n' "$source_count"
  echo "top mirror/export scopes:"
  printf '%s\n' "$forbidden_paths" | summarize_paths
  if [[ "${PRIVATE_DAO_WORKTREE_VERBOSE:-0}" == "1" ]]; then
    printf '%s\n' "$forbidden_paths" | sed -n '1,25p'
    if [[ "$forbidden_count" -gt 25 ]]; then
      printf '... truncated %s additional path(s)\n' "$((forbidden_count - 25))"
    fi
  else
    echo "set PRIVATE_DAO_WORKTREE_VERBOSE=1 to print sample churn paths"
  fi
  if [[ "${PRIVATE_DAO_STRICT_WORKTREE_PREFLIGHT:-0}" == "1" && "$staged_forbidden_count" -gt 0 ]]; then
    exit 1
  fi
  echo "source worktree preflight: warning only (strict mode now hard-fails staged mirror/export churn only)"
  echo "source worktree preflight: use 'npm run status:source' to inspect only source-scoped deltas"
  echo "source worktree preflight: use 'npm run status:source:staged' before commit"
  exit 0
fi

printf 'source worktree preflight: worktree is source-safe (%s source path(s))\n' "$source_count"
