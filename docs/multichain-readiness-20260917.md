# PrivateDAO Multichain Readiness

Observed: `2026-10-12`

This report separates network connectivity, adapter support, funding, and
independent product evidence. A reachable RPC is not treated as product
support.

## Network Status

| Network | Current state | Evidence boundary |
| --- | --- | --- |
| Solana Devnet | `devnet_verified` for three Payroll rows | Payroll Devnet artifacts and runtime registry |
| Solana Mainnet | `mainnet_live` for two Agent Exchange rows | Live Agent Card, A2A, MCP, OpenAPI, free job and receipt smoke checks |
| Ethereum Sepolia | `testnet_verified` | Fresh Phase 2 artifact with record/blind proof, rejection, expiry, and revocation checks |
| Base Sepolia | `testnet_verified` | Fresh Phase 2 artifact with the same full verification checks |
| Arbitrum Sepolia | `testnet_verified` | Committed Phase 2 artifact; a prior long-running rerun remains open and was not duplicated |
| Tempo Testnet | `testnet_verified` | Committed verification and organizational evidence artifacts |
| Robinhood Testnet | `testnet_verified` for Verification and organizational workflows | Fresh verification and organizational receipts; no Mainnet claim |
| Hyperliquid HyperEVM Testnet | `testnet_verified` for Verification; organizational lane pending funding | Chain `998` verification receipts are present; organizational runner needs additional HYPE gas |
| Zcash Testnet | foundation adapter only | Native UTXO, isolation, timeout, receipt and gate tests; no funded chain E2E |
| BNB Testnet | `testnet_verified` for Verification and organizational workflows | Fresh verification and organizational receipts; no Mainnet claim |
| Stellar Testnet | `testnet_verified` at Kernel product-binding lifecycle level | Nine controlled self-payment receipts cover every declared Stellar product capability; product-specific business state remains off-chain and signature-gated |
| Wormhole | cancelled scope | No bridge network is declared in the capability matrix |

## Product Evidence

- Application bindings: `7` products and the current generated binding set.
- Native capability registry: `216` rows, `61` testnet-verified, `6`
  devnet-verified, `2` mainnet-live, bridge-free.
- Hyperliquid organizational rows remain pending until the deployer has enough
  HYPE for the full Treasury/Payroll/Governance/Auction runner.
- Mainnet execution remains disabled by the EVM gate.

## Current Funding Gate

Read-only balance observations for the public test wallet:

- Ethereum Sepolia: funded.
- Arbitrum Sepolia: funded.
- Base Sepolia: below the `0.01 ETH` reporting threshold after its completed
  E2E run.
- Robinhood Testnet: funded for the completed organizational run.
- Hyperliquid Testnet: `0 HYPE`.

No private key was printed, committed, or included in this report. No funding
transaction is initiated by the reporting command.

## Stellar product-binding evidence

`docs/evidence/stellar-testnet-product-e2e.json` records nine confirmed
Stellar Testnet transactions. Each was prepared through the Kernel intent
boundary, signed by the authorized Testnet account, submitted through Horizon,
and reconciled into a confirmed receipt. The current evidence also carries a
privacy-preserving product workflow envelope: SHA-256 input commitments, plus
policy or outcome commitments where the capability requires them. The
transactions remain controlled self-payments with minimal native XLM. They
prove Kernel product binding and workflow preparation, not that Stellar stores
private payroll, governance, auction, or verification source data on-chain.

The runner is `scripts/run-stellar-testnet-product-e2e.mjs` and requires both
explicit Testnet broadcast gates. Mainnet is not accepted by the adapter.

## External Agent Exchange

Unauthenticated external checks currently pass for Agent Card, A2A, MCP,
OpenAPI, services, acquisition, health, pricing, discovery, registry search,
and treasury status. A fresh `verify.basic` job completed with a verified
receipt. A paid service correctly returned `402 Payment Required` with a
Solana Mainnet USDC quote; no payment was signed or submitted.

These checks are synthetic smoke traffic and are not evidence of external
adoption or revenue.

## Release Boundary

The repository is synchronized between `main` and `canonical-live`. The game,
production website, and production services were not changed by this work.
No network is promoted to Mainnet or commercial support without independent
on-chain evidence for that product and network.
