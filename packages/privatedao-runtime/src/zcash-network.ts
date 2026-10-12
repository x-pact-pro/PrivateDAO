import type {
  CapabilityId,
  ExecutionIntent,
  ExecutionReceipt,
  ExecutionState,
  KernelProvider,
  NetworkId,
  PreparedExecution,
  ProviderId,
} from "./index.js";
import { getNetwork } from "./networks.js";
import type { FeeEstimate, WalletSession } from "./protocol.js";

export type ZcashEnvironment = "testnet" | "mainnet";

export interface ZcashNetworkConfig {
  network: NetworkId;
  label: string;
  environment: ZcashEnvironment;
  rpcUrlEnv: string;
  explorerBaseUrl: string;
  nativeAsset: "TAZ" | "ZEC";
  mainnetEnabled: false;
}

export const ZCASH_NETWORK_CONFIGS: readonly ZcashNetworkConfig[] = [
  {
    network: "zcash-testnet",
    label: "Zcash Testnet",
    environment: "testnet",
    rpcUrlEnv: "PDAO_ZCASH_TESTNET_RPC_URL",
    explorerBaseUrl: "https://explorer.testnet.z.cash/",
    nativeAsset: "TAZ",
    mainnetEnabled: false,
  },
];

export interface ZcashTransport {
  health(): Promise<{ ok: boolean; network: NetworkId; latencyMs?: number; reason?: string }>;
  prepare<TPayload, TUnsigned>(intent: ExecutionIntent<TPayload>): Promise<PreparedExecution<TUnsigned>>;
  submit<TUnsigned>(execution: PreparedExecution<TUnsigned>, signedPayload: TUnsigned): Promise<{ executionId: string; signatures: string[] }>;
  status(executionId: string): Promise<{ executionId: string; state: ExecutionState; errorCode?: string }>;
  receipt<TResult = unknown>(executionId: string): Promise<ExecutionReceipt<TResult>>;
  estimateFee<TPayload>(intent: ExecutionIntent<TPayload>): Promise<FeeEstimate>;
}

export interface ZcashWalletAdapter {
  connect(): Promise<WalletSession>;
  sign<TUnsigned>(payload: TUnsigned, intent: ExecutionIntent<unknown>): Promise<TUnsigned>;
}

export class ZcashAdapterError extends Error {
  constructor(
    readonly code: "NETWORK_MISMATCH" | "MALFORMED_RECEIPT" | "RPC_FAILURE" | "RPC_TIMEOUT" | "UNSUPPORTED_CAPABILITY",
    message: string,
  ) {
    super(message);
    this.name = "ZcashAdapterError";
  }
}

/**
 * Native UTXO execution boundary for Zcash. It deliberately does not reuse
 * EVM assumptions about chain IDs, account balances, or contract receipts.
 * The transport owns the authenticated zcashd/RPC interaction and wallet
 * signing; no private key crosses this boundary.
 */
export class ZcashNetworkAdapter implements KernelProvider {
  readonly id: ProviderId;
  readonly networks: readonly NetworkId[];
  readonly config: ZcashNetworkConfig;
  private readonly capabilities: ReadonlySet<CapabilityId>;
  private readonly transport: ZcashTransport;
  private readonly wallet?: ZcashWalletAdapter;

  constructor(input: {
    id: ProviderId;
    config: ZcashNetworkConfig;
    capabilities: readonly CapabilityId[];
    transport: ZcashTransport;
    wallet?: ZcashWalletAdapter;
  }) {
    const descriptor = getNetwork(input.config.network);
    if (descriptor.family !== "utxo") throw new ZcashAdapterError("NETWORK_MISMATCH", "Zcash adapter requires a UTXO network descriptor.");
    if (input.config.network !== "zcash-testnet") throw new ZcashAdapterError("NETWORK_MISMATCH", "Only the configured Zcash Testnet lane is available.");
    if (input.config.environment !== "testnet" || input.config.mainnetEnabled) throw new ZcashAdapterError("NETWORK_MISMATCH", "Zcash Mainnet execution is disabled.");
    if (input.capabilities.length === 0) throw new ZcashAdapterError("UNSUPPORTED_CAPABILITY", "Zcash adapter requires at least one explicit capability.");
    this.id = input.id;
    this.networks = [input.config.network];
    this.config = input.config;
    this.capabilities = new Set(input.capabilities);
    this.transport = input.transport;
    this.wallet = input.wallet;
  }

