# Umbra Intent Evidence 2026-05-07

## Purpose

This packet documents the current PrivateDAO Umbra integration boundary for reviewers. It shows the complete product-side stealth-settlement intent path, the relayer readiness check, the recipient privacy hash, and the exact line between PrivateDAO evidence and Umbra's full UTXO claim flow.

## Product Route

- Live route: `https://privatedao.org/services/umbra-confidential-payout/`
- Settlement workbench: `https://privatedao.org/services/cloak-private-settlement/`
- Proof route: `https://privatedao.org/proof/?judge=1`
- Hosted read-node: `https://api.privatedao.org/api/v1`

## Current Umbra Boundary

PrivateDAO verifies the Umbra Devnet relayer and records privacy-preserving intent receipts through the hosted read-node. The relayer API is operationally reachable and exposes health, identity, supported mints, and active stealth pool indices.

The full Umbra UTXO claim path still requires Umbra SDK-generated cryptographic proof data:

- `proof_account_data`
- `utxo_slot_data`
- relayer-supported mint
- active stealth pool index
- ZK prover output
- claim variant (`encrypted_balance` or `public_balance`)

PrivateDAO does not fabricate these fields. The product records the intent boundary and relayer readiness until the full SDK claim has the required proof payload.

## Evidence Flow

1. Operator prepares a confidential payout from the PrivateDAO UI.
2. The UI hashes recipient-level information locally before the reviewer-facing packet is stored.
3. The hosted read-node verifies Umbra relayer health and relayer information.
4. The product records a settlement intent receipt in Supabase through browser-direct receipt continuity.
5. The Proof Matrix displays the receipt as an Umbra/Cloak lane with clear status and boundary text.

## Recipient Privacy Hash

Recipient-level details are represented by a deterministic hash in the public proof layer. This keeps reviewer evidence stable without revealing the final recipient identity or payroll sheet.

Example intent fields:

- rail: `umbra`
- operation type: `confidential_payout_intent`
- audit mode: `scoped_viewing_key`
- recipient visibility: `hashed`
- response status: `intent_recorded`

## Reviewer Interpretation

This is a real product integration boundary, not a full completed Umbra claim execution. Reviewers should treat the current evidence as:

- relayer reachable
- intent receipt recorded
- privacy hash generated
- Proof Matrix continuity wired
- full UTXO claim pending SDK-generated proof payload

## Related Evidence

- Umbra Devnet relayer receipt: `https://privatedao.org/documents/umbra-devnet-relayer-receipt-2026-05-06/`
- Runtime closure packet: `https://privatedao.org/documents/testnet-integration-runtime-closure-2026-05-07/`
- Supabase receipt schema: `docs/supabase-operation-receipts.sql`
