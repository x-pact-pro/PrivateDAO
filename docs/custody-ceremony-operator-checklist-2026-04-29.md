# Custody Ceremony Operator Checklist

Date: 2026-04-29

This checklist is the only evidence needed from operators before `npm run apply:custody-evidence-intake` can close the custody lane. Do not place seed phrases, private keys, recovery phrases, or hardware-wallet export material in this repository.

## Required Public Evidence

- Multisig implementation name, for example Squads Protocol or SPL Token-2022 multisig.
- Multisig public address.
- Network, expected to be `devnet` for rehearsal or `mainnet-beta` for production.
- Threshold, expected to be `2-of-3` or stronger.
- Signer public keys and role labels.
- Timelock or delay setting, expected to be at least 48 hours for production authority moves.
- Multisig creation transaction signature.
- Program upgrade-authority transfer transaction signature.
- Treasury or operational authority transfer transaction signatures, if any.
- Post-transfer readout links showing the authority now resolves to the multisig.

## Safe Intake Flow

1. Fill `docs/custody-evidence-intake.template.json` with public addresses and signatures only.
2. Save the filled copy as `docs/custody-evidence-intake.json`.
3. Run `npm run apply:custody-evidence-intake`.
4. Run `npm run verify:multisig-intake`.
5. Run `npm run build:custody-proof-reviewer-packet`.
6. Run `npm run verify:custody-proof-reviewer-packet`.
7. Rebuild launch evidence with `npm run build:launch-trust-packet`.

## Current Boundary

Until the public evidence above is recorded, PrivateDAO should continue to claim testnet readiness and devnet-proven operational flow, not production mainnet custody completion.
