import type {
  CapabilityId,
  ExecutionIntent,
  ExecutionReceipt,
  ExecutionState,
  NetworkAdapter,
  NetworkId,
  PreparedExecution,
  ProviderId,
} from "./index.js";
import { getNetwork } from "./networks.js";
import type { NetworkDescriptor } from "./networks.js";
import type { FeeEstimate, WalletSession } from "./protocol.js";

export type SolanaEnvironment = "devnet" | "mainnet";

export interface SolanaNetworkConfig {
  network: NetworkId;
  label: string;
  environment: SolanaEnvironment;
  cluster: "devnet" | "mainnet-beta";
  rpcUrlEnv: string;
  explorerBaseUrl: string;
  nativeAsset: "SOL";
  broadcastEnabled: boolean;
}

export const SOLANA_NETWORK_CONFIGS: readonly SolanaNetworkConfig[] = [
  {
    network: "solana-devnet",
    label: "Solana Devnet",
    environment: "devnet",
    cluster: "devnet",
    rpcUrlEnv: "PDAO_SOLANA_DEVNET_RPC_URL",
    explorerBaseUrl: "https://explorer.solana.com/tx/",
    nativeAsset: "SOL",
    broadcastEnabled: false,
  },
  {
    network: "solana-mainnet-beta",
    label: "Solana Mainnet",
    environment: "mainnet",
    cluster: "mainnet-beta",
    rpcUrlEnv: "PDAO_SOLANA_MAINNET_RPC_URL",
    explorerBaseUrl: "https://explorer.solana.com/tx/",
    nativeAsset: "SOL",
    broadcastEnabled: false,
  },
];

export interface SolanaWalletAdapter {
  connect(): Promise<WalletSession>;
  sign<TUnsigned>(payload: TUnsigned, intent: ExecutionIntent<unknown>): Promise<TUnsigned>;
}

export interface SolanaTransport {
  prepare<TPayload, TUnsigned>(intent: ExecutionIntent<TPayload>): Promise<PreparedExecution<TUnsigned>>;
  submit<TUnsigned>(execution: PreparedExecution<TUnsigned>, signedPayload: TUnsigned): Promise<{ executionId: string; signatures: string[] }>;
  status(executionId: string): Promise<{ executionId: string; state: ExecutionState; errorCode?: string }>;
  receipt<TResult = unknown>(executionId: string): Promise<ExecutionReceipt<TResult>>;
  estimateFee<TPayload>(intent: ExecutionIntent<TPayload>): Promise<FeeEstimate>;
  health(): Promise<{ ok: boolean; network: NetworkId; cluster: string; latencyMs?: number; reason?: string }>;
}

export class SolanaAdapterError extends Error {
  constructor(
    readonly code: "NETWORK_MISMATCH" | "MALFORMED_RECEIPT" | "RPC_FAILURE" | "RPC_TIMEOUT" | "UNSUPPORTED_CAPABILITY" | "BROADCAST_DISABLED",
    message: string,
  ) {
    super(message);
    this.name = "SolanaAdapterError";
  }
}

/** Solana RPC, instruction construction, and signing stay in injected providers. */
export class SolanaNetworkAdapter implements NetworkAdapter {
  readonly id: ProviderId;
  readonly networks: readonly NetworkId[];
  readonly descriptor: NetworkDescriptor;
  readonly config: SolanaNetworkConfig;
  private readonly capabilities: ReadonlySet<CapabilityId>;
  private readonly transport: SolanaTransport;
  private readonly wallet?: SolanaWalletAdapter;

  constructor(input: {
    id: ProviderId;
    config: SolanaNetworkConfig;
    capabilities: readonly CapabilityId[];
    transport: SolanaTransport;
    wallet?: SolanaWalletAdapter;
  }) {
    const descriptor = getNetwork(input.config.network);
    if (descriptor.family !== "solana") throw new SolanaAdapterError("NETWORK_MISMATCH", "Solana adapter requires a Solana network descriptor.");
    if (descriptor.environment !== input.config.environment) throw new SolanaAdapterError("NETWORK_MISMATCH", "Solana environment does not match the network registry.");
    if (input.config.environment === "mainnet" || input.config.cluster === "mainnet-beta") {
      throw new SolanaAdapterError("NETWORK_MISMATCH", "Mainnet execution is disabled.");
    }
    if (input.capabilities.length === 0) throw new SolanaAdapterError("UNSUPPORTED_CAPABILITY", "Solana adapter requires at least one explicit capability.");
    this.id = input.id;
    this.networks = [input.config.network];
    this.capabilities = new Set(input.capabilities);
    this.config = input.config;
    this.transport = input.transport;
    this.wallet = input.wallet;
    this.descriptor = descriptor;
  }

  supports(capability: CapabilityId): boolean { return this.capabilities.has(capability); }

  async prepare<TPayload, TUnsigned>(intent: ExecutionIntent<TPayload>): Promise<PreparedExecution<TUnsigned>> {
    this.assertIntent(intent);
    const health = await this.call(() => this.transport.health());
    if (!health.ok || health.network !== this.config.network || health.cluster !== this.config.cluster) {
      throw new SolanaAdapterError("NETWORK_MISMATCH", "Solana RPC health does not match the configured cluster.");
    }
    return this.call(() => this.transport.prepare(intent));
  }

  async submit<TUnsigned>(execution: PreparedExecution<TUnsigned>, signedPayload: TUnsigned): Promise<{ executionId: string; signatures: string[] }> {
    this.assertIntent(execution.intent);
    if (!this.config.broadcastEnabled) throw new SolanaAdapterError("BROADCAST_DISABLED", "Solana broadcast is disabled; no transaction was sent.");
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
      throw new SolanaAdapterError("MALFORMED_RECEIPT", "Solana receipt is missing the configured network, environment, asset, timestamp, or signature.");
    }
    return receipt;
  }

  estimateFee<TPayload>(intent: ExecutionIntent<TPayload>): Promise<FeeEstimate> {
    this.assertIntent(intent);
    return this.call(() => this.transport.estimateFee(intent));
  }

  async connectWallet(): Promise<WalletSession> {
    if (!this.wallet) throw new SolanaAdapterError("UNSUPPORTED_CAPABILITY", "No Solana wallet adapter is configured.");
    const session = await this.wallet.connect();
    if (session.network !== this.config.network) throw new SolanaAdapterError("NETWORK_MISMATCH", "Connected wallet is on a different Solana network.");
    return session;
  }

  explorerUrl(reference: string): string {
    return `${this.config.explorerBaseUrl.replace(/\/$/, "")}/${encodeURIComponent(reference)}?cluster=${encodeURIComponent(this.config.cluster)}`;
  }

  private assertIntent<TPayload>(intent: ExecutionIntent<TPayload>): void {
    if (intent.context.network !== this.config.network) throw new SolanaAdapterError("NETWORK_MISMATCH", "Execution intent targets a different Solana network.");
    if (!this.supports(intent.context.capability)) throw new SolanaAdapterError("UNSUPPORTED_CAPABILITY", `Capability is not enabled: ${intent.context.capability}`);
  }

  private async call<T>(operation: () => Promise<T>): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (error instanceof SolanaAdapterError) throw error;
      const message = error instanceof Error ? error.message : String(error);
      if (/timeout|timed out|abort/i.test(message)) throw new SolanaAdapterError("RPC_TIMEOUT", message);
      throw new SolanaAdapterError("RPC_FAILURE", message);
    }
  }
}
