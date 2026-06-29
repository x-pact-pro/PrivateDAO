# MagicBlock Runtime Evidence

## Overview

- project: `PrivateDAO`
- generated at: `2026-05-30T09:29:37.326Z`
- network: `devnet`
- status: `pending-magicblock-capture`
- target count: `6`
- completed target count: `1`
- deposit success count: `1`
- private transfer success count: `1`
- settle success count: `1`
- execute success count: `1`
- diagnostics snapshot count: `0`

## Target Matrix

- Phantom (`phantom-desktop-magicblock`) | environment: `desktop-browser` | status: `pending-capture`
- Solflare (`solflare-desktop-magicblock`) | environment: `desktop-browser` | status: `pending-capture`
- Backpack (`backpack-desktop-magicblock`) | environment: `desktop-browser` | status: `pending-capture`
- Glow (`glow-desktop-magicblock`) | environment: `desktop-browser` | status: `pending-capture`
- Android Native / Mobile (`android-runtime-magicblock`) | environment: `android-or-mobile` | status: `pending-capture`
- CLI Devnet Test Wallet (`cli-devnet-magicblock`) | environment: `cli-devnet` | status: `captured-with-failures`

## Pending Targets

- Phantom
- Solflare
- Backpack
- Glow
- Android Native / Mobile

## Captures

### CLI Devnet Test Wallet

- captured at: `2026-04-06T22:47:00.000Z`
- environment: `cli-devnet`
- proposal: `52UpWHJodPWQzpR8u2qqpgwo3jRB7mvjgwCnf8oSJuXX`
- corridor PDA: `8YH5f29UX363oMM1mqsXDyyBtyu4Y1b1BBuikV4xkAys`
- settlement wallet: `2TrX1tAJjcPcV8nc6f8LBAe97jZVi5hPG6jND3Wb1mCk`
- validator: `MAS1Dt9qreoRMQ14YQuhg8UTZMMzDdKhmkZMECCzk57`
- transfer queue: `FgUh7pocATTbVxJeorMb5iZwMQWcoVAAzy1PcCz2suZT`
- mint initialization result: `success`
- deposit result: `success`
- private transfer result: `success`
- withdraw result: `success`
- settle result: `success`
- execute result: `success`
- diagnostics snapshot captured: `false`
- deposit tx: `3FV1LENXhfzktPUQh6rK1mRhEk4aJf2snFhfMSK3nLM4au2y4n1smbEGCEWr5x8kJ7t86ZcAivB5HhsMqMWpkRJC`
- transfer tx: `662meytSDxGaCpkkkvMwqo6ZLFNvbC8jswHUw4sCaJmaYpov1995Xoik97CoWUHu6vvYigNdvfWSGBMfktzwbRr4`
- withdraw tx: `23VxsHqP9aDWTLCdPmRep5UxRXzj9mpvR9B5HGDC8Nt9tKNrVxiwCHCpzm7BLHg8TrChdpmx4awtHyUEW1QPdEBC`
- settle tx: `56zD3JYxYssgAkSsmxoh2zGzs11SakCXmUviMF53rdHy1HHcNQGqq72Jo9cbww2m67k7XsD5gqTB42HXMC8YEHHM`
- execute tx: `LoNED2YKkYWxaQbFV4y8fCzqGi5YrpPSruJYppqfvcTyAJ2zU5HM92QEsPNydQb26abE7qp2kB7hCNPJFbVUUPA`
- error message: `CLI Devnet route completed with real on-chain payout execution; browser diagnostics snapshot remains pending for wallet-specific capture.`

## Required Docs

- `docs/magicblock/private-payments.md`
- `docs/magicblock/operator-flow.md`
- `docs/magicblock/runtime-evidence.md`
- `docs/magicblock/runtime-captures.json`

## Commands

- `npm run build:magicblock-runtime`
- `npm run verify:magicblock-runtime`
- `npm run record:magicblock-runtime -- <capture-json-path>`
- `npm run configure:magicblock`
- `npm run settle:magicblock`
- `npm run magicblock:payments -- transfer --from <OWNER> --to <SETTLEMENT> --mint <MINT> --amount <RAW> --visibility private --from-balance base --to-balance ephemeral`

## Honest Boundary

This package makes the MagicBlock runtime path reviewable without pretending that every wallet environment has already been captured. It exists to turn future captures into stable evidence, not into ad hoc demo claims.
