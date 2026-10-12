import * as http from "node:http";
import { createPublicClient, createWalletClient, defineChain, http as viemHttp } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { createClient as createTempoClient } from "viem/tempo";
import { tempoModerato } from "viem/chains";

import {
  AuctionBidCommitProvider,
  AuctionOutcomeProofProvider,
  BlindPolicyProofProvider,
  InMemoryProviderRegistry,
  PayrollApprovalProvider,
  GovernancePolicyProvider,
  PayrollCalculationProvider,
  RecordCreationProvider,
  RecordVerificationProvider,
  TreasuryPolicyProvider,
  EVM_NETWORK_CONFIGS,
  EvmNetworkAdapter,
  BrowserEvmTransport,
  ViemEvmTransport,
  ZalletCliTransport,
  ZcashNetworkAdapter,
  ZCASH_NETWORK_CONFIGS,
  HyperCoreNetworkAdapter,
  StellarHorizonTransport,
  StellarNetworkAdapter,
  STELLAR_NETWORK_CONFIGS,
  STELLAR_KERNEL_CAPABILITIES,
  AgentDiscoveryProvider,
  SolanaBrowserExecutionProvider,
  createPrivateDaoRuntime,
  buildNativeCapabilityRegistry,
  type ExecutionIntent,
  type KernelProvider,
  type NetworkId,
  type PreparedExecution,
  type ProtocolRole,
} from "../packages/privatedao-runtime/src/index.js";

export type KernelGatewayServiceOptions = {
  allowedOrigin?: string;
  requiredToken?: string;
  maxBodyBytes?: number;
};

const EVM_KERNEL_CAPABILITIES = [
  "governance.proposal.execute",
  "auction.bid.commit",
  "auction.settle",
] as const;

const PUBLIC_EVM_TESTNET_RPC_URLS: Partial<Record<NetworkId, string>> = {
  "ethereum-sepolia": "https://ethereum-sepolia-rpc.publicnode.com",
  "arbitrum-sepolia": "https://sepolia-rollup.arbitrum.io/rpc",
  "tempo-testnet": "https://rpc.moderato.tempo.xyz",
  "base-sepolia": "https://sepolia.base.org",
  "bnb-testnet": "https://bsc-testnet-dataseed.bnbchain.org",
  "robinhood-testnet": "https://rpc.testnet.chain.robinhood.com",
  // HyperEVM is the EVM surface of Hyperliquid. HyperCore remains a separate
  // native exchange surface and is intentionally not routed through this map.
  "hyperliquid-testnet": "https://rpc.hyperliquid-testnet.xyz/evm",
};

// An EVM RPC adapter can be healthy before a network has PrivateDAO product
// contracts. Keep those lanes available for Kernel policy workflows until a
// real contract deployment and independent E2E evidence are registered.
const DEFAULT_EVM_PRODUCT_EXECUTION_NETWORKS = new Set<NetworkId>([
  "ethereum-sepolia",
  "arbitrum-sepolia",
  "tempo-testnet",
  "base-sepolia",
  // Robinhood organizational contracts have independently verified Testnet
  // receipts, so contract-write routing is enabled by default for its
  // Kernel-backed Governance and Auction workflows.
  "robinhood-testnet",
]);

type EvmProviderEntry = {
  id: string;
  network: NetworkId;
};

type KernelViemPublicClient = {
  getChainId(): Promise<number>;
  waitForTransactionReceipt(input: { hash: `0x${string}`; timeout?: number }): Promise<{ status: "success" | "reverted"; blockNumber: bigint }>;
  estimateContractGas(input: Record<string, unknown>): Promise<bigint>;
  getGasPrice(): Promise<bigint>;
};

type KernelViemWalletClient = {
  writeContract(input: Record<string, unknown>): Promise<`0x${string}`>;
};

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function scopedProvider(delegate: KernelProvider, network: NetworkId): KernelProvider {
  return {
    id: `${delegate.id}-${network}`,
    networks: [network],
    supports: (capability) => delegate.supports(capability),
    prepare: (intent) => {
      if (intent.context.network !== network) throw new Error("Provider/network mismatch.");
      return delegate.prepare(intent);
    },
    submit: (execution, signedPayload) => delegate.submit(execution, signedPayload),
    status: (executionId) => delegate.status(executionId),
    receipt: (executionId) => delegate.receipt(executionId),
  };
}

