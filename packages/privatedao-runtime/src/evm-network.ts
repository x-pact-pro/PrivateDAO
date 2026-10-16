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

export type EvmEnvironment = "testnet" | "mainnet";

export interface EvmNetworkConfig {
  network: NetworkId;
  label: string;
  environment: EvmEnvironment;
  chainId: string;
  nativeAsset: string;
  rpcUrlEnv: string;
  explorerBaseUrl: string;
  mainnetEnabled: false;
}

export const EVM_NETWORK_CONFIGS: readonly EvmNetworkConfig[] = [
  { network: "ethereum-sepolia", label: "Ethereum Sepolia", environment: "testnet", chainId: "11155111", nativeAsset: "ETH", rpcUrlEnv: "PDAO_EVM_ETHEREUM_SEPOLIA_RPC_URL", explorerBaseUrl: "https://sepolia.etherscan.io/", mainnetEnabled: false },
  { network: "bnb-testnet", label: "BNB Smart Chain Testnet", environment: "testnet", chainId: "97", nativeAsset: "tBNB", rpcUrlEnv: "PDAO_EVM_BNB_TESTNET_RPC_URL", explorerBaseUrl: "https://testnet.bscscan.com/", mainnetEnabled: false },
  { network: "arbitrum-sepolia", label: "Arbitrum Sepolia", environment: "testnet", chainId: "421614", nativeAsset: "ETH", rpcUrlEnv: "PDAO_EVM_ARBITRUM_SEPOLIA_RPC_URL", explorerBaseUrl: "https://sepolia.arbiscan.io/", mainnetEnabled: false },
  { network: "base-sepolia", label: "Base Sepolia", environment: "testnet", chainId: "84532", nativeAsset: "ETH", rpcUrlEnv: "PDAO_EVM_BASE_SEPOLIA_RPC_URL", explorerBaseUrl: "https://sepolia.basescan.org/", mainnetEnabled: false },
  { network: "robinhood-testnet", label: "Robinhood Chain Testnet", environment: "testnet", chainId: "46630", nativeAsset: "ETH", rpcUrlEnv: "PDAO_EVM_ROBINHOOD_TESTNET_RPC_URL", explorerBaseUrl: "https://explorer.testnet.chain.robinhood.com/", mainnetEnabled: false },
  { network: "hyperliquid-testnet", label: "Hyperliquid HyperEVM Testnet", environment: "testnet", chainId: "998", nativeAsset: "HYPE", rpcUrlEnv: "PDAO_EVM_HYPERLIQUID_TESTNET_RPC_URL", explorerBaseUrl: "https://www.hyperscan.com/", mainnetEnabled: false },
  { network: "tempo-testnet", label: "Tempo Testnet", environment: "testnet", chainId: "42431", nativeAsset: "USD", rpcUrlEnv: "PDAO_EVM_TEMPO_TESTNET_RPC_URL", explorerBaseUrl: "https://explore.testnet.tempo.xyz/", mainnetEnabled: false },
  { network: "ethereum-mainnet", label: "Ethereum Mainnet", environment: "mainnet", chainId: "1", nativeAsset: "ETH", rpcUrlEnv: "PDAO_EVM_ETHEREUM_MAINNET_RPC_URL", explorerBaseUrl: "https://etherscan.io/", mainnetEnabled: false },
  { network: "bnb-mainnet", label: "BNB Smart Chain", environment: "mainnet", chainId: "56", nativeAsset: "BNB", rpcUrlEnv: "PDAO_EVM_BNB_MAINNET_RPC_URL", explorerBaseUrl: "https://bscscan.com/", mainnetEnabled: false },
  { network: "arbitrum-one", label: "Arbitrum One", environment: "mainnet", chainId: "42161", nativeAsset: "ETH", rpcUrlEnv: "PDAO_EVM_ARBITRUM_MAINNET_RPC_URL", explorerBaseUrl: "https://arbiscan.io/", mainnetEnabled: false },
  { network: "base-mainnet", label: "Base Mainnet", environment: "mainnet", chainId: "8453", nativeAsset: "ETH", rpcUrlEnv: "PDAO_EVM_BASE_MAINNET_RPC_URL", explorerBaseUrl: "https://basescan.org/", mainnetEnabled: false },
  { network: "robinhood-mainnet", label: "Robinhood Chain", environment: "mainnet", chainId: "4663", nativeAsset: "ETH", rpcUrlEnv: "PDAO_EVM_ROBINHOOD_MAINNET_RPC_URL", explorerBaseUrl: "https://robinhoodchain.blockscout.com/", mainnetEnabled: false },
  { network: "tempo-mainnet", label: "Tempo Mainnet", environment: "mainnet", chainId: "", nativeAsset: "USD", rpcUrlEnv: "PDAO_EVM_TEMPO_MAINNET_RPC_URL", explorerBaseUrl: "https://explore.tempo.xyz/", mainnetEnabled: false },
];

export interface EvmWalletAdapter {
  connect(): Promise<WalletSession>;
  switchChain(chainId: string): Promise<void>;
  sign<TUnsigned>(payload: TUnsigned, intent: ExecutionIntent<unknown>): Promise<TUnsigned>;
}

export interface EvmTransport {
  prepare<TPayload, TUnsigned>(intent: ExecutionIntent<TPayload>): Promise<PreparedExecution<TUnsigned>>;
  submit<TUnsigned>(execution: PreparedExecution<TUnsigned>, signedPayload: TUnsigned): Promise<{ executionId: string; signatures: string[] }>;
  status(executionId: string): Promise<{ executionId: string; state: ExecutionState; errorCode?: string }>;
  receipt<TResult = unknown>(executionId: string): Promise<ExecutionReceipt<TResult>>;
  estimateFee<TPayload>(intent: ExecutionIntent<TPayload>): Promise<FeeEstimate>;
  health(): Promise<{ ok: boolean; chainId: string; latencyMs?: number }>;
}

