import { PRODUCT_CATALOG } from "./catalog.js";
import { NETWORK_MATRIX, type NetworkDescriptor } from "./networks.js";
import type { CapabilityId, NetworkId, ProductId } from "./index.js";

export type NativeCapabilityStatus =
  | "planned"
  | "researching"
  | "implementation"
  | "blocked_external"
  | "testnet_ready"
  | "testnet"
  | "testnet_verified"
  | "devnet_verified"
  | "mainnet_pending_review"
  | "mainnet_live"
  | "disabled";

export interface NativeCapabilityEntry {
  product: ProductId;
  capability: CapabilityId;
  network: NetworkId;
  networkFamily: NetworkDescriptor["family"];
  declared: boolean;
  environment: NetworkDescriptor["environment"];
  chainId: string | null;
  nativeAsset: string | null;
  supportedAssets: readonly string[];
  contracts: readonly string[];
  verifier: string | null;
  provider: string | null;
  walletModel: "none" | "external-wallet" | "provider-wallet";
  supportsExecution: boolean;
  supportsPrivateExecution: boolean;
  supportsPrivateSettlement: boolean;
  supportsProof: boolean;
  supportsReceipt: boolean;
  supportsReconciliation: boolean;
  supportsMainnet: boolean;
  status: NativeCapabilityStatus;
  lastVerifiedCommit: string | null;
  lastVerifiedTimestamp: string | null;
  evidence: "none" | "runtime-only" | "devnet-e2e" | "testnet-e2e";
}

const ETHEREUM_SEPOLIA_EVIDENCE = {
  verifier: "0x26E3515D02bb3D8122Fad109D159f43e81e8bEeb",
  contracts: [
    "0xdd01dA1b53BA46BF1Ce8c71Bc1C5E86E8784694B",
    "0x6f813E1221cB5f760BbC5b467983c014bbE4B3B5c",
  ],
  provider: "evm-ethereum-sepolia",
  commit: "1c2afa0bb",
  timestamp: "2026-10-15T17:01:28.735Z",
} as const;

const BASE_SEPOLIA_EVIDENCE = {
  verifier: "0xdd01da1b53ba46bf1ce8c71bc1c5e86e8784694b",
  contracts: [
    "0xdd01da1b53ba46bf1ce8c71bc1c5e86e8784694b",
    "0x6f813e1221cb5f760bb5c467983c014bbe4b3b5c",
    "0xa0cbe18d8b8b54befda83f33288347466f2c88b9",
  ],
  provider: "evm-base-sepolia",
  commit: "7dcfce7",
  timestamp: "2026-09-17T00:39:48.896Z",
} as const;

const ARBITRUM_SEPOLIA_EVIDENCE = {
  verifier: "0x53aa3e1d6c7a0844c900c5f4e0d4b5967a3367dc",
  contracts: [
    "0x53aa3e1d6c7a0844c900c5f4e0d4b5967a3367dc",
    "0xff7fa49a29a1bbc91c04368f45b0d238f21e0af6",
    "0x88ef958407ee3929cc23b1737e89f0e8acdf7a57",
  ],
  provider: "evm-arbitrum-sepolia",
  commit: "bf23f95",
  timestamp: "2026-09-17T07:28:40.938Z",
} as const;

const AGENT_MAINNET_EVIDENCE = {
  provider: "https://agents.privatedao.org",
  timestamp: "2026-09-11T01:18:16Z",
} as const;

const PAYROLL_SOLANA_DEVNET_EVIDENCE = {
  provider: "umbra-solana-devnet",
  program: "DSuKkyqGVGgo4QtPABfxKJKygUDACbUhirnuv63mEpAJ",
  asset: "WSOL",
  commit: "adcb3ae",
  timestamp: "2026-09-11T21:36:18.740Z",
} as const;

