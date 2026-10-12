export type ProductId =
  | "blind-verification"
  | "record-verification"
  | "payroll"
  | "treasury"
  | "governance"
  | "auction"
  | "agent";

export type CapabilityId =
  | "verification.record.create"
  | "verification.record.verify"
  | "verification.blind.prove"
  | "payroll.calculate"
  | "payroll.approve"
  | "payroll.settle"
  | "treasury.policy.check"
  | "governance.proposal.execute"
  | "auction.bid.commit"
  | "auction.settle"
  | "agent.discover"
  | "agent.invoke";

export type NetworkId = "solana-devnet" | "solana-mainnet-beta" | (string & {});
export type ProviderId = string & {};

export type ExecutionState =
  | "created"
  | "prepared"
  | "awaiting_signature"
  | "signed"
  | "submitted"
  | "confirmed"
  | "finalized"
  | "reconciled"
  | "failed"
  | "cancelled";

export interface ExecutionContext {
  requestId: string;
  idempotencyKey: string;
  product: ProductId;
  capability: CapabilityId;
  organizationId?: string;
  actorId?: string;
  network: NetworkId;
  provider?: ProviderId;
  policyHash?: string;
}

export interface AccountReference {
  role: "authority" | "payer" | "recipient" | "program" | "treasury" | "other";
  address: string;
  network: NetworkId;
}

export interface ExecutionIntent<TPayload = unknown> {
  context: ExecutionContext;
  payload: TPayload;
  accounts: AccountReference[];
  expiresAt?: string;
}

export interface PreparedExecution<TUnsigned = unknown> {
  executionId: string;
  intent: ExecutionIntent;
  unsignedPayload: TUnsigned;
  requiredSigners: AccountReference[];
  state: "prepared" | "awaiting_signature";
  signingMode?: "browser" | "server";
}

export interface ExecutionReceipt<TResult = unknown> {
  executionId: string;
  requestId: string;
  capability: CapabilityId;
  network: NetworkId;
  provider?: ProviderId;
  state: Extract<ExecutionState, "confirmed" | "finalized" | "reconciled">;
  signatures: string[];
  result?: TResult;
  metadata?: Readonly<Record<string, string | number | boolean | null>>;
  reconciliationId?: string;
  proofId?: string;
  createdAt: string;
  environment?: "devnet" | "testnet" | "mainnet";
  chainId?: string;
  asset?: string;
  contract?: string;
  blockNumber?: string;
  explorerUrl?: string;
}

export interface KernelProvider {
  readonly id: ProviderId;
  readonly networks: readonly NetworkId[];
  supports(capability: CapabilityId): boolean;
  prepare<TPayload, TUnsigned>(intent: ExecutionIntent<TPayload>): Promise<PreparedExecution<TUnsigned>>;
  submit<TUnsigned>(execution: PreparedExecution<TUnsigned>, signedPayload: TUnsigned): Promise<{ executionId: string; signatures: string[] }>;
  status(executionId: string): Promise<{ executionId: string; state: ExecutionState; errorCode?: string }>;
  receipt<TResult = unknown>(executionId: string): Promise<ExecutionReceipt<TResult>>;
}

export interface ProviderRegistry {
  register(provider: KernelProvider): void;
  resolve(network: NetworkId, capability: CapabilityId, preferredProvider?: ProviderId): KernelProvider;
}

export interface ProtocolCapability {
  id: CapabilityId;
  version: string;
  product: ProductId;
  networks: readonly NetworkId[];
  requiresSignature: boolean;
  supportsAsync: boolean;
  receiptSchema: string;
}

export interface ProtocolAction<TInput = unknown, TOutput = unknown> {
  capability: ProtocolCapability;
  execute(input: TInput, context: ExecutionContext): Promise<TOutput>;
}

export interface ProofReference {
  proofId: string;
  verificationUrl?: string;
  scope: "public" | "auditor" | "custom";
  claims: readonly string[];
  expiresAt?: string;
  revokedAt?: string;
}

export interface ProtocolReceipt<TResult = unknown> extends ExecutionReceipt<TResult> {
  proof?: ProofReference;
}

