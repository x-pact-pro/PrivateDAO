# PrivateDAO Integration Boundary

`packages/privatedao-runtime/` is the source of truth for product
capabilities, network availability, provider selection, authorization,
execution lifecycle, receipts, and reconciliation. This document is an
orientation map only; a provider name or page is not evidence that a product
is executable.

## Current executable boundary

The Kernel catalog exposes the core PrivateDAO products through the same
product/workflow boundary on the nine current testnet lanes:

`solana-devnet`, `ethereum-sepolia`, `base-sepolia`, `tempo-testnet`,
`zcash-testnet`, `arbitrum-sepolia`, `robinhood-testnet`,
`hyperliquid-testnet` (HyperEVM), and `hypercore-testnet` (native HyperCore).

The web client selects only the product, workflow, and preferred network. The
Kernel resolves the network adapter or policy provider behind that selection.
The table below describes the product boundary, not a claim that every lane
has an on-chain contract deployment or funded settlement proof.

| Product | Kernel capabilities | Application exposure |
|---|---|---|
| Blind Verification | `verification.blind.prove` | Kernel gateway; proof/contract evidence varies by network |
| Record Verification | `verification.record.create`, `verification.record.verify` | Kernel gateway; anchor evidence varies by network |
| Confidential Payroll | `payroll.calculate`, `payroll.approve` | Kernel gateway; settlement is separately gated and not advertised without a native provider |
| Private Treasury | `treasury.policy.check` | Kernel gateway; policy and settlement evidence are tracked separately |
| Private Governance | `governance.proposal.execute` | Kernel gateway; policy fallback is used where no contract deployment is evidenced |
| Private Auctions | `auction.bid.commit`, `auction.settle` | Kernel gateway; financial settlement is separately gated |
| Agent Marketplace | `agent.discover`, `agent.invoke` | hosted outside this web boundary |

`payroll.settle` remains an internal adapter capability for separately gated
Testnet execution and is not part of the customer product catalog. Umbra is a
legacy Solana provider and is disabled for current product execution; removing
it from Solana does not remove Confidential Payroll, Governance, Verification,
Treasury, or Auctions from the Kernel product surface.

Ethereum Sepolia, Base Sepolia, Tempo Testnet, Arbitrum Sepolia, Solana Devnet,
and the Zcash Testnet policy lane have committed evidence at different levels.
Robinhood Testnet now has verified organizational E2E evidence for Treasury,
Governance, and Auctions; its Blind Verification, Record Verification, and
Payroll lanes remain Kernel policy paths until independently evidenced.
Hyperliquid HyperEVM and HyperCore currently expose network-scoped
Kernel policy/readiness paths; they are not advertised as funded on-chain
settlement until independent transaction, confirmation, and reconciliation
evidence exists.

The application binding ledger is authoritative for whether a route is
`kernel-gateway`, `legacy-provider`, or `unbound`. Only a `kernel-gateway`
binding with an injected, tested provider may be advertised as Kernel-backed.

## Provider and historical evidence

Umbra, MagicBlock, Ika/Encrypt, Cloak, Jupiter, QVAC, GoldRush, PUSD,
AUDD, Zerion, Torque, Txline, and related pages remain as provider-specific
implementation or evidence surfaces where current source references require
them. They must not be copied into new product paths or treated as a unified
network adapter without independent execution evidence.

Historical generated route snapshots are archived under
`docs/archive/legacy-routes/20260909/` and retain redirect stubs at their old
paths. The archive is for recovery and provenance, not product discovery.

## Verification rule

Claims about signatures, settlement, or proof must point to a current receipt,
explorer record, or independently rerunnable test. Static marketing pages,
provider metadata, and old generated snapshots do not establish live support.