const TEMPO_TESTNET_EVIDENCE = {
  provider: "evm-tempo-testnet",
  verifier: "0xbf495e8147ab23bfa2024eae7c0d2f54af40279c",
  contracts: [
    "0xffe6e9a78dafd35f230ad51c7bd96ba469d53405",
    "0x9570769a1a4980d199845ccb276706face805cb4",
  ],
  commit: "7b4d430",
  timestamp: "2026-09-16T21:53:12.853Z",
} as const;

const BNB_TESTNET_EVIDENCE = {
  provider: "evm-bnb-testnet",
  verifier: "0x26e3515d02bb3d8122fad109d159f43e81e8beeb",
  contracts: [
    "0xdd01da1b53ba46bf1ce8c71bc1c5e86e8784694b",
    "0x6f813e1221cb5f760bb5c467983c014bbe4b3b5c",
  ],
  commit: "9755727ba",
  timestamp: "2026-10-11T15:16:22.645Z",
} as const;

const HYPERLIQUID_TESTNET_EVIDENCE = {
  provider: "evm-hyperliquid-testnet",
  contracts: [
    "0x26e3515d02bb3d8122fad109d159f43e81e8beeb",
    "0xdd01da1b53ba46bf1ce8c71bc1c5e86e8784694b",
    "0x6f813e1221cb5f760bb5c467983c014bbe4b3b5c",
  ],
  commit: "b4af3f3e4",
  timestamp: "2026-10-11T14:08:00.682Z",
} as const;

const ROBINHOOD_TESTNET_EVIDENCE = {
  provider: "evm-robinhood-testnet",
  verifier: "0xccfd62e867475fd70137d065792e72919357ce44",
  contracts: [
    "0xccfd62e867475fd70137d065792e72919357ce44",
    "0x3fc47618e59c5bf8a19fe6a5298938fc9b8c3bdc",
    "0x672899b8ad719468b20ee0b662bc30a8a22e6585",
  ],
  commit: "62ca8d314",
  timestamp: "2026-10-15T04:03:29.445Z",
} as const;

const STELLAR_TESTNET_EVIDENCE = {
  provider: "stellar-testnet-horizon",
  commit: "7aeff6d4b",
  timestamp: "2026-10-12T08:11:43.186Z",
  transaction: "8220fea632c55e3dca415b8b46ec82ea9d333cc2461947ef194592e5410a4e1b",
  ledger: "5153823",
  capabilities: [
    "verification.blind.prove",
    "verification.record.create",
    "verification.record.verify",
    "payroll.calculate",
    "payroll.approve",
    "payroll.settle",
    "treasury.policy.check",
    "governance.proposal.execute",
    "auction.bid.commit",
    "auction.settle",
  ],
} as const;

