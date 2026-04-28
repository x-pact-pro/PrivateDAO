#!/usr/bin/env bash
set -euo pipefail

MODE="${1:-github}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
WEB_DIR="$REPO_ROOT/apps/web"
DIST_DIR="$REPO_ROOT/dist"
TARGET_DIR="$DIST_DIR/web-mirror-$MODE"
ARCHIVE_PATH="$DIST_DIR/web-mirror-$MODE.tar.gz"

if [[ "${PRIVATE_DAO_SKIP_SOURCE_PREFLIGHT:-0}" != "1" ]]; then
  bash "$SCRIPT_DIR/verify-source-worktree.sh"
fi

mkdir -p "$DIST_DIR"
rm -rf "$TARGET_DIR" "$ARCHIVE_PATH"

case "$MODE" in
  github)
    (cd "$WEB_DIR" && npm run build:github)
    ;;
  root)
    (cd "$WEB_DIR" && npm run build:root)
    ;;
  *)
    echo "Unsupported mode: $MODE" >&2
    echo "Usage: bash scripts/build-web-mirror-bundle.sh [github|root]" >&2
    exit 1
    ;;
esac

# Next 16/Turbopack can prerender app-route HTML into `.next/server/app`
# while omitting some nested static pages from `out/`. The public site is a
# static mirror, so supplement missing service pages from the prerendered HTML
# before the mirror bundle is copied to the repo root.
SERVER_APP_DIR="$WEB_DIR/.next/server/app"
if [[ -d "$SERVER_APP_DIR/services" && -d "$WEB_DIR/out/services" ]]; then
  while IFS= read -r html_path; do
    route_slug="$(basename "$html_path" .html)"
    [[ "$route_slug" == "page" ]] && continue
    out_dir="$WEB_DIR/out/services/$route_slug"
    out_html="$out_dir/index.html"
    if [[ ! -f "$out_html" ]]; then
      mkdir -p "$out_dir"
      cp "$html_path" "$out_html"
      rsc_path="${html_path%.html}.rsc"
      meta_path="${html_path%.html}.meta"
      [[ -f "$rsc_path" ]] && cp "$rsc_path" "$out_dir/index.txt"
      [[ -f "$meta_path" ]] && cp "$meta_path" "$out_dir/meta.txt"
      echo "Supplemented static service route: /services/$route_slug/"
    fi
  done < <(find "$SERVER_APP_DIR/services" -maxdepth 1 -type f -name '*.html' | sort)
fi

if [[ -d "$WEB_DIR/.next/static" ]]; then
  mkdir -p "$WEB_DIR/out/_next/static"
  cp -R "$WEB_DIR/.next/static"/. "$WEB_DIR/out/_next/static"/
fi

cp -R "$WEB_DIR/out" "$TARGET_DIR"
touch "$TARGET_DIR/.nojekyll"

if [[ "$MODE" == "root" && -f "$REPO_ROOT/CNAME" ]]; then
  cp "$REPO_ROOT/CNAME" "$TARGET_DIR/CNAME"
fi

tar -czf "$ARCHIVE_PATH" -C "$DIST_DIR" "web-mirror-$MODE"

echo "Built mirror bundle:"
echo "  Directory: $TARGET_DIR"
echo "  Archive:   $ARCHIVE_PATH"
