import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import type {
  ExecutionIntent,
  ExecutionReceipt,
  ExecutionState,
  PreparedExecution,
} from "./index.js";
import type { FeeEstimate } from "./protocol.js";
import type { ZcashTransport } from "./zcash-network.js";

export interface ZcashRecipient {
  address: string;
  atomicAmount: string;
}

export interface ZcashSendPayload {
  kind: "zallet-send";
  fromAddress: string;
  recipients: readonly ZcashRecipient[];
  minConfirmations?: number;
  privacyPolicy?: string;
}

export interface ZalletCliTransportOptions {
  binaryPath: string;
  dataDirectory: string;
  configPath: string;
  network: "zcash-testnet";
  explorerBaseUrl: string;
  commandTimeoutMs?: number;
  pollIntervalMs?: number;
  confirmationDepth?: number;
  allowBalanceReadinessProbe?: boolean;
  broadcastEnabled?: boolean;
}

type OperationRecord = {
  execution: PreparedExecution<ZcashSendPayload>;
  state: ExecutionState;
  operationId?: string;
  signature?: string;
  errorCode?: string;
  receipt?: ExecutionReceipt;
};

type ZalletOperation = {
  id?: string;
  status?: string;
  result?: { txid?: string } | string;
  error?: { code?: string; message?: string };
};

/**
 * Real Zcash Testnet transport backed by the local Zallet binary.
 *
 * Zallet owns key material and performs signing/broadcasting internally. The
 * product runtime only passes public transaction intent to this boundary; no
 * spending key or viewing key is loaded by the application process.
 */
export class ZalletCliTransport implements ZcashTransport {
  private readonly executions = new Map<string, OperationRecord>();
  private readonly idempotency = new Map<string, string>();
  private readonly timeoutMs: number;
  private readonly pollMs: number;
  private readonly confirmations: number;

  constructor(private readonly options: ZalletCliTransportOptions) {
    this.timeoutMs = options.commandTimeoutMs ?? 20_000;
    this.pollMs = options.pollIntervalMs ?? 2_000;
    this.confirmations = options.confirmationDepth ?? 1;
  }

  async health(): Promise<{ ok: boolean; network: "zcash-testnet"; latencyMs?: number }> {
    const started = Date.now();
    const [wallet, status] = await Promise.all([
      this.rpc<Record<string, unknown>>("getwalletinfo"),
      this.rpc<{ node_tip?: { height?: number }; wallet_tip?: { height?: number }; fully_synced_height?: number }>("getwalletstatus"),
    ]);
    const nodeHeight = Number(status.node_tip?.height ?? -1);
    const walletHeight = Number(status.wallet_tip?.height ?? -1);
    const fullySyncedHeight = Number(status.fully_synced_height ?? -1);
    const locked = wallet["locked"] === true;
    // Zallet's live RPC may omit wallet_tip/fully_synced_height while its
    // wallet index is catching up. A successful balance query is its stable
    // spend-readiness signal; keep the richer height check for providers
    // that expose it.
    let syncedToNode = nodeHeight >= 0 && walletHeight >= nodeHeight;
    if (status.wallet_tip?.height === undefined || status.fully_synced_height === undefined) {
      if (!this.options.allowBalanceReadinessProbe) return { ok: false, network: "zcash-testnet", latencyMs: Date.now() - started };
      try {
        await this.rpc("z_gettotalbalance");
        syncedToNode = nodeHeight >= 0;
      } catch {
        syncedToNode = false;
      }
    }
    const heightReady = status.wallet_tip?.height === undefined || status.fully_synced_height === undefined
      ? true
      : walletHeight >= fullySyncedHeight;
    const ok = syncedToNode && heightReady && !locked;
    return { ok, network: "zcash-testnet", latencyMs: Date.now() - started };
  }

