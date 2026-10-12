# Current Network E2E Audit

This is the current evidence index for the Kernel network lanes. It is
generated from the checked-in capability matrix and the read-only verifiers;
it is not a claim that every product is executable on every network.

## Boundary

```text
Product -> Protocol -> Kernel Gateway -> Family Adapter -> Network Adapter
        -> Provider/Wallet -> RPC or native node -> receipt/reconciliation
```

The Agent Exchange is a separate marketplace lane. It keeps its own Solana
marketplace/payment and read-only intelligence boundaries; product execution
for BNB, Zcash, Stellar, and the EVM networks belongs to the Kernel adapters.

## Evidence Snapshot

Counts below are capability entries from
`docs/generated/native-capability-matrix-20260911.json`.
`testnet_verified` means the stated capability has independent Testnet
evidence. `testnet_ready` means the Kernel policy/adapter contract exists but
the independent write gate is not complete. It does not mean a funded E2E.

| Network lane | Verified | Ready only | Declared products | Current evidence boundary |
|---|---:|---:|---:|---|
| Solana Devnet | 6 | 0 | 6 | Six product lanes have independent Devnet evidence |
| Ethereum Sepolia | 6 | 0 | 6 | Full six-product organizational E2E evidence |
| Arbitrum Sepolia | 6 | 0 | 6 | Full six-product organizational E2E evidence |
| BNB Testnet | 6 | 0 | 6 | Full six-product organizational E2E evidence |
| Base Sepolia | 6 | 0 | 6 | Full six-product evidence; Builder attribution remains a separate gate |
| Robinhood Testnet | 6 | 0 | 6 | Full six-product organizational E2E evidence |
| Tempo Testnet | 6 | 0 | 6 | Full six-product evidence including token-settled Payroll |
| Zcash Testnet | 0 | 6 | 6 | Payroll settlement is evidenced separately, but the strict six-product gate is not complete |
| Stellar Testnet | 6 | 0 | 6 | Full six-product Kernel-to-Horizon evidence |
| Hyperliquid Testnet / HyperEVM | 2 | 4 | 6 | Blind/Record evidence only; organizational attempt is blocked by signer funding |
| HyperCore Testnet | 0 | 6 | 6 | Native read-only adapter only; no product execution E2E |

The counts intentionally contradict a blanket “all six products on all eleven
networks are complete” claim. That claim must remain unpublished until each
network's missing capabilities have their own confirmed receipt and recovery
evidence.

## Verified Stellar Lane

Stellar is the completed lane in this audit:

- `scripts/verify-stellar-product-e2e-evidence.mjs` combines the nine-product
  packet with the separately recorded `payroll.settle` packet.
- `scripts/verify-stellar-system-coherence.mjs` requires ten capabilities and
  excludes Agent Exchange.
- `docs/evidence/stellar-testnet-payroll-e2e.json` contains the confirmed
  payroll settlement receipt.
- The browser/runtime catalog is generated from the same Kernel catalog.

## Verified Supporting Lanes

- BNB: `scripts/verify-bnb-evidence.mjs` and
  `scripts/verify-bnb-organizational-evidence.mjs` validate chain ID 97,
  deployed bytecode, successful receipts, recovery readback, and replay
  protection.
- Robinhood: `scripts/verify-robinhood-organizational-evidence.mjs` validates
  chain ID 46630, four deployed contracts, and 22 successful receipts.
- Base: `scripts/verify-base-evidence.mjs` validates Base Sepolia receipts and
  explicitly does not infer Builder Code attribution from historical writes.
- Hyperliquid: the verified lane is HyperEVM only; HyperCore remains a
  distinct native surface.

## Verification Commands

```bash
npm run test:commercial-network-matrix
npm run verify:native-capability-matrix
npm run verify:application-bindings
npm run verify:product-gateway-boundary
npm run verify:stellar:product-e2e
npm run verify:stellar:coherence
npm run verify:bnb:evidence
npm run verify:bnb:organizational-evidence
npm run verify:robinhood:evidence
npm run verify:hyperliquid:evidence
npm run verify:base:evidence
```

These commands are read-only verification. They do not create wallets, sign
transactions, or broadcast funds.
