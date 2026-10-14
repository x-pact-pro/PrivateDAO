# Enterprise Kernel Boundary

This document is the current boundary for the PrivateDAO commercial runtime.
It keeps the six organization-facing products separate from the independently
deployed Agent Exchange and records what is verified versus planned.

## Domains

The `packages/privatedao-runtime` catalog has two explicit domains:

- **Enterprise**: Confidential Payroll, Private Treasury, Private Governance,
  Confidential Auctions, Blind Verification, and Record Verification.
- **Agent Exchange**: the external marketplace at `agents.privatedao.org`.

Agent Exchange is a separate production service and payment surface. Its
discovery binding may be Kernel-routed, but it is excluded from the enterprise
product/network evidence matrix. Its external deployment must not be used as
evidence that an enterprise product is executable on a given network.

## Execution boundary

Enterprise requests follow this path:

```text
product -> protocol -> ProductExecutionGateway -> Kernel -> provider/adapter
        -> network RPC or service -> normalized receipt -> reconciliation
```

Product modules must not call network SDKs or RPC endpoints directly. Provider
selection, authorization, lifecycle state, idempotency, normalized errors,
receipts, and reconciliation remain Kernel concerns.

## Network evidence

The target enterprise inventory contains ten ecosystems: Solana, Ethereum,
Arbitrum, BNB Chain, Base, Robinhood Chain, Tempo, Zcash, Hyperliquid, and
Stellar. The runtime now records all ten explicitly. Stellar is currently a
planned ecosystem with no provider, product binding, receipt, or execution
claim; the inventory entry is a scope marker, not support evidence.

The repository may contain configuration for multiple ecosystems, but a
configured adapter is not proof of product execution. A product/network row is
advertised as verified only when the registry contains independent execution
evidence and a receipt path for that capability.

Zcash Testnet currently has a foundation adapter and isolated Testnet wallet
path; it must not be described as six independently verified enterprise
products without six product-specific receipts. Hyperliquid HyperEVM likewise
requires funded organizational E2E receipts. HyperCore is a distinct native
execution surface and cannot be represented by HyperEVM evidence.

The organization identity, constitution builder, delegation tree, policy
compiler, institutional wallet, upgrade governance, and cross-product policy
enforcement described in the product specification remain roadmap work unless
the source and evidence registry show an implemented, tested capability.
The architecture is prepared for these additions through versioned catalog
domains, Kernel gateway routing, provider boundaries, and explicit evidence
states; this document does not claim those roadmap features are complete.

## Safety rules

- Testnet evidence never implies Mainnet support.
- Agent Exchange evidence never promotes an enterprise capability.
- A receipt must be tied to the exact product, capability, network, and policy
  version that produced it.
- Unknown provider or network state fails closed.
- Secrets, wallet material, and RPC credentials remain outside source and
  public evidence artifacts.
