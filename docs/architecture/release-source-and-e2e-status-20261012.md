# Release Source And E2E Status

Snapshot: 2026-10-12

This document is a handoff boundary for the PrivateDAO Kernel work. It keeps
repository placement, product evidence, and public-surface cleanup explicit.

## Source Placement

The reviewed Kernel/evidence source is the `canonical-live` branch and its
working mirror `codex/pdao-holder-access`. At this snapshot both point to:

```text
bd6d698ff fahd: clarify canonical branch boundaries
```

The repository's `main` branch is divergent and must not be treated as an
equivalent release source until a separate reconciliation merge is reviewed.
The current branch contains the later Kernel, adapter, evidence, and product
binding work. No production deployment is implied by a GitHub branch.

## Product And Network Gate

The authoritative gate is:

```bash
npm run verify:11-network-e2e
```

The rule is strict: every declared product on every listed network needs an
independent Testnet/Devnet E2E evidence status. Current result:

| Network | Result | Boundary |
|---|---|---|
| Solana Devnet | COMPLETE | Six product lanes have independent evidence |
| Ethereum Sepolia | COMPLETE | Six-product EVM organizational evidence |
| Arbitrum Sepolia | COMPLETE | Six-product EVM organizational evidence |
| BNB Testnet | COMPLETE | Six-product organizational evidence |
| Base Sepolia | COMPLETE | Six-product evidence; Builder attribution is separate |
| Robinhood Testnet | COMPLETE | Six-product organizational evidence |
| Tempo Testnet | COMPLETE | Six-product evidence including token Payroll |
| Stellar Testnet | COMPLETE | Six product lanes through Kernel, signer, Horizon, and receipts |
| Zcash Testnet | INCOMPLETE | Payroll settlement evidence only |
| Hyperliquid HyperEVM Testnet | INCOMPLETE | Blind/Record evidence only; organizational lanes need funded E2E |
| HyperCore Testnet | INCOMPLETE | Native health, preparation, and guarded signing; no product execution E2E |

The overall gate remains `complete: false`. This is intentional and prevents
runtime or RPC readiness from being reported as product execution.

## Stellar Evidence

Stellar is complete for the six declared products in the current registry.
The evidence boundary is:

```text
Product -> Protocol -> Kernel Gateway -> Stellar adapter
        -> signer boundary -> Horizon -> confirmed receipt
        -> reconciliation and evidence
```

Primary verification commands:

```bash
npm run verify:stellar:coherence
npm run verify:stellar:product-e2e
npm run verify:stellar:payroll:e2e
npm run test:runtime:stellar
npm run test:stellar:products
```

Agent Exchange remains a separate marketplace product. Stellar product
evidence must not be inferred from Agent Exchange metadata.

## Game Archive Boundary

The public game surface is removed from the active web build. The repository
check is:

```bash
npm run verify:public-game-removed
```

The archived PDAO Worlds source package is stored outside the active build at:

```text
/media/x-pact/BUK/pdao-worlds-source-archive-20261012.tar.gz
```

Recorded archive SHA-256:

```text
567c493712b7432cbcbe003d423379a4cdb6ff65867465d3e6d92a7a402deb89
```

The game is not a prerequisite for Kernel or product E2E verification.

## Remaining Completion Work

The remaining work is execution evidence, not a documentation shortcut:

1. Fund the exact Hyperliquid HyperEVM signer used by the organizational E2E
   runner, then run and verify the full product artifact.
2. Implement and independently verify the missing Zcash product paths without
   weakening the existing Testnet wallet and broadcast guards.
3. Define and implement genuine HyperCore-native product operations before
   marking HyperCore capabilities as verified. HyperEVM RPC health is not
   evidence for HyperCore.

Until these three boundaries have real receipts, the 11-network goal remains
open.
