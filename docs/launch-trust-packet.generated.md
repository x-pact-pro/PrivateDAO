# Launch Trust Packet

## Overview

- project: `PrivateDAO`
- generated at: `2026-05-24T21:33:34.668Z`
- current decision: `blocked-external-steps`
- production mainnet claim allowed: `false`

## Custody Snapshot

- custody status: `ready-for-transfer`
- multisig implementation: `Squads Protocol`
- rehearsal implementation: `spl-token-2022-multisig`
- rehearsal network: `devnet`
- rehearsal multisig address: `EqbW1xQRABPNmPM4TMkdygp6j94i7A3DSbgFKTpqXvJE`
- rehearsal creation signature: `4KSyTYQTzeNpBDWou7GFLmvUpAhLgmNKkNdd4PZqndLpCWmUnArffYRQUwe6zrTmQD5uCbBfBR6pakf9Gz8dviRp`
- threshold target: `2-of-3`
- multisig address: `thHmF7VYNtxE1MaDzYXbfPCiq13RF6JwuWnjvDZuSmF`
- signer slots configured: `3`
- minimum timelock hours: `48`
- configured timelock hours: `48`
- observed Testnet authority: `CALHrBqx6jbzcPn2NVcinqSAHeod65v9LcDuTxsdPqBv`
- observed target-network program status: `not-found`

Pending authority transfers:

- `dao-authority`
- `treasury-operator-authority`

## Runtime Snapshot

- runtime status: `pending-real-device-capture`
- completed targets: `1/5`

Pending real-device targets:

- Phantom
- Solflare
- Backpack
- Glow

## Audit Snapshot

- audit status: `pending-external`
- next action: Complete an external program audit against the exact deployed mainnet candidate and record finding closure or accepted residual risk.

## Pilot Snapshot

- pilot status: `repo-ready-pending-external-target`

Lifecycle to prove for the first pilot:

1. Create DAO
2. Submit proposal
3. Private vote
4. Execute treasury

Available use-case packs:

- Grant Committee Pack
- Fund Governance Pack
- Gaming DAO Pack
- Enterprise DAO Pack

## Additive V3 Evidence

- governance hardening: `docs/governance-hardening-v3.md`
- settlement hardening: `docs/settlement-hardening-v3.md`
- dedicated live proof: `docs/test-wallet-live-proof-v3.generated.md`
- V3 evidence status: `devnet-proven`
- V3 evidence boundary: `test-wallet-devnet-only`

## Required External Inputs

- 3 production signer public keys
- chosen multisig implementation and address
- 48+ hour timelock configuration evidence
- authority transfer signatures, explorer links, and readouts
- real-device wallet captures
- external audit report or signed memo
- first pilot DAO target and operator contact

## Linked Docs

- `docs/multisig-setup-intake.md`
- `docs/canonical-custody-proof.generated.md`
- `docs/custody-proof-reviewer-packet.generated.md`
- `docs/custody-observed-readouts.json`
- `docs/production-custody-ceremony.md`
- `docs/authority-transfer-runbook.md`
- `docs/external-audit-engagement.md`
- `docs/audit-handoff.md`
- `docs/governance-hardening-v3.md`
- `docs/settlement-hardening-v3.md`
- `docs/test-wallet-live-proof-v3.generated.md`
- `docs/runtime/real-device.md`
- `docs/pilot-onboarding-playbook.md`
- `docs/pilot-program.md`
- `docs/trust-package.md`
- `docs/mainnet-blockers.md`

## Canonical Commands

- `npm run build:launch-trust-packet`
- `npm run verify:launch-trust-packet`
- `npm run build:custody-proof-reviewer-packet`
- `npm run verify:custody-proof-reviewer-packet`
- `npm run verify:multisig-intake`
- `npm run verify:launch-ops`
- `npm run verify:mainnet-blockers`
- `npm run verify:real-device-runtime`
- `npm run check:mainnet`

## Honest Boundary

This packet proves that the repository is operationally prepared for custody, audit, runtime capture, and pilot onboarding.

It does not claim those external actions have already happened until the corresponding addresses, signatures, captures, and audit outputs are recorded.
