#!/usr/bin/env bash
set -euo pipefail

CLUSTER="${CLUSTER:-https://api.testnet.solana.com}"
VAULT="${VAULT:-CALHrBqx6jbzcPn2NVcinqSAHeod65v9LcDuTxsdPqBv}"
MULTISIG="${MULTISIG:-thHmF7VYNtxE1MaDzYXbfPCiq13RF6JwuWnjvDZuSmF}"
PROPOSAL_INDEX="${PROPOSAL_INDEX:-1}"
DAO_PDA="${DAO_PDA:-}"
RELEASE_AT="${RELEASE_AT:-2026-05-25T00:31:05Z}"
EXECUTE_TIMELOCK="${EXECUTE_TIMELOCK:-0}"

if [[ "${EXECUTE_TIMELOCK}" != "1" ]]; then
  echo "DRY RUN: set EXECUTE_TIMELOCK=1 after ${RELEASE_AT} to execute."
  echo "Cluster: ${CLUSTER}"
  echo "Squads vault: ${VAULT}"
  echo "Squads multisig: ${MULTISIG}"
  echo "Proposal index: ${PROPOSAL_INDEX}"
  echo "DAO PDA: ${DAO_PDA:-set DAO_PDA before DAO authority handoff}"
  echo "Planned commands:"
  echo "squads-cli vault-transaction execute --multisig ${MULTISIG} --vault ${VAULT} --transaction-index ${PROPOSAL_INDEX} --cluster testnet"
  echo "npm run transfer:dao-authority -- --dao <DAO_PDA> --new-authority ${VAULT}"
  echo "Treasury SOL/SPL execution is proposal/PDA-bound in the current Anchor program; no separate transfer_treasury_authority instruction exists in this build."
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
squads-cli vault-transaction execute --multisig "${MULTISIG}" --vault "${VAULT}" --transaction-index "${PROPOSAL_INDEX}" --cluster testnet
npm run transfer:dao-authority -- --dao "${DAO_PDA}" --new-authority "${VAULT}"
echo "Done. Squads upgrade execution and DAO authority handoff submitted. Record signatures and post-transfer readouts before changing custody gates."
