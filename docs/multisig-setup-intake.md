# Multisig Setup Intake

This file is the execution intake for moving PrivateDAO from repository readiness to real production custody. It is deliberately strict: the repository can define the required shape, but the multisig is not considered created until the public addresses and transaction evidence are recorded.

Canonical machine-readable source:

- `docs/multisig-setup-intake.json`

Strict operator ingestion path:

- Build the packet in `/custody`
- Save the downloaded JSON as local operator input: `docs/custody-evidence-intake.json`
- Apply and rebuild all linked proof artifacts with:

```bash
npm run apply:custody-evidence-intake
```

## Chosen Path

- Implementation: `Squads Protocol`
- Live ceremony lane: `mainnet-beta production custody once signer posture, timelock, and authority-transfer evidence are ready`
- Why this path: Squads is the clearest Solana-native multisig surface for reviewer-visible approval history, signer roles, and explorer-verifiable transfer evidence on the real production custody path.

Supporting operator docs:

- `docs/production-custody-ceremony.md`
- `docs/squads-devnet-multisig-ceremony.md`
- `docs/custody-evidence-intake.template.json`

## Required Target

- Network: `testnet` for the reviewer-facing custody transfer; `mainnet-beta` remains blocked until real-funds cutover.
- Threshold: `2-of-3`
- Timelock: `48+ hours`
- Custody target: program upgrade authority and production operational authorities
- Secret handling: no seed phrases, no private keys, no hot-wallet exports in Git

## Current Testnet Authority Transfer

Read-only command run after transfer on `2026-05-22`:

```bash
solana program show EP9xE8MJZ6FfyEwLqns6HDdUZBknEa7WGYs1Jzsecuva --url https://api.testnet.solana.com
```

Observed output:

```text
Program Id: EP9xE8MJZ6FfyEwLqns6HDdUZBknEa7WGYs1Jzsecuva
ProgramData Address: FKyt5DcmRQcCF8kzMGjCvfGb3ZPHMQnH1SqiG9Mi8xEc
Authority: CALHrBqx6jbzcPn2NVcinqSAHeod65v9LcDuTxsdPqBv
Last Deployed In Slot: 405189011
```

The previous single-key authority `4Mm5YTRbJuyA8NcWM85wTnx6ZQMXNph2DSnzCCKLhsMD` has been replaced by the Squads vault authority PDA `CALHrBqx6jbzcPn2NVcinqSAHeod65v9LcDuTxsdPqBv` on Testnet.

Squads creation:

- multisig PDA: `thHmF7VYNtxE1MaDzYXbfPCiq13RF6JwuWnjvDZuSmF`
- vault authority PDA: `CALHrBqx6jbzcPn2NVcinqSAHeod65v9LcDuTxsdPqBv`
- threshold: `2-of-3`
- timelock: `48+ hours`
- creation signature: `67S63JAUNvvCED3hE9h6bCXW9iJ3EYzJLARvj8Lki5x2dJEgLnrfES9mp6bAxfsH6vfmor2ocqNaEd68uVN68DNJ`

Transfer command:

```bash
solana program set-upgrade-authority EP9xE8MJZ6FfyEwLqns6HDdUZBknEa7WGYs1Jzsecuva \
  --new-upgrade-authority CALHrBqx6jbzcPn2NVcinqSAHeod65v9LcDuTxsdPqBv \
  --keypair /home/x-pact/.config/solana/id.json \
  --url https://api.testnet.solana.com \
  --skip-new-upgrade-authority-signer-check
```

Transfer signature:

- `EzwLLrAchBpj3eLTUFuv1uo9rSLKgKNbQgp1DkCevJycT31Eou9TSJsJsEfMjLt4q87pKwXaZUTqCZ1NduNc1vy`

Full transfer packet:

- `docs/squads-testnet-custody-transfer-2026-05-22.md`

The packet remains `ready-for-transfer`, not `complete`, until DAO authority, treasury-operator authority, and any required production cutover evidence are recorded.

## Live Rehearsal Source

- Devnet rehearsal multisig:
  - implementation: `spl-token-2022-multisig`
  - address: `EqbW1xQRABPNmPM4TMkdygp6j94i7A3DSbgFKTpqXvJE`
  - creation signature: `4KSyTYQTzeNpBDWou7GFLmvUpAhLgmNKkNdd4PZqndLpCWmUnArffYRQUwe6zrTmQD5uCbBfBR6pakf9Gz8dviRp`
- Rehearsal proved:
  - the `2-of-3` model is live
  - the 3-role signer shape is workable
  - the production closure can keep the same signer model with a stricter mainnet ceremony

This rehearsal is real evidence. It is not itself the production custody closure.

## Required Signer Slots

| Slot | Role | Public Key | Storage Class | Backup Procedure |
| --- | --- | --- | --- | --- |
| 1 | founder-operator | pending | cold-or-hardware | pending |
| 2 | independent-security-or-ops-signer | pending | cold-or-hardware | pending |
| 3 | recovery-or-governance-signer | pending | cold-or-hardware | pending |

## Candidate Minimal-Delta Production Model

These are the current rehearsal wallets and may be promoted only if they are moved into production-safe custody posture.

| Slot | Role | Rehearsal Wallet | Candidate Public Key | Promotion Condition |
| --- | --- | --- | --- | --- |
| 1 | founder-operator | Solflare | `73EzhBNNdM2ZV3LzMxyNZ5FwGiZCZJrbZTHyRxhTsdq9` | moved to cold-or-hardware custody and retained as the operational founder signer |
| 2 | independent-security-or-ops-signer | Phantom | `BBBPcpUnnBi3CWUhcv6vLTqaY9pugAGuhgw2Axjpvcr2` | signer is operationally independent and approval path is documented |
| 3 | recovery-or-governance-signer | Backpack | `2KpA69UB55tfWUSkKj5j7Tvebd3eG22hEs9hjXUq7pf5` | recovery/governance path remains separate and backup path is documented |

## Required Evidence Before Completion

- multisig implementation selection
- chosen Solana-native operator surface for the live ceremony
- multisig address
- 3 distinct public signer keys
- threshold set to exactly `2`
- timelock configured to at least `48` hours
- multisig creation signature
- zero-value or low-risk rehearsal signature
- program upgrade authority transfer signature
- DAO authority transfer signature, if applicable
- treasury operator authority transfer signature, if applicable
- post-transfer `solana program show` or equivalent authority readout
- post-transfer readout reference URL or repo-backed evidence path
- backup and signer replacement procedure retained outside secret material

## Forbidden Evidence

- private keys
- seed phrases
- unencrypted keypair JSON
- screenshots containing secrets
- hot-wallet exports

## Current Status

`ready-for-transfer`

This is correct after the Testnet program-upgrade authority transfer. The remaining closure work is DAO authority, treasury-operator authority, and production cutover evidence. Historical `pending-external` language remains in this document only as a boundary for unclosed production/mainnet claims.

Canonical reviewer-safe packet:

- `docs/canonical-custody-proof.generated.md`
- `docs/custody-observed-readouts.json`
- `docs/production-custody-ceremony.md`
- `docs/squads-devnet-multisig-ceremony.md`

## Verification

```bash
npm run verify:multisig-intake
```
