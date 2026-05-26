# Governance Runtime Proof Status

## Overview

- Generated at: `2026-05-25T23:47:09.997Z`
- Project: `PrivateDAO`
- Network: `devnet`
- Program id: `EP9xE8MJZ6FfyEwLqns6HDdUZBknEa7WGYs1Jzsecuva`
- Live wallet-first actions: `6`
- Repo-script proofs captured: `6`
- Browser-wallet proofs captured: `6`
- Real-device proofs captured: `3`

## Current Boundary

- Unsupported executable boundary: CustomCPI treasury actions remain outside the executable release boundary.
- Pending browser-wallet captures: none
- Pending real-device captures: Reveal Vote, Finalize Proposal, Execute Proposal

## Action Status

### Create DAO

- Instruction: `initialize_dao`
- Live wallet-first lane: `true`
- Repo-script proof captured: `true`
- Browser-wallet proof captured: `true`
- Real-device proof captured: `true`
- Note: DAO bootstrap is live in the web wallet lane. Repo-script proof exists, the full Solflare browser cycle is captured, and Android Solflare now proves the mobile path through DAO bootstrap on Testnet.

### Create Proposal

- Instruction: `create_proposal`
- Live wallet-first lane: `true`
- Repo-script proof captured: `true`
- Browser-wallet proof captured: `true`
- Real-device proof captured: `true`
- Note: Proposal submit is live in the web wallet lane, including the current SendSol and SendToken treasury motions. The full Solflare browser cycle is captured, and Android Solflare now proves proposal creation on Testnet.

### Commit Vote

- Instruction: `commit_vote`
- Live wallet-first lane: `true`
- Repo-script proof captured: `true`
- Browser-wallet proof captured: `true`
- Real-device proof captured: `true`
- Note: Commit vote is live in the web wallet lane once a real DAO and proposal already exist in session state. The full Solflare browser cycle is captured, and Android Solflare now proves commit-vote submission on Testnet.

### Reveal Vote

- Instruction: `reveal_vote`
- Live wallet-first lane: `true`
- Repo-script proof captured: `true`
- Browser-wallet proof captured: `true`
- Real-device proof captured: `false`
- Note: Reveal vote is live in the web wallet lane once a live commit already exists in the same session. The full Solflare browser cycle is captured; Android remains in capture expansion for this stage.

### Finalize Proposal

- Instruction: `finalize_proposal`
- Live wallet-first lane: `true`
- Repo-script proof captured: `true`
- Browser-wallet proof captured: `true`
- Real-device proof captured: `false`
- Note: Finalize proposal is live in the web wallet lane. Repo-script proof exists and the full Solflare browser cycle is captured; Android remains in capture expansion for this stage.

### Execute Proposal

- Instruction: `execute_proposal`
- Live wallet-first lane: `true`
- Repo-script proof captured: `true`
- Browser-wallet proof captured: `true`
- Real-device proof captured: `false`
- Note: Execute proposal is live in the web wallet lane for standard, SendSol, and SendToken proposals. The full Solflare browser cycle is captured; Android capture expansion remains pending and CustomCPI stays outside the current executable release boundary.

## Linked Docs

- `docs/test-wallet-live-proof.generated.md`
- `docs/test-wallet-live-proof-v3.generated.md`
- `docs/runtime-evidence.generated.md`
- `docs/runtime/browser-wallet.generated.md`
- `docs/runtime/browser-wallet.md`
- `docs/runtime/real-device.generated.md`
- `docs/runtime/real-device.md`
- `docs/launch-trust-packet.generated.md`
- `docs/treasury-reviewer-packet.generated.md`

## Commands

- `npm run live-proof`
- `npm run live-proof:v3`
- `npm run build:governance-runtime-proof`
- `npm run verify:governance-runtime-proof`
- `npm run build:browser-wallet-runtime`
- `npm run verify:browser-wallet-runtime`
- `npm run build:real-device-runtime`
- `npm run verify:real-device-runtime`

## Notes

- This packet separates live web wallet capability from runtime proof capture so the product does not overclaim based on shipped code alone.
- Repo-script proof exists for the governance core lifecycle, the full Solflare browser cycle is captured on the live web route, and Android Solflare now proves the mobile path through Create DAO, Create Proposal, and Commit Vote.
- The web wallet lane currently covers Create DAO, Create Proposal, Commit Vote, Reveal Vote, Finalize Proposal, and Execute Proposal for standard, SendSol, and SendToken proposals.