export class EvmAdapterError extends Error {
  constructor(readonly code: "NETWORK_MISMATCH" | "MALFORMED_RECEIPT" | "RPC_FAILURE" | "RPC_TIMEOUT" | "UNSUPPORTED_CAPABILITY", message: string) {
    super(message);
    this.name = "EvmAdapterError";
  }
}

export class EvmNetworkAdapter implements KernelProvider {
  readonly id: ProviderId;
  readonly networks: readonly NetworkId[];
  private readonly capabilities: ReadonlySet<CapabilityId>;

  constructor(input: { id: ProviderId; config: EvmNetworkConfig; capabilities: readonly CapabilityId[]; transport: EvmTransport; wallet?: EvmWalletAdapter }) {
    const descriptor = getNetwork(input.config.network);
    if (descriptor.family !== "evm") throw new EvmAdapterError("NETWORK_MISMATCH", "EVM adapter requires an EVM network descriptor.");
    if (descriptor.chainId !== input.config.chainId) throw new EvmAdapterError("NETWORK_MISMATCH", "EVM config chain ID does not match the network registry.");
    if (input.config.environment === "mainnet" || input.config.mainnetEnabled) throw new EvmAdapterError("NETWORK_MISMATCH", "Mainnet execution is disabled in Phase 1.");
    if (!input.config.chainId) throw new EvmAdapterError("NETWORK_MISMATCH", "An EVM adapter requires a non-empty chain ID.");
    if (input.capabilities.length === 0) throw new EvmAdapterError("UNSUPPORTED_CAPABILITY", "EVM adapter requires at least one explicit capability.");
    this.id = input.id;
    this.networks = [input.config.network];
    this.capabilities = new Set(input.capabilities);
    this.config = input.config;
    this.transport = input.transport;
    this.wallet = input.wallet;
  }

  readonly config: EvmNetworkConfig;
  private readonly transport: EvmTransport;
  private readonly wallet?: EvmWalletAdapter;

  supports(capability: CapabilityId): boolean { return this.capabilities.has(capability); }

  async prepare<TPayload, TUnsigned>(intent: ExecutionIntent<TPayload>): Promise<PreparedExecution<TUnsigned>> {
    this.assertIntent(intent);
    const health = await this.call(() => this.transport.health());
    if (!health.ok || health.chainId !== this.config.chainId) throw new EvmAdapterError("NETWORK_MISMATCH", "EVM RPC health check does not match the configured chain.");
    return this.call(() => this.transport.prepare(intent));
  }

  async submit<TUnsigned>(execution: PreparedExecution<TUnsigned>, signedPayload: TUnsigned): Promise<{ executionId: string; signatures: string[] }> {
    this.assertIntent(execution.intent);
    return this.call(() => this.transport.submit(execution, signedPayload));
  }

  status(executionId: string): Promise<{ executionId: string; state: ExecutionState; errorCode?: string }> { return this.call(() => this.transport.status(executionId)); }

  async receipt<TResult = unknown>(executionId: string): Promise<ExecutionReceipt<TResult>> {
    const receipt = await this.call(() => this.transport.receipt<TResult>(executionId));
    if (
      receipt.network !== this.config.network
      || receipt.chainId !== this.config.chainId
      || receipt.environment !== this.config.environment
      || receipt.asset !== this.config.nativeAsset
      || !receipt.createdAt
    ) {
      throw new EvmAdapterError("MALFORMED_RECEIPT", "EVM receipt is missing the configured network, chain ID, environment, asset, or timestamp.");
    }
    return { ...receipt, provider: this.id };
  }

  estimateFee<TPayload>(intent: ExecutionIntent<TPayload>): Promise<FeeEstimate> { this.assertIntent(intent); return this.call(() => this.transport.estimateFee(intent)); }

  health(): Promise<{ ok: boolean; chainId: string; latencyMs?: number }> { return this.call(() => this.transport.health()); }

  async connectWallet(): Promise<WalletSession> {
    if (!this.wallet) throw new EvmAdapterError("UNSUPPORTED_CAPABILITY", "No wallet adapter is configured.");
    const session = await this.wallet.connect();
    if (session.network !== this.config.network) throw new EvmAdapterError("NETWORK_MISMATCH", "Connected wallet is on a different network.");
    return session;
  }

  async switchWalletChain(): Promise<void> {
    if (!this.wallet) throw new EvmAdapterError("UNSUPPORTED_CAPABILITY", "No wallet adapter is configured.");
    await this.wallet.switchChain(this.config.chainId);
  }

  explorerUrl(reference: string): string { return `${this.config.explorerBaseUrl.replace(/\/$/, "")}/tx/${encodeURIComponent(reference)}`; }

  private assertIntent<TPayload>(intent: ExecutionIntent<TPayload>): void {
    if (intent.context.network !== this.config.network) throw new EvmAdapterError("NETWORK_MISMATCH", "Execution intent targets a different network.");
    if (!this.supports(intent.context.capability)) throw new EvmAdapterError("UNSUPPORTED_CAPABILITY", `Capability is not enabled: ${intent.context.capability}`);
  }

  private async call<T>(operation: () => Promise<T>): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (error instanceof EvmAdapterError) throw error;
      const message = error instanceof Error ? error.message : String(error);
      if (/timeout|timed out|abort/i.test(message)) throw new EvmAdapterError("RPC_TIMEOUT", message);
      throw new EvmAdapterError("RPC_FAILURE", message);
    }
  }
}
