# PrivateDAO Engineer Index

This is the shortest machine- and reviewer-readable path through the PrivateDAO
runtime. It separates the provider-neutral Kernel from network adapters,
product bindings, and independent on-chain evidence.

## Start Here

| Question | Canonical source |
|---|---|
| What is the execution boundary? | [`kernel-network-adapters.md`](kernel-network-adapters.md) |
| What capabilities and permissions exist? | [`../../packages/privatedao-runtime/src/protocol.ts`](../../packages/privatedao-runtime/src/protocol.ts) |
| Which products and actions are declared? | [`../../packages/privatedao-runtime/src/catalog.ts`](../../packages/privatedao-runtime/src/catalog.ts) |
| Which products enter the Kernel on which networks? | [`../../packages/privatedao-runtime/src/application-bindings.ts`](../../packages/privatedao-runtime/src/application-bindings.ts) |
| What family, chain ID, finality, and adapter are used? | [`../../packages/privatedao-runtime/src/networks.ts`](../../packages/privatedao-runtime/src/networks.ts) |
| What is independently proven? | [`product-network-evidence.md`](product-network-evidence.md) and [`../../docs/generated/native-capability-matrix-20260911.json`](../generated/native-capability-matrix-20260911.json) |
| What is the machine-readable architecture manifest? | [`../generated/engineer-architecture-index.json`](../generated/engineer-architecture-index.json) |
| What is the current evidence snapshot? | [`current-state-20261011.md`](current-state-20261011.md) |
| What is the repository-to-production boundary? | [`PRODUCTION-SURFACE-HANDOFF.md`](PRODUCTION-SURFACE-HANDOFF.md) |
| How is BNB verified? | [`../integrations/bnb-testnet-e2e.md`](../integrations/bnb-testnet-e2e.md) |

## Architecture Tree

```text
Customer product
  -> catalog capability
  -> Protocol permissions and policy
  -> Kernel gateway
  -> family adapter
  -> network adapter
  -> provider and wallet boundary
  -> RPC or native node
  -> confirmation and finality
  -> receipt
  -> reconciliation and evidence
```

Products do not own RPC calls or private keys. A network logo, a configured
RPC, or a healthy read call is not product execution evidence.

## Family Map

```text
Kernel
├── EVM family
│   ├── Ethereum Sepolia      evm-ethereum-sepolia
│   ├── Arbitrum Sepolia     evm-arbitrum-sepolia
│   ├── Base Sepolia         evm-base-sepolia
│   ├── BNB Testnet          evm-bnb-testnet
│   ├── Tempo Testnet        evm-tempo-testnet
│   ├── Robinhood Testnet    evm-robinhood-testnet
│   └── HyperEVM Testnet     evm-hyperliquid-testnet
├── Solana family
│   └── Solana Devnet/Mainnet boundary
├── Zcash family
│   └── Zcash Testnet / Zallet boundary
├── Stellar family
│   └── Stellar Testnet / Horizon boundary
└── HyperCore family
    └── Hyperliquid native API boundary, separate from HyperEVM
```

The EVM family shares lifecycle and transaction abstractions, but every
network retains its own chain ID, RPC variable, fee model, adapter identity,
and evidence. HyperEVM and HyperCore are different execution surfaces.

Stellar is a separate non-EVM family. Its current PrivateDAO path uses the
Horizon provider boundary and keeps signing/broadcast disabled until an
authorized signed XDR is supplied.

## Evidence Status

The generated matrix is the status index; the deployment artifact and verifier
are the proof. The current matrix contains 216 product/network entries, 52
`testnet_verified` entries, 6 `devnet_verified` entries, and 2 `mainnet_live`
entries. Those counts are not a universal claim that every product runs on
every network.

The machine-readable architecture manifest is generated from `catalog.ts`,
`networks.ts`, `application-bindings.ts`, and the native capability registry:

```bash
npm run build:engineer-index
npm run verify:engineer-index
```

For a specific claim, require all of the following:

1. A catalog capability.
2. A product-to-network Kernel binding.
3. A network adapter and provider/wallet boundary.
4. A committed artifact with real transaction receipts.
5. A verifier that checks chain ID, receipt success, and product state.

`testnet_ready` means the route exists but its independent write gate is not
complete. `testnet_verified` means the stated capability has real testnet
evidence. `planned` and `implementation` must not be advertised as live.

## BNB Testnet Snapshot

BNB Smart Chain Testnet is chain `97`, uses `evm-bnb-testnet`, and executes
directly through the Kernel. No bridge is part of this path.

Currently evidenced BNB product lanes:

- Blind Verification
- Record Verification
- Treasury Coordination
- Confidential Payroll
- Private Governance
- Confidential Auctions

The organizational artifact records 18 successful receipts and four deployed
product contracts. Payroll binds an off-chain batch commitment to a real
Maker/Checker payout and settlement receipt; it does not claim shielded EVM
payment.

Run the read-only artifact verifier with:

```bash
npm run verify:bnb:organizational-evidence
```

The verifier performs state readback for Treasury, Payroll, Governance, and
Auction, then confirms that replaying each completed action is rejected. It
uses read-only `eth_call` for these checks and does not send a new transaction.

## BNB Ecosystem References

The BNB ecosystem items supplied for integration research are external
references, not PrivateDAO products or partnerships:

| Reference | Boundary |
|---|---|
| BNB Agent Studio / Agent SDK | Possible external agent onboarding reference; no PrivateDAO implementation claim |
| Greenfield SDK | Storage research reference; no configured PrivateDAO production adapter claim |
| BNB MCP / Ask AI | Distribution and documentation reference; PrivateDAO MCP remains independently operated |
| MPP SDK | Future machine-payment research; not a current PrivateDAO payment rail |
| Scaled UI Amount / ERC-8056 | Presentation/attribution research; no current product binding claim |
| Privacy at Scale | Ecosystem research reference; not a PrivateDAO implementation claim |

## Verification Commands

```bash
npm run test:commercial-network-matrix
npm run verify:application-bindings
npm run test:native-capability-registry
npm run verify:native-capability-matrix
npm run verify:bnb:evidence
npm run verify:bnb:organizational-evidence
npm run verify:hyperliquid:evidence
npm run verify:product-gateway-boundary
npm run verify:stellar:product-e2e
```

These commands are intentionally separate from production deployment. They
validate routing, evidence, the product-to-Kernel boundary, and network
receipts without changing the live website or game. The Stellar evidence
verifier is read-only against Horizon; the Stellar product runner is a
separately gated Testnet command.