const ORGANIZATIONAL_EVIDENCE = {
  "ethereum-sepolia": {
    provider: "evm-ethereum-sepolia-organizational",
    contracts: [
      "0x92739fdd28d200b7ced0d177c021079ce30412b1",
      "0x8ea77a4b281c29d92bb6cb991687cc34462cd2a1",
      "0xff3bbac12cb2630bee9f0576ea2ea202a059edf7",
    ],
    assets: ["ETH"],
    commit: "bc9e662",
    timestamp: "2026-09-16T23:03:17.944Z",
  },
  "tempo-testnet": {
    provider: "evm-tempo-testnet-organizational",
    contracts: [
      "0x88ef958407ee3929cc23b1737e89f0e8acdf7a57",
      "0x1f51b3231cbb448793e41903181c68bcc96e4b5d",
      "0x400805c6b9d4d4a3c4f604a293b0733453dde3ca",
    ],
    assets: ["AlphaUSD"],
    commit: "332565a",
    timestamp: "2026-09-16T22:03:49.724Z",
  },
  "arbitrum-sepolia": {
    provider: "evm-arbitrum-sepolia-organizational",
    contracts: [
      "0xbf495e8147ab23bfa2024eae7c0d2f54af40279c",
      "0xc4d37f8fb01dd8575ed8a5e8432eaa284abc41ec",
      "0x4dbe25b21607cf04bbf06b9b88927af3e381d373",
    ],
    assets: ["ETH"],
    commit: "bf23f95",
    timestamp: "2026-09-17T07:23:24.600Z",
  },
  "base-sepolia": {
    provider: "evm-base-sepolia-organizational",
    contracts: [
      "0xf053303014cbf6233d8b9bf38679a30706069216",
      "0x9887bcfe7daad364202d5d3102de180c389ecb20",
      "0xcfb3e7af09f206614cf7a3cf8a93f92379c1c374",
    ],
    assets: ["ETH"],
    commit: "7dcfce7",
    timestamp: "2026-09-19T13:20:48.792Z",
  },
  "robinhood-testnet": {
    provider: "evm-robinhood-testnet-organizational",
    contracts: [
      "0xdd01da1b53ba46bf1ce8c71bc1c5e86e8784694b",
      "0x5b3a18eda78e7ce2086271585c3c23c8269c7ca4",
      "0xffe6e9a78dafd35f230ad51c7bd96ba469d53405",
    ],
    assets: ["ETH"],
    commit: "65fe6957e",
    timestamp: "2026-09-19T14:01:22.656Z",
  },
  "bnb-testnet": {
    provider: "evm-bnb-testnet-organizational",
    contracts: [
      "0x5011c9c68006c2857eaea0f67401e9d58ff39770",
      "0x62f8f7ffc4235a1dde58ba811fa9c448c56f7620",
      "0x57d5d75f81db5459d541891f4c1a20f51abe32fc",
      "0x4dbe25b21607cf04bbf06b9b88927af3e381d373",
    ],
    assets: ["BNB"],
    commit: "ef862608a",
    timestamp: "2026-10-11T17:04:22.062Z",
  },
  "hyperliquid-testnet": {
    provider: "evm-hyperliquid-testnet-organizational",
    contracts: [
      "0x6376b8909dba5d61d3267eb092fdd51718cfc524",
      "0x987457e59339e8e291db1cb58a71a19af82e81ff",
      "0x672899b8ad719468b20ee0b662bc30a8a22e6585",
    ],
    assets: ["HYPE"],
    commit: "25ed8bb4b",
    timestamp: "2026-10-15T02:42:28.053Z",
  },
} as const;

const ORGANIZATIONAL_PAYROLL_EVIDENCE = {
  "ethereum-sepolia": {
    provider: "evm-ethereum-sepolia-organizational",
    contracts: ["0xcd6709c1bc73a746e1ba094c6d04f9f3442ba1fc"],
    assets: ["ETH"],
    commit: "39e969024",
    timestamp: "2026-10-15T08:11:09.510Z",
  },
  "bnb-testnet": {
    provider: "evm-bnb-testnet-organizational",
    contracts: ["0x0a1a6467fdcc858899692c0f7d15beca2483d069"],
    assets: ["BNB"],
    commit: "ef862608a",
    timestamp: "2026-10-12T00:18:34.179Z",
  },
} as const;

function nativeAsset(network: NetworkDescriptor): string | null {
  if (network.family === "solana") return "SOL";
  if (network.family === "evm") {
    if (network.id === "tempo-testnet" || network.id === "tempo-mainnet") return "USD";
    if (network.id === "bnb-testnet" || network.id === "bnb-mainnet") return "BNB";
    if (network.id === "hyperliquid-testnet") return "HYPE";
    return "ETH";
  }
  if (network.family === "utxo") return "ZEC";
  if (network.family === "stellar") return "XLM";
  if (network.family === "exchange") return "USDC";
  return null;
}

function defaultStatus(declared: boolean, network: NetworkDescriptor): NativeCapabilityStatus {
  if (!declared || network.stage === "planned") return "planned";
  return "implementation";
}

