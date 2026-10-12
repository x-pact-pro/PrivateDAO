# HyperCore Native Boundary

Snapshot: 2026-10-12

HyperCore is the native Hyperliquid state and action surface. It is not an
EVM network and it must not inherit product evidence from HyperEVM chain 998.

## Official Native Surfaces

- Read-only metadata and account information use the HyperCore Testnet info
  API: `https://api.hyperliquid-testnet.xyz/info`.
- Signed native actions use the Testnet exchange API:
  `https://api.hyperliquid-testnet.xyz/exchange`.
- Native action payloads require a Hyperliquid signature and Testnet domain.

The upstream action vocabulary includes transfers and staking/vault operations
such as `usdSend`, `spotSend`, `usdClassTransfer`, `withdraw3`, `cDeposit`,
`cWithdraw`, `tokenDelegate`, and `vaultTransfer`. These are execution
primitives, not proof that PrivateDAO Payroll, Treasury, Governance, Auctions,
or Verification have been implemented on HyperCore.

## PrivateDAO Adapter Boundary

```text
Product intent
  -> Protocol capability and policy
  -> Kernel gateway
  -> HyperCoreNetworkAdapter
  -> native action preparation
  -> explicit signer boundary
  -> Testnet exchange API
  -> native response and reconciliation evidence
```

The current adapter provides:

- Testnet-only endpoint validation.
- Read-only `meta` health and universe inspection.
- Fail-closed native action preparation.
- Guarded EIP-712 signing for the documented `usdSend`, `spotSend`,
  `usdClassTransfer`, and `tokenDelegate` user-signed actions.
- Explicit action allowlist.
- Nonce validation.
- Automatic Testnet domain binding.
- `broadcastEnabled: false` until a separately approved execution path exists.

The adapter does not currently submit native actions or produce product
receipts. It also does not claim product support from metadata health or
HyperEVM receipts.

## Evidence Rule

HyperCore remains `INCOMPLETE` in the strict 11-network gate until a real
PrivateDAO product workflow has:

1. a declared Kernel capability and application binding;
2. a native signed Testnet action through the adapter;
3. a confirmed native response/receipt;
4. reconciliation and replay/error evidence;
5. product-specific verification without exposing private business data.

Until these conditions are met, HyperCore is an adapter foundation and not a
marketed product network.

Official references:

- https://hyperliquid.gitbook.io/Hyperliquid-docs/for-developers/api/exchange-endpoint
- https://hyperliquid.gitbook.io/Hyperliquid-docs/for-developers/hyperevm/interacting-with-hypercore
