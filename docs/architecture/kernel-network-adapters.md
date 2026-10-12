# PrivateDAO Kernel and Network Adapter Architecture

This document is the engineer-facing map of the execution boundary. It is
separate from the commercial website, which presents workflows and outcomes
rather than provider internals.

## Request path

```text
Product workflow
  -> Protocol capability and policy
  -> Kernel gateway
  -> family adapter
  -> network adapter
  -> provider / wallet boundary
  -> RPC or native node
  -> confirmation / finality
  -> receipt, reconciliation, and evidence
```

Products do not call RPC endpoints directly. A network is only executable for
a capability when the binding, provider lifecycle, receipt path, and
independent evidence exist. RPC health alone is never product evidence.
BNB Confidential Payroll is a product-specific EVM provider: it binds an
off-chain payroll commitment to a dedicated settlement contract and receipt
path instead of borrowing Treasury evidence.

## Layer ownership

| Layer | Source of truth | Responsibility |
|---|---|---|
| Product catalog | `packages/privatedao-runtime/src/catalog.ts` | Product, capability, and network declarations |
| Protocol registry | `packages/privatedao-runtime/src/protocol.ts` | Capability registration, permissions, policies, and resolution |
| Kernel gateway | `scripts/kernel-gateway-service.ts` and `packages/privatedao-runtime/src/` | Prepare, submit, confirm, receipt, reconciliation, idempotency, and normalized errors |
| Network matrix | `packages/privatedao-runtime/src/networks.ts` | Family, chain ID, finality, explorer, and adapter identity |
| Application bindings | `packages/privatedao-runtime/src/application-bindings.ts` | Product-to-capability-to-network entrypoints and evidence notes |
| EVM family | `packages/privatedao-runtime/src/evm-network.ts` and EVM transport | Shared EVM transaction lifecycle with per-network chain configuration |
| Solana family | Solana runtime providers | Wallet-signing and commitment lifecycle for Solana |
| Zcash family | Zcash adapter/provider and Zallet boundary | Testnet shielded lifecycle and explicit broadcast gates |
| Stellar family | `packages/privatedao-runtime/src/stellar-network.ts` | Testnet Horizon health, fee, preparation, receipt, and explicit broadcast gate |
| HyperCore native | `packages/privatedao-runtime/src/hypercore-network.ts` | Read-only native HyperCore metadata and health; not HyperEVM execution |
| Evidence | `packages/evm-verification/deployments/` and `docs/` | On-chain receipts, block numbers, verification results, and limitations |

## EVM reuse model

Ethereum Sepolia, Base Sepolia, Arbitrum Sepolia, BNB Testnet, Tempo
Testnet, Robinhood Testnet, and Hyperliquid HyperEVM Testnet share the EVM
family transaction lifecycle. Each still has its own network adapter identity,
chain ID, RPC environment variable, explorer, fee model, and evidence file.

Shared EVM code does not mean shared deployment evidence. A product is
promoted only after its own transactions are confirmed on the selected chain.
Tempo uses its tokenized fee/payment path; Hyperliquid HyperEVM uses HYPE gas;
BNB Testnet uses tBNB gas. These differences stay behind the adapter.

## Non-EVM boundaries

- Solana uses its own wallet and commitment model. The legacy Umbra private
  payout path is disabled for the Solana product surface; this does not remove
  Payroll calculation/approval or other Kernel workflows.
- Zcash Testnet is not represented as EVM. Shielded wallet state, notes,
  anchors, confirmation, and broadcast guards remain Zcash-specific.
- Stellar Testnet is not represented as EVM. Horizon account/ledger data,
  receipt lookup, and workflow preparation remain behind the Stellar adapter.
  The official `@stellar/stellar-sdk` builds unsigned Testnet XDR for payment
  intents; signing remains in the external wallet boundary and signed XDR
  broadcast is fail-closed until a reviewed signer path is enabled.
- HyperCore is not HyperEVM. The current adapter is intentionally read-only;
  no financial execution claim is made for HyperCore.

## Verification commands

```bash
npm run test:commercial-network-matrix
npm run verify:application-bindings
npm run test:native-capability-registry
npm run test:runtime:wallet-recovery
npm run test:runtime:hypercore
npm run verify:bnb:evidence
```

These checks are complementary: catalog/binding checks prove routing shape,
recovery checks prove wallet-network guards, and evidence verification proves
that recorded BNB transactions still resolve to successful receipts on chain
97.
