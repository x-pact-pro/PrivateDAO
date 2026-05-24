#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

run_parallel_group() {
  local pids=()
  local labels=()
  local status=0

  while [[ "$#" -gt 0 ]]; do
    local label="$1"
    local command="$2"
    shift 2
    echo "[verify-all] checking ${label}"
    ( eval "$command" ) &
    pids+=("$!")
    labels+=("$label")
  done

  for i in "${!pids[@]}"; do
    if ! wait "${pids[$i]}"; then
      echo "[verify-all] ${labels[$i]} failed" >&2
      status=1
    fi
  done

  return "$status"
}

run_with_retry() {
  local attempts="$1"
  shift
  local try=1
  while true; do
    if "$@"; then
      return 0
    fi
    if [[ "$try" -ge "$attempts" ]]; then
      return 1
    fi
    echo "[verify-all] retry ${try}/${attempts} failed for: $*" >&2
    try=$((try + 1))
    sleep 2
  done
}

echo "[verify-all] validating Ranger strategy package"
npm run validate:ranger-strategy -- docs/ranger-strategy-config.devnet.json >/dev/null

echo "[verify-all] checking live proof"
npm run verify:live-proof >/dev/null

echo "[verify-all] checking test-wallet live proof"
npm run verify:test-wallet-live-proof >/dev/null

echo "[verify-all] checking test-wallet live proof v3"
npm run verify:test-wallet-live-proof:v3 >/dev/null

echo "[verify-all] checking strategy surface"
npm run verify:strategy-surface >/dev/null

echo "[verify-all] rebuilding zk registry / transcript / attestation"
run_parallel_group \
  "zk registry" "npm run build:zk-registry >/dev/null" \
  "zk transcript" "npm run build:zk-transcript >/dev/null" \
  "zk attestation" "npm run build:zk-attestation >/dev/null"

echo "[verify-all] checking frontend surface"
npm run verify:frontend-surface >/dev/null

echo "[verify-all] checking browser smoke"
run_with_retry 2 timeout 120s npm run verify:browser-smoke >/dev/null

echo "[verify-all] checking remediation / pitch / demo / program surface"
echo "[verify-all] checking security remediation"
npm run verify:security-remediation >/dev/null
echo "[verify-all] checking investor pitch deck"
npm run verify:investor-pitch-deck >/dev/null
echo "[verify-all] checking demo video"
npm run verify:demo-video >/dev/null
echo "[verify-all] checking program id consistency"
npm run verify:program-id-consistency >/dev/null
echo "[verify-all] checking PDAO token surface"
npm run verify:pdao-surface >/dev/null

echo "[verify-all] rebuilding reviewer artifacts"
if [[ "${CI:-}" == "true" ]]; then
  echo "[verify-all] CI detected; using committed reviewer artifacts to avoid public RPC rate limits"
  npm run build:cryptographic-manifest >/dev/null
  npm run build:deployment-attestation >/dev/null
  npm run build:runtime-attestation >/dev/null
  npm run build:go-live-attestation >/dev/null
  npm run build:review-attestation >/dev/null
else
  run_with_retry 3 npm run build:devnet:review-artifacts >/dev/null
fi

echo "[verify-all] checking submission registry"
npm run verify:submission-registry >/dev/null

echo "[verify-all] checking registry consistency"
npm run verify:registry-consistency >/dev/null

echo "[verify-all] checking packaged review bundle"
npm run verify:review-bundle >/dev/null

echo "[verify-all] checking generated artifacts"
npm run verify:generated-artifacts >/dev/null

echo "[verify-all] checking supply-chain attestation"
npm run verify:supply-chain-attestation >/dev/null

echo "[verify-all] checking release ceremony attestation"
npm run verify:release-ceremony-attestation >/dev/null

echo "[verify-all] checking release drill evidence"
npm run verify:release-drill >/dev/null

echo "[verify-all] checking cryptographic integrity"
npm run verify:cryptographic-manifest >/dev/null

echo "[verify-all] checking release manifest"
npm run verify:release-manifest >/dev/null

echo "[verify-all] checking readiness and attestation bundle"
run_parallel_group \
  "mainnet readiness report" "npm run verify:mainnet-readiness-report >/dev/null" \
  "launch trust packet" "npm run verify:launch-trust-packet >/dev/null" \
  "deployment attestation" "npm run verify:deployment-attestation >/dev/null" \
  "runtime attestation" "npm run verify:runtime-attestation >/dev/null"

echo "[verify-all] checking read-node bundle"
if [[ "${CI:-}" == "true" ]]; then
  echo "[verify-all] CI detected; validating committed read-node snapshots to avoid public RPC rate limits"
  run_parallel_group \
    "read-node snapshot" "npm run verify:read-node-snapshot >/dev/null" \
    "read-node ops snapshot" "npm run verify:read-node-ops >/dev/null"
else
  run_parallel_group \
    "read node" "npm run verify:read-node >/dev/null" \
    "read node http surface" "run_with_retry 3 npm run verify:read-node:http >/dev/null" \
    "read-node snapshot" "npm run verify:read-node-snapshot >/dev/null" \
    "read-node ops snapshot" "npm run verify:read-node-ops >/dev/null"
fi

echo "[verify-all] checking integration and runtime bundle"
run_parallel_group \
  "Frontier integrations" "npm run verify:frontier-integrations >/dev/null" \
  "Colosseum competitive analysis" "npm run verify:colosseum-competitive >/dev/null" \
  "real-device runtime intake" "npm run verify:real-device-runtime >/dev/null" \
  "runtime evidence" "npm run verify:runtime-evidence >/dev/null" \
  "operational evidence" "npm run verify:operational-evidence >/dev/null" \
  "runtime surface" "npm run verify:runtime-surface >/dev/null" \
  "confidential manifest encryption" "npm run verify:confidential-manifest >/dev/null" \
  "V2 audit-readiness gates" "npm run verify:audit-readiness:v2 >/dev/null" \
  "wallet compatibility matrix" "npm run verify:wallet-matrix >/dev/null" \
  "devnet canary" "npm run verify:devnet-canary >/dev/null" \
  "PDAO attestation" "npm run verify:pdao-attestation >/dev/null" \
  "go-live attestation" "npm run verify:go-live-attestation >/dev/null"

echo "[verify-all] checking review surface bundle"
run_parallel_group \
  "review links" "npm run verify:review-links >/dev/null" \
  "weekly update videos" "npm run verify:weekly-updates >/dev/null" \
  "ops surface" "npm run verify:ops-surface >/dev/null" \
  "reviewer surface" "VERIFY_REVIEW_SURFACE_MODE=fast npm run verify:review-surface >/dev/null"

echo "[verify-all] PASS"