export class KernelGatewayService {
  readonly supportedNetworks: readonly NetworkId[];
  private readonly allowedOrigin: string;
  private readonly requiredToken: string;
  private readonly maxBodyBytes: number;
  private readonly prepared = new Map<string, PreparedExecution<unknown>>();
  private readonly evmProviders = new Map<NetworkId, EvmProviderEntry>();
  private readonly evmAdapters = new Map<NetworkId, EvmNetworkAdapter>();
  private readonly zcashAdapter?: ZcashNetworkAdapter;
  private readonly hypercoreAdapter?: HyperCoreNetworkAdapter;
  private readonly stellarAdapter?: StellarNetworkAdapter;
  private readonly runtime;

  constructor(options: KernelGatewayServiceOptions = {}) {
    this.allowedOrigin = options.allowedOrigin || process.env.PDAO_KERNEL_GATEWAY_ALLOWED_ORIGIN || "*";
    this.requiredToken = options.requiredToken ?? process.env.PDAO_KERNEL_GATEWAY_TOKEN?.trim() ?? "";
    this.maxBodyBytes = options.maxBodyBytes || Number(process.env.PDAO_KERNEL_GATEWAY_MAX_BODY_BYTES || 1_000_000);

    const evmNetworks: readonly NetworkId[] = [
      "solana-devnet",
      "ethereum-sepolia",
      "arbitrum-sepolia",
      "tempo-testnet",
      "base-sepolia",
      "bnb-testnet",
      "robinhood-testnet",
      "hyperliquid-testnet",
    ];
    const kernelNetworks: readonly NetworkId[] = [...evmNetworks, "zcash-testnet", "stellar-testnet", "hypercore-testnet"];
    const zcashConfigured = Boolean(
      process.env.PDAO_ZCASH_ZALLET_BINARY?.trim()
      && process.env.PDAO_ZCASH_ZALLET_DATA_DIR?.trim()
      && process.env.PDAO_ZCASH_ZALLET_CONFIG?.trim(),
    );
    // Kernel policy and verification workflows do not require a Zcash wallet.
    // The wallet-backed settlement adapter remains conditional below.
    this.supportedNetworks = kernelNetworks;
    if (process.env.PDAO_HYPERCORE_API_ENABLED === "1") {
      this.hypercoreAdapter = new HyperCoreNetworkAdapter();
    }

    const registry = new InMemoryProviderRegistry();
    this.registerConfiguredEvmAdapters(registry, evmNetworks);
    const stellarConfig = STELLAR_NETWORK_CONFIGS.find((entry) => entry.network === "stellar-testnet");
    if (!stellarConfig) throw new Error("Stellar Testnet configuration is missing from the Kernel network matrix.");
    const stellarAdapter = new StellarNetworkAdapter({
      id: "privatedao-stellar-testnet-horizon",
      config: stellarConfig,
      capabilities: STELLAR_KERNEL_CAPABILITIES,
      transport: new StellarHorizonTransport(),
    });
    this.stellarAdapter = stellarAdapter;
    registry.register(stellarAdapter);
    for (const network of this.supportedNetworks) {
      const providers: KernelProvider[] = [
        new PayrollCalculationProvider(),
        new PayrollApprovalProvider(),
        new TreasuryPolicyProvider(),
        new RecordCreationProvider(),
        new RecordVerificationProvider(),
        new BlindPolicyProofProvider(),
        new AuctionBidCommitProvider(),
        new AuctionOutcomeProofProvider(),
      ];
      for (const provider of providers) registry.register(scopedProvider(provider, network));
      // Keep policy governance available on every non-Solana lane. A real
      // contract-write payload is still resolved to the network adapter;
      // policy payloads must remain executable when a network has no product
      // contract deployment yet.
      if (network !== "solana-devnet") registry.register(new GovernancePolicyProvider(network));
    }
    registry.register(new AgentDiscoveryProvider());
    registry.register(new SolanaBrowserExecutionProvider());

    if (zcashConfigured) {
      const config = ZCASH_NETWORK_CONFIGS.find((entry) => entry.network === "zcash-testnet");
      if (!config) throw new Error("Zcash Testnet configuration is missing from the Kernel network matrix.");
      const transport = new ZalletCliTransport({
        binaryPath: process.env.PDAO_ZCASH_ZALLET_BINARY!.trim(),
        dataDirectory: process.env.PDAO_ZCASH_ZALLET_DATA_DIR!.trim(),
        configPath: process.env.PDAO_ZCASH_ZALLET_CONFIG!.trim(),
        network: "zcash-testnet",
        explorerBaseUrl: config.explorerBaseUrl,
        confirmationDepth: Number(process.env.PDAO_ZCASH_CONFIRMATIONS || 1),
        allowBalanceReadinessProbe: process.env.PDAO_ZCASH_ALLOW_BALANCE_CHECK === "1",
        broadcastEnabled: process.env.PDAO_ZCASH_BROADCAST_ENABLED === "1",
      });
      const zcashAdapter = new ZcashNetworkAdapter({
        id: "privatedao-zcash-testnet-zallet",
        config,
        capabilities: ["payroll.settle"],
        transport,
      });
      this.zcashAdapter = zcashAdapter;
      registry.register(zcashAdapter);
    }
    this.runtime = createPrivateDaoRuntime(registry);
  }

