# Current Network State — 2026-05-24

This is the canonical address boundary for the current reviewer-facing PrivateDAO deployment.

## Current Runtime

- Cluster: `Solana Testnet`
- Current Anchor 1.0.1 program: `EP9xE8MJZ6FfyEwLqns6HDdUZBknEa7WGYs1Jzsecuva`
- Current PDAO Token-2022 governance mint: `DFYvBdivHCe4bSErgCiKm2RhwGEcZYbBPFQzLNr37Bie`
- Current canonical DAO PDA: `FEz2hCLGpDhJ3cdAm5CCWFzrKv8vDDzmmt9UjdF2fApZ`
- Squads vault authority: `CALHrBqx6jbzcPn2NVcinqSAHeod65v9LcDuTxsdPqBv`
- Squads multisig: `thHmF7VYNtxE1MaDzYXbfPCiq13RF6JwuWnjvDZuSmF`
- Squads threshold: `2-of-3`
- Executed Squads proposal index `1`: `3E7SMWBouxxqFAMQFXybZQzfvnbchtYdZLBUE5QKe5GaJa4uMbJsVNHybubjSBBePuFuQUM6Cyed7goG7pPyj4Jk`
- Current binary Squads proposal index `3`: `HAQdiBhjHdYG35MNqn9JzMhg5itFFSj8oTnVPGhM2VYM`
- Current binary proposal status: `Approved 2-of-3; timelock enforced`
- Current binary timelock release target: `2026-05-27T02:25:39Z`

## Legacy Archive

- Legacy Devnet baseline program: `5AhUsbQ4mJ8Xh7QJEomuS85qGgmK9iNvFqzF669Y7Psx`
- Legacy Devnet governance mint: `AZUkprJDfJPgAp7L4z3TpCV3KHqLiA8RjHAVhK9HCvDt`

The legacy Devnet IDs remain in historical proof packets, load reports, and Devnet canary artifacts. They are not the current reviewer-facing program or token mint.

## Short Answer

PrivateDAO is currently evaluated through the `EP9x...Jzsecuva` Anchor 1.0.1 program on Solana Testnet. `5Ah...Y7Psx` is preserved only as old Devnet evidence.

## Verification Commands

```bash
solana program show EP9xE8MJZ6FfyEwLqns6HDdUZBknEa7WGYs1Jzsecuva --url https://api.testnet.solana.com
spl-token display --program-2022 DFYvBdivHCe4bSErgCiKm2RhwGEcZYbBPFQzLNr37Bie --url https://api.testnet.solana.com --output json-compact
npm run check:squads-timelock
PROPOSAL_INDEX=3 npm run execute:squads-upgrade
```
