import type { ExecutionIntent, PreparedExecution, ProtocolRole, WalletSigner } from "./index.js";
import { KernelError } from "./kernel.js";
import { ProductExecutionGateway } from "./product-gateway.js";
import { PersistentWalletSecurityGuard, type AuthenticatedTenantPrincipal, type HybridAuthorizationVerifier, type WalletActionRequest, type WalletPolicy, type WalletAuthorizationDecision, type WalletSecurityStore, type WalletExecutionSession } from "./wallet-security.js";

type WalletReceiptStore = {
  recordReceipt(record: {
    receiptId: string;
    tenantId: string;
    organizationId: string;
    requestId: string;
    executionId: string;
    state: "submitted" | "confirmed" | "finalized" | "reconciled" | "failed";
    network: string;
    reference?: string;
    receiptCommitment: string;
    occurredAt: string;
  }): Promise<void>;
};

type WalletAuthorizer = {
  authorize(
    principal: AuthenticatedTenantPrincipal,
    policy: WalletPolicy,
    request: WalletActionRequest,
  ): { decision: WalletAuthorizationDecision } | Promise<{ decision: WalletAuthorizationDecision }>;
};

export interface WalletExecutionAuthorization {
  principal: AuthenticatedTenantPrincipal;
  policy: WalletPolicy;
  request: WalletActionRequest;
}

export function createPersistentWalletExecutionGateway(gateway: ProductExecutionGateway, store: WalletSecurityStore, autonomousSigner?: WalletSigner, hybridVerifier?: HybridAuthorizationVerifier): WalletExecutionGateway {
  const receiptStore = typeof (store as Partial<WalletReceiptStore>).recordReceipt === "function"
    ? store as unknown as WalletReceiptStore
    : undefined;
  return new WalletExecutionGateway(gateway, new PersistentWalletSecurityGuard(store, undefined, hybridVerifier), autonomousSigner, receiptStore);
}

/**
 * Kernel execution boundary for B2B, B2C, and autonomous wallet modes.
 * Authorization happens before ProductExecutionGateway.prepare(), so a
 * rejected wallet action cannot create a provider execution record.
 */
export class WalletExecutionGateway {
  private readonly executionModes = new Map<string, string>();
  private readonly executionReceipts = new Map<string, { tenantId: string; organizationId: string; requestId: string; network: string; receiptCommitment: string }>();

  constructor(
    private readonly gateway: ProductExecutionGateway,
    private readonly security: WalletAuthorizer,
    private readonly autonomousSigner?: WalletSigner,
    private readonly receiptStore?: WalletReceiptStore,
  ) {}

  restoreExecutionSession(session: Pick<WalletExecutionSession, "executionId" | "mode" | "tenantId" | "organizationId" | "requestId" | "network" | "receiptCommitment">): void {
    this.executionModes.set(session.executionId, session.mode);
    this.executionReceipts.set(session.executionId, {
      tenantId: session.tenantId,
      organizationId: session.organizationId,
      requestId: session.requestId,
      network: session.network,
      receiptCommitment: session.receiptCommitment,
    });
  }

  executionSession(executionId: string): Pick<WalletExecutionSession, "executionId" | "mode" | "tenantId" | "organizationId" | "requestId" | "network" | "receiptCommitment"> | undefined {
    const mode = this.executionModes.get(executionId);
    const receipt = this.executionReceipts.get(executionId);
    if (!mode || !receipt) return undefined;
    return { executionId, mode: mode as WalletExecutionSession["mode"], ...receipt };
  }

