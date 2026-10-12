import type {
  ExecutionIntent,
  ExecutionReceipt,
  ExecutionState,
  KernelProvider,
  PreparedExecution,
  ProviderId,
  ProviderRegistry,
  CapabilityId,
  NetworkId,
} from "./index.js";
import { supportsProductCapability } from "./catalog.js";
import { isNetworkAvailable } from "./networks.js";

export type KernelErrorCode =
  | "INVALID_INTENT"
  | "INTENT_EXPIRED"
  | "DUPLICATE_IDEMPOTENCY_KEY"
  | "PROVIDER_NOT_FOUND"
  | "CAPABILITY_UNSUPPORTED"
  | "UNSUPPORTED_NETWORK"
  | "EXECUTION_NOT_FOUND"
  | "INVALID_STATE"
  | "PROVIDER_FAILURE";

export type KernelEventName =
  | "execution.prepare.started"
  | "execution.prepare.completed"
  | "execution.submit.started"
  | "execution.submit.completed"
  | "execution.status.updated"
  | "execution.receipt.loaded"
  | "execution.failed";

export interface KernelEvent {
  name: KernelEventName;
  executionId?: string;
  requestId?: string;
  product?: string;
  capability?: string;
  network?: string;
  provider?: string;
  state?: ExecutionState;
  errorCode?: KernelErrorCode;
  occurredAt: string;
}

export interface KernelTelemetry {
  record(event: KernelEvent): void | Promise<void>;
}

export interface KernelOptions {
  telemetry?: KernelTelemetry;
  now?: () => string;
}

export class KernelError extends Error {
  readonly code: KernelErrorCode;
  readonly details?: Record<string, unknown>;

  constructor(code: KernelErrorCode, message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = "KernelError";
    this.code = code;
    this.details = details;
  }
}

export class InMemoryProviderRegistry implements ProviderRegistry {
  private readonly providers = new Map<ProviderId, KernelProvider>();

  register(provider: KernelProvider): void {
    if (this.providers.has(provider.id)) {
      throw new KernelError("PROVIDER_FAILURE", `Provider is already registered: ${provider.id}`);
    }
    const unavailableNetwork = provider.networks.find((network) => !isNetworkAvailable(network));
    if (unavailableNetwork) {
      throw new KernelError("UNSUPPORTED_NETWORK", "A provider cannot be registered for a network without an available adapter.", {
        network: unavailableNetwork,
        provider: provider.id,
      });
    }
    this.providers.set(provider.id, provider);
  }

  resolve(network: NetworkId, capability: CapabilityId, preferredProvider?: ProviderId): KernelProvider {
    if (preferredProvider) {
      const preferred = this.providers.get(preferredProvider);
      if (!preferred || !preferred.networks.includes(network)) {
        throw new KernelError("PROVIDER_NOT_FOUND", "The requested provider is not available on this network.", {
          network,
          provider: preferredProvider,
        });
      }
      if (!preferred.supports(capability)) {
        throw new KernelError("CAPABILITY_UNSUPPORTED", "The provider does not support this capability.", {
          capability,
          provider: preferredProvider,
        });
      }
      return preferred;
    }

    for (const provider of this.providers.values()) {
      if (provider.networks.includes(network) && provider.supports(capability)) return provider;
    }
    throw new KernelError("PROVIDER_NOT_FOUND", "No provider supports this network and capability.", { network, capability });
  }
}

type ExecutionRecord<TUnsigned> = {
  provider: KernelProvider;
  prepared: PreparedExecution<TUnsigned>;
  state: ExecutionState;
  submission?: { executionId: string; signatures: string[] };
  receipt?: ExecutionReceipt;
};

export class PrivateDaoKernel {
  private readonly executions = new Map<string, ExecutionRecord<unknown>>();
  private readonly idempotency = new Map<string, string>();
  private readonly inFlightPrepares = new Map<string, Promise<PreparedExecution<unknown>>>();
  private readonly inFlightSubmissions = new Map<string, Promise<{ executionId: string; signatures: string[] }>>();

  private readonly telemetry?: KernelTelemetry;
  private readonly now: () => string;

  constructor(private readonly registry: ProviderRegistry, options: KernelOptions = {}) {
    this.telemetry = options.telemetry;
    this.now = options.now || (() => new Date().toISOString());
  }

