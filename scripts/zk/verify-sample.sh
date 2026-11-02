#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
source "$ROOT_DIR/scripts/zk/common.sh"
SETUP_DIR="$ROOT_DIR/zk/setup"
PROOF_DIR="$ROOT_DIR/zk/proofs"

if (($#)); then
  circuits=("$@")
else
  mapfile -t circuits < <(zk_sample_circuits)
fi

for circuit in "${circuits[@]}"; do
  echo "[zk] verifying proof: $circuit"
  npx snarkjs groth16 verify \
    "$SETUP_DIR/${circuit}_vkey.json" \
    "$PROOF_DIR/${circuit}.public.json" \
    "$PROOF_DIR/${circuit}.proof.json"
done

echo "[zk] verification passed"
