#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

search_placeholders() {
  local pattern="$1"
  shift
  if command -v rg >/dev/null 2>&1; then
    rg -n "$pattern" "$@"
  else
    grep -nE "$pattern" "$@"
  fi
}

echo "[verify-zk-surface] checking zk docs and artifacts"

placeholder_pattern="REPLACE_""WITH|REPLACE_""ME|TO""DO|T""BD|coming s""oon|not imp""lemented"

required_files=(
  "docs/zk-layer.md"
  "docs/zk-upgrade.md"
  "docs/zk-stack.md"
  "docs/zk-threat-extension.md"
  "docs/zk-assumption-matrix.md"
  "docs/zk-capability-matrix.md"
  "docs/zk-provenance.md"
  "docs/zk-verification-flow.md"
  "docs/zk-registry.generated.json"
  "docs/zk-transcript.generated.md"
  "docs/zk-attestation.generated.json"
  "docs/zk-architecture.md"
  "docs/zk-evidence.md"
  "zk/circuits/private_dao_vote_overlay.circom"
  "zk/circuits/private_dao_delegation_overlay.circom"
  "zk/circuits/private_dao_tally_overlay.circom"
  "zk/inputs/private_dao_vote_overlay.sample.json"
  "zk/inputs/private_dao_delegation_overlay.sample.json"
  "zk/inputs/private_dao_tally_overlay.sample.json"
  "zk/proofs/private_dao_vote_overlay.proof.json"
  "zk/proofs/private_dao_vote_overlay.public.json"
  "zk/proofs/private_dao_delegation_overlay.proof.json"
  "zk/proofs/private_dao_delegation_overlay.public.json"
  "zk/proofs/private_dao_tally_overlay.proof.json"
  "zk/proofs/private_dao_tally_overlay.public.json"
  "zk/setup/private_dao_vote_overlay_final.zkey"
  "zk/setup/private_dao_vote_overlay_vkey.json"
  "zk/setup/private_dao_delegation_overlay_final.zkey"
  "zk/setup/private_dao_delegation_overlay_vkey.json"
  "zk/setup/private_dao_tally_overlay_final.zkey"
  "zk/setup/private_dao_tally_overlay_vkey.json"
)

for file in "${required_files[@]}"; do
  test -f "$file" || {
    echo "[verify-zk-surface] missing required file: $file" >&2
    exit 1
  }
done

echo "[verify-zk-surface] checking placeholder text"
if search_placeholders "$placeholder_pattern" \
  docs/zk-layer.md \
  docs/zk-upgrade.md \
  docs/zk-stack.md \
  docs/zk-threat-extension.md \
  docs/zk-assumption-matrix.md \
  docs/zk-capability-matrix.md \
  docs/zk-provenance.md \
  docs/zk-verification-flow.md \
  docs/zk-architecture.md \
  docs/zk-evidence.md; then
  echo "[verify-zk-surface] placeholder text detected" >&2
  exit 1
fi

if [[ "${CI:-}" == "true" ]]; then
  echo "[verify-zk-surface] CI detected; validating committed ZK artifacts"
else
  echo "[verify-zk-surface] rebuilding zk registry"
  npm run build:zk-registry >/dev/null

  echo "[verify-zk-surface] rebuilding zk transcript"
  npm run build:zk-transcript >/dev/null

  echo "[verify-zk-surface] rebuilding zk attestation"
  npm run build:zk-attestation >/dev/null
fi

echo "[verify-zk-surface] verifying sample proof"
npm run zk:verify:sample >/dev/null

echo "[verify-zk-surface] checking public signal consistency"
npm run verify:zk-consistency >/dev/null

echo "[verify-zk-surface] checking zk doc coherence"
npm run verify:zk-docs >/dev/null

echo "[verify-zk-surface] checking tamper rejection"
npm run verify:zk-negative >/dev/null

echo "[verify-zk-surface] checking zk registry"
npm run verify:zk-registry >/dev/null

echo "[verify-zk-surface] checking zk transcript"
npm run verify:zk-transcript >/dev/null

echo "[verify-zk-surface] checking zk attestation"
npm run verify:zk-attestation >/dev/null

echo "[verify-zk-surface] PASS"