  async prepare<TPayload, TUnsigned>(intent: ExecutionIntent<TPayload>): Promise<PreparedExecution<TUnsigned>> {
    const payload = parsePayload(intent.payload);
    const existingId = this.idempotency.get(intent.context.idempotencyKey);
    if (existingId) {
      const existing = this.executions.get(existingId);
      if (!existing) throw new Error("Zallet idempotency index points to a missing execution.");
      return existing.execution as PreparedExecution<TUnsigned>;
    }

    const executionId = `zcash-${intent.context.requestId || randomUUID()}`;
    const prepared: PreparedExecution<ZcashSendPayload> = {
      executionId,
      intent: intent as ExecutionIntent<ZcashSendPayload>,
      unsignedPayload: payload,
      requiredSigners: [{ role: "payer", address: payload.fromAddress, network: "zcash-testnet" }],
      state: "awaiting_signature",
    };
    this.executions.set(executionId, { execution: prepared, state: "awaiting_signature" });
    this.idempotency.set(intent.context.idempotencyKey, executionId);
    return prepared as PreparedExecution<TUnsigned>;
  }

  async submit<TUnsigned>(execution: PreparedExecution<TUnsigned>, _signedPayload: TUnsigned): Promise<{ executionId: string; signatures: string[] }> {
    const record = this.executions.get(execution.executionId);
    if (!record) throw new Error("Unknown Zallet execution.");
    if (record.signature) return { executionId: execution.executionId, signatures: [record.signature] };
    if (record.state !== "awaiting_signature" && record.state !== "prepared") {
      throw new Error(`Cannot submit Zallet execution from ${record.state}.`);
    }

    const payload = record.execution.unsignedPayload;
    const amounts = payload.recipients.map((recipient) => ({
      address: recipient.address,
      amount: atomicToZec(recipient.atomicAmount),
    }));
    if (!this.options.broadcastEnabled) {
      record.state = "failed";
      record.errorCode = "ZCASH_BROADCAST_DISABLED";
      throw new Error("Zcash broadcast is disabled. Set broadcastEnabled only for an explicitly approved Testnet E2E send.");
    }
    const result = await this.rpc<unknown>("z_sendmany", [
      payload.fromAddress,
      amounts,
      payload.minConfirmations ?? 1,
      null,
      payload.privacyPolicy ?? "FullPrivacy",
    ]);
    const operationId = operationIdFrom(result);
    record.operationId = operationId;
    record.state = "submitted";

    const txid = await this.waitForOperation(operationId, record);
    record.signature = txid;
    record.state = "confirmed";
    return { executionId: execution.executionId, signatures: [txid] };
  }

  async status(executionId: string): Promise<{ executionId: string; state: ExecutionState; errorCode?: string }> {
    const record = this.executions.get(executionId);
    if (!record) throw new Error("Unknown Zallet execution.");
    return { executionId, state: record.state, ...(record.errorCode ? { errorCode: record.errorCode } : {}) };
  }

  async receipt<TResult = unknown>(executionId: string): Promise<ExecutionReceipt<TResult>> {
    const record = this.executions.get(executionId);
    if (!record?.signature) throw new Error("Zallet execution has not produced a transaction id.");
    if (record.receipt) return record.receipt as ExecutionReceipt<TResult>;

    const tx = await this.rpc<{ confirmations?: number; height?: number }>("getrawtransaction", [record.signature, 1]);
    const confirmations = Number(tx.confirmations ?? 0);
    if (confirmations < this.confirmations) {
      throw new Error(`Zcash transaction is not sufficiently confirmed: ${confirmations}/${this.confirmations}`);
    }
    record.state = confirmations >= this.confirmations ? "finalized" : "confirmed";
    record.receipt = {
      executionId,
      requestId: record.execution.intent.context.requestId,
      capability: record.execution.intent.context.capability,
      network: "zcash-testnet",
      provider: "privatedao-zallet-testnet",
      state: "finalized",
      signatures: [record.signature],
      createdAt: new Date().toISOString(),
      environment: "testnet",
      asset: "TAZ",
      blockNumber: tx.height === undefined ? undefined : String(tx.height),
      explorerUrl: `${this.options.explorerBaseUrl.replace(/\/$/, "")}/tx/${record.signature}`,
      result: { confirmations } as TResult,
    };
    return record.receipt as ExecutionReceipt<TResult>;
  }

  async estimateFee<TPayload>(_intent: ExecutionIntent<TPayload>): Promise<FeeEstimate> {
    return { network: "zcash-testnet", atomicAmount: "10000", asset: "TAZ" };
  }

