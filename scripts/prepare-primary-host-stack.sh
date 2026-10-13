#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
STACK_DIR="$REPO_ROOT/deploy/primary-host"
SITE_DIR="$STACK_DIR/volumes/site"
STAGED_SITE_DIR="$STACK_DIR/volumes/site.staged"
TARGET_IDL_DIR="$STACK_DIR/target/idl"
IDL_SOURCE="$REPO_ROOT/target/idl/private_dao.json"

if [[ ! -f "$IDL_SOURCE" ]]; then
  echo "Missing $IDL_SOURCE. Run an Anchor build first so the read-node can decode accounts." >&2
  exit 1
fi

if [[ "${PRIVATE_DAO_SKIP_SOURCE_PREFLIGHT:-0}" != "1" ]]; then
  bash "$SCRIPT_DIR/verify-source-worktree.sh"
fi

mkdir -p "$STACK_DIR/volumes" "$TARGET_IDL_DIR"

if [[ ! -f "$STACK_DIR/.env" ]]; then
  cp "$STACK_DIR/.env.example" "$STACK_DIR/.env"
fi

# Never prepare a production stack with an empty gateway credential. The
# application already fails closed at request time; catching this here makes
# the deployment failure explicit before containers are rebuilt.
NODE_ENV_VALUE="$(grep -E '^NODE_ENV=' "$STACK_DIR/.env" 2>/dev/null | tail -1 | cut -d= -f2- || true)"
GATEWAY_TOKEN_VALUE="$(grep -E '^PDAO_KERNEL_GATEWAY_TOKEN=' "$STACK_DIR/.env" 2>/dev/null | tail -1 | cut -d= -f2- || true)"
ALLOW_UNAUTHENTICATED_VALUE="$(grep -E '^PDAO_KERNEL_GATEWAY_ALLOW_UNAUTHENTICATED=' "$STACK_DIR/.env" 2>/dev/null | tail -1 | cut -d= -f2- || true)"
ALLOWED_ORIGIN_VALUE="$(grep -E '^PDAO_KERNEL_GATEWAY_ALLOWED_ORIGIN=' "$STACK_DIR/.env" 2>/dev/null | tail -1 | cut -d= -f2- || true)"
if [[ "$NODE_ENV_VALUE" == "production" ]]; then
  if [[ -z "$GATEWAY_TOKEN_VALUE" || "$ALLOW_UNAUTHENTICATED_VALUE" == "1" ]]; then
    echo "Production primary-host requires PDAO_KERNEL_GATEWAY_TOKEN and forbids unauthenticated gateway mode." >&2
    exit 1
  fi
  if [[ -z "$ALLOWED_ORIGIN_VALUE" || "$ALLOWED_ORIGIN_VALUE" == "*" ]]; then
    echo "Production primary-host requires a specific PDAO_KERNEL_GATEWAY_ALLOWED_ORIGIN." >&2
    exit 1
  fi
fi

(cd "$REPO_ROOT" && npm run web:bundle:root)

# Keep the bind-mount directory itself stable. Replacing SITE_DIR with a new
# inode while the edge container is running leaves Caddy serving the old
# directory. Stage and validate the bundle, then sync its contents in place.
rm -rf "$STAGED_SITE_DIR"
mkdir -p "$SITE_DIR" "$STAGED_SITE_DIR"
cp -R "$REPO_ROOT/dist/web-mirror-root/." "$STAGED_SITE_DIR/"
test -s "$STAGED_SITE_DIR/index.html"
find "$SITE_DIR" -mindepth 1 -maxdepth 1 -exec rm -rf -- {} +
cp -R "$STAGED_SITE_DIR/." "$SITE_DIR/"
rm -rf "$STAGED_SITE_DIR"
cp "$IDL_SOURCE" "$TARGET_IDL_DIR/private_dao.json"

echo "Prepared primary-host stack inputs:"
echo "  Site bundle: $SITE_DIR"
echo "  IDL:         $TARGET_IDL_DIR/private_dao.json"
echo "  Env file:    $STACK_DIR/.env"
