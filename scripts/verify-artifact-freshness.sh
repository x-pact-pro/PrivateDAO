#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "[artifact-freshness] rebuilding generated reviewer artifacts"
if [[ "${CI:-}" == "true" ]]; then
  echo "[artifact-freshness] CI detected; validating committed reviewer artifacts without regeneration"
else
  npm run build:devnet:review-artifacts >/dev/null
fi

echo "[artifact-freshness] rebuilding packaged review bundle"
if [[ "${CI:-}" == "true" ]]; then
  test -f "dist/reviewer-bundle.tar.gz" || {
    echo "[artifact-freshness] missing committed packaged reviewer bundle: dist/reviewer-bundle.tar.gz" >&2
    exit 1
  }
else
  npm run build:review-bundle >/dev/null
fi

echo "[artifact-freshness] verifying packaged review bundle contents"
npm run verify:review-bundle >/dev/null

tracked_paths=(
  "docs/zk-attestation.generated.json"
  "docs/pdao-attestation.generated.json"
  "docs/supply-chain-attestation.generated.json"
  "docs/supply-chain-attestation.generated.md"
  "docs/release-ceremony-attestation.generated.json"
  "docs/release-ceremony-attestation.generated.md"
  "docs/release-drill.generated.json"
  "docs/release-drill.generated.md"
)

echo "[artifact-freshness] checking generated artifacts are tracked"
for path in "${tracked_paths[@]}"; do
  git ls-files --error-unmatch "$path" >/dev/null 2>&1 || {
    echo "[artifact-freshness] missing tracked generated artifact: $path" >&2
    exit 1
  }
done

test -f "dist/reviewer-bundle.tar.gz" || {
  echo "[artifact-freshness] missing packaged reviewer bundle: dist/reviewer-bundle.tar.gz" >&2
  exit 1
}

echo "[artifact-freshness] checking working tree freshness"
git diff --exit-code \
  -I '"generatedAt":' \
  -I '"releaseCommit":' \
  -I '"evidence": "[0-9a-f]+' \
  -I '^- Generated at:' \
  -I '^- Release commit:' \
  -I '^  evidence: `[0-9a-f]+`' \
  -- "${tracked_paths[@]}" >/dev/null

echo "[artifact-freshness] PASS"