  private registerConfiguredEvmAdapters(registry: InMemoryProviderRegistry, networks: readonly NetworkId[]): void {
    const serverEnabled = process.env.PDAO_KERNEL_EVM_ENABLED === "1";
    const browserEnabled = process.env.PDAO_KERNEL_EVM_BROWSER_ENABLED !== "0";
    if (!serverEnabled && !browserEnabled) return;

    const account = serverEnabled ? this.serverEvmAccount() : undefined;
    const configuredSelection = (process.env.PDAO_KERNEL_EVM_NETWORKS || "").trim();
    const selectionIsExplicit = configuredSelection.length > 0;
    const selected = new Set(
      configuredSelection
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean),
    );
    if (selected.size === 0) for (const network of networks) selected.add(network);
    const unknown = [...selected].filter((network) => !networks.includes(network as NetworkId));
    if (unknown.length > 0) throw new Error(`PDAO_KERNEL_EVM_NETWORKS contains unsupported gateway networks: ${unknown.join(", ")}`);
    const productExecutionSelection = (process.env.PDAO_KERNEL_EVM_PRODUCT_EXECUTION_NETWORKS || "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);
    const productExecutionNetworks = productExecutionSelection.length > 0
      ? new Set(productExecutionSelection as NetworkId[])
      : DEFAULT_EVM_PRODUCT_EXECUTION_NETWORKS;

    for (const network of networks) {
      const config = EVM_NETWORK_CONFIGS.find((entry) => entry.network === network);
      if (!config || config.environment !== "testnet" || !selected.has(network)) continue;
      const rpcUrl = process.env[config.rpcUrlEnv]?.trim() || (!serverEnabled ? PUBLIC_EVM_TESTNET_RPC_URLS[network] : undefined);
      if (!rpcUrl) {
        // Future lanes remain visible through the Kernel policy providers until
        // an operator supplies the network's RPC. An explicit selection is a
        // configuration error; an implicit selection is simply not configured.
        if (selectionIsExplicit) throw new Error(`${config.rpcUrlEnv} is required when ${network} is explicitly enabled.`);
        continue;
      }
      if (!/^https:\/\//i.test(rpcUrl)) {
        throw new Error(`${config.rpcUrlEnv} must be an HTTPS testnet RPC URL when ${network} is enabled.`);
      }

      const transport = viemHttp(rpcUrl, { timeout: 30_000 });
      const chain = network === "tempo-testnet"
        ? tempoModerato
        : defineChain({
          id: Number(config.chainId),
          name: config.label,
          nativeCurrency: { name: config.nativeAsset, symbol: config.nativeAsset, decimals: 18 },
          rpcUrls: { default: { http: [rpcUrl] } },
        });
      const publicClient = createPublicClient({ chain, transport });
      const inner = serverEnabled
        ? new ViemEvmTransport(
          publicClient as unknown as KernelViemPublicClient,
          (network === "tempo-testnet"
            ? createTempoClient({ account: account!, chain: tempoModerato, transport })
            : createWalletClient({ account: account!, chain, transport })) as unknown as KernelViemWalletClient,
          network,
          config.chainId,
          "testnet",
          config.explorerBaseUrl,
          config.nativeAsset,
          account!.address,
        )
        : new BrowserEvmTransport(
          publicClient as unknown as ConstructorParameters<typeof BrowserEvmTransport>[0],
          network,
          config.chainId,
          config.explorerBaseUrl,
          config.nativeAsset,
        );
      const providerId = `privatedao-evm-${network}${serverEnabled ? "" : "-browser"}`;
      const adapter = new EvmNetworkAdapter({
        id: providerId,
        config,
        capabilities: EVM_KERNEL_CAPABILITIES,
        transport: {
          health: () => inner.health(),
          prepare: (intent) => inner.prepare(intent),
          submit: (execution, signedPayload) => {
            if (serverEnabled && process.env.PDAO_KERNEL_EVM_BROADCAST_ENABLED !== "1") {
              throw new Error("EVM testnet broadcast is disabled; enable it explicitly for an approved E2E run.");
            }
            return inner.submit(execution, signedPayload);
          },
          status: (executionId) => inner.status(executionId),
          receipt: (executionId) => inner.receipt(executionId),
          estimateFee: (intent) => inner.estimateFee(intent),
        },
      });
      if (productExecutionNetworks.has(network)) registry.register(adapter);
      this.evmAdapters.set(network, adapter);
      this.evmProviders.set(network, { id: providerId, network });
    }
  }

