import type {
  ExecutionIntent,
  ExecutionReceipt,
  ExecutionState,
  KernelProvider,
  PreparedExecution,
  ProviderId,
} from "./index.js";
import { buildKernelAuctionBidProof } from "./auction-proof-service.js";

export interface AuctionBidCommitPayload {
  config: Record<string, unknown>;
  privateBids: readonly Record<string, unknown>[];
  proofId?: string;
}

export interface AuctionBidCommitResult {
  ok: true;
  status: string;
  publicOutcome: string;
  proofHash: string;
  publicProofPackage: Record<string, unknown>;
  privateDataExcluded: true;
  explanation: string;
}

type BidExecution = {
  intent: ExecutionIntent<AuctionBidCommitPayload>;
  result: AuctionBidCommitResult;
  state: ExecutionState;
  preparedAt: string;
  submittedAt?: string;
};

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

const DEFAULT_ENDPOINT = "https://privatedao.org/api/auctions/sealed/run";

/** Kernel adapter for the real sealed-bid commitment/proof endpoint. */
export class AuctionBidCommitProvider implements KernelProvider {
  readonly id: ProviderId = "privatedao-auction-bid-commit";
  readonly networks = ["solana-devnet"] as const;
  private readonly records = new Map<string, BidExecution>();

  constructor(
    private readonly fetchImpl?: FetchLike,
    private readonly endpoint?: string,
  ) {
    if (endpoint && !endpoint.startsWith("https://")) throw new Error("Auction bid endpoint must use HTTPS.");
  }

  supports(capability: string): boolean {
    return capability === "auction.bid.commit";
  }

  async prepare<TPayload, TUnsigned>(intent: ExecutionIntent<TPayload>): Promise<PreparedExecution<TUnsigned>> {
    if (!this.supports(intent.context.capability)) throw new Error("Auction bid provider does not support this capability.");
    const payload = parsePayload(intent.payload);
    const result = this.endpoint && this.fetchImpl
      ? await this.fetchRemote(payload)
      : buildKernelAuctionBidProof(payload);
    const executionId = `auction-bid-commit-${intent.context.requestId}`;
    const preparedAt = new Date().toISOString();
    this.records.set(executionId, { intent: intent as ExecutionIntent<AuctionBidCommitPayload>, result, state: "prepared", preparedAt });
    return { executionId, intent, unsignedPayload: undefined as TUnsigned, requiredSigners: [], state: "prepared" };
  }

  private async fetchRemote(payload: AuctionBidCommitPayload): Promise<AuctionBidCommitResult> {
    const response = await this.fetchImpl!(this.endpoint!, {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error(`Auction bid service failed with HTTP ${response.status}.`);
    return parseResult(await response.json());
  }

  async submit<TUnsigned>(execution: PreparedExecution<TUnsigned>, _signedPayload: TUnsigned): Promise<{ executionId: string; signatures: string[] }> {
    const record = this.records.get(execution.executionId);
    if (!record) throw new Error("Unknown auction bid execution.");
    if (record.state === "reconciled") return { executionId: execution.executionId, signatures: [] };
    if (record.state !== "prepared" && record.state !== "awaiting_signature") throw new Error(`Auction bid cannot submit from ${record.state}.`);
    record.state = "reconciled";
    record.submittedAt = new Date().toISOString();
    return { executionId: execution.executionId, signatures: [] };
  }

  async status(executionId: string): Promise<{ executionId: string; state: ExecutionState }> {
    const record = this.records.get(executionId);
    if (!record) throw new Error("Unknown auction bid execution.");
    return { executionId, state: record.state };
  }

  async receipt<TResult = unknown>(executionId: string): Promise<ExecutionReceipt<TResult>> {
    const record = this.records.get(executionId);
    if (!record) throw new Error("Unknown auction bid execution.");
    if (record.state !== "reconciled") throw new Error("Auction bid is not reconciled.");
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

function parsePayload(value: unknown): AuctionBidCommitPayload {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Auction bid payload must be an object.");
  const payload = value as Partial<AuctionBidCommitPayload>;
  if (!payload.config || typeof payload.config !== "object" || Array.isArray(payload.config)) throw new Error("Auction config is required.");
  if (!Array.isArray(payload.privateBids) || payload.privateBids.length === 0) throw new Error("Private bids are required.");
  if (payload.proofId !== undefined && typeof payload.proofId !== "string") throw new Error("proofId must be a string.");
  return { config: payload.config as Record<string, unknown>, privateBids: payload.privateBids as readonly Record<string, unknown>[], proofId: payload.proofId };
}

function parseResult(value: unknown): AuctionBidCommitResult {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Auction bid response must be an object.");
  const result = value as Partial<AuctionBidCommitResult>;
  if (
    result.ok !== true ||
    typeof result.status !== "string" ||
    typeof result.publicOutcome !== "string" ||
    typeof result.proofHash !== "string" ||
    !/^[a-f0-9]{64}$/i.test(result.proofHash) ||
    !result.publicProofPackage ||
    typeof result.publicProofPackage !== "object" ||
    Array.isArray(result.publicProofPackage) ||
    result.privateDataExcluded !== true ||
    typeof result.explanation !== "string"
  ) throw new Error("Auction bid response is not a valid public proof package.");
  return result as AuctionBidCommitResult;
}
