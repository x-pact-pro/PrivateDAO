#!/usr/bin/env bash
set -euo pipefail

CLUSTER="${CLUSTER:-https://api.testnet.solana.com}"
ANCHOR_WALLET="${ANCHOR_WALLET:-${HOME}/.config/solana/id.json}"
VAULT="${VAULT:-CALHrBqx6jbzcPn2NVcinqSAHeod65v9LcDuTxsdPqBv}"
MULTISIG="${MULTISIG:-thHmF7VYNtxE1MaDzYXbfPCiq13RF6JwuWnjvDZuSmF}"
PROPOSAL_INDEX="${PROPOSAL_INDEX:-1}"
DAO_PDA="${DAO_PDA:-}"
RELEASE_AT="${RELEASE_AT:-2026-05-25T00:31:05Z}"
EXECUTE_TIMELOCK="${EXECUTE_TIMELOCK:-0}"

if [[ "${EXECUTE_TIMELOCK}" != "1" ]]; then
  echo "DRY RUN: set EXECUTE_TIMELOCK=1 after ${RELEASE_AT} to execute."
  node scripts/check-squads-timelock-window.mjs || true
  echo "Cluster: ${CLUSTER}"
  echo "Squads vault: ${VAULT}"
  echo "Squads multisig: ${MULTISIG}"
  echo "Proposal index: ${PROPOSAL_INDEX}"
  echo "DAO PDA: ${DAO_PDA:-set DAO_PDA before DAO authority handoff}"
  echo "Planned commands:"
  echo "npm run execute:squads-upgrade"
  echo "npm run initialize:treasury-operator-authority -- --dao <DAO_PDA>"
  echo "npm run transfer:treasury-operator-authority -- --dao <DAO_PDA> --new-authority ${VAULT}"
  echo "npm run transfer:dao-authority -- --dao <DAO_PDA> --new-authority ${VAULT}"
  echo "Exact prepared command after release:"
  echo "EXECUTE_TIMELOCK=1 DAO_PDA=FEz2hCLGpDhJ3cdAm5CCWFzrKv8vDDzmmt9UjdF2fApZ scripts/execute-after-timelock.sh"
  echo "Record the resulting tx/readout in docs/multisig-setup-intake.json or the custody intake flow."
  exit 0
fi

if [[ -z "${DAO_PDA}" ]]; then
  echo "DAO_PDA is required for DAO authority handoff."
  exit 1
fi

NOW="$(date -u +%s)"
RELEASE="$(date -u -d "${RELEASE_AT}" +%s)"
if (( NOW < RELEASE )); then
  echo "Timelock still active. Release: ${RELEASE_AT}"
  exit 1
fi

solana config set --url "${CLUSTER}"
export SOLANA_RPC_URL="${CLUSTER}"
export ANCHOR_PROVIDER_URL="${CLUSTER}"
export ANCHOR_WALLET="${ANCHOR_WALLET}"
npm run execute:squads-upgrade
npm run initialize:treasury-operator-authority -- --dao "${DAO_PDA}"
npm run transfer:treasury-operator-authority -- --dao "${DAO_PDA}" --new-authority "${VAULT}"
npm run transfer:dao-authority -- --dao "${DAO_PDA}" --new-authority "${VAULT}"
echo "Done. Squads upgrade execution, DAO authority handoff, and treasury operator authority handoff submitted. Record signatures and post-transfer readouts before changing custody gates."
