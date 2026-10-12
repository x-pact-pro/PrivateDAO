# Kernel Source Of Truth

## Canonical branch

`main` is the canonical development and integration branch for the PrivateDAO
Kernel and product contracts. `canonical-live` is kept synchronized with
`main` until the deployment cutover is separately verified. The immutable
pre-Kernel snapshot is preserved as the Git tag
`archive/legacy-integrations-20260909`.

The repository's operational branch set is intentionally small: `main` and
the synchronized `canonical-live` mirror are the only product source branches.
Dependabot branches are maintenance proposals, not product variants. Archived
integration history belongs in the `archive/*` tags and
`docs/archive/legacy-routes/`; no archived tag or maintenance branch is a
second source of truth.

## Runtime boundary

The provider-neutral source of truth is
`packages/privatedao-runtime/`. Product code must use the Kernel and Protocol
contracts for provider selection, authorization, lifecycle state, receipts,
reconciliation, retry/idempotency semantics, and normalized errors.

Provider-specific RPC, wallet, relay, and transaction construction belongs in
an adapter behind `KernelProvider`. A provider name in a document, route, or
catalog is not evidence of support.

## Product boundary

The declared product capabilities are catalogued in
`packages/privatedao-runtime/src/catalog.ts`. Application exposure is tracked
in `application-bindings.ts` and is intentionally classified as one of:

- `kernel-gateway`: routed through `ProductExecutionGateway`;
- `legacy-provider`: an existing route that is not Kernel evidence;
- `unbound`: not executable and must not be advertised as supported.

This classification is enforced by validation and CI. A product is not marked
Kernel-backed merely because a legacy endpoint exists.

The first Kernel-native application capabilities are `payroll.calculate`,
`treasury.policy.check`, `verification.record.create`,
`verification.blind.prove`, and `auction.settle` on Solana Devnet.
They produce deterministic receipts
with no wallet signature or settlement side effect: the former calculates a
payroll batch, while the latter evaluates bounded budget, transaction-limit,
recipient-limit, and asset-policy checks. Record creation produces a digest
and selected public fields without returning the source payload; it does not
create a public URL or on-chain anchor. Record verification now recomputes and
compares the digest, including a tamper-failure path, but it remains an
off-chain Kernel capability. Payroll approval, settlement, and the other
product actions remain explicitly classified until their real provider
lifecycle is wired and independently tested.

Agent discovery is also Kernel-backed as a read-only fetch. It returns only
the received Agent Card and fails on non-HTTPS, non-JSON, or non-2xx responses;
it does not fabricate agents, usage, payments, or adoption.

Blind policy proving is Kernel-routed through the configured HTTPS proof
service. The adapter rejects non-2xx responses and malformed responses; it
does not create a proof locally, fabricate a proof package, or imply an
on-chain receipt.

Auction bid commitment and outcome proving are Kernel-routed through the
configured HTTPS auction proof services. They validate observed public
commitment/proof packages; they do not claim token movement, settlement
finality, or an on-chain signature.

## Network truth

The current Kernel catalog contains independently gated Testnet lanes. A
network is executable only for the product capability that has both an
application binding and matching evidence; catalog presence alone is not a
support claim.

- `solana-devnet`: Kernel-native payroll, governance, and auction paths with
  Devnet evidence.
- `ethereum-sepolia`, `base-sepolia`, `arbitrum-sepolia`, `bnb-testnet`,
  `robinhood-testnet`, `hyperliquid-testnet`, and `tempo-testnet`: shared EVM
  lifecycle with separated chain IDs, RPC configuration, fee rules, receipts,
  and independent verification evidence. Hyperliquid here means HyperEVM;
  HyperCore remains a separate native API surface.
- `zcash-testnet`: native UTXO/Zallet-Zebra boundary with a separately
  evidenced payroll settlement path. It is not an EVM lane.
- `stellar-testnet`: Horizon adapter with ten Kernel product capabilities
  covering verification, payroll calculation/approval, treasury policy,
  governance, auction workflow commitments, and a prepared-only payroll
  settlement path. Nine capabilities have confirmed transactions; payroll
  settlement remains `testnet_ready` until a funded receipt exists. The
  confirmed transactions prove product binding and workflow evidence; they do
  not claim private business data storage or financial settlement on Stellar.

`agent` capabilities remain explicitly scoped to Solana in the catalog, and
`payroll.settle` is exposed on Stellar only as a Kernel-ready preparation and
signing path; it is not advertised as independently verified until a funded
Testnet receipt exists. Mainnet configurations remain disabled everywhere.

## Migration rule

New product work starts from the Kernel contracts and adds an explicit
application binding plus evidence. Legacy integration code is retained only
while a live route or reproducibility requirement depends on it; it is not
copied into new product paths and is not promoted by discovery metadata.

The archive tag is a recovery point, not a second source of truth. Changes are
made on `main`, tested locally and in CI, then mirrored to `canonical-live`.
