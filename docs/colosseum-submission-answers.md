# Submission Answers

This file is the canonical answer pack for manual submission updates. It exists because the repo can be updated directly, while external submission portals may still require manual copy-paste.

For the public product posture around the current review cycle, use [superteam-track-submission-matrix-2026.md](docs/superteam-track-submission-matrix-2026.md) as the companion source.

## Core Links

- Website: `https://privatedao.org/`
- GitHub: `https://github.com/X-PACT/PrivateDAO`
- Product video: `https://youtu.be/iFTUe4CTWP0`
- Public project profile: `https://arena.colosseum.org/projects/explore/praivatedao`
- Project X link: `https://x.com/i/status/2039742760719151177`

## Corrected Facts

- Project title: `PrivateDAO`
- Primary role: `Founder & Lead Protocol Engineer`
- Team size: `solo founder`
- Open source: `Yes`
- Live token: `No`, if the form means a public mainnet market token.
- Governance mint evidence:
  - token: `PDAO`
  - network: `Solana Devnet`
  - mint: ``
  - token program: `Token-2022`
  - initial supply: `1,000,000 PDAO`
  - mint authority: `disabled`
  - role: preserved governance voting-token evidence attached to the current Testnet review path
- Important honesty boundary:
  - this is preserved Devnet governance-token evidence attached to the current Testnet governance path
  - it is not presented as a mainnet market token or speculative token launch

## Short Project Description

PrivateDAO is a Solana governance and treasury product for private voting, confidential payroll and bonus approvals, and execution-safe treasury operations. It combines a live wallet-connected frontend, an on-chain Anchor program, backend read infrastructure, `zk_enforced` governance paths, REFHE-gated settlement, MagicBlock private payment corridors, and reviewer-visible runtime evidence into one operational system.

## Problem And User

Most DAO governance leaks intent too early through public voting and public treasury signaling. That creates whale pressure, coordination distortion, and exposure around sensitive internal operations. PrivateDAO is built for DAOs, on-chain teams, and crypto-native organizations that need private governance, confidential compensation, and disciplined treasury execution without giving up auditability or operator visibility.

## Why Now

Solana is now strong enough to support governance infrastructure that goes beyond public voting into private organizational operations. PrivateDAO exists because serious on-chain organizations need private decision-making and confidential treasury workflows, not just public dashboards and token-weighted signaling.

## What Works Today

- deployed Solana Testnet program with preserved canonical program id
- live wallet-connected frontend
- preserved Devnet governance token evidence (`PDAO`) attached to the Testnet reviewer path
- commit-reveal governance
- proposal-level `zk_enforced` hardening
- additive `Governance Hardening V3` and `Settlement Hardening V3` paths with dedicated Devnet proof
- confidential payroll and bonus approvals
- REFHE-gated settlement path
- MagicBlock private payment corridor path
- backend read node / indexer path
- runtime, review, and go-live artifacts
- weekly update video package for reviewer updates

## Repo Context

This repo contains the core product, not just one contract. It includes the on-chain program, live frontend, backend read node, Testnet lifecycle automation, preserved Devnet evidence, confidential payout and privacy paths, submission and review artifacts, and operational readiness surfaces. It is live on Testnet today, with final production steps still external by nature, such as expanded real-device captures, external audit closure, custody ceremony, and final mainnet operational sign-off.

## Technical Stack

- Solana
- Anchor
- Rust
- TypeScript
- `@solana/web3.js`
- wallet-connected web frontend
- backend read node / indexer path
- additive V3 governance and settlement hardening
- REFHE-based encrypted payout flow
- MagicBlock private payment corridor path
- automated runtime evidence and review tooling

## V3 Evidence Shortcut

When a reviewer needs the stricter additive hardening path specifically, point them to:

- `docs/test-wallet-live-proof-v3.generated.md`
- `docs/governance-hardening-v3.md`
- `docs/settlement-hardening-v3.md`

This is a Devnet proof surface, not a production-custody or unrestricted-mainnet claim.

## Revenue / Funding Position

PrivateDAO is being built as governance infrastructure and confidential treasury software for on-chain organizations. The long-term monetization path is a mix of enterprise deployments, hosted infrastructure, premium governance tooling, and confidential treasury or payroll workflows. In the near term, the project is seeking grants, prize support, and direct investment to accelerate audit, infrastructure hardening, privacy execution, and mainnet readiness.

## Competitive Position

Existing governance and treasury tools often separate governance, treasury control, privacy, and operator workflows into disconnected products. PrivateDAO integrates private voting, confidential payouts, stronger cryptographic governance paths, runtime evidence, and treasury execution safety in one product instead of treating privacy as an isolated add-on.

## Live Token Answer

If a form asks `Do you have a live token?`, the correct answer is:

`No`, if the form means a public mainnet market token.

Suggested details:


## Contact

- Email: `fahd@privatedao.org`
- Email: `fahd@privatedao.org`
- Telegram: `@Fahdkotb`
- X: `@privateDAOOS`