function applyEthereumSepoliaEvidence(entry: NativeCapabilityEntry): NativeCapabilityEntry {
  const isBlind = entry.product === "blind-verification" && ["verification.blind.prove", "verification.blind.revoke"].includes(entry.capability);
  const isRecord = entry.product === "record-verification" && ["verification.record.create", "verification.record.verify", "verification.record.revoke"].includes(entry.capability);
  if (entry.network !== "ethereum-sepolia" || (!isBlind && !isRecord)) return entry;
  return {
    ...entry,
    provider: ETHEREUM_SEPOLIA_EVIDENCE.provider,
    contracts: ETHEREUM_SEPOLIA_EVIDENCE.contracts,
    verifier: ETHEREUM_SEPOLIA_EVIDENCE.verifier,
    walletModel: "provider-wallet",
    supportsExecution: true,
    supportsProof: isBlind,
    supportsReceipt: true,
    supportsReconciliation: false,
    status: "testnet_verified",
    lastVerifiedCommit: ETHEREUM_SEPOLIA_EVIDENCE.commit,
    lastVerifiedTimestamp: ETHEREUM_SEPOLIA_EVIDENCE.timestamp,
    evidence: "testnet-e2e",
  };
}

function applyBaseSepoliaEvidence(entry: NativeCapabilityEntry): NativeCapabilityEntry {
  const isBlind = entry.product === "blind-verification" && entry.capability === "verification.blind.prove";
  const isRecord = entry.product === "record-verification" && ["verification.record.create", "verification.record.verify"].includes(entry.capability);
  if (entry.network !== "base-sepolia" || (!isBlind && !isRecord)) return entry;
  return {
    ...entry,
    provider: BASE_SEPOLIA_EVIDENCE.provider,
    contracts: BASE_SEPOLIA_EVIDENCE.contracts,
    verifier: BASE_SEPOLIA_EVIDENCE.verifier,
    walletModel: "provider-wallet",
    supportsExecution: true,
    supportsProof: isBlind,
    supportsReceipt: true,
    supportsReconciliation: false,
    status: "testnet_verified",
    lastVerifiedCommit: BASE_SEPOLIA_EVIDENCE.commit,
    lastVerifiedTimestamp: BASE_SEPOLIA_EVIDENCE.timestamp,
    evidence: "testnet-e2e",
  };
}

function applyArbitrumSepoliaEvidence(entry: NativeCapabilityEntry): NativeCapabilityEntry {
  const isBlind = entry.product === "blind-verification" && entry.capability === "verification.blind.prove";
  const isRecord = entry.product === "record-verification" && ["verification.record.create", "verification.record.verify"].includes(entry.capability);
  if (entry.network !== "arbitrum-sepolia" || (!isBlind && !isRecord)) return entry;
  return {
    ...entry,
    provider: ARBITRUM_SEPOLIA_EVIDENCE.provider,
    contracts: ARBITRUM_SEPOLIA_EVIDENCE.contracts,
    verifier: ARBITRUM_SEPOLIA_EVIDENCE.verifier,
    walletModel: "provider-wallet",
    supportsExecution: true,
    supportsProof: isBlind,
    supportsReceipt: true,
    supportsReconciliation: false,
    status: "testnet_verified",
    lastVerifiedCommit: ARBITRUM_SEPOLIA_EVIDENCE.commit,
    lastVerifiedTimestamp: ARBITRUM_SEPOLIA_EVIDENCE.timestamp,
    evidence: "testnet-e2e",
  };
}

