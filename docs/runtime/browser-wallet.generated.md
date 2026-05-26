# Browser-Wallet Runtime Evidence

## Overview

- project: `PrivateDAO`
- generated at: `2026-05-26T03:06:10.015Z`
- network: `devnet`
- status: `pending-browser-wallet-capture`
- target count: `4`
- completed target count: `2`
- successful connect count: `2`
- successful submission count: `1`
- diagnostics snapshot count: `2`
- action coverage count: `7`

## Target Matrix

- Phantom (`phantom-browser-wallet`) | environment: `desktop-browser` | status: `captured-with-failures`
- Solflare (`solflare-browser-wallet`) | environment: `desktop-browser` | status: `captured`
- Backpack (`backpack-browser-wallet`) | environment: `desktop-browser` | status: `pending-capture`
- Glow (`glow-browser-wallet`) | environment: `desktop-browser` | status: `pending-capture`

## Pending Targets

- Backpack
- Glow

## Captures

### Phantom

- captured at: `2026-04-14T15:20:00.000Z`
- environment: `desktop-browser`
- os: `Linux`
- browser or client: `Playwright Chromium`
- actions covered: `Connect Wallet, Create DAO`
- connect result: `success`
- signing result: `failure`
- submission result: `not-attempted`
- diagnostics snapshot captured: `true`
- tx signature: `none`
- explorer url: `none`
- error message: `Create DAO reached the live pre-sign review and then the 'Awaiting wallet signature for the DAO bootstrap transaction...' state from the web command-center lane. Phantom was connected successfully, but browser automation did not complete a wallet popup/signature handoff. An earlier run in the same environment also surfaced 'Could not establish connection' and 'Attempting to use a disconnected port object' from the Phantom extension session.`

### Solflare

- captured at: `2026-04-18T02:49:35Z`
- environment: `desktop-browser`
- os: `Linux`
- browser or client: `Playwright Chromium`
- actions covered: `Connect Wallet, Create DAO, Create Proposal, Commit Vote, Reveal Vote, Finalize Proposal, Execute Proposal`
- connect result: `success`
- signing result: `success`
- submission result: `success`
- diagnostics snapshot captured: `true`
- tx signature: `4VcbB1ABpJvU4qiP9vPU5VcGfQDvwLNPnJCU9k74zUrm2o1WcPCKX5VV9AiFA6LNjsgrsvD674kQk2Y7qeEtkjJ4`
- explorer url: `https://explorer.solana.com/tx/4VcbB1ABpJvU4qiP9vPU5VcGfQDvwLNPnJCU9k74zUrm2o1WcPCKX5VV9AiFA6LNjsgrsvD674kQk2Y7qeEtkjJ4?cluster=devnet`
- error message: `none`

## Required Docs

- `docs/runtime/browser-wallet.md`
- `docs/runtime/browser-wallet-captures.json`
- `docs/governance-runtime-proof.generated.json`
- `docs/wallet-runtime.md`

## Commands

- `npm run build:browser-wallet-runtime`
- `npm run verify:browser-wallet-runtime`
- `npm run verify:runtime-surface`
- `npm run verify:all`

## Honest Boundary

This package makes browser-wallet runtime QA reviewer-visible and reproducible as an intake process. It does not treat live wallet-first code paths as a substitute for actual browser-wallet captures.
