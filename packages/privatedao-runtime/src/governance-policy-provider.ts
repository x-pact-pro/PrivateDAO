import type {
  ExecutionIntent,
  ExecutionReceipt,
  ExecutionState,
  KernelProvider,
  PreparedExecution,
  ProviderId,
} from "./index.js";
import type { NetworkId } from "./index.js";

export interface GovernancePolicyPayload {
  proposalId: string;
  proposalHash: string;
  policyHash: string;
  requiredApprovals: number;
}

export interface GovernancePolicySignature {
  actorId: string;
  decision: "approve" | "reject";
  signature: string;
}

type GovernanceRecord = {
  intent: ExecutionIntent<GovernancePolicyPayload>;
  payload: GovernancePolicyPayload;
  state: ExecutionState;
  preparedAt: string;
  signature?: GovernancePolicySignature;
  submittedAt?: string;
};

/**
 * Zcash policy-only governance boundary. It verifies an authority decision and
 * emits an auditable receipt; it never signs, broadcasts, or settles on-chain.
 */
export class GovernancePolicyProvider implements KernelProvider {
  readonly id: ProviderId;
  readonly networks: readonly NetworkId[];
  private readonly records = new Map<string, GovernanceRecord>();

  constructor(network: NetworkId) {
    this.id = `privatedao-governance-policy-${network}`;
    this.networks = [network];
  }

  supports(capability: string): boolean {
    return capability === "governance.proposal.execute";
  }

  async prepare<TPayload, TUnsigned>(intent: ExecutionIntent<TPayload>): Promise<PreparedExecution<TUnsigned>> {
    if (!this.supports(intent.context.capability)) throw new Error("Governance policy provider does not support this capability.");
    const payload = parsePayload(intent.payload);
    const authority = intent.accounts.find((account) => account.role === "authority" && account.network === intent.context.network);
    if (!authority) throw new Error("Governance policy requires a network-matched authority account.");
    if (payload.requiredApprovals !== 1) throw new Error("Governance policy currently requires exactly one authority approval.");

    const executionId = `governance-policy-${intent.context.requestId}`;
    const preparedAt = new Date().toISOString();
    this.records.set(executionId, { intent: intent as ExecutionIntent<GovernancePolicyPayload>, payload, state: "awaiting_signature", preparedAt });
    return {
      executionId,
      intent,
      unsignedPayload: { proposalId: payload.proposalId, proposalHash: payload.proposalHash, policyHash: payload.policyHash } as TUnsigned,
      requiredSigners: [authority],
      state: "awaiting_signature",
    };
  }

  async submit<TUnsigned>(execution: PreparedExecution<TUnsigned>, signedPayload: TUnsigned): Promise<{ executionId: string; signatures: string[] }> {
    const record = this.records.get(execution.executionId);
    if (!record) throw new Error("Unknown governance policy execution.");
    if (record.state === "reconciled" && record.signature) return { executionId: execution.executionId, signatures: [record.signature.signature] };
    if (record.state !== "awaiting_signature") throw new Error(`Governance policy cannot submit from ${record.state}.`);
    const decision = parseSignature(signedPayload);
    const authority = execution.requiredSigners[0];
    if (!authority || decision.actorId !== authority.address) throw new Error("Governance signer does not match the authority account.");
    record.signature = decision;
    record.state = "reconciled";
    record.submittedAt = new Date().toISOString();
    return { executionId: execution.executionId, signatures: [decision.signature] };
  }

  async status(executionId: string): Promise<{ executionId: string; state: ExecutionState }> {
    const record = this.records.get(executionId);
    if (!record) throw new Error("Unknown governance policy execution.");
    return { executionId, state: record.state };
  }

  async receipt<TResult = unknown>(executionId: string): Promise<ExecutionReceipt<TResult>> {
    const record = this.records.get(executionId);
    if (!record || !record.signature) throw new Error("Governance policy is not reconciled.");
    return {
      executionId,
      requestId: record.intent.context.requestId,
      capability: record.intent.context.capability,
      network: record.intent.context.network,
      provider: this.id,
      state: "reconciled",
      signatures: [record.signature.signature],
      result: {
        proposalId: record.payload.proposalId,
        proposalHash: record.payload.proposalHash,
        policyHash: record.payload.policyHash,
        decision: record.signature.decision,
        onchainSettlement: false,
      } as TResult,
      createdAt: record.submittedAt || record.preparedAt,
    };
  }
}

function parsePayload(value: unknown): GovernancePolicyPayload {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Governance policy payload must be an object.");
  const payload = value as Partial<GovernancePolicyPayload>;
  if (typeof payload.proposalId !== "string" || payload.proposalId.length === 0) throw new Error("proposalId is required.");
  if (typeof payload.proposalHash !== "string" || payload.proposalHash.length === 0) throw new Error("proposalHash is required.");
  if (typeof payload.policyHash !== "string" || payload.policyHash.length === 0) throw new Error("policyHash is required.");
  const requiredApprovals = payload.requiredApprovals;
  if (typeof requiredApprovals !== "number" || !Number.isSafeInteger(requiredApprovals) || requiredApprovals < 1) throw new Error("requiredApprovals must be a positive integer.");
  return { proposalId: payload.proposalId, proposalHash: payload.proposalHash, policyHash: payload.policyHash, requiredApprovals };
}

function parseSignature<TUnsigned>(value: TUnsigned): GovernancePolicySignature {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Governance policy requires a signed payload.");
  const signature = value as Partial<GovernancePolicySignature>;
  if (typeof signature.actorId !== "string" || typeof signature.signature !== "string" || signature.signature.length === 0) throw new Error("Governance signed payload is incomplete.");
  if (signature.decision !== "approve" && signature.decision !== "reject") throw new Error("Governance decision must be approve or reject.");
  return { actorId: signature.actorId, decision: signature.decision, signature: signature.signature };
}