  async prepare<TPayload, TUnsigned>(intent: ExecutionIntent<TPayload>): Promise<PreparedExecution<TUnsigned>> {
    this.validateIntent(intent);
    this.emit({
      name: "execution.prepare.started",
      requestId: intent.context.requestId,
      product: intent.context.product,
      capability: intent.context.capability,
      network: intent.context.network,
      provider: intent.context.provider,
    });
    const prepareKey = this.idempotencyKey(intent);
    const existingId = this.idempotency.get(prepareKey);
    if (existingId) {
      const existing = this.executions.get(existingId);
      if (existing) return existing.prepared as PreparedExecution<TUnsigned>;
    }
    const inFlight = this.inFlightPrepares.get(prepareKey);
    if (inFlight) return (await inFlight) as PreparedExecution<TUnsigned>;

    const provider = this.registry.resolve(intent.context.network, intent.context.capability, intent.context.provider);
    const preparation = (async (): Promise<PreparedExecution<unknown>> => {
      try {
        const prepared = await provider.prepare<TPayload, TUnsigned>(intent);
        this.executions.set(prepared.executionId, { provider, prepared, state: prepared.state });
        this.idempotency.set(prepareKey, prepared.executionId);
        this.emit({
          name: "execution.prepare.completed",
          executionId: prepared.executionId,
          requestId: intent.context.requestId,
          product: intent.context.product,
          capability: intent.context.capability,
          network: intent.context.network,
          provider: provider.id,
          state: prepared.state,
        });
        return prepared;
      } catch (error) {
        this.emit({
          name: "execution.failed",
          requestId: intent.context.requestId,
          product: intent.context.product,
          capability: intent.context.capability,
          network: intent.context.network,
          provider: provider.id,
          errorCode: "PROVIDER_FAILURE",
        });
        throw this.providerError("Provider preparation failed.", error);
      }
    })();
    this.inFlightPrepares.set(prepareKey, preparation);
    try {
      return (await preparation) as PreparedExecution<TUnsigned>;
    } finally {
      if (this.inFlightPrepares.get(prepareKey) === preparation) this.inFlightPrepares.delete(prepareKey);
    }
  }

  async submit<TUnsigned>(executionId: string, signedPayload: TUnsigned): Promise<{ executionId: string; signatures: string[] }> {
    const record = this.getRecord(executionId);
    if (record.submission) return { ...record.submission, signatures: [...record.submission.signatures] };
    this.validateIntent(record.prepared.intent);
    if (record.state !== "prepared" && record.state !== "awaiting_signature") {
      throw new KernelError("INVALID_STATE", `Execution cannot be submitted from state ${record.state}.`);
    }
    const inFlight = this.inFlightSubmissions.get(executionId);
    if (inFlight) return inFlight;

    const submission = (async () => {
      this.emit({ name: "execution.submit.started", executionId });
      try {
        const result = await record.provider.submit(record.prepared, signedPayload);
        if (result.executionId !== executionId || (record.prepared.requiredSigners.length > 0 && result.signatures.length === 0)) {
          throw new Error("Provider returned an invalid submission result.");
        }
        record.submission = { executionId: result.executionId, signatures: [...result.signatures] };
        record.state = "submitted";
        this.emit({
          name: "execution.submit.completed",
          executionId,
          provider: record.provider.id,
          state: "submitted",
        });
        return result;
      } catch (error) {
        record.state = "failed";
        this.emit({ name: "execution.failed", executionId, provider: record.provider.id, errorCode: "PROVIDER_FAILURE" });
        throw this.providerError("Provider submission failed.", error);
      }
    })();
    this.inFlightSubmissions.set(executionId, submission);
    try {
      return await submission;
    } finally {
      if (this.inFlightSubmissions.get(executionId) === submission) this.inFlightSubmissions.delete(executionId);
    }
  }

  async status(executionId: string): Promise<{ executionId: string; state: ExecutionState; errorCode?: string }> {
    const record = this.getRecord(executionId);
    try {
      const status = await record.provider.status(executionId);
      if (status.executionId !== executionId) throw new Error("Provider returned status for a different execution.");
      record.state = status.state;
      this.emit({
        name: "execution.status.updated",
        executionId,
        provider: record.provider.id,
        state: status.state,
        errorCode: status.errorCode as KernelErrorCode | undefined,
      });
      return status;
    } catch (error) {
      this.emit({ name: "execution.failed", executionId, provider: record.provider.id, errorCode: "PROVIDER_FAILURE" });
      throw this.providerError("Provider status lookup failed.", error);
    }
  }