function applyAgentMainnetEvidence(entry: NativeCapabilityEntry): NativeCapabilityEntry {
  if (entry.product !== "agent" || entry.network !== "solana-mainnet-beta") return entry;
  const isDiscovery = entry.capability === "agent.discover";
  const isInvocation = entry.capability === "agent.invoke";
  if (!isDiscovery && !isInvocation) return entry;
  return {
    ...entry,
    provider: AGENT_MAINNET_EVIDENCE.provider,
    walletModel: isInvocation ? "external-wallet" : "none",
    supportsExecution: true,
    supportsReceipt: isInvocation,
    supportsMainnet: true,
    status: "mainnet_live",
    lastVerifiedCommit: null,
    lastVerifiedTimestamp: AGENT_MAINNET_EVIDENCE.timestamp,
    evidence: "runtime-only",
  };
}

function applyPayrollDevnetEvidence(entry: NativeCapabilityEntry): NativeCapabilityEntry {
  if (entry.product !== "payroll" || entry.network !== "solana-devnet") return entry;
  if (!["payroll.calculate", "payroll.approve", "payroll.settle"].includes(entry.capability)) return entry;
  const isSettlement = entry.capability === "payroll.settle";
  return {
    ...entry,
    provider: PAYROLL_SOLANA_DEVNET_EVIDENCE.provider,
    supportedAssets: [PAYROLL_SOLANA_DEVNET_EVIDENCE.asset],
    contracts: [PAYROLL_SOLANA_DEVNET_EVIDENCE.program],
    walletModel: "external-wallet",
    supportsExecution: true,
    supportsPrivateExecution: isSettlement,
    supportsPrivateSettlement: isSettlement,
    supportsProof: isSettlement,
    supportsReceipt: true,
    supportsReconciliation: isSettlement,
    status: "devnet_verified",
    lastVerifiedCommit: PAYROLL_SOLANA_DEVNET_EVIDENCE.commit,
    lastVerifiedTimestamp: PAYROLL_SOLANA_DEVNET_EVIDENCE.timestamp,
    evidence: "devnet-e2e",
  };
}

function applyTempoTestnetEvidence(entry: NativeCapabilityEntry): NativeCapabilityEntry {
  const isBlind = entry.product === "blind-verification" && entry.capability === "verification.blind.prove";
  const isRecord = entry.product === "record-verification" && ["verification.record.create", "verification.record.verify"].includes(entry.capability);
  if (entry.network !== "tempo-testnet" || (!isBlind && !isRecord)) return entry;
  return {
    ...entry,
    provider: TEMPO_TESTNET_EVIDENCE.provider,
    contracts: TEMPO_TESTNET_EVIDENCE.contracts,
    verifier: TEMPO_TESTNET_EVIDENCE.verifier,
    supportedAssets: ["AlphaUSD"],
    walletModel: "provider-wallet",
    supportsExecution: true,
    supportsProof: isBlind,
    supportsReceipt: true,
    supportsReconciliation: true,
    status: "testnet_verified",
    lastVerifiedCommit: TEMPO_TESTNET_EVIDENCE.commit,
    lastVerifiedTimestamp: TEMPO_TESTNET_EVIDENCE.timestamp,
    evidence: "testnet-e2e",
  };
}

function applyBnbTestnetEvidence(entry: NativeCapabilityEntry): NativeCapabilityEntry {
  const isBlind = entry.product === "blind-verification" && entry.capability === "verification.blind.prove";
  const isRecord = entry.product === "record-verification" && ["verification.record.create", "verification.record.verify"].includes(entry.capability);
  if (entry.network !== "bnb-testnet" || (!isBlind && !isRecord)) return entry;
  return {
    ...entry,
    provider: BNB_TESTNET_EVIDENCE.provider,
    supportedAssets: ["BNB"],
    contracts: BNB_TESTNET_EVIDENCE.contracts,
    verifier: BNB_TESTNET_EVIDENCE.verifier,
    walletModel: "provider-wallet",
    supportsExecution: true,
    supportsPrivateExecution: false,
    supportsPrivateSettlement: false,
    supportsProof: isBlind,
    supportsReceipt: true,
    supportsReconciliation: true,
    status: "testnet_verified",
    lastVerifiedCommit: BNB_TESTNET_EVIDENCE.commit,
    lastVerifiedTimestamp: BNB_TESTNET_EVIDENCE.timestamp,
    evidence: "testnet-e2e",
  };
}

