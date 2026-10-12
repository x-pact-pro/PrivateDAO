import type {
  ExecutionIntent,
  ExecutionReceipt,
  ExecutionState,
  KernelProvider,
  PreparedExecution,
  ProviderId,
} from "./index.js";

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export type SolanaBrowserExecutionPayload = {
  kind: "solana-browser-transaction";
  operation: "governance.proposal.execute";
  account: string;
  programId: string;
};

export type SolanaBrowserSignedPayload = {
  kind: "browser-solana-transaction";
  signature: string;
};

type RecordState = {
  intent: ExecutionIntent<SolanaBrowserExecutionPayload>;
  prepared: PreparedExecution<SolanaBrowserExecutionPayload>;
  state: ExecutionState;
  signature?: string;
  receipt?: ExecutionReceipt;
};

const GOVERNANCE_PROGRAM_ID = "EP9xE8MJZ6FfyEwLqns6HDdUZBknEa7WGYs1Jzsecuva";
const DEFAULT_RPC_URL = "https://api.devnet.solana.com";

/**
 * Kernel boundary for browser-signed Solana Devnet transactions.
 * The server never receives a key and never broadcasts on behalf of the user.
 */
export class SolanaBrowserExecutionProvider implements KernelProvider {
  readonly id: ProviderId = "privatedao-solana-browser-devnet";
  readonly networks = ["solana-devnet"] as const;
  private readonly records = new Map<string, RecordState>();
  private readonly idempotency = new Map<string, string>();

  constructor(
    private readonly fetchImpl: FetchLike = fetch,
    private readonly rpcUrl = process.env.PDAO_SOLANA_DEVNET_RPC_URL?.trim() || DEFAULT_RPC_URL,
  ) {}

  supports(capability: string): boolean {
    return capability === "governance.proposal.execute";
  }

  async prepare<TPayload, TUnsigned>(intent: ExecutionIntent<TPayload>): Promise<PreparedExecution<TUnsigned>> {
    if (intent.context.network !== "solana-devnet") throw new Error("Solana browser provider is Devnet-only.");
    if (!this.supports(intent.context.capability)) throw new Error("Solana browser provider does not support this capability.");
    const payload = parsePayload(intent.payload);
    const existingId = this.idempotency.get(intent.context.idempotencyKey);
    if (existingId) {
      const existing = this.records.get(existingId);
      if (!existing) throw new Error("Solana execution idempotency record is missing.");
      return existing.prepared as PreparedExecution<TUnsigned>;
    }
    const executionId = `solana-browser-${intent.context.requestId}`;
    const prepared: PreparedExecution<SolanaBrowserExecutionPayload> = {
      executionId,
      intent: intent as ExecutionIntent<SolanaBrowserExecutionPayload>,
      unsignedPayload: payload,
      requiredSigners: [{ role: "payer", address: payload.account, network: "solana-devnet" }],
      state: "awaiting_signature",
      signingMode: "browser",
    };
    this.records.set(executionId, { intent: prepared.intent as ExecutionIntent<SolanaBrowserExecutionPayload>, prepared, state: prepared.state });
    this.idempotency.set(intent.context.idempotencyKey, executionId);
    return prepared as PreparedExecution<TUnsigned>;
  }

  async submit<TUnsigned>(execution: PreparedExecution<TUnsigned>, signedPayload: TUnsigned): Promise<{ executionId: string; signatures: string[] }> {
    const record = this.records.get(execution.executionId);
    if (!record) throw new Error("Unknown Solana browser execution.");
    if (record.signature) return { executionId: execution.executionId, signatures: [record.signature] };
    if (record.state !== "awaiting_signature" && record.state !== "prepared") throw new Error(`Cannot submit Solana execution from ${record.state}.`);
    const signed = parseSignedPayload(signedPayload);
    record.signature = signed.signature;
    record.state = "submitted";
    return { executionId: execution.executionId, signatures: [signed.signature] };
  }

  async status(executionId: string): Promise<{ executionId: string; state: ExecutionState; errorCode?: string }> {
    const record = this.records.get(executionId);
    if (!record) throw new Error("Unknown Solana browser execution.");
    if (record.signature && record.state === "submitted") {
      try {
        await this.receipt(executionId);
      } catch {
        // A submitted transaction may still be waiting for confirmation.
      }
    }
    return { executionId, state: record.state };
  }

  async receipt<TResult = unknown>(executionId: string): Promise<ExecutionReceipt<TResult>> {
    const record = this.records.get(executionId);
    if (!record?.signature) throw new Error("Solana browser execution has not been submitted.");
    if (record.receipt) return record.receipt as ExecutionReceipt<TResult>;
    const transaction = await this.rpc("getTransaction", [record.signature, { commitment: "confirmed", maxSupportedTransactionVersion: 0 }]);
    if (!transaction) throw new Error("Solana transaction is not confirmed yet.");
    if (transaction.meta?.err) {
      record.state = "failed";
      throw new Error(`Solana transaction failed: ${record.signature}`);
    }
    const accountKeys = Array.isArray(transaction.transaction?.message?.accountKeys) ? transaction.transaction.message.accountKeys : [];
    if (!accountKeys.includes(GOVERNANCE_PROGRAM_ID)) throw new Error("Solana receipt does not reference the PrivateDAO governance program.");
    record.state = "confirmed";
    record.receipt = {
      executionId,
      requestId: record.intent.context.requestId,
      capability: record.intent.context.capability,
      network: "solana-devnet",
      provider: this.id,
      state: "confirmed",
      signatures: [record.signature],
      createdAt: new Date().toISOString(),
      environment: "devnet",
      asset: "SOL",
      contract: GOVERNANCE_PROGRAM_ID,
      blockNumber: typeof transaction.slot === "number" ? String(transaction.slot) : undefined,
      explorerUrl: `https://solscan.io/tx/${encodeURIComponent(record.signature)}?cluster=devnet`,
      result: { confirmed: true, slot: transaction.slot } as TResult,
    };
    return record.receipt as ExecutionReceipt<TResult>;
  }

  private async rpc(method: string, params: unknown[]): Promise<any> {
    const response = await this.fetchImpl(this.rpcUrl, {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    });
    if (!response.ok) throw new Error(`Solana RPC returned HTTP ${response.status}.`);
    const body = await response.json() as { error?: { message?: string }; result?: unknown };
    if (body.error) throw new Error(body.error.message || "Solana RPC request failed.");
    return body.result;
  }
}

function parsePayload(value: unknown): SolanaBrowserExecutionPayload {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Solana browser payload must be an object.");
  const payload = value as Partial<SolanaBrowserExecutionPayload>;
  if (payload.kind !== "solana-browser-transaction" || payload.operation !== "governance.proposal.execute" || typeof payload.account !== "string" || typeof payload.programId !== "string") {
    throw new Error("Solana browser execution requires a governance operation, wallet account, and program ID.");
  }
  if (payload.programId !== GOVERNANCE_PROGRAM_ID) throw new Error("Solana execution targets an unapproved program.");
  return payload as SolanaBrowserExecutionPayload;
}

function parseSignedPayload(value: unknown): SolanaBrowserSignedPayload {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Solana wallet submission is required.");
  const payload = value as Partial<SolanaBrowserSignedPayload>;
  if (payload.kind !== "browser-solana-transaction" || typeof payload.signature !== "string" || !/^[1-9A-HJ-NP-Za-km-z]{32,100}$/.test(payload.signature)) {
    throw new Error("Solana wallet submission must contain a valid transaction signature.");
  }
  return payload as SolanaBrowserSignedPayload;
}
