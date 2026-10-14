# Current Network State — 2026-05-24

This is the canonical address boundary for the current reviewer-facing PrivateDAO deployment.

## Current Runtime

- Cluster: `Solana Testnet`
- Current Anchor 1.0.1 program: `EP9xE8MJZ6FfyEwLqns6HDdUZBknEa7WGYs1Jzsecuva`
- Public PDAO Mainnet token mint: `9isGuumtaqvJeJeyLF44fvfskk2cv5mYsopexMBfpump`
- Current canonical DAO PDA: `FEz2hCLGpDhJ3cdAm5CCWFzrKv8vDDzmmt9UjdF2fApZ`
- Squads vault authority: `CALHrBqx6jbzcPn2NVcinqSAHeod65v9LcDuTxsdPqBv`
- Squads multisig: `thHmF7VYNtxE1MaDzYXbfPCiq13RF6JwuWnjvDZuSmF`
- Squads threshold: `2-of-3`
- Executed Squads proposal index `1`: `3E7SMWBouxxqFAMQFXybZQzfvnbchtYdZLBUE5QKe5GaJa4uMbJsVNHybubjSBBePuFuQUM6Cyed7goG7pPyj4Jk`
- Current binary Squads proposal index `3`: `HAQdiBhjHdYG35MNqn9JzMhg5itFFSj8oTnVPGhM2VYM`
- Current binary proposal status: `Approved 2-of-3; timelock enforced`
- Current binary timelock release target: `2026-05-27T02:25:39Z`

## Scope Boundary

The Testnet runtime record above describes product execution only. The public
PDAO token identity is maintained separately on Solana Mainnet.

## Short Answer

PrivateDAO product execution is currently evaluated through the
`EP9x...Jzsecuva` Anchor 1.0.1 program on Solana Testnet. The public PDAO token
identity is `9isGuumtaqvJeJeyLF44fvfskk2cv5mYsopexMBfpump` on Solana Mainnet.

## Verification Commands

```bash
solana program show EP9xE8MJZ6FfyEwLqns6HDdUZBknEa7WGYs1Jzsecuva --url https://api.testnet.solana.com
solana account 9isGuumtaqvJeJeyLF44fvfskk2cv5mYsopexMBfpump --url https://api.mainnet-beta.solana.com
PROPOSAL_INDEX=3 RELEASE_AT=2026-05-27T02:25:39Z npm run check:squads-timelock
PROPOSAL_INDEX=3 npm run execute:squads-upgrade
```