function applyHyperliquidTestnetEvidence(entry: NativeCapabilityEntry): NativeCapabilityEntry {
  const isBlind = entry.product === "blind-verification" && entry.capability === "verification.blind.prove";
  const isRecord = entry.product === "record-verification" && ["verification.record.create", "verification.record.verify"].includes(entry.capability);
  if (entry.network !== "hyperliquid-testnet" || (!isBlind && !isRecord)) return entry;
  return {
    ...entry,
    provider: HYPERLIQUID_TESTNET_EVIDENCE.provider,
    contracts: HYPERLIQUID_TESTNET_EVIDENCE.contracts,
    walletModel: "provider-wallet",
    supportsExecution: true,
    supportsPrivateExecution: false,
    supportsPrivateSettlement: false,
    supportsProof: isBlind,
    supportsReceipt: true,
    supportsReconciliation: true,
    status: "testnet_verified",
    lastVerifiedCommit: HYPERLIQUID_TESTNET_EVIDENCE.commit,
    lastVerifiedTimestamp: HYPERLIQUID_TESTNET_EVIDENCE.timestamp,
    evidence: "testnet-e2e",
  };
}

function applyRobinhoodTestnetEvidence(entry: NativeCapabilityEntry): NativeCapabilityEntry {
  const isBlind = entry.product === "blind-verification" && entry.capability === "verification.blind.prove";
  const isRecord = entry.product === "record-verification" && ["verification.record.create", "verification.record.verify"].includes(entry.capability);
  if (entry.network !== "robinhood-testnet" || (!isBlind && !isRecord)) return entry;
  return {
    ...entry,
    provider: ROBINHOOD_TESTNET_EVIDENCE.provider,
    contracts: ROBINHOOD_TESTNET_EVIDENCE.contracts,
    verifier: ROBINHOOD_TESTNET_EVIDENCE.verifier,
    walletModel: "provider-wallet",
    supportsExecution: true,
    supportsProof: isBlind,
    supportsReceipt: true,
    supportsReconciliation: true,
    status: "testnet_verified",
    lastVerifiedCommit: ROBINHOOD_TESTNET_EVIDENCE.commit,
    lastVerifiedTimestamp: ROBINHOOD_TESTNET_EVIDENCE.timestamp,
    evidence: "testnet-e2e",
  };
}

function applyStellarTestnetEvidence(entry: NativeCapabilityEntry): NativeCapabilityEntry {
  if (entry.network !== "stellar-testnet" || entry.product === "agent" || !entry.declared) return entry;
  const verified = (STELLAR_TESTNET_EVIDENCE.capabilities as readonly string[]).includes(entry.capability);
  return {
    ...entry,
    provider: STELLAR_TESTNET_EVIDENCE.provider,
    supportedAssets: ["XLM"],
    walletModel: "external-wallet",
    supportsExecution: true,
    supportsPrivateExecution: false,
    supportsPrivateSettlement: false,
    supportsProof: ["verification.blind.prove", "verification.record.create", "verification.record.verify", "auction.bid.commit", "auction.settle"].includes(entry.capability),
    supportsReceipt: true,
    supportsReconciliation: true,
    status: verified ? "testnet_verified" : "testnet_ready",
    lastVerifiedCommit: verified ? STELLAR_TESTNET_EVIDENCE.commit : null,
    lastVerifiedTimestamp: STELLAR_TESTNET_EVIDENCE.timestamp,
    evidence: verified ? "testnet-e2e" : "runtime-only",
  };
}

