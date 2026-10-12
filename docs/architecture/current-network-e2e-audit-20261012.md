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
| Solana Devnet | 6 | 3 | 7 | Solana lifecycle evidence; not every declared capability is verified |
| Ethereum Sepolia | 9 | 0 | 6 | Verification, Treasury, Governance, and Auction evidence |
| Arbitrum Sepolia | 9 | 0 | 6 | Verification, Treasury, Governance, and Auction evidence |
| BNB Testnet | 8 | 2 | 6 | Product and organizational E2E receipts; Robinhood-style native lanes remain separate |
| Base Sepolia | 9 | 0 | 6 | Product receipts verified; historical Builder attribution is not asserted |
| Robinhood Testnet | 4 | 5 | 6 | Treasury, Payroll, Governance, and Auction organizational evidence; verifier now checks 4 contracts and 22 receipts |
| Tempo Testnet | 9 | 0 | 6 | EVM product evidence plus Tempo payment rail evidence |
| Zcash Testnet | 1 | 9 | 6 | Confirmed Zallet/Zebra Payroll settlement; other product rows remain Kernel policy-only |
| Stellar Testnet | 10 | 0 | 6 | Kernel -> Stellar adapter -> Horizon; all 10 declared non-agent capabilities confirmed |
| Hyperliquid Testnet / HyperEVM | 3 | 6 | 6 | HyperEVM verification evidence; this does not certify HyperCore native execution |
| HyperCore Testnet | 0 | 9 | 6 | Native readiness/policy boundary only; no native execution E2E claim |

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
