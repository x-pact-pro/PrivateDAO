#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

scoped_paths=(
  .github
  apps
  docs
  frontend
  migrations
  programs
  scripts
  sdk
  tests
  README.md
  Anchor.toml
  Cargo.toml
  Cargo.lock
  package.json
  package-lock.json
  tsconfig.json
)

status_lines="$(git -C "$REPO_ROOT" status --short --untracked-files=all -- "${scoped_paths[@]}")"

if [[ -z "$status_lines" ]]; then
  echo "worktree triage: no scoped changes"
  exit 0
fi

classify_path() {
  local path="$1"
  case "$path" in
    404.html|CNAME|__next.*|_next/*|_not-found/*|analytics/*|assistant/*|awards/*|benefit/*|command-center/*|community/*|dashboard/*|developers/*|diagnostics/*|documents/*|network/*|products/*|proof/*|search/*|security/*|services/*|start/*|story/*|tracks/*|treasury/*|viewer/*|dist/*|docs/index.html|docs/assets/weekly-live-captures/*|docs/assets/weekly-updates-live/*|docs/assets/weekly-youtube-ready/*|docs/assets/weekly-updates/private-dao-week-1-update.mp4|docs/assets/weekly-updates/week-1-scene-[1-5].png)
      printf 'mirror_export\n'
      ;;
    programs/private-dao/fuzz/corpus/*)
      printf 'fuzz_corpus\n'
      ;;
    scripts/*.js|scripts/lib/*.js|sdk/src/*.js|migrations/*.js)
      printf 'generated_js\n'
      ;;
    docs/*.generated.json|docs/*.generated.md|docs/*/*.generated.json|docs/*/*.generated.md|docs/*/*/*.generated.json|docs/*/*/*.generated.md|docs/runtime/*.generated.json|docs/runtime/*.generated.md|docs/runtime/*.md|docs/read-node/*.generated.json|docs/read-node/*.generated.md|docs/track-reviewer-packets/*.generated.json|docs/track-reviewer-packets/*.generated.md|docs/runtime/templates/*)
      printf 'docs_evidence\n'
      ;;
    docs/*)
      printf 'docs_manual\n'
      ;;
    apps/*)
      printf 'source_app\n'
      ;;
    programs/*|sdk/*|tests/*|migrations/*)
      printf 'source_protocol\n'
      ;;
    scripts/*|README.md|Anchor.toml|Cargo.toml|Cargo.lock|package.json|package-lock.json|tsconfig.json|.github/*|frontend/*)
      printf 'source_ops\n'
      ;;
    *)
      printf 'other\n'
      ;;
  esac
}

scope_key() {
  local path="$1"
  IFS='/' read -r first second _ <<< "$path"
  if [[ -z "${second:-}" ]]; then
    printf '%s\n' "$first"
    return
  fi
  case "$first" in
    apps|docs|programs|scripts|sdk|tests|migrations|frontend|.github)
      printf '%s/%s\n' "$first" "$second"
      ;;
    *)
      printf '%s\n' "$first"
      ;;
  esac
}

top_scopes() {
  awk '
    {
      counts[$0]++
    }
    END {
      for (key in counts) {
        printf "%6d  %s\n", counts[key], key;
      }
    }
  ' | sort -nr | sed -n '1,12p'
}

declare -A category_counts
declare -A category_scope_lines
declare -A category_sample_lines

total_count=0
while IFS= read -r line; do
  [[ -z "$line" ]] && continue
  path="${line:3}"
  path="${path#\"}"
  path="${path%\"}"
  category="$(classify_path "$path")"
  scope="$(scope_key "$path")"

  total_count=$((total_count + 1))
  category_counts["$category"]=$(( ${category_counts["$category"]:-0} + 1 ))
  category_scope_lines["$category"]+="${scope}"$'\n'

  if [[ ${category_counts["$category"]} -le 8 ]]; then
    category_sample_lines["$category"]+="${line}"$'\n'
  fi
done <<< "$status_lines"

ordered_categories=(
  mirror_export
  source_app
  source_ops
  source_protocol
  docs_evidence
  docs_manual
  generated_js
  fuzz_corpus
  other
)

printf 'worktree triage: %s scoped change(s)\n' "$total_count"

for category in "${ordered_categories[@]}"; do
  count="${category_counts["$category"]:-0}"
  [[ "$count" == "0" ]] && continue

  printf '\n[%s] %s path(s)\n' "$category" "$count"
  echo "top scopes:"
  printf '%s' "${category_scope_lines["$category"]}" | top_scopes
  echo "sample paths:"
  printf '%s' "${category_sample_lines["$category"]}" | sed -n '1,8p'
done

mirror_count="${category_counts["mirror_export"]:-0}"
source_count=$(( ${category_counts["source_app"]:-0} + ${category_counts["source_ops"]:-0} + ${category_counts["source_protocol"]:-0} ))
docs_count=$(( ${category_counts["docs_evidence"]:-0} + ${category_counts["docs_manual"]:-0} ))
generated_count=$(( ${category_counts["generated_js"]:-0} + ${category_counts["fuzz_corpus"]:-0} ))
other_count="${category_counts["other"]:-0}"

printf '\nsummary:\n'
printf '  source changes: %s\n' "$source_count"
printf '  docs changes: %s\n' "$docs_count"
printf '  generated/runtime artifacts: %s\n' "$generated_count"
printf '  mirror/export churn: %s\n' "$mirror_count"
printf '  other: %s\n' "$other_count"

if [[ "$source_count" -gt 0 ]]; then
  echo "recommendation: triage source_app/source_ops/source_protocol before any release claim"
fi
if [[ "$mirror_count" -gt 0 ]]; then
  echo "recommendation: ignore mirror/export churn when assessing source readiness"
fi