  private async waitForOperation(operationId: string, record: OperationRecord): Promise<string> {
    const deadline = Date.now() + this.timeoutMs;
    while (Date.now() < deadline) {
      const entries = await this.rpc<ZalletOperation[]>("z_getoperationstatus", [[operationId]]);
      const operation = entries[0];
      if (operation?.error) {
        record.state = "failed";
        record.errorCode = operation.error.code ?? "ZALLET_OPERATION_FAILED";
        throw new Error(operation.error.message ?? "Zallet operation failed.");
      }
      const txid = typeof operation?.result === "string" ? operation.result : operation?.result?.txid;
      if (txid) return txid;
      await delay(this.pollMs);
    }
    record.state = "failed";
    record.errorCode = "ZALLET_OPERATION_TIMEOUT";
    throw new Error("Timed out waiting for Zallet operation result.");
  }

  private async rpc<TResult>(method: string, params: readonly unknown[] = []): Promise<TResult> {
    const output = await runZallet(this.options, method, params, this.timeoutMs);
    if (output.error) throw new Error(output.error.message ?? `Zallet RPC failed: ${method}`);
    return output.result as TResult;
  }
}

function parsePayload(value: unknown): ZcashSendPayload {
  if (!value || typeof value !== "object") throw new Error("Zcash payload must be an object.");
  const payload = value as Partial<ZcashSendPayload>;
  if (payload.kind !== "zallet-send" || typeof payload.fromAddress !== "string" || !Array.isArray(payload.recipients) || payload.recipients.length === 0) {
    throw new Error("Zcash payload must contain a source and at least one recipient.");
  }
  for (const recipient of payload.recipients) {
    if (!recipient || typeof recipient.address !== "string" || !/^\d+$/.test(recipient.atomicAmount)) {
      throw new Error("Zcash recipients must contain a valid address and atomic amount.");
    }
  }
  return payload as ZcashSendPayload;
}

function atomicToZec(value: string): number {
  const atomic = BigInt(value);
  if (atomic <= 0n) throw new Error("Zcash amount must be positive.");
  const whole = atomic / 100_000_000n;
  const fraction = (atomic % 100_000_000n).toString().padStart(8, "0");
  return Number(`${whole}.${fraction}`);
}

function operationIdFrom(value: unknown): string {
  if (typeof value === "string" && value.length > 0) return value;
  if (value && typeof value === "object" && typeof (value as { operationid?: unknown }).operationid === "string") return (value as { operationid: string }).operationid;
  throw new Error("Zallet did not return an operation id.");
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function runZallet(options: ZalletCliTransportOptions, method: string, params: readonly unknown[], timeoutMs: number): Promise<{ result?: unknown; error?: { code?: string; message?: string } }> {
  return new Promise((resolve, reject) => {
    const child = spawn(options.binaryPath, [
      "-d", options.dataDirectory,
      "-c", options.configPath,
      "rpc", method,
      ...params.map((param) => JSON.stringify(param)),
    ], { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error(`Zallet RPC timeout: ${method}`));
    }, timeoutMs);
    child.stdout.on("data", (chunk: Buffer) => { stdout += chunk.toString(); });
    child.stderr.on("data", (chunk: Buffer) => { stderr += chunk.toString(); });
    child.once("error", (error) => { clearTimeout(timer); reject(error); });
    child.once("close", (code) => {
      clearTimeout(timer);
      if (code !== 0) {
        reject(new Error(`Zallet RPC ${method} failed${stderr.trim() ? `: ${stderr.trim().slice(-400)}` : ""}`));
        return;
      }
      try {
        const parsed = JSON.parse(stdout) as { result?: unknown; error?: unknown };
        // The zallet CLI prints the RPC result directly, unlike its HTTP
        // JSON-RPC endpoint. Normalize both shapes at this boundary.
        if (parsed && typeof parsed === "object" && ("result" in parsed || "error" in parsed)) {
          resolve(parsed as { result?: unknown; error?: { code?: string; message?: string } });
        } else {
          resolve({ result: parsed });
        }
      } catch {
        reject(new Error(`Zallet RPC ${method} returned invalid JSON.`));
      }
    });
  });
}
