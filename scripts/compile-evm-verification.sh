#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BUILD_DIR="$(mktemp -d)"
trap 'rm -rf "$BUILD_DIR"' EXIT

npx --yes solc@0.8.24 \
  --base-path "$ROOT_DIR" \
  --include-path "$ROOT_DIR/node_modules" \
  --bin --abi \
  "$ROOT_DIR/packages/evm-verification/contracts/PrivateDaoBlindPolicyGroth16Verifier.sol" \
  "$ROOT_DIR/packages/evm-verification/contracts/BlindVerificationRegistry.sol" \
  "$ROOT_DIR/packages/evm-verification/contracts/RecordVerificationRegistry.sol" \
  "$ROOT_DIR/packages/evm-verification/contracts/PrivateDaoTreasury.sol" \
  "$ROOT_DIR/packages/evm-verification/contracts/PrivateDaoPayroll.sol" \
  "$ROOT_DIR/packages/evm-verification/contracts/PrivateDaoTokenTreasury.sol" \
  "$ROOT_DIR/packages/evm-verification/contracts/PrivateDaoGovernance.sol" \
  "$ROOT_DIR/packages/evm-verification/contracts/PrivateDaoSealedAuction.sol" \
  "$ROOT_DIR/packages/evm-verification/contracts/PrivateDaoTokenSealedAuction.sol" \
  -o "$BUILD_DIR"

mkdir -p "$ROOT_DIR/packages/evm-verification/artifacts"
cp "$BUILD_DIR/packages_evm-verification_contracts_PrivateDaoBlindPolicyGroth16Verifier_sol_Groth16Verifier.bin" "$ROOT_DIR/packages/evm-verification/artifacts/Groth16Verifier.bin"
cp "$BUILD_DIR/packages_evm-verification_contracts_PrivateDaoBlindPolicyGroth16Verifier_sol_Groth16Verifier.abi" "$ROOT_DIR/packages/evm-verification/artifacts/Groth16Verifier.abi"
cp "$BUILD_DIR/packages_evm-verification_contracts_BlindVerificationRegistry_sol_BlindVerificationRegistry.bin" "$ROOT_DIR/packages/evm-verification/artifacts/BlindVerificationRegistry.bin"
cp "$BUILD_DIR/packages_evm-verification_contracts_BlindVerificationRegistry_sol_BlindVerificationRegistry.abi" "$ROOT_DIR/packages/evm-verification/artifacts/BlindVerificationRegistry.abi"
cp "$BUILD_DIR/packages_evm-verification_contracts_RecordVerificationRegistry_sol_RecordVerificationRegistry.bin" "$ROOT_DIR/packages/evm-verification/artifacts/RecordVerificationRegistry.bin"
cp "$BUILD_DIR/packages_evm-verification_contracts_RecordVerificationRegistry_sol_RecordVerificationRegistry.abi" "$ROOT_DIR/packages/evm-verification/artifacts/RecordVerificationRegistry.abi"
cp "$BUILD_DIR/packages_evm-verification_contracts_PrivateDaoTreasury_sol_PrivateDaoTreasury.bin" "$ROOT_DIR/packages/evm-verification/artifacts/PrivateDaoTreasury.bin"
cp "$BUILD_DIR/packages_evm-verification_contracts_PrivateDaoTreasury_sol_PrivateDaoTreasury.abi" "$ROOT_DIR/packages/evm-verification/artifacts/PrivateDaoTreasury.abi"
cp "$BUILD_DIR/packages_evm-verification_contracts_PrivateDaoPayroll_sol_PrivateDaoPayroll.bin" "$ROOT_DIR/packages/evm-verification/artifacts/PrivateDaoPayroll.bin"
cp "$BUILD_DIR/packages_evm-verification_contracts_PrivateDaoPayroll_sol_PrivateDaoPayroll.abi" "$ROOT_DIR/packages/evm-verification/artifacts/PrivateDaoPayroll.abi"
cp "$BUILD_DIR/packages_evm-verification_contracts_PrivateDaoTokenTreasury_sol_PrivateDaoTokenTreasury.bin" "$ROOT_DIR/packages/evm-verification/artifacts/PrivateDaoTokenTreasury.bin"
cp "$BUILD_DIR/packages_evm-verification_contracts_PrivateDaoTokenTreasury_sol_PrivateDaoTokenTreasury.abi" "$ROOT_DIR/packages/evm-verification/artifacts/PrivateDaoTokenTreasury.abi"
cp "$BUILD_DIR/packages_evm-verification_contracts_PrivateDaoGovernance_sol_PrivateDaoGovernance.bin" "$ROOT_DIR/packages/evm-verification/artifacts/PrivateDaoGovernance.bin"
cp "$BUILD_DIR/packages_evm-verification_contracts_PrivateDaoGovernance_sol_PrivateDaoGovernance.abi" "$ROOT_DIR/packages/evm-verification/artifacts/PrivateDaoGovernance.abi"
cp "$BUILD_DIR/packages_evm-verification_contracts_PrivateDaoSealedAuction_sol_PrivateDaoSealedAuction.bin" "$ROOT_DIR/packages/evm-verification/artifacts/PrivateDaoSealedAuction.bin"
cp "$BUILD_DIR/packages_evm-verification_contracts_PrivateDaoSealedAuction_sol_PrivateDaoSealedAuction.abi" "$ROOT_DIR/packages/evm-verification/artifacts/PrivateDaoSealedAuction.abi"
cp "$BUILD_DIR/packages_evm-verification_contracts_PrivateDaoTokenSealedAuction_sol_PrivateDaoTokenSealedAuction.bin" "$ROOT_DIR/packages/evm-verification/artifacts/PrivateDaoTokenSealedAuction.bin"
cp "$BUILD_DIR/packages_evm-verification_contracts_PrivateDaoTokenSealedAuction_sol_PrivateDaoTokenSealedAuction.abi" "$ROOT_DIR/packages/evm-verification/artifacts/PrivateDaoTokenSealedAuction.abi"

echo "EVM verification contracts compiled"
