# Squads Current Binary Upgrade Proposal — 2026-05-25

Date: 2026-05-25

This packet records the current Anchor 1.0.1 Testnet upgrade lane after the first timelock execution revealed that proposal index `1` used an older buffer than the local `target/deploy/private_dao.so` handoff build.

## What Was Closed

- Squads proposal index `1` was executed after its timelock released.
- Execution signature: `3E7SMWBouxxqFAMQFXybZQzfvnbchtYdZLBUE5QKe5GaJa4uMbJsVNHybubjSBBePuFuQUM6Cyed7goG7pPyj4Jk`
- ProgramData was extended first to avoid `AccountDataTooSmall`.
- ProgramData extend signature: `2rokPjVaDWQLAcs2ppKmgnZRoFw1ePVavrYNuJ58GzBYu6sBgmPzmtZgcKJzjpYHddQBkaPQZkt7pz8ubfuWrESL`
- Live program readout after execution:
  - program id: `EP9xE8MJZ6FfyEwLqns6HDdUZBknEa7WGYs1Jzsecuva`
  - program data: `FKyt5DcmRQcCF8kzMGjCvfGb3ZPHMQnH1SqiG9Mi8xEc`
  - authority: `CALHrBqx6jbzcPn2NVcinqSAHeod65v9LcDuTxsdPqBv`
  - last deployed slot: `410689759`
  - data length: `1487376`

## Why A New Proposal Was Required

The first executed upgrade did not activate the DAO and treasury-operator handoff instructions. A live call to `initialize_treasury_operator_authority` returned Anchor fallback error `101`, while the local IDL and source contain:

- `initialize_treasury_operator_authority`
- `transfer_treasury_operator_authority`
- `transfer_dao_authority`

The deployed binary hash did not match the current local binary hash, so a fresh buffer was uploaded and controlled by the Squads vault.

## Current Binary Buffer

- cluster: `Solana Testnet`
- program id: `EP9xE8MJZ6FfyEwLqns6HDdUZBknEa7WGYs1Jzsecuva`
- program data: `FKyt5DcmRQcCF8kzMGjCvfGb3ZPHMQnH1SqiG9Mi8xEc`
- current binary sha256: `1b6ecab37dcf2b80a8f011eaeca94c8db9dbdd062be2a2b7e5eb491237bfe9ed`
- new buffer: `HXcaUbT7Q8euufUbDKuhoRkSSYQPwUwmhw69TdePV6uY`
- buffer create signature: `4xtABuVUynWwqFSjtPZ3Uj5XMAUpi4AG8csMBrGvfYKKNn5rekaDFNLJbjNPa6DuypT2Ews9aZPDv9cDSpZfWRxJ`
- final chunk signature: `49nkn5M5TTxNn9t8uTtZoiAaKY1PceL8b38zxV1926Z4Gwn9rVmXesDhESTFzRtDzuKcHJwDRgYP7A5YL2g6JhB7`
- buffer authority transfer to Squads vault: `4g7SaVf6yXNouGCvxqDnSsQGD7yuPgJr9fLCSWhd3BaN1uQJgZy5LQ8iZZhMozSy83X8CBKjXfsjZTgdiZVq6fqB`
- new buffer authority: `CALHrBqx6jbzcPn2NVcinqSAHeod65v9LcDuTxsdPqBv`

## Squads Proposal Index 3

- multisig: `thHmF7VYNtxE1MaDzYXbfPCiq13RF6JwuWnjvDZuSmF`
- vault authority: `CALHrBqx6jbzcPn2NVcinqSAHeod65v9LcDuTxsdPqBv`
- threshold: `2-of-3`
- timelock: `172800` seconds
- transaction index: `3`
- vault transaction PDA: `BQjNS2iqiTKa2AqCvGBWptDUvhwoXhwDgwMKF4GQwm9`
- proposal PDA: `HAQdiBhjHdYG35MNqn9JzMhg5itFFSj8oTnVPGhM2VYM`
- vault transaction create: `56eZTSjozR6XfKr1oMjcKetX47PPMxhGasAtWhpGtZDSwq6DjmjTFUJmfEiQhdbS1uPaU5zaCHF4qTeLwcmEKPcb`
- proposal create: `2xmM6hv4SPBaFVaMgxmnPCw6Q3XqW5c6AqFXFQbB5RnX1UyPGUDJhbX143nY1u2pKAEm798vdoT1SeW7LKq32et3`
- approval by `4Mm5YTRbJuyA8NcWM85wTnx6ZQMXNph2DSnzCCKLhsMD`: `4rcv9EyfZpP8UmjNx6qfSL1GwiC5Wy9Ypxyg36e49QbmJCLxbhgka1vbYxen9oH566QkGqKmCEmez7zYvogGR85J`
- approval by `2KpA69UB55tfWUSkKj5j7Tvebd3eG22hEs9hjXUq7pf5`: `3giWXofHsD8Aau7qJbym3pfE6MMT2ZhdWCvZZq3C7M4zp8GFbC1LDqbnFro9ovKREf8ME1rNjE5VDN4xnh2s4JNi`
- status after second approval: `Approved`
- approved at: `2026-05-25T02:25:39Z`
- timelock release: `2026-05-27T02:25:39Z`

## Enforced Timelock Proof

Execution was attempted immediately after the second approval. Squads rejected it in simulation:

- error: `TimeLockNotReleased`
- custom code: `6021`
- interpretation: even a 2-of-3 approved upgrade cannot execute before the configured 48-hour timelock.

This is the correct custody result. The current binary is staged behind Squads, approved by two members, and blocked only by the enforced timelock.

## Execution Command After Release

Run after `2026-05-27T02:25:39Z`:

```bash
SOLANA_RPC_URL=https://api.testnet.solana.com PROPOSAL_INDEX=3 npm run execute:squads-upgrade
```

Then verify:

```bash
solana program dump EP9xE8MJZ6FfyEwLqns6HDdUZBknEa7WGYs1Jzsecuva /tmp/privatedao-deployed.so --url https://api.testnet.solana.com
sha256sum /tmp/privatedao-deployed.so target/deploy/private_dao.so
ANCHOR_PROVIDER_URL=https://api.testnet.solana.com npm run initialize:treasury-operator-authority -- --dao FEz2hCLGpDhJ3cdAm5CCWFzrKv8vDDzmmt9UjdF2fApZ
```
