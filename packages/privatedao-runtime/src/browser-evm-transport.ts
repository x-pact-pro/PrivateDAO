import type {
  ExecutionIntent,
  ExecutionReceipt,
  ExecutionState,
  PreparedExecution,
} from "./index.js";
import type { FeeEstimate } from "./protocol.js";
import type { EvmTransport } from "./evm-network.js";

export type BrowserEvmSignedPayload = {
  kind: "browser-evm-transaction";
  hash: `0x${string}`;
};

type BrowserEvmPublicClient = {
  getChainId(): Promise<number>;
  waitForTransactionReceipt(input: { hash: `0x${string}`; timeout?: number }): Promise<{ status: "success" | "reverted"; blockNumber: bigint }>;
  estimateContractGas(input: Record<string, unknown>): Promise<bigint>;
  getGasPrice(): Promise<bigint>;
};

type BrowserExecution = {
  intent: ExecutionIntent<BrowserEvmContractWritePayload>;
  prepared: PreparedExecution<BrowserEvmContractWritePayload>;
  state: ExecutionState;
  signature?: `0x${string}`;
  receipt?: ExecutionReceipt;
};

export type BrowserEvmContractWritePayload = {
  kind: "contract-write";
  address: `0x${string}`;
  abi: readonly unknown[];
  functionName: string;
  args: readonly unknown[];
  account: `0x${string}`;
  value?: bigint;
};

const RECEIPT_TIMEOUT_MS = Number(process.env.PRIVATEDAO_EVM_RECEIPT_TIMEOUT_MS || 120_000);

/**
 * EVM testnet transport for browser-wallet signing.
 *
 * The server prepares the intent and verifies the receipt, while the browser
 * wallet performs the only signing/broadcast step. No private key is needed
 * by the Kernel gateway.
 */
export class BrowserEvmTransport implements EvmTransport {
  private readonly executions = new Map<string, BrowserExecution>();
  private readonly idempotency = new Map<string, string>();

  constructor(
    private readonly publicClient: BrowserEvmPublicClient,
    private readonly network: string,
    private readonly chainId: string,
    private readonly explorerBaseUrl: string,
    private readonly nativeAsset: string,
  ) {}

  async health(): Promise<{ ok: boolean; chainId: string; latencyMs?: number }> {
    const started = Date.now();
    const observed = await this.publicClient.getChainId();
    return { ok: String(observed) === this.chainId, chainId: String(observed), latencyMs: Date.now() - started };
  }

  async prepare<TPayload, TUnsigned>(intent: ExecutionIntent<TPayload>): Promise<PreparedExecution<TUnsigned>> {
    const payload = parsePayload(intent.payload);
    const previous = this.idempotency.get(intent.context.idempotencyKey);
    if (previous) {
      const record = this.executions.get(previous);
      if (!record) throw new Error("Idempotency index points to a missing browser EVM execution.");
      return record.prepared as PreparedExecution<TUnsigned>;
    }

    const executionId = `evm-browser-${intent.context.requestId}`;
    const prepared: PreparedExecution<BrowserEvmContractWritePayload> = {
      executionId,
      intent: intent as ExecutionIntent<BrowserEvmContractWritePayload>,
      unsignedPayload: payload,
      requiredSigners: [{ role: "payer", address: payload.account, network: this.network }],
      state: "awaiting_signature",
      signingMode: "browser",
    };
    this.executions.set(executionId, { intent: prepared.intent as ExecutionIntent<BrowserEvmContractWritePayload>, prepared, state: prepared.state });
    this.idempotency.set(intent.context.idempotencyKey, executionId);
    return prepared as PreparedExecution<TUnsigned>;
  }

  async submit<TUnsigned>(execution: PreparedExecution<TUnsigned>, signedPayload: TUnsigned): Promise<{ executionId: string; signatures: string[] }> {
    const record = this.executions.get(execution.executionId);
    if (!record) throw new Error("Unknown browser EVM execution.");
    if (record.signature) return { executionId: execution.executionId, signatures: [record.signature] };
    if (record.state !== "awaiting_signature" && record.state !== "prepared") throw new Error(`Cannot submit browser EVM execution from ${record.state}.`);
    const signed = parseSignedPayload(signedPayload);
    record.signature = signed.hash;
    record.state = "submitted";
    return { executionId: execution.executionId, signatures: [signed.hash] };
  }

  async status(executionId: string): Promise<{ executionId: string; state: ExecutionState; errorCode?: string }> {
    const record = this.executions.get(executionId);
    if (!record) throw new Error("Unknown browser EVM execution.");
    if (record.signature && record.state === "submitted") await this.receipt(executionId);
    return { executionId, state: record.state };
  }

  async receipt<TResult = unknown>(executionId: string): Promise<ExecutionReceipt<TResult>> {
    const record = this.executions.get(executionId);
    if (!record?.signature) throw new Error("Browser EVM execution has not been submitted.");
    if (record.receipt) return record.receipt as ExecutionReceipt<TResult>;
    const chainReceipt = await this.publicClient.waitForTransactionReceipt({ hash: record.signature, timeout: RECEIPT_TIMEOUT_MS });
    if (chainReceipt.status !== "success") {
      record.state = "failed";
      throw new Error(`EVM transaction reverted: ${record.signature}`);
    }
    record.state = "confirmed";
    record.receipt = {
      executionId,
      requestId: record.intent.context.requestId,
      capability: record.intent.context.capability,
      network: this.network,
      provider: "privatedao-browser-evm",
      state: "confirmed",
      signatures: [record.signature],
      createdAt: new Date().toISOString(),
      environment: "testnet",
      chainId: this.chainId,
      asset: this.nativeAsset,
      contract: record.prepared.unsignedPayload.address,
      blockNumber: chainReceipt.blockNumber.toString(),
      explorerUrl: `${this.explorerBaseUrl.replace(/\/$/, "")}/tx/${record.signature}`,
    };
    return record.receipt as ExecutionReceipt<TResult>;
  }

  async estimateFee<TPayload>(intent: ExecutionIntent<TPayload>): Promise<FeeEstimate> {
    const payload = parsePayload(intent.payload);
    const gas = await this.publicClient.estimateContractGas({ address: payload.address, abi: payload.abi, functionName: payload.functionName, args: payload.args, account: payload.account });
    const price = await this.publicClient.getGasPrice();
    return { network: this.network, atomicAmount: (gas * price).toString(), asset: this.nativeAsset };
  }
}

function parsePayload(value: unknown): BrowserEvmContractWritePayload {
  if (!value || typeof value !== "object") throw new Error("EVM execution payload must be an object.");
  const payload = value as Partial<BrowserEvmContractWritePayload>;
  if (payload.kind !== "contract-write" || typeof payload.address !== "string" || !Array.isArray(payload.abi) || typeof payload.functionName !== "string" || !Array.isArray(payload.args) || typeof payload.account !== "string") {
    throw new Error("Browser EVM execution requires a contract-write payload and a connected wallet account.");
  }
  return payload as BrowserEvmContractWritePayload;
}

function parseSignedPayload(value: unknown): BrowserEvmSignedPayload {
  if (!value || typeof value !== "object") throw new Error("Browser wallet submission is required.");
  const payload = value as Partial<BrowserEvmSignedPayload>;
  if (payload.kind !== "browser-evm-transaction" || typeof payload.hash !== "string" || !/^0x[0-9a-fA-F]{64}$/.test(payload.hash)) {
    throw new Error("Browser wallet submission must contain a valid transaction hash.");
  }
  return payload as BrowserEvmSignedPayload;
}