  private serverEvmAccount() {
    const rawKey = process.env.PDAO_EVM_DEPLOYER_PRIVATE_KEY?.trim();
    if (!rawKey || !/^0x?[0-9a-fA-F]{64}$/.test(rawKey)) {
      throw new Error("PDAO_KERNEL_EVM_ENABLED requires a valid testnet signer in the secure environment.");
    }
    const privateKey = rawKey.startsWith("0x") ? rawKey : `0x${rawKey}`;
    return privateKeyToAccount(privateKey as `0x${string}`);
  }

  async handle(req: http.IncomingMessage, res: http.ServerResponse): Promise<boolean> {
    const incomingPath = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`).pathname.replace(/\/+$/, "") || "/";
    const path = incomingPath.startsWith("/api/") ? incomingPath.slice(4) : incomingPath;
    if (path === "/healthz" && req.method === "GET") {
      const [evmReadiness, zcashReadiness, stellarReadiness, hypercoreReadiness] = await Promise.all([
        Promise.all([...this.evmAdapters.entries()].map(async ([network, adapter]) => [network, await this.probe(() => adapter.health())] as const)),
        this.zcashAdapter ? this.probe(() => this.zcashAdapter!.health()) : Promise.resolve(null),
        this.probe(() => this.stellarAdapter!.health()),
        this.hypercoreAdapter ? this.hypercoreAdapter.health() : Promise.resolve(null),
      ]);
      const evmReady = Object.fromEntries(evmReadiness.map(([network, result]) => [network, result.ok]));
      const capabilityStatus = buildNativeCapabilityRegistry()
        .filter((entry) => entry.declared)
        .map((entry) => ({
          product: entry.product,
          capability: entry.capability,
          network: entry.network,
          status: entry.status,
          evidence: entry.evidence,
          provider: entry.provider,
          supportsExecution: entry.supportsExecution,
          supportsReceipt: entry.supportsReceipt,
        }));
      this.writeJson(res, 200, {
        ok: true,
        service: "privatedao-kernel-gateway",
        mode: "kernel",
        networks: this.supportedNetworks,
        capabilityStatus,
        networkModes: this.supportedNetworks.map((network) => ({
          network,
          provider: network === "zcash-testnet"
            ? this.zcashAdapter?.id || "privatedao-kernel-policy"
            : network === "stellar-testnet"
              ? this.stellarAdapter?.id || "privatedao-kernel-policy"
            : network === "solana-devnet"
              ? "kernel-native"
            : this.evmProviders.get(network)?.id
              || (["bnb-testnet", "robinhood-testnet", "hyperliquid-testnet", "hypercore-testnet"].includes(network)
                ? "privatedao-kernel-policy"
                : "kernel-native"),
            onchainAdapter: network === "zcash-testnet"
              ? Boolean(this.zcashAdapter)
              : network === "stellar-testnet"
                ? Boolean(this.stellarAdapter)
              : network === "solana-devnet"
                ? false
              : this.evmProviders.has(network),
            nativeReadAdapter: network === "hypercore-testnet" ? this.hypercoreAdapter?.id || null : null,
            nativeReadReady: network === "hypercore-testnet" ? Boolean(hypercoreReadiness?.ok) : false,
          ready: network === "zcash-testnet"
            ? Boolean(zcashReadiness?.ok)
            : network === "stellar-testnet"
              ? Boolean(stellarReadiness?.ok)
            : network === "solana-devnet"
              ? false
            : network in evmReady
              ? Boolean(evmReady[network])
              : false,
        })),
        evm: {
          configured: this.evmProviders.size > 0,
          networks: [...this.evmProviders.keys()],
          ready: evmReady,
          broadcastEnabled: process.env.PDAO_KERNEL_EVM_BROADCAST_ENABLED === "1",
        },
          zcash: {
          configured: Boolean(this.zcashAdapter),
          policyReady: true,
          ready: Boolean(zcashReadiness?.ok),
          readinessReason: zcashReadiness?.reason || (zcashReadiness?.ok ? "ready" : this.zcashAdapter ? "rpc_unavailable" : "policy_only_wallet_not_configured"),
          testnetOnly: true,
          broadcastEnabled: process.env.PDAO_ZCASH_BROADCAST_ENABLED === "1",
          },
        stellar: {
          configured: Boolean(this.stellarAdapter),
          ready: Boolean(stellarReadiness?.ok),
          readinessReason: stellarReadiness?.reason || (stellarReadiness?.ok ? "ready" : "horizon_unavailable"),
          testnetOnly: true,
          broadcastEnabled: Boolean(this.stellarAdapter?.broadcastEnabled),
        },
        hypercore: {
          configured: Boolean(this.hypercoreAdapter),
          nativeReadAdapter: this.hypercoreAdapter?.id || null,
          ready: Boolean(hypercoreReadiness?.ok),
          universeSize: hypercoreReadiness?.universeSize,
          readinessReason: hypercoreReadiness?.reason || (hypercoreReadiness?.ok ? "ready" : this.hypercoreAdapter ? "api_unavailable" : "native_read_adapter_not_configured"),
          testnetOnly: true,
          executionEnabled: false,
        },
      });
      return true;
    }
    if (!path.startsWith("/v1/executions/")) return false;
    if (!this.authorized(req)) {
      this.writeJson(res, 401, { ok: false, error: "Kernel gateway authentication required." });
      return true;
    }
    try {
      const body = await this.readJson(req);
      if (!isRecord(body)) throw new Error("Request body must be an object.");
      const role = this.roleFrom(req, body);
      if (req.method === "POST" && path === "/v1/executions/prepare") {
        const intent = body.intent;
        if (!isRecord(intent) || !isRecord(intent.context)) throw new Error("intent.context is required.");
        const network = intent.context.network;
        if (typeof network !== "string" || !this.supportedNetworks.includes(network as NetworkId)) throw new Error("The selected network is not enabled in this gateway.");
        const routedIntent = this.routeNetworkAdapter(intent as unknown as ExecutionIntent);
        const result = await this.runtime.gateway.prepare(routedIntent, role);
        this.prepared.set(result.executionId, result as PreparedExecution<unknown>);
        this.writeJson(res, 200, result as unknown as JsonRecord);
        return true;
      }
      if (req.method === "POST" && path === "/v1/executions/submit") {
        const execution = body.execution;
        if (!isRecord(execution) || typeof execution.executionId !== "string") throw new Error("execution is required.");
        const stored = this.prepared.get(execution.executionId);
        if (!stored) throw new Error("Execution is not present in this gateway session.");
        this.writeJson(res, 200, await this.runtime.gateway.submit(stored, body.signedPayload, role));
        return true;
      }
      const match = path.match(/^\/v1\/executions\/([^/]+)\/(status|receipt)$/);
      if (req.method === "GET" && match) {
        const execution = this.prepared.get(decodeURIComponent(match[1]));
        if (!execution) throw new Error("Execution is not present in this gateway session.");
        if (match[2] === "status") this.writeJson(res, 200, await this.runtime.gateway.status(execution, role));
        else this.writeJson(res, 200, await this.runtime.gateway.receipt(execution, role) as unknown as JsonRecord);
        return true;
      }
      this.writeJson(res, 404, { ok: false, error: "Unknown execution route." });
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Kernel gateway request failed.";
      this.writeJson(res, 400, { ok: false, error: message });
      return true;
    }
  }

  private routeNetworkAdapter(intent: ExecutionIntent): ExecutionIntent {
    if (intent.context.provider || !isRecord(intent.payload)) return intent;
    if (
      intent.context.capability === "governance.proposal.execute"
      && intent.payload.kind !== "contract-write"
      && intent.context.network !== "solana-devnet"
      && intent.context.network !== "stellar-testnet"
    ) {
      return {
        ...intent,
        context: { ...intent.context, provider: `privatedao-governance-policy-${intent.context.network}` },
      };
    }
    if (intent.payload.kind !== "contract-write") return intent;
    const provider = this.evmProviders.get(intent.context.network);
    if (!provider) return intent;
    return {
      ...intent,
      context: { ...intent.context, provider: provider.id },
    };
  }

  private authorized(req: http.IncomingMessage): boolean {
    return !this.requiredToken || req.headers["x-pdao-gateway-token"] === this.requiredToken;
  }

  private roleFrom(req: http.IncomingMessage, body: JsonRecord): ProtocolRole {
    const role = req.headers["x-pdao-role"] || body.role;
    return role === "checker" || role === "auditor" || role === "admin" || role === "agent" ? role : "maker";
  }

  private async readJson(req: http.IncomingMessage): Promise<unknown> {
    let size = 0;
    const chunks: Buffer[] = [];
    for await (const chunk of req) {
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      size += buffer.length;
      if (size > this.maxBodyBytes) throw new Error("Request body is too large.");
      chunks.push(buffer);
    }
    if (chunks.length === 0) return {};
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  }

  private writeJson(res: http.ServerResponse, status: number, body: JsonRecord): void {
    res.statusCode = status;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Access-Control-Allow-Origin", this.allowedOrigin);
    res.setHeader("Access-Control-Allow-Headers", "content-type, x-pdao-gateway-token, x-pdao-role");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    res.end(JSON.stringify(body));
  }

  private async probe<T>(operation: () => Promise<T>): Promise<{ ok: boolean; reason?: string }> {
    try {
      const result = await Promise.race([
        operation(),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error("probe_timeout")), 2_000)),
      ]);
      if (isRecord(result) && result.ok === false) {
        return { ok: false, reason: typeof result.reason === "string" ? result.reason : "provider_not_ready" };
      }
      return { ok: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { ok: false, reason: /timeout/i.test(message) ? "probe_timeout" : "rpc_unavailable" };
    }
  }
}

export function createKernelGatewayService(options?: KernelGatewayServiceOptions): KernelGatewayService {
  return new KernelGatewayService(options);
}