  async prepare<TPayload, TUnsigned>(
    intent: ExecutionIntent<TPayload>,
    role: ProtocolRole,
    authorization: WalletExecutionAuthorization,
  ): Promise<PreparedExecution<TUnsigned>> {
    this.assertRequestBinding(intent, authorization.request);
    const { decision } = await this.security.authorize(authorization.principal, authorization.policy, authorization.request);
    if (!decision.allowed) throw new KernelError("INVALID_INTENT", decision.reason, { receiptCommitment: decision.receiptCommitment });
    if (decision.approvalRequired && !authorization.request.approvalConfirmed) {
      throw new KernelError("APPROVAL_REQUIRED", "Wallet approval is required before execution preparation.", { receiptCommitment: decision.receiptCommitment });
    }
    const prepared = await this.gateway.prepare<TPayload, TUnsigned>(intent, role);
    this.executionModes.set(prepared.executionId, authorization.request.mode);
    this.executionReceipts.set(prepared.executionId, {
      tenantId: authorization.principal.tenantId,
      organizationId: authorization.principal.organizationId,
      requestId: authorization.request.requestId,
      network: authorization.request.network,
      receiptCommitment: decision.receiptCommitment,
    });
    return prepared;
  }

  async submit<TUnsigned>(prepared: PreparedExecution<TUnsigned>, signedPayload: TUnsigned, role: ProtocolRole): Promise<{ executionId: string; signatures: string[] }> {
    let payload = signedPayload;
    if (this.executionModes.get(prepared.executionId) === "autonomous") {
      if (this.autonomousSigner) {
        const session = await this.autonomousSigner.session();
        if (session.network !== prepared.intent.context.network) throw new KernelError("UNSUPPORTED_NETWORK", "Managed signer network does not match the execution intent.");
        payload = await this.autonomousSigner.sign(prepared.unsignedPayload, prepared.intent.context) as TUnsigned;
      } else if (prepared.signingMode === "server") {
        // The provider owns the real managed signer (for example ViemEvmTransport).
        // Never forward a caller-supplied payload in this mode.
        payload = prepared.unsignedPayload;
      } else {
        throw new KernelError("INVALID_INTENT", "Autonomous execution requires a configured managed signer.");
      }
    }
    try {
      const result = await this.gateway.submit(prepared, payload, role);
      await this.recordReceipt(prepared.executionId, { state: "submitted", reference: result.signatures[0] });
      return result;
    } catch (error) {
      await this.recordReceipt(prepared.executionId, { state: "failed" });
      throw error;
    }
  }

  status(execution: Pick<PreparedExecution<unknown>, "intent"> & { executionId: string }, role: ProtocolRole) {
    return this.gateway.status(execution, role);
  }

  async receipt<TResult = unknown>(execution: Pick<PreparedExecution<unknown>, "intent"> & { executionId: string }, role: ProtocolRole) {
    const receipt = await this.gateway.receipt<TResult>(execution, role);
    await this.recordReceipt(execution.executionId, {
      state: receipt.state,
      reference: receipt.signatures[0],
    });
    return receipt;
  }

  private assertRequestBinding<TPayload>(intent: ExecutionIntent<TPayload>, request: WalletActionRequest): void {
    if (intent.context.requestId !== request.requestId || intent.context.idempotencyKey !== request.idempotencyKey || intent.context.organizationId !== request.organizationId) {
      throw new KernelError("INVALID_INTENT", "Wallet authorization is not bound to the execution intent.");
    }
    if (intent.context.network !== request.network) throw new KernelError("UNSUPPORTED_NETWORK", "Wallet authorization network does not match the execution intent.");
  }

  private async recordReceipt(executionId: string, update: { state: "submitted" | "confirmed" | "finalized" | "reconciled" | "failed"; reference?: string }): Promise<void> {
    const context = this.executionReceipts.get(executionId);
    if (!context || !this.receiptStore) return;
    await this.receiptStore.recordReceipt({
      receiptId: `wallet_receipt_${executionId}`,
      tenantId: context.tenantId,
      organizationId: context.organizationId,
      requestId: context.requestId,
      executionId,
      state: update.state,
      network: context.network,
      ...(update.reference ? { reference: update.reference } : {}),
      receiptCommitment: context.receiptCommitment,
      occurredAt: new Date().toISOString(),
    });
  }
}
