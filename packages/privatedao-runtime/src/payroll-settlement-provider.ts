import { createHash } from "node:crypto";
import type {
  ExecutionIntent,
  ExecutionReceipt,
  ExecutionState,
  KernelProvider,
  PreparedExecution,
  ProviderId,
} from "./index.js";

export interface PayrollSettlementPayload {
  batchId: string;
  policyHash: string;
  approved: boolean;
  recipients: readonly { commitment: string; netCents: number }[];
}

export interface PayrollSettlementResult {
  settled: true;
  batchId: string;
  policyHash: string;
  recipientCount: number;
  totalNetCents: number;
  settlementDigest: string;
  privateDataExcluded: true;
  onchainAnchor: false;
}

type SettlementRecord = {
  intent: ExecutionIntent<PayrollSettlementPayload>;
  result: PayrollSettlementResult;
  state: ExecutionState;
  preparedAt: string;
  submittedAt?: string;
};

/** Kernel settlement receipt for an approved payroll batch; it never moves funds. */
export class PayrollSettlementProvider implements KernelProvider {
  readonly id: ProviderId = "privatedao-payroll-settlement";
  readonly networks = ["solana-devnet"] as const;
  private readonly records = new Map<string, SettlementRecord>();

  supports(capability: string): boolean {
    return capability === "payroll.settle";
  }

  async prepare<TPayload, TUnsigned>(intent: ExecutionIntent<TPayload>): Promise<PreparedExecution<TUnsigned>> {
    if (!this.supports(intent.context.capability)) throw new Error("Payroll settlement provider does not support this capability.");
    const payload = parsePayload(intent.payload);
    if (!payload.approved) throw new Error("Payroll settlement requires an approved batch.");
    const totalNetCents = payload.recipients.reduce((total, recipient) => total + recipient.netCents, 0);
    const settlementDigest = createHash("sha256").update(JSON.stringify(payload)).digest("hex");
    const result: PayrollSettlementResult = {
      settled: true,
      batchId: payload.batchId,
      policyHash: payload.policyHash,
      recipientCount: payload.recipients.length,
      totalNetCents,
      settlementDigest,
      privateDataExcluded: true,
      onchainAnchor: false,
    };
    const executionId = `payroll-settle-${intent.context.requestId}`;
    const preparedAt = new Date().toISOString();
    this.records.set(executionId, { intent: intent as ExecutionIntent<PayrollSettlementPayload>, result, state: "prepared", preparedAt });
    return { executionId, intent, unsignedPayload: undefined as TUnsigned, requiredSigners: [], state: "prepared" };
  }

  async submit<TUnsigned>(execution: PreparedExecution<TUnsigned>, _signedPayload: TUnsigned): Promise<{ executionId: string; signatures: string[] }> {
    const record = this.records.get(execution.executionId);
    if (!record) throw new Error("Unknown payroll settlement execution.");
    if (record.state === "reconciled") return { executionId: execution.executionId, signatures: [] };
    if (record.state !== "prepared" && record.state !== "awaiting_signature") throw new Error(`Payroll settlement cannot submit from ${record.state}.`);
    record.state = "reconciled";
    record.submittedAt = new Date().toISOString();
    return { executionId: execution.executionId, signatures: [] };
  }

  async status(executionId: string): Promise<{ executionId: string; state: ExecutionState }> {
    const record = this.records.get(executionId);
    if (!record) throw new Error("Unknown payroll settlement execution.");
    return { executionId, state: record.state };
  }

  async receipt<TResult = unknown>(executionId: string): Promise<ExecutionReceipt<TResult>> {
    const record = this.records.get(executionId);
    if (!record) throw new Error("Unknown payroll settlement execution.");
    if (record.state !== "reconciled") throw new Error("Payroll settlement is not reconciled.");
    return {
      executionId,
      requestId: record.intent.context.requestId,
      capability: record.intent.context.capability,
      network: record.intent.context.network,
      provider: this.id,
      state: "reconciled",
      signatures: [],
      result: record.result as TResult,
      createdAt: record.submittedAt || record.preparedAt,
    };
  }
}

function parsePayload(value: unknown): PayrollSettlementPayload {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Payroll settlement payload must be an object.");
  const payload = value as Partial<PayrollSettlementPayload>;
  if (typeof payload.batchId !== "string" || payload.batchId.trim() === "" || typeof payload.policyHash !== "string" || payload.policyHash.trim() === "" || typeof payload.approved !== "boolean") {
    throw new Error("Payroll settlement requires batchId, policyHash, and approved.");
  }
  if (!Array.isArray(payload.recipients) || payload.recipients.length === 0) throw new Error("Payroll settlement requires recipients.");
  for (const recipient of payload.recipients) {
    if (!recipient || typeof recipient.commitment !== "string" || recipient.commitment.trim() === "" || !Number.isSafeInteger(recipient.netCents) || recipient.netCents < 0) {
      throw new Error("Payroll settlement recipient is invalid.");
    }
  }
  return payload as PayrollSettlementPayload;
}