  async receipt<TResult = unknown>(executionId: string): Promise<ExecutionReceipt<TResult>> {
    const record = this.getRecord(executionId);
    try {
      const receipt = await record.provider.receipt<TResult>(executionId);
      if (receipt.executionId !== executionId) throw new Error("Provider returned a receipt for a different execution.");
      record.receipt = receipt;
      record.state = receipt.state;
      this.emit({
        name: "execution.receipt.loaded",
        executionId,
        provider: record.provider.id,
        state: receipt.state,
      });
      return receipt;
    } catch (error) {
      this.emit({ name: "execution.failed", executionId, provider: record.provider.id, errorCode: "PROVIDER_FAILURE" });
      throw this.providerError("Provider receipt lookup failed.", error);
    }
  }

  private emit(event: Omit<KernelEvent, "occurredAt">): void {
    if (!this.telemetry) return;
    void this.telemetry.record({ ...event, occurredAt: this.now() });
  }

  private validateIntent<TPayload>(intent: ExecutionIntent<TPayload>): void {
    if (!intent.context.requestId || !intent.context.idempotencyKey || !intent.context.network || !intent.context.capability) {
      throw new KernelError("INVALID_INTENT", "Execution intent is missing required context fields.");
    }
    if (!supportsProductCapability(intent.context.product, intent.context.network, intent.context.capability)) {
      throw new KernelError("UNSUPPORTED_NETWORK", "The product capability is not declared for the selected network.", {
        product: intent.context.product,
        capability: intent.context.capability,
        network: intent.context.network,
      });
    }
    if (intent.expiresAt) {
      const expiresAt = Date.parse(intent.expiresAt);
      const now = Date.parse(this.now());
      if (!Number.isFinite(expiresAt) || !Number.isFinite(now)) {
        throw new KernelError("INVALID_INTENT", "Execution intent has an invalid expiry timestamp.");
      }
      if (expiresAt <= now) {
        throw new KernelError("INTENT_EXPIRED", "Execution intent has expired.", { expiresAt: intent.expiresAt });
      }
    }
  }

  private idempotencyKey<TPayload>(intent: ExecutionIntent<TPayload>): string {
    return `${intent.context.organizationId || "anonymous"}:${intent.context.idempotencyKey}`;
  }

  private getRecord(executionId: string): ExecutionRecord<unknown> {
    const record = this.executions.get(executionId);
    if (!record) throw new KernelError("EXECUTION_NOT_FOUND", `Execution not found: ${executionId}`);
    return record;
  }

  private providerError(message: string, error: unknown): KernelError {
    return new KernelError("PROVIDER_FAILURE", message, {
      cause: error instanceof Error ? error.message : String(error),
    });
  }
}

export interface ReconciliationLine {
  payoutId: string;
  expectedAtomic: string;
  actualAtomic: string;
  state: "confirmed" | "failed" | "pending";
}

export interface ReconciliationResult {
  ok: boolean;
  expectedCount: number;
  confirmedCount: number;
  failedCount: number;
  pendingCount: number;
  expectedTotalAtomic: string;
  confirmedTotalAtomic: string;
  varianceAtomic: string;
  duplicatePayoutIds: string[];
  failedPayoutIds: string[];
  pendingPayoutIds: string[];
}

export function reconcileSettlements(lines: readonly ReconciliationLine[]): ReconciliationResult {
  const seen = new Set<string>();
  const duplicatePayoutIds: string[] = [];
  let expectedTotal = 0n;
  let confirmedTotal = 0n;
  let confirmedCount = 0;
  let failedCount = 0;
  let pendingCount = 0;
  const failedPayoutIds: string[] = [];
  const pendingPayoutIds: string[] = [];

  for (const line of lines) {
    if (seen.has(line.payoutId)) duplicatePayoutIds.push(line.payoutId);
    seen.add(line.payoutId);
    expectedTotal += BigInt(line.expectedAtomic);
    if (line.state === "confirmed") {
      confirmedCount += 1;
      confirmedTotal += BigInt(line.actualAtomic);
    } else if (line.state === "failed") {
      failedCount += 1;
      failedPayoutIds.push(line.payoutId);
    } else {
      pendingCount += 1;
      pendingPayoutIds.push(line.payoutId);
    }
  }

  const variance = expectedTotal - confirmedTotal;
  return {
    ok: duplicatePayoutIds.length === 0 && failedCount === 0 && pendingCount === 0 && variance === 0n,
    expectedCount: lines.length,
    confirmedCount,
    failedCount,
    pendingCount,
    expectedTotalAtomic: expectedTotal.toString(),
    confirmedTotalAtomic: confirmedTotal.toString(),
    varianceAtomic: variance.toString(),
    duplicatePayoutIds,
    failedPayoutIds,
    pendingPayoutIds,
  };
}
