# Core Integration Evidence

This legacy document path is intentionally preserved so older links do not break.

The current reviewer-facing integration packet is:

- `docs/frontier-integrations.generated.md`
- live route: `/documents/frontier-integrations`
- current network: Solana Testnet
- current Anchor 1.0.1 program: `EP9xE8MJZ6FfyEwLqns6HDdUZBknEa7WGYs1Jzsecuva`

## Current Status

PrivateDAO has moved from the archived Devnet integration packet to the current Testnet evidence path. The live packet binds:

- ZK standalone verifier evidence
- REFHE envelope settlement
- MagicBlock corridor settlement
- backend-indexed read-node evidence
- reviewer-visible Testnet receipts

## Verification

Run:

```bash
npm run build:frontier-integrations
npm run verify:frontier-integrations
npm run verify:encrypted-integrations-activation
npm run verify:magicblock-runtime
```

## Boundary

This path no longer presents the archived Devnet program as current. Devnet evidence remains historical rehearsal material only. The live judging surface is the Testnet packet linked above.
