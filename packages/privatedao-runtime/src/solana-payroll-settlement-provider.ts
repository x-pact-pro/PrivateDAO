import type {
  ExecutionIntent,
  ExecutionReceipt,
  ExecutionState,
  KernelProvider,
  PreparedExecution,
  ProviderId,
} from "./index.js";

export interface SolanaPayrollSettlementPayload {
  kind: "umbra-payroll";
  manifestCommitment: string;
  recipientHash: string;
  recipientCount: number;
  totalAmount: string;
  asset: "WSOL";
  batchId: string;
  sensitive?: boolean;
  requiresAudit?: boolean;
  unlinkabilityRequired?: boolean;
}

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;
type RemoteIntent = Record<string, unknown>;
type SettlementRecord = {
  intent: ExecutionIntent<SolanaPayrollSettlementPayload>;
  remoteIntent: RemoteIntent;
  state: ExecutionState;
  preparedAt: string;
  response?: Record<string, unknown>;
};

const DEFAULT_ENDPOINT = "https://privatedao.org/api/private-payout/umbra-workflow";

/**
 * Kernel boundary for the existing Umbra Devnet payroll workflow.
 * The provider delegates to the existing workflow endpoint; it does not hold
 * wallet keys and it never treats a frontend response as settlement proof.
 */
export class SolanaPayrollSettlementProvider implements KernelProvider {
  readonly id: ProviderId = "privatedao-umbra-solana-devnet";
  readonly networks = ["solana-devnet"] as const;
  private readonly records = new Map<string, SettlementRecord>();

  constructor(
    private readonly fetchImpl: FetchLike = fetch,
    private readonly endpoint = process.env.PDAO_SOLANA_PAYROLL_UMBRA_ENDPOINT?.trim() || DEFAULT_ENDPOINT,
  ) {
    if (!endpoint.startsWith("https://")) throw new Error("Umbra payroll endpoint must use HTTPS.");
  }

  supports(capability: string): boolean {
    return capability === "payroll.settle";
  }

  async prepare<TPayload, TUnsigned>(intent: ExecutionIntent<TPayload>): Promise<PreparedExecution<TUnsigned>> {
    if (!this.supports(intent.context.capability)) throw new Error("Solana payroll provider does not support this capability.");
    if (intent.context.network !== "solana-devnet") throw new Error("Umbra payroll provider is Testnet/Devnet only.");
    const payload = parsePayload(intent.payload);
    const response = await this.request({ action: "prepare", ...payload });
    if (response.ok !== true || !isRecord(response.intent)) throw new Error("Umbra payroll prepare did not return a valid intent.");
    const executionId = `umbra-payroll-${intent.context.requestId}`;
    const preparedAt = new Date().toISOString();
    this.records.set(executionId, {
      intent: intent as ExecutionIntent<SolanaPayrollSettlementPayload>,
      remoteIntent: response.intent,
      state: "prepared",
      preparedAt,
    });
    return {
      executionId,
      intent,
      unsignedPayload: response.intent as TUnsigned,
      requiredSigners: [],
      state: "prepared",
    };
  }

  async submit<TUnsigned>(execution: PreparedExecution<TUnsigned>, _signedPayload: TUnsigned): Promise<{ executionId: string; signatures: string[] }> {
    const record = this.records.get(execution.executionId);
    if (!record) throw new Error("Unknown Umbra payroll execution.");
    if (record.state === "reconciled") return { executionId: execution.executionId, signatures: signaturesFrom(record.response) };
    if (record.state !== "prepared") throw new Error(`Umbra payroll cannot submit from ${record.state}.`);
    const response = await this.request({ action: "execute", intent: record.remoteIntent });
    if (response.ok !== true) throw new Error(typeof response.error === "string" ? response.error : "Umbra payroll execution failed.");
    record.response = response;
    const stage = typeof response.stage === "string" ? response.stage : "settlement-submitted";
    record.state = stage === "reconciled" || stage === "confirmed" ? "reconciled" : "submitted";
    return { executionId: execution.executionId, signatures: signaturesFrom(response) };
  }

  async status(executionId: string): Promise<{ executionId: string; state: ExecutionState }> {
    const record = this.records.get(executionId);
    if (!record) throw new Error("Unknown Umbra payroll execution.");
    return { executionId, state: record.state };
  }

  async receipt<TResult = unknown>(executionId: string): Promise<ExecutionReceipt<TResult>> {
    const record = this.records.get(executionId);
    if (!record || record.state !== "reconciled" || !record.response) throw new Error("Umbra payroll is not reconciled.");
    return {
      executionId,
      requestId: record.intent.context.requestId,
      capability: record.intent.context.capability,
      network: "solana-devnet",
      provider: this.id,
      state: "reconciled",
      signatures: signaturesFrom(record.response),
      result: record.response as TResult,
      createdAt: new Date().toISOString(),
      environment: "devnet",
      asset: "WSOL",
    };
  }

  private async request(body: Record<string, unknown>): Promise<Record<string, unknown>> {
    const response = await this.fetchImpl(this.endpoint, {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(isRecord(payload) && typeof payload.error === "string" ? payload.error : `Umbra payroll endpoint failed with HTTP ${response.status}.`);
    if (!isRecord(payload)) throw new Error("Umbra payroll endpoint returned an invalid response.");
    return payload;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function parsePayload(value: unknown): SolanaPayrollSettlementPayload {
  if (!isRecord(value) || value.kind !== "umbra-payroll") throw new Error("Solana payroll payload must use kind=umbra-payroll.");
  if (typeof value.manifestCommitment !== "string" || !/^[a-f0-9]{64}$/i.test(value.manifestCommitment)) throw new Error("manifestCommitment must be a SHA-256 hex string.");
  if (typeof value.recipientHash !== "string" || !/^[a-f0-9]{64}$/i.test(value.recipientHash)) throw new Error("recipientHash must be a SHA-256 hex string.");
  if (!Number.isInteger(value.recipientCount) || Number(value.recipientCount) < 1 || Number(value.recipientCount) > 500) throw new Error("recipientCount must be between 1 and 500.");
  if (typeof value.totalAmount !== "string" || !/^\d+(\.\d+)?$/.test(value.totalAmount) || Number(value.totalAmount) <= 0) throw new Error("totalAmount must be positive.");
  if (value.asset !== "WSOL" || typeof value.batchId !== "string" || value.batchId.length === 0) throw new Error("Umbra payroll requires WSOL and a batchId.");
  return value as unknown as SolanaPayrollSettlementPayload;
}

function signaturesFrom(value: Record<string, unknown> | undefined): string[] {
  const execution = value?.execution;
  if (!isRecord(execution)) return [];
  const candidates = [execution.signature, execution.txSignature, execution.transactionSignature];
  return candidates.filter((candidate): candidate is string => typeof candidate === "string" && candidate.length > 0);
}
