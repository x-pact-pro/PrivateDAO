import { createHash } from "node:crypto";
import type {
  ExecutionIntent,
  ExecutionReceipt,
  ExecutionState,
  KernelProvider,
  PreparedExecution,
  ProviderId,
} from "./index.js";

export interface GovernanceProposalPayload {
  proposalId: string;
  actionDigest: string;
  votesFor: number;
  votesAgainst: number;
  quorum: number;
  policyVersion: string;
}

export interface GovernanceProposalResult {
  passed: boolean;
  proposalDigest: string;
  tally: { votesFor: number; votesAgainst: number; quorum: number };
  policyVersion: string;
  privateDataExcluded: true;
  onchainAnchor: false;
}

type ProposalExecution = {
  intent: ExecutionIntent<GovernanceProposalPayload>;
  result: GovernanceProposalResult;
  state: ExecutionState;
  preparedAt: string;
  submittedAt?: string;
};

/** Kernel-native governance policy evaluation without pretending to be an onchain receipt. */
export class GovernanceProposalProvider implements KernelProvider {
  readonly id: ProviderId = "privatedao-governance-proposal";
  readonly networks = ["solana-devnet"] as const;
  private readonly records = new Map<string, ProposalExecution>();

  supports(capability: string): boolean {
    return capability === "governance.proposal.execute";
  }

  async prepare<TPayload, TUnsigned>(intent: ExecutionIntent<TPayload>): Promise<PreparedExecution<TUnsigned>> {
    if (!this.supports(intent.context.capability)) throw new Error("Governance provider does not support this capability.");
    const payload = parsePayload(intent.payload);
    const proposalDigest = createHash("sha256")
      .update(JSON.stringify({ ...payload, proposalId: payload.proposalId, actionDigest: payload.actionDigest }))
      .digest("hex");
    const result: GovernanceProposalResult = {
      passed: payload.votesFor >= payload.quorum && payload.votesFor > payload.votesAgainst,
      proposalDigest,
      tally: { votesFor: payload.votesFor, votesAgainst: payload.votesAgainst, quorum: payload.quorum },
      policyVersion: payload.policyVersion,
      privateDataExcluded: true,
      onchainAnchor: false,
    };
    const executionId = `governance-proposal-${intent.context.requestId}`;
    const preparedAt = new Date().toISOString();
    this.records.set(executionId, { intent: intent as ExecutionIntent<GovernanceProposalPayload>, result, state: "prepared", preparedAt });
    return { executionId, intent, unsignedPayload: undefined as TUnsigned, requiredSigners: [], state: "prepared" };
  }

  async submit<TUnsigned>(execution: PreparedExecution<TUnsigned>, _signedPayload: TUnsigned): Promise<{ executionId: string; signatures: string[] }> {
    const record = this.records.get(execution.executionId);
    if (!record) throw new Error("Unknown governance proposal execution.");
    if (record.state === "reconciled") return { executionId: execution.executionId, signatures: [] };
    if (record.state !== "prepared" && record.state !== "awaiting_signature") throw new Error(`Governance proposal cannot submit from ${record.state}.`);
    record.state = "reconciled";
    record.submittedAt = new Date().toISOString();
    return { executionId: execution.executionId, signatures: [] };
  }

  async status(executionId: string): Promise<{ executionId: string; state: ExecutionState }> {
    const record = this.records.get(executionId);
    if (!record) throw new Error("Unknown governance proposal execution.");
    return { executionId, state: record.state };
  }

  async receipt<TResult = unknown>(executionId: string): Promise<ExecutionReceipt<TResult>> {
    const record = this.records.get(executionId);
    if (!record) throw new Error("Unknown governance proposal execution.");
    if (record.state !== "reconciled") throw new Error("Governance proposal is not reconciled.");
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

function parsePayload(value: unknown): GovernanceProposalPayload {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Governance proposal payload must be an object.");
  const payload = value as Partial<GovernanceProposalPayload>;
  for (const field of ["proposalId", "actionDigest", "policyVersion"] as const) {
    if (typeof payload[field] !== "string" || payload[field].trim() === "") throw new Error(`${field} is required.`);
  }
  for (const field of ["votesFor", "votesAgainst", "quorum"] as const) {
    if (typeof payload[field] !== "number" || !Number.isSafeInteger(payload[field]) || payload[field] < 0) throw new Error(`${field} must be a non-negative integer.`);
  }
  return payload as GovernanceProposalPayload;
}
