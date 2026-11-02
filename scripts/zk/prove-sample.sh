#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
source "$ROOT_DIR/scripts/zk/common.sh"
BUILD_DIR="$ROOT_DIR/zk/build"
SETUP_DIR="$ROOT_DIR/zk/setup"
INPUT_DIR="$ROOT_DIR/zk/inputs"
PROOF_DIR="$ROOT_DIR/zk/proofs"

mkdir -p "$INPUT_DIR" "$PROOF_DIR"

if (($#)); then
  circuits=("$@")
else
  mapfile -t circuits < <(zk_sample_circuits)
fi

for circuit in "${circuits[@]}"; do
  input_json="$INPUT_DIR/${circuit}.sample.json"
  wasm_dir="$BUILD_DIR/${circuit}_js"
  wasm_file="$wasm_dir/${circuit}.wasm"
  witness="$PROOF_DIR/${circuit}.wtns"
  proof_json="$PROOF_DIR/${circuit}.proof.json"
  public_json="$PROOF_DIR/${circuit}.public.json"
  zkey_final="$SETUP_DIR/${circuit}_final.zkey"

  echo "[zk] generating sample input: $circuit"
  node "$ROOT_DIR/scripts/generate-zk-sample-input.js" "$circuit" "$input_json"

  echo "[zk] generating witness: $circuit"
  node "$wasm_dir/generate_witness.js" "$wasm_file" "$input_json" "$witness"

  echo "[zk] generating proof: $circuit"
  npx snarkjs groth16 prove "$zkey_final" "$witness" "$proof_json" "$public_json"
done

echo "[zk] proof generation complete"