function applyOrganizationalEvidence(entry: NativeCapabilityEntry): NativeCapabilityEntry {
  const evidence = ORGANIZATIONAL_EVIDENCE[entry.network as keyof typeof ORGANIZATIONAL_EVIDENCE];
  const supportedCapability =
    (entry.product === "treasury" && entry.capability === "treasury.policy.check") ||
    (entry.product === "governance" && entry.capability === "governance.proposal.execute") ||
    (entry.product === "auction" && ["auction.bid.commit", "auction.settle"].includes(entry.capability));
  if (!evidence || !supportedCapability) return entry;
  return {
    ...entry,
    provider: evidence.provider,
    supportedAssets: evidence.assets,
    contracts: evidence.contracts,
    walletModel: "external-wallet",
    supportsExecution: true,
    supportsPrivateExecution: false,
    supportsPrivateSettlement: false,
    supportsProof: false,
    supportsReceipt: true,
    supportsReconciliation: true,
    status: "testnet_verified",
    lastVerifiedCommit: evidence.commit,
    lastVerifiedTimestamp: evidence.timestamp,
    evidence: "testnet-e2e",
  };
}

function applyOrganizationalPayrollEvidence(entry: NativeCapabilityEntry): NativeCapabilityEntry {
  const evidence = ORGANIZATIONAL_PAYROLL_EVIDENCE[entry.network as keyof typeof ORGANIZATIONAL_PAYROLL_EVIDENCE];
  if (entry.product !== "payroll" || !evidence) return entry;
  if (!["payroll.calculate", "payroll.approve", "payroll.settle"].includes(entry.capability)) return entry;
  return {
    ...entry,
    provider: evidence.provider,
    supportedAssets: evidence.assets,
    contracts: evidence.contracts,
    walletModel: "external-wallet",
    supportsExecution: true,
    supportsPrivateExecution: false,
    supportsPrivateSettlement: false,
    supportsProof: false,
    supportsReceipt: true,
    supportsReconciliation: true,
    status: "testnet_verified",
    lastVerifiedCommit: evidence.commit,
    lastVerifiedTimestamp: evidence.timestamp,
    evidence: "testnet-e2e",
  };
}

/**
 * Conservative native capability registry. Planned entries are emitted so
 * discovery can explain the roadmap, but only evidence-backed entries are
 * executable or presented as verified support.
 */
export function buildNativeCapabilityRegistry(): readonly NativeCapabilityEntry[] {
  return PRODUCT_CATALOG.flatMap((product) =>
    product.capabilities.flatMap((capability) =>
      NETWORK_MATRIX.map((network) => applyOrganizationalEvidence(applyOrganizationalPayrollEvidence(applyStellarTestnetEvidence(applyRobinhoodTestnetEvidence(applyHyperliquidTestnetEvidence(applyBnbTestnetEvidence(applyTempoTestnetEvidence(applyPayrollDevnetEvidence(applyAgentMainnetEvidence(applyArbitrumSepoliaEvidence(applyBaseSepoliaEvidence(applyEthereumSepoliaEvidence({
        product: product.id,
        capability: capability.id,
        network: network.id,
        networkFamily: network.family,
        declared: product.networks.includes(network.id) && capability.networks.includes(network.id),
        environment: network.environment,
        chainId: network.chainId ?? null,
        nativeAsset: nativeAsset(network),
        supportedAssets: nativeAsset(network) ? [nativeAsset(network) as string] : [],
        contracts: [],
        verifier: null,
        provider: network.adapterId ?? null,
        walletModel: network.family === "solana" || network.family === "evm" ? "external-wallet" : "none",
        supportsExecution: false,
        supportsPrivateExecution: false,
        supportsPrivateSettlement: false,
        supportsProof: false,
        supportsReceipt: false,
        supportsReconciliation: false,
        supportsMainnet: false,
        status: defaultStatus(product.networks.includes(network.id) && capability.networks.includes(network.id), network),
        lastVerifiedCommit: null,
        lastVerifiedTimestamp: null,
        evidence: "none",
      }))))))))))))) ,
    ),
  );
}
