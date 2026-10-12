# PrivateDAO Engineering Map

This is the shortest path for engineers reviewing PrivateDAO. It describes
the implementation boundary and evidence model; it is not a commercial
product page.

## Read in this order

1. [`ENGINEER-INDEX.md`](ENGINEER-INDEX.md) - one-page index for the Kernel,
   family map, evidence rules, and BNB boundary.
2. [`kernel-network-adapters.md`](kernel-network-adapters.md) - request path,
   layer ownership, and family reuse.
3. [`../../packages/privatedao-runtime/src/protocol.ts`](../../packages/privatedao-runtime/src/protocol.ts)
   - protocol capabilities, permissions, policies, and receipts.
4. [`../../packages/privatedao-runtime/src/catalog.ts`](../../packages/privatedao-runtime/src/catalog.ts)
   - product and capability declarations.
5. [`../../packages/privatedao-runtime/src/application-bindings.ts`](../../packages/privatedao-runtime/src/application-bindings.ts)
   - actual product-to-network entrypoints and evidence notes.
6. [`../../packages/privatedao-runtime/src/networks.ts`](../../packages/privatedao-runtime/src/networks.ts)
   - network family, chain identity, finality, explorer, and adapter metadata.
7. [`../../docs/generated/native-capability-matrix-20260911.json`](../generated/native-capability-matrix-20260911.json)
   - machine-readable capability status generated from the runtime and
   evidence artifacts.
8. [`product-network-evidence.md`](product-network-evidence.md) - concise
   product/network status rules and the current evidence-backed lanes.

## What proves execution

The sources have different meanings and must not be conflated:

| Source | Proves | Does not prove |
|---|---|---|
| `catalog.ts` | a product/capability is modeled and can be policy-resolved | a funded write or a customer-executable network path |
| `networks.ts` | chain family, chain ID, provider identity, and network metadata | product support by itself |
| `application-bindings.ts` | the product capability has a Kernel entrypoint and an explicit note | that every binding has an on-chain receipt |
| `deployments/*.json` | recorded transaction hashes, receipts, blocks, and workflow evidence | support for a different product or network |
| generated capability matrix | the normalized status used by discovery/UI gates | a replacement for the underlying receipt evidence |

The only customer-executable claim for a specific product/network should be
based on the binding plus an evidence-backed status. `testnet_ready` means a
Kernel policy path exists but the independent network write gate is incomplete.
`testnet_verified` means the stated capability has real testnet evidence. RPC
health alone is never sufficient.

## Runtime request path

```text
Product
  -> Protocol capability / permission / policy
  -> Kernel gateway
  -> family adapter
  -> network adapter
  -> provider and wallet boundary
  -> RPC or native node
  -> confirmation / finality
  -> receipt / reconciliation / evidence
```

Products do not own RPC calls. EVM networks reuse the EVM lifecycle but retain
separate chain IDs, RPC configuration, fee rules, adapters, and evidence.
Solana, Zcash, Stellar, and HyperCore remain separate execution families.

## Stellar Testnet status

Stellar Testnet is registered through the shared Kernel catalog and routed by
`StellarNetworkAdapter` to the official Horizon Testnet API. The adapter is
used by the current non-agent product workflows for preparation, health, fee,
and receipt boundaries. Nine declared product capabilities have confirmed
Testnet lifecycle evidence through the Product Gateway, including a signed
workflow commitment envelope. `payroll.settle` is also registered as a
Kernel-ready, prepared-only capability; it has no confirmed payout receipt
yet. Broadcast remains disabled by default outside the explicit Testnet E2E
runner. The evidence is product binding and workflow preparation proof; it
does not claim that Stellar stores private product data or performs private
business settlement on-chain.

## BNB Testnet status

BNB Smart Chain Testnet is wired through the EVM family and the Kernel with
chain ID `97`, adapter `evm-bnb-testnet`, and the explicit environment
variable `PDAO_EVM_BNB_TESTNET_RPC_URL`.

- Blind Verification and Record Verification have independent real BNB
  Testnet evidence in
  [`phase-2-e2e-bnb-testnet.json`](../../packages/evm-verification/deployments/phase-2-e2e-bnb-testnet.json).
- Treasury, Confidential Payroll, Governance, and Sealed Auction now have
  organizational BNB Testnet evidence through the Kernel. Payroll binds an
  off-chain batch commitment to a dedicated settlement contract and receipt.
- The first organizational attempt stopped before writing because funding was
  below the runner minimum. A later funded run completed and is recorded in
  `organizational-bnb-testnet.json`.
- BNB is direct EVM execution. No bridge is used or implied by this adapter.

Re-run the organizational test only after the test wallet has enough tBNB:

```bash
set -a
. /home/x-pact/.privatedao-secret-vault/files/multichain-testnet.env
set +a
PDAO_EVM_NETWORK=bnb-testnet \
PDAO_EVM_BNB_TESTNET_RPC_URL=https://bsc-testnet-dataseed.bnbchain.org \
npm run test:evm:organizational
```

Load the secret environment locally only. Never commit or print the signer.

## Verification commands

```bash
npm run test:commercial-network-matrix
npm run verify:application-bindings
npm run test:native-capability-registry
npm run test:runtime:wallet-recovery
npm run test:runtime:hypercore
npm run verify:bnb:evidence
npm run release:verify
```

These commands are complementary. They validate routing, bindings, recovery
guards, native-family boundaries, receipts, and the release gate; none should
be used to turn an unfunded or unverified network into a live claim.
