#!/usr/bin/env bash
set -euo pipefail

OUTPUT_PATH=${1:-/tmp/privatedao-agent-exchange.zip}
PACKAGE_DIR=$(mktemp -d)
trap 'rm -rf "$PACKAGE_DIR"' EXIT

cp -R src assets package.json package-lock.json "$PACKAGE_DIR/"
cp -R scripts/browser "$PACKAGE_DIR/.browser"
mkdir -p "$PACKAGE_DIR/assets/browser"
test -f "$PACKAGE_DIR/assets/brand/privatedao-official-logo.jpg"
test -f "$PACKAGE_DIR/assets/brand/privatedao-official-banner.jpg"
test -f "$PACKAGE_DIR/assets/ecosystem/ibm-watsonx.svg"
test -f "$PACKAGE_DIR/assets/ecosystem/openvino.svg"
test -f "$PACKAGE_DIR/assets/ecosystem/mongodb.svg"
test -f "$PACKAGE_DIR/assets/ecosystem/github.svg"
test -f "$PACKAGE_DIR/assets/ecosystem/amd.png"
test -f "$PACKAGE_DIR/assets/ecosystem/ibm.svg"
test -f "$PACKAGE_DIR/assets/ecosystem/aws.svg"
test -f "$PACKAGE_DIR/assets/ecosystem/alibaba-cloud.svg"
test -f "$PACKAGE_DIR/assets/clients/openai-knot.svg"
test -f "$PACKAGE_DIR/assets/clients/claude-symbol.svg"
test -f "$PACKAGE_DIR/assets/clients/grok-symbol.svg"
test -f "$PACKAGE_DIR/assets/clients/openclaw-symbol.png"

(
  cd "$PACKAGE_DIR"
  # Backup/archive mounts may reject npm's executable symlinks; Lambda does
  # not need node_modules/.bin in the runtime bundle.
  npm ci --bin-links=false --ignore-scripts --no-audit --no-fund
  node node_modules/esbuild/bin/esbuild .browser/solana-web3-entry.mjs --bundle --minify --format=esm --platform=browser --target=es2020 --outfile=assets/browser/solana-web3.mjs
  node node_modules/esbuild/bin/esbuild .browser/spl-token-entry.mjs --bundle --minify --format=esm --platform=browser --target=es2020 --outfile=assets/browser/spl-token.mjs
  node node_modules/esbuild/bin/esbuild .browser/8004-solana-entry.mjs --bundle --minify --format=esm --platform=browser --target=es2020 --external:crypto --external:node:fs --external:fs/promises --outfile=assets/browser/8004-solana.mjs
  rm -rf .browser
  npm prune --bin-links=false --omit=dev --ignore-scripts --no-audit --no-fund
  node --check src/handler.mjs
  node --input-type=module -e 'import("./src/handler.mjs").then(({ handler }) => { if (typeof handler !== "function") throw new Error("src/handler.handler export is missing"); })'
  test -s assets/browser/solana-web3.mjs
  test -s assets/browser/spl-token.mjs
  test -s assets/browser/8004-solana.mjs
  zip -qr "$OUTPUT_PATH" src assets package.json package-lock.json node_modules
)

test -s "$OUTPUT_PATH"
unzip -tq "$OUTPUT_PATH"
unzip -l "$OUTPUT_PATH" | awk '$NF == "src/handler.mjs" { found = 1 } END { exit found ? 0 : 1 }'
echo "Lambda package created: $OUTPUT_PATH"