export { InMemoryProviderRegistry, KernelError, PrivateDaoKernel, reconcileSettlements } from "./kernel.js";
export { SolanaBrowserExecutionProvider } from "./solana-browser-execution-provider.js";
export type { SolanaBrowserExecutionPayload, SolanaBrowserSignedPayload } from "./solana-browser-execution-provider.js";
export { SolanaPayrollSettlementProvider } from "./solana-payroll-settlement-provider.js";
export type { SolanaPayrollSettlementPayload } from "./solana-payroll-settlement-provider.js";
export type {
  KernelErrorCode,
  KernelEvent,
  KernelEventName,
  KernelOptions,
  KernelTelemetry,
  ReconciliationLine,
  ReconciliationResult,
} from "./kernel.js";
export { PRODUCT_CATALOG, assertProductCatalogValid, findProduct, listProducts, supportsProductCapability, validateProductCatalog } from "./catalog.js";
export type { ProductAvailability, ProductDescriptor } from "./catalog.js";
export { NETWORK_MATRIX, getNetwork, isNetworkAvailable } from "./networks.js";
export type { NetworkDescriptor, NetworkFamily, NetworkStage } from "./networks.js";
export {
  InMemoryProtocolRegistry,
  canApprove,
  isPreparedExecution,
} from "./protocol.js";
export type {
  ApprovalPolicy,
  ApprovalRecord,
  AuthorizationPolicy,
  FeeEstimate,
  NetworkAdapter,
  ProtocolPermission,
  ProtocolRegistration,
  ProtocolRegistry,
  ProtocolRole,
  WalletSession,
  WalletSigner,
} from "./protocol.js";
export { InMemoryAuditLog, InMemoryJobStore, isTerminalJobState, nextRetryState } from "./jobs.js";
export type { AuditEvent, AuditLog, JobState, JobStore, ProtocolJob } from "./jobs.js";
export { TransportBackedNetworkAdapter } from "./adapters.js";
export type { AdapterTransport } from "./adapters.js";
export { HttpExecutionTransport } from "./http-transport.js";
export type { HttpExecutionTransportOptions, HttpExecutionTransportPaths, HttpFetch } from "./http-transport.js";
export { EvmNetworkAdapter, EvmAdapterError, EVM_NETWORK_CONFIGS } from "./evm-network.js";
export type { EvmEnvironment, EvmNetworkConfig, EvmTransport, EvmWalletAdapter } from "./evm-network.js";
export { ViemEvmTransport } from "./evm-viem-transport.js";
export type { ViemContractWritePayload } from "./evm-viem-transport.js";
export { BrowserEvmTransport } from "./browser-evm-transport.js";
export type { BrowserEvmContractWritePayload, BrowserEvmSignedPayload } from "./browser-evm-transport.js";
export { ZcashNetworkAdapter, ZcashAdapterError, ZCASH_NETWORK_CONFIGS } from "./zcash-network.js";
export type { ZcashEnvironment, ZcashNetworkConfig, ZcashTransport, ZcashWalletAdapter } from "./zcash-network.js";
export { ZalletCliTransport } from "./zallet-cli-transport.js";
export type { ZalletCliTransportOptions, ZcashRecipient, ZcashSendPayload } from "./zallet-cli-transport.js";
export { StellarNetworkAdapter, StellarAdapterError, StellarHorizonTransport, STELLAR_NETWORK_CONFIGS, STELLAR_TESTNET_NETWORK_PASSPHRASE, STELLAR_KERNEL_CAPABILITIES } from "./stellar-network.js";
export type { StellarEnvironment, StellarNetworkConfig, StellarPaymentPayload, StellarPayrollRecipient, StellarPayrollSettlementPayload, StellarRecoveredAccount, StellarTransport, StellarUnsignedPayload, StellarSignedPayload } from "./stellar-network.js";
export { HyperCoreNetworkAdapter } from "./hypercore-network.js";
export type { HyperCoreHealth, HyperCoreMetaSnapshot, HyperCoreNetworkId } from "./hypercore-network.js";
export { DeploymentRegistry } from "./deployment-registry.js";
export type { DeploymentRecord } from "./deployment-registry.js";
export { createHttpBackedPrivateDaoRuntime } from "./http-runtime.js";
export type { HttpBackedRuntimeOptions } from "./http-runtime.js";
export {
  assertPayrollTransition,
  calculatePayroll,
  canTransitionPayroll,
} from "./payroll.js";
export type {
  PayrollCalculation,
  PayrollLine,
  PayrollLineInput,
  PayrollPolicy,
  PayrollRounding,
  PayrollState,
} from "./payroll.js";
export { registerCatalogCapabilities } from "./product-registry.js";
export { ProductExecutionGateway } from "./product-gateway.js";
export { validateStellarProductWorkflow } from "./stellar-product-workflow.js";
export type { StellarProductWorkflow } from "./stellar-product-workflow.js";
export {
  EntraIdentityError,
  EntraTenantAuthorizer,
  EntraTokenVerifier,
  MapTenantMembershipStore,
} from "./identity/entra.js";
export type {
  EnterprisePrincipal,
  EnterpriseRole,
  EntraIdentityConfig,
  TenantMembership,
  TenantMembershipStore,
} from "./identity/entra.js";
export { createPrivateDaoRuntime } from "./runtime.js";
export type { PrivateDaoRuntime } from "./runtime.js";
export { PayrollCalculationProvider } from "./payroll-provider.js";
export type { PayrollCalculationPayload } from "./payroll-provider.js";
export { PayrollApprovalProvider } from "./payroll-approval-provider.js";
export type { PayrollApprovalPayload, PayrollApprovalPolicy, PayrollApprovalSignature } from "./payroll-approval-provider.js";
export { GovernancePolicyProvider } from "./governance-policy-provider.js";
export type { GovernancePolicyPayload, GovernancePolicySignature } from "./governance-policy-provider.js";
export { TreasuryPolicyProvider } from "./treasury-policy-provider.js";
export type { TreasuryPolicyCheckPayload, TreasuryPolicyCheckResult } from "./treasury-policy-provider.js";
export { RecordCreationProvider, RecordVerificationProvider, RECORD_CANONICALIZATION_VERSION } from "./record-provider.js";
export type { RecordCreationPayload, RecordCreationResult, RecordVerificationPayload, RecordVerificationResult } from "./record-provider.js";
export { AgentDiscoveryProvider } from "./agent-provider.js";
export type { AgentDiscoveryPayload, AgentDiscoveryResult } from "./agent-provider.js";
export { BlindPolicyProofProvider } from "./blind-policy-provider.js";
export type { BlindPolicyProofPayload, BlindPolicyProofResult } from "./blind-policy-provider.js";
export { AuctionOutcomeProofProvider } from "./auction-outcome-provider.js";
export type { AuctionOutcomeProofPayload, AuctionOutcomeProofResult } from "./auction-outcome-provider.js";
export { buildKernelAuctionBidProof, buildKernelAuctionOutcomeProof } from "./auction-proof-service.js";
export { AuctionBidCommitProvider } from "./auction-bid-provider.js";
export type { AuctionBidCommitPayload, AuctionBidCommitResult } from "./auction-bid-provider.js";
export { buildCapabilityMatrix } from "./capability-matrix.js";
export type { CapabilityMatrixEntry, CapabilityRuntimeStatus } from "./capability-matrix.js";
export { buildNativeCapabilityRegistry } from "./native-capability-registry.js";
export type { NativeCapabilityEntry, NativeCapabilityStatus } from "./native-capability-registry.js";
export {
  APPLICATION_CAPABILITY_BINDINGS,
  assertApplicationBindingsValid,
  findApplicationBinding,
  listApplicationBindings,
  validateApplicationBindings,
} from "./application-bindings.js";
export type { ApplicationBindingMode, ApplicationCapabilityBinding, ApplicationHttpMethod } from "./application-bindings.js";
export { buildTempoPaymentBatch, reconcileTempoPayments, buildBaseTestnetDeposit, baseDepositDestinationHash, reconcileBaseDeposit, TEMPO_PAYMENT_CHAIN, TEMPO_PAYMENT_TOKEN, BASE_DEPOSIT_PORTAL } from "./payment-rails.js";
export type { PaymentLine } from "./payment-rails.js";
export { PAYMENT_RAIL_CATALOG, findPaymentRail } from "./payment-rail-catalog.js";
export type { PaymentRailDescriptor, PaymentRailId, PaymentRailStatus } from "./payment-rail-catalog.js";
