import type {
  ExecutionIntent,
  ExecutionReceipt,
  ExecutionState,
  PreparedExecution,
} from "./index.js";
import type { FeeEstimate } from "./protocol.js";
import type { EvmTransport } from "./evm-network.js";

export type ViemContractWritePayload = {
  kind: "contract-write";
  address: `0x${string}`;
  abi: readonly unknown[];
  functionName: string;
  args: readonly unknown[];
  account?: `0x${string}`;
  value?: bigint;
};

type ViemPublicClient = {
  getChainId(): Promise<number>;
  waitForTransactionReceipt(input: { hash: `0x${string}`; timeout?: number }): Promise<{ status: "success" | "reverted"; blockNumber: bigint }>;
  estimateContractGas(input: Record<string, unknown>): Promise<bigint>;
  getGasPrice(): Promise<bigint>;
};

const RECEIPT_TIMEOUT_MS = Number(process.env.PRIVATEDAO_EVM_RECEIPT_TIMEOUT_MS || 120_000);

type ViemWalletClient = {
  writeContract(input: Record<string, unknown>): Promise<`0x${string}`>;
};

type ExecutionRecord = {
  intent: ExecutionIntent<ViemContractWritePayload>;
  prepared: PreparedExecution<ViemContractWritePayload>;
  state: ExecutionState;
  signature?: `0x${string}`;
  receipt?: ExecutionReceipt;
};

/** Real viem transport used by EVM product execution and E2E tooling. */
export class ViemEvmTransport implements EvmTransport {
  private readonly executions = new Map<string, ExecutionRecord>();
  private readonly idempotency = new Map<string, string>();

  constructor(
    private readonly publicClient: ViemPublicClient,
    private readonly walletClient: ViemWalletClient,
    private readonly network: string,
    private readonly chainId: string,
    private readonly environment: "testnet" | "mainnet",
    private readonly explorerBaseUrl: string,
    private readonly nativeAsset: string,
    private readonly signerAddress?: `0x${string}`,
  ) {}

  async health(): Promise<{ ok: boolean; chainId: string; latencyMs?: number }> {
    const started = Date.now();
    const observed = await this.publicClient.getChainId();
    return { ok: String(observed) === this.chainId, chainId: String(observed), latencyMs: Date.now() - started };
  }

  async prepare<TPayload, TUnsigned>(intent: ExecutionIntent<TPayload>): Promise<PreparedExecution<TUnsigned>> {
    const payload = parsePayload(intent.payload);
    const account = payload.account || this.signerAddress;
    if (!account) throw new Error("EVM contract write requires a configured signer account.");
    const previous = this.idempotency.get(intent.context.idempotencyKey);
    if (previous) {
      const record = this.executions.get(previous);
      if (!record) throw new Error("Idempotency index points to a missing EVM execution.");
      return record.prepared as PreparedExecution<TUnsigned>;
    }

    const executionId = `evm-${intent.context.requestId}`;
    const prepared: PreparedExecution<ViemContractWritePayload> = {
      executionId,
      intent: intent as ExecutionIntent<ViemContractWritePayload>,
      unsignedPayload: { ...payload, account },
      requiredSigners: [],
      state: "awaiting_signature",
      signingMode: "server",
    };
    this.executions.set(executionId, { intent: prepared.intent as ExecutionIntent<ViemContractWritePayload>, prepared, state: "awaiting_signature" });
    this.idempotency.set(intent.context.idempotencyKey, executionId);
    return prepared as PreparedExecution<TUnsigned>;
  }

  async submit<TUnsigned>(execution: PreparedExecution<TUnsigned>, _signedPayload: TUnsigned): Promise<{ executionId: string; signatures: string[] }> {
    const record = this.executions.get(execution.executionId);
    if (!record) throw new Error("Unknown EVM execution.");
    if (record.signature) return { executionId: execution.executionId, signatures: [record.signature] };
    if (record.state !== "awaiting_signature" && record.state !== "prepared") throw new Error(`Cannot submit EVM execution from ${record.state}.`);
    const payload = record.prepared.unsignedPayload;
    const signature = await this.walletClient.writeContract({
      address: payload.address,
      abi: payload.abi,
      functionName: payload.functionName,
      args: payload.args,
      ...(payload.value === undefined ? {} : { value: payload.value }),
    });
    record.signature = signature;
    record.state = "submitted";
    return { executionId: execution.executionId, signatures: [signature] };
  }

  async status(executionId: string): Promise<{ executionId: string; state: ExecutionState; errorCode?: string }> {
    const record = this.executions.get(executionId);
    if (!record) throw new Error("Unknown EVM execution.");
    if (record.signature && record.state === "submitted") await this.receipt(executionId);
    return { executionId, state: record.state };
  }

  async receipt<TResult = unknown>(executionId: string): Promise<ExecutionReceipt<TResult>> {
    const record = this.executions.get(executionId);
    if (!record?.signature) throw new Error("EVM execution has not been submitted.");
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
      provider: "privatedao-viem-evm",
      state: "confirmed",
      signatures: [record.signature],
      createdAt: new Date().toISOString(),
      environment: this.environment,
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

function parsePayload(value: unknown): ViemContractWritePayload {
  if (!value || typeof value !== "object") throw new Error("EVM execution payload must be an object.");
  const payload = value as Partial<ViemContractWritePayload>;
  if (payload.kind !== "contract-write" || typeof payload.address !== "string" || !Array.isArray(payload.abi) || typeof payload.functionName !== "string" || !Array.isArray(payload.args) || (payload.account !== undefined && typeof payload.account !== "string")) {
    throw new Error("EVM execution payload is not a contract-write payload.");
  }
  return payload as ViemContractWritePayload;
}
