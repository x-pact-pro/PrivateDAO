import type {
  ExecutionIntent,
  ExecutionReceipt,
  ExecutionState,
  KernelProvider,
  PreparedExecution,
  ProviderId,
} from "./index.js";
import { buildKernelAuctionOutcomeProof } from "./auction-proof-service.js";

export interface AuctionOutcomeProofPayload {
  metadata: Record<string, unknown>;
  bids: readonly Record<string, unknown>[];
}

export interface AuctionOutcomeProofResult {
  ok: true;
  proofType: string;
  publicSignals: readonly string[];
  proof: Record<string, unknown>;
  privateDataExcluded: true;
  binding: string;
}

type ProofExecution = {
  intent: ExecutionIntent<AuctionOutcomeProofPayload>;
  result: AuctionOutcomeProofResult;
  state: ExecutionState;
  preparedAt: string;
  submittedAt?: string;
};

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

const DEFAULT_ENDPOINT = "https://privatedao.org/api/auctions/sealed/outcome-proof";

/**
 * Kernel adapter for the real sealed-auction outcome-proof endpoint.
 * It proves an already-bound result; it does not claim token movement or an
 * on-chain signature.
 */
export class AuctionOutcomeProofProvider implements KernelProvider {
  readonly id: ProviderId = "privatedao-auction-outcome-proof";
  readonly networks = ["solana-devnet"] as const;
  private readonly records = new Map<string, ProofExecution>();

  constructor(
    private readonly fetchImpl?: FetchLike,
    private readonly endpoint?: string,
  ) {
    if (endpoint && !endpoint.startsWith("https://")) throw new Error("Auction proof endpoint must use HTTPS.");
  }

  supports(capability: string): boolean {
    return capability === "auction.settle";
  }

  async prepare<TPayload, TUnsigned>(intent: ExecutionIntent<TPayload>): Promise<PreparedExecution<TUnsigned>> {
    if (!this.supports(intent.context.capability)) throw new Error("Auction outcome provider does not support this capability.");
    const payload = parsePayload(intent.payload);
    const result = this.endpoint && this.fetchImpl
      ? await this.fetchRemote(payload)
      : buildKernelAuctionOutcomeProof(payload);
    const executionId = `auction-outcome-proof-${intent.context.requestId}`;
    const preparedAt = new Date().toISOString();
    this.records.set(executionId, { intent: intent as ExecutionIntent<AuctionOutcomeProofPayload>, result, state: "prepared", preparedAt });
    return { executionId, intent, unsignedPayload: undefined as TUnsigned, requiredSigners: [], state: "prepared" };
  }

  private async fetchRemote(payload: AuctionOutcomeProofPayload): Promise<AuctionOutcomeProofResult> {
    const response = await this.fetchImpl!(this.endpoint!, {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error(`Auction outcome proof service failed with HTTP ${response.status}.`);
    return parseResult(await response.json());
  }

  async submit<TUnsigned>(execution: PreparedExecution<TUnsigned>, _signedPayload: TUnsigned): Promise<{ executionId: string; signatures: string[] }> {
    const record = this.records.get(execution.executionId);
    if (!record) throw new Error("Unknown auction outcome proof execution.");
    if (record.state === "reconciled") return { executionId: execution.executionId, signatures: [] };
    if (record.state !== "prepared" && record.state !== "awaiting_signature") throw new Error(`Auction outcome proof cannot submit from ${record.state}.`);
    record.state = "reconciled";
    record.submittedAt = new Date().toISOString();
    return { executionId: execution.executionId, signatures: [] };
  }

  async status(executionId: string): Promise<{ executionId: string; state: ExecutionState }> {
    const record = this.records.get(executionId);
    if (!record) throw new Error("Unknown auction outcome proof execution.");
    return { executionId, state: record.state };
  }

  async receipt<TResult = unknown>(executionId: string): Promise<ExecutionReceipt<TResult>> {
    const record = this.records.get(executionId);
    if (!record) throw new Error("Unknown auction outcome proof execution.");
    if (record.state !== "reconciled") throw new Error("Auction outcome proof is not reconciled.");
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

function parsePayload(value: unknown): AuctionOutcomeProofPayload {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Auction outcome payload must be an object.");
  const payload = value as Partial<AuctionOutcomeProofPayload>;
  if (!payload.metadata || typeof payload.metadata !== "object" || Array.isArray(payload.metadata)) throw new Error("Auction outcome metadata is required.");
  if (!Array.isArray(payload.bids) || payload.bids.length === 0) throw new Error("Auction outcome bids are required.");
  return { metadata: payload.metadata as Record<string, unknown>, bids: payload.bids as readonly Record<string, unknown>[] };
}

function parseResult(value: unknown): AuctionOutcomeProofResult {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Auction outcome response must be an object.");
  const result = value as Partial<AuctionOutcomeProofResult>;
  if (
    result.ok !== true ||
    typeof result.proofType !== "string" ||
    !Array.isArray(result.publicSignals) ||
    !result.proof ||
    typeof result.proof !== "object" ||
    Array.isArray(result.proof) ||
    result.privateDataExcluded !== true ||
    typeof result.binding !== "string"
  ) throw new Error("Auction outcome response is not a valid public proof package.");
  return result as AuctionOutcomeProofResult;
}