  supports(capability: CapabilityId): boolean { return this.capabilities.has(capability); }

  async prepare<TPayload, TUnsigned>(intent: ExecutionIntent<TPayload>): Promise<PreparedExecution<TUnsigned>> {
    this.assertIntent(intent);
    await this.assertHealthy();
    return this.call(() => this.transport.prepare(intent));
  }

  async submit<TUnsigned>(execution: PreparedExecution<TUnsigned>, signedPayload: TUnsigned): Promise<{ executionId: string; signatures: string[] }> {
    this.assertIntent(execution.intent);
    return this.call(() => this.transport.submit(execution, signedPayload));
  }

  status(executionId: string): Promise<{ executionId: string; state: ExecutionState; errorCode?: string }> {
    return this.call(() => this.transport.status(executionId));
  }

  async receipt<TResult = unknown>(executionId: string): Promise<ExecutionReceipt<TResult>> {
    const receipt = await this.call(() => this.transport.receipt<TResult>(executionId));
    if (
      receipt.network !== this.config.network
      || receipt.environment !== this.config.environment
      || receipt.asset !== this.config.nativeAsset
      || !receipt.createdAt
      || receipt.signatures.length === 0
    ) {
      throw new ZcashAdapterError("MALFORMED_RECEIPT", "Zcash receipt is missing the configured network, environment, asset, timestamp, or transaction reference.");
    }
    return receipt;
  }

  estimateFee<TPayload>(intent: ExecutionIntent<TPayload>): Promise<FeeEstimate> {
    this.assertIntent(intent);
    return this.call(() => this.transport.estimateFee(intent));
  }

  async health(): Promise<{ ok: boolean; network: NetworkId; latencyMs?: number; reason?: string }> {
    const health = await this.call(() => this.transport.health());
    if (health.network !== this.config.network) throw new ZcashAdapterError("NETWORK_MISMATCH", "Zcash RPC health reports a different network.");
    return health;
  }

  async connectWallet(): Promise<WalletSession> {
    if (!this.wallet) throw new ZcashAdapterError("UNSUPPORTED_CAPABILITY", "No Zcash wallet adapter is configured.");
    const session = await this.wallet.connect();
    if (session.network !== this.config.network) throw new ZcashAdapterError("NETWORK_MISMATCH", "Connected wallet is on a different Zcash network.");
    return session;
  }

  async sign<TUnsigned>(payload: TUnsigned, intent: ExecutionIntent<unknown>): Promise<TUnsigned> {
    this.assertIntent(intent);
    if (!this.wallet) throw new ZcashAdapterError("UNSUPPORTED_CAPABILITY", "No Zcash wallet adapter is configured.");
    return this.wallet.sign(payload, intent);
  }

  explorerUrl(reference: string): string {
    return `${this.config.explorerBaseUrl.replace(/\/$/, "")}/tx/${encodeURIComponent(reference)}`;
  }

  private async assertHealthy(): Promise<void> {
    const health = await this.health();
    if (!health.ok) throw new ZcashAdapterError("RPC_FAILURE", "Zcash RPC health check failed.");
  }

  private assertIntent<TPayload>(intent: ExecutionIntent<TPayload>): void {
    if (intent.context.network !== this.config.network) throw new ZcashAdapterError("NETWORK_MISMATCH", "Execution intent targets a different Zcash network.");
    if (!this.supports(intent.context.capability)) throw new ZcashAdapterError("UNSUPPORTED_CAPABILITY", `Capability is not enabled: ${intent.context.capability}`);
  }

  private async call<T>(operation: () => Promise<T>): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (error instanceof ZcashAdapterError) throw error;
      const message = error instanceof Error ? error.message : String(error);
      if (/timeout|timed out|abort/i.test(message)) throw new ZcashAdapterError("RPC_TIMEOUT", message);
      throw new ZcashAdapterError("RPC_FAILURE", message);
    }
  }
}
