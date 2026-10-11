# PrivateDAO Runtime Contracts

Provider-neutral contracts for the PrivateDAO Kernel and Protocol layers.

This package contains no RPC client, wallet signer, private key, treasury authority, or network side effect. Product workflows use these contracts to describe an execution, select a registered provider, track lifecycle state, and return a receipt or proof reference.

The exported `PrivateDaoKernel` is the shared orchestration boundary for products. It enforces provider selection, idempotent preparation, lifecycle transitions, normalized provider errors, and receipt retrieval. `reconcileSettlements` validates payout counts, totals, duplicates, and incomplete lines without knowing how a network transaction was built.

The kernel accepts an optional `KernelTelemetry` sink for lifecycle events without recording payloads, amounts, recipients, secrets, or other sensitive data. Submission is deliberately not retried automatically: a network adapter must provide its own idempotent submission semantics before an application retries a side-effecting transaction.

Network-specific adapters belong outside this package and must implement `KernelProvider`. A network is not considered supported merely because it appears in a product UI; it must have a real adapter and independent test evidence.

`NetworkAdapter` and `WalletSigner` define the integration boundary for real providers. Wallet signing is delegated to an injected wallet session; this package never accepts or stores private keys. `ProtocolRegistry` and its authorization policy types keep product actions, versions, roles, and permissions consistent across REST, SDK, MCP, and agent surfaces. The registry is an in-memory contract implementation for tests and composition; production authentication and persistence remain the responsibility of the application backend.

`EvmNetworkAdapter` is the Phase 1 EVM-family boundary. It accepts an explicit
network configuration and injected transport/wallet adapters, validates chain
identity, normalizes RPC timeout/failure errors, validates network-bound receipts,
and refuses Mainnet activation. `EVM_NETWORK_CONFIGS` contains separated testnet
and disabled Mainnet records; configuration presence is not support evidence.
`DeploymentRegistry` stores network-scoped deployment metadata and rejects a
`mainnet_live` record without an external release gate.

`ProtocolJob` and `AuditEvent` define the shared asynchronous-job and append-only audit shapes. The included in-memory stores are test/composition utilities only; production services must provide durable, tenant-isolated persistence and must not place employee plaintext, salaries, recipient data, secrets, or private keys in audit metadata.

`TransportBackedNetworkAdapter` is the concrete boundary for a real network integration. It accepts an injected transport, validates that the network is currently available, filters capabilities by network, and delegates observed preparation, submission, status, receipts, and fee estimates. It has no mock success path and does not contain an RPC client or signing key.

`HttpExecutionTransport` is the production HTTP implementation of that boundary. It maps a configured backend's prepare, submit, status, receipt, and fee-estimate endpoints into the same transport contract, enforces request timeouts, validates lifecycle responses, and fails closed on non-JSON or incomplete responses. It never creates a local execution id, signature, receipt, or success fallback. API authentication is injected through headers by the owning service and is never logged by this package.

`PRODUCT_CATALOG` is the single customer-executable capability surface for the current release. It lists the product/network contracts, while the generated native capability registry applies the stricter evidence gate before a lane is advertised as executable. Current evidence-backed lanes include Solana Devnet payroll calculation/approval and governance/auction runtime paths, Ethereum Sepolia, Tempo Testnet, and Base Sepolia verification plus organizational treasury/governance/auction paths. Confidential Payroll is intentionally Solana-only in the current release; no Umbra or Zcash settlement route is advertised through the customer workflow until an independent native E2E provider passes. Each row remains limited to the product, action, asset, receipt, and reconciliation behavior actually evidenced for that network; a network appearing in the catalog alone is not a claim of support.

`NETWORK_MATRIX` records the requested network roadmap without making unsupported claims. Planned entries are metadata only and cannot be resolved by a provider registry until an adapter is implemented and tested.

The migration rule is strict: product code may depend on these contracts, but provider-specific transaction construction belongs behind `KernelProvider` implementations. REST, SDK, MCP, and agent adapters should expose the same `ProtocolCapability` and receipt semantics.

`registerCatalogCapabilities` materializes the current product catalog in the Protocol registry with shared role and permission policies. It only registers contracts; it does not execute a transaction or create a provider success path. Applications still have to inject a real adapter and provide independent network evidence before declaring an action supported.

`ProductExecutionGateway` is the application boundary for those contracts. It checks product ownership and role permissions before delegating prepare, submit, status, or receipt work to `PrivateDaoKernel`; it does not bypass provider lifecycle checks or create synthetic receipts.

`createPrivateDaoRuntime` is the standard composition root for applications. It
creates one protocol registry, registers the complete product catalog, and
connects it to one Kernel and gateway. Applications still must inject a real
provider; the factory intentionally does not create a test-only provider or a
fallback-success path.

`buildCapabilityMatrix` is the runtime support check for product and network
selection. It reports `verified` only when the injected provider registry can
resolve the exact capability on the exact network, `contract-only` when the
catalog exists but no provider is registered, and `planned` for undeclared or
unavailable network combinations. Customer and agent discovery surfaces must
not promote `contract-only` or `planned` entries to executable support.

`APPLICATION_CAPABILITY_BINDINGS` is the application migration ledger. It
accounts for every currently declared product capability and records whether
the web application is routed through the Kernel gateway, an existing legacy
provider route, or no application binding. A `legacy-provider` row is not
Kernel evidence, and an `unbound` row must never be advertised as executable.
The ledger is validated at module load and by the runtime test so a new
catalog capability cannot be added without an explicit application boundary.

## Testnet Payment Rails

`buildTempoPaymentBatch` builds atomic AlphaUSD transfers with opaque, domain-bound
TIP-20 memos on chain 42431. `reconcileTempoPayments` requires exact payer, token,
recipient, memo, amount and count matches in a successful RPC receipt. These are
public onchain payments; they do not provide confidential payroll settlement.

`buildBaseTestnetDeposit` prepares a canonical Sepolia-to-Base-Sepolia ETH deposit.
`baseDepositDestinationHash` derives the destination transaction from the official
portal event. `reconcileBaseDeposit` binds both network IDs, source calldata/value,
sender, destination receipt hash, recipient and amount. Source confirmation alone
does not complete a bridge. Receipt inputs must come from authenticated backend
workflows using chain-ID-checked RPCs, never from untrusted uploaded JSON.

These helpers do not sign or authorize payments. Product policies and approvals
must run before wallet signing. They are exported integration primitives, not yet
customer-facing payment actions. Payment memos do not enforce onchain idempotency;
the owning service must persist its intent and signed transaction before broadcast.
The E2E runner does this in a private local journal, reuses the same signed bytes
after uncertain delivery, and allows a new attempt only after a confirmed revert.

Run `node --import tsx scripts/test-payment-rails.mjs` from the repository root.
Real testnet probes use `scripts/run-payment-rails-e2e.mjs tempo` or `base-bridge`
with `PDAO_TESTNET_PAYMENTS_EXECUTE=1` and the authorized testnet signing environment.
Public evidence is stored in `packages/evm-verification/deployments/payment-rail-*.json`.
The native product matrix remains independent of optional bridge funding routes.
