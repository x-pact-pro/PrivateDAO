# PrivateDAO Current Engineering State

Snapshot date: 2026-10-12

This is an evidence-based engineering snapshot. It describes the repository
and testnet evidence, not a production deployment or a Mainnet launch.

## Executive Summary

PrivateDAO presents a commercial, workflow-first website for organizations
inside and outside Web3. The live commercial surface and PDAO Worlds game are
separate from this engineering work and were not changed or deployed by the
current branch.

The repository separates:

```text
Product
  -> Protocol capability and policy
  -> Kernel gateway
  -> family adapter
  -> network adapter
  -> provider and wallet boundary
  -> RPC or native node
  -> confirmed receipt
  -> reconciliation and evidence
```

Products do not call RPCs directly. A network is not considered product
support merely because it has configuration, a healthy RPC, or a logo.

## Canonical Sources

- Kernel contracts: `packages/privatedao-runtime/src/protocol.ts`
- Product/capability catalog: `packages/privatedao-runtime/src/catalog.ts`
- Network families and adapters: `packages/privatedao-runtime/src/networks.ts`
- Product-to-network bindings: `packages/privatedao-runtime/src/application-bindings.ts`
- Evidence-gated registry: `packages/privatedao-runtime/src/native-capability-registry.ts`
- Machine-readable architecture: `docs/generated/engineer-architecture-index.json`
- Machine-readable capability status: `docs/generated/native-capability-matrix-20260911.json`
- Network-specific receipts: `packages/evm-verification/deployments/`

## Current Evidence Counts

The generated architecture manifest currently reports:

- 7 products
- 17 network descriptors
- 96 application bindings
- 216 capability evidence entries
- 61 `testnet_verified` entries
- 6 `devnet_verified` entries
- 2 `mainnet_live` entries in the generated registry scope
- `bridgeFree: true`

These are registry counts, not a claim that every product is verified on every
network. Always inspect the product-specific artifact before making a public
execution claim.

## BNB Smart Chain Testnet

BNB Testnet is implemented as a direct EVM-family path:

```text
Product -> Kernel -> EVM family -> evm-bnb-testnet -> signer/provider
  -> BNB Testnet RPC (chain 97) -> receipt -> reconciliation/evidence
```

Verified product lanes:

- Blind Verification
- Record Verification
- Treasury Coordination
- Confidential Payroll
- Private Governance
- Confidential Auctions

The organizational artifact contains 18 successful receipts and four deployed
contracts. The verifier performs readback for all four contract states and
checks replay rejection for all four completed actions using read-only
`eth_call`; it does not send new transactions.

Run:

```bash
npm run verify:bnb:evidence
npm run verify:bnb:organizational-evidence
npm run verify:engineer-index
```

The current BNB deployer balance was read-only verified at
`0.3028809105 tBNB`. No transaction was sent during the latest verification.

## Other Network Boundaries

| Network/family | Current evidence boundary |
|---|---|
| Ethereum Sepolia | Verified EVM product lanes listed in the capability matrix |
| Arbitrum Sepolia | Verified EVM product lanes listed in the capability matrix |
| Base Sepolia | Verified EVM lanes; Builder Code attribution remains a separate evidence gate |
| Tempo Testnet | EVM/tokenized fee and payment behavior is network-specific |
| Robinhood Testnet | Treasury, Governance, and Auction are verified; other lanes remain gated |
| Hyperliquid HyperEVM | Blind and Record Verification verified; HyperCore is separate |
| Solana Devnet | Solana-specific wallet/commitment lifecycle and organizational evidence. Record Verification now has a local schema/policy-bound anchor service with broadcast disabled by default; a funded approved signer run is still required before promotion to product E2E. |
| Zcash Testnet | Zcash-specific shielded wallet/provider boundary; Payroll settlement has a confirmed Testnet receipt, while other products remain policy-only |
| Stellar Testnet | Nine product-binding capabilities verified through Kernel, signer boundary, Horizon submission, confirmation, and receipts; `payroll.settle` is Kernel-ready and prepared-only without a confirmed payout receipt; business payloads remain off-chain |

The BNB ecosystem references supplied by the user, including Agent Studio,
Agent SDK, Greenfield, MCP/Ask AI, MPP, ERC-8056, and Privacy at Scale, are
documented with their supplied reference-card paths in
`docs/integrations/bnb-ecosystem-reference.md`. They remain external
references only, not declared PrivateDAO products, dependencies, or
partnerships without repository implementation and independent evidence.

## Recovery, Replay, and Resilience

- Common wallet recovery tests pass for Solana, EVM chain checks, Zcash
  Testnet guards, and HyperCore stateless recovery.
- BNB organizational state recovery readback passes for Treasury, Payroll,
  Governance, and Auction.
- BNB replay attempts are rejected for all four completed actions.
- Wrong-network and failed-receipt boundaries remain fail-closed in the runtime
  tests and EVM adapter.

## Production and Storage Boundary

- No production deployment was performed by this work.
- The live website remains customer/investor-facing and workflow-first.
- PDAO Worlds remains independent.
- Rebuildable `target`, `apps/web/.next`, and `apps/web/out` were archived to
  `/media/x-pact/BACKUP/privatedao-build-artifacts-20261011/` and removed after
  archive validation.
- Active Kernel/Zebra processes, Zcash vault/data, `node_modules`, and active
  wallet worktrees were preserved.
- The pre-existing unstaged `scripts/verify-base-evidence.mjs` change remains
  untouched and is not part of the branch commits.

## Verification and Maintenance

```bash
npm run build:engineer-index
npm run verify:engineer-index
npm run test:commercial-network-matrix
npm run verify:application-bindings
npm run test:native-capability-registry
npm run verify:native-capability-matrix
npm run test:runtime:wallet-recovery
npm run verify:bnb:organizational-evidence
```

These commands keep the architecture index, bindings, capability status, and
on-chain evidence checks aligned as the system evolves.
