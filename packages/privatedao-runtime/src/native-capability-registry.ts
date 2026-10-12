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
  evidence: "none" | "runtime-only" | "kernel-policy-testnet" | "devnet-e2e" | "testnet-e2e";
}

const ETHEREUM_SEPOLIA_EVIDENCE = {
  verifier: "0x26E3515D02bb3D8122Fad109D159f43e81e8bEeb",
  contracts: [
    "0xdd01dA1b53BA46BF1Ce8c71Bc1C5E86E8784694B",
    "0x6f813E1221cB5f760BbC5b467983c014bbE4B3B5c",
  ],
  provider: "evm-ethereum-sepolia",
  commit: "7b4d430",
  timestamp: "2026-09-16T21:53:12.853Z",
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

const BNB_TESTNET_EVIDENCE = {
  verifier: "0x26e3515d02bb3d8122fad109d159f43e81e8beeb",
  contracts: [
    "0xdd01da1b53ba46bf1ce8c71bc1c5e86e8784694b",
    "0x6f813e1221cb5f760bb5c467983c014bbe4b3b5c",
  ],
  provider: "evm-bnb-testnet",
  commit: "9755727ba",
  timestamp: "2026-10-11T15:16:22.645Z",
} as const;

const HYPERLIQUID_TESTNET_EVIDENCE = {
  verifier: "0x26e3515d02bb3d8122fad109d159f43e81e8beeb",
  contracts: [
    "0xdd01da1b53ba46bf1ce8c71bc1c5e86e8784694b",
    "0x6f813e1221cb5f760bb5c467983c014bbE4B3B5c",
  ],
  provider: "evm-hyperliquid-testnet",
  commit: "8449317fc",
  timestamp: "2026-10-11T14:08:00.682Z",
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
  provider: "privatedao-payroll-kernel",
  asset: "WSOL",
  commit: "adcb3ae",
  timestamp: "2026-09-11T21:36:18.740Z",
} as const;

const ZCASH_TESTNET_PAYROLL_EVIDENCE = {
  provider: "zcash-testnet-zallet",
  transaction: "c14158dad7761c5d3c497cf27b2a80ffa909156ba2306e18f3731e608d1521df",
  blockNumber: "4485265",
  commit: "d41bec9addcd6580afce1fa11554d5ec03b94c86",
  timestamp: "2026-10-10T12:42:21.000Z",
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

const SOLANA_DEVNET_ORGANIZATIONAL_EVIDENCE = {
  provider: "solana-devnet",
  governanceProgram: "EP9xE8MJZ6FfyEwLqns6HDdUZBknEa7WGYs1Jzsecuva",
  auctionProgram: "4Z7AeFRZHBCok68hhbUgVLC3uFaEP2aDWozsYVksPuQd",
  commit: "c2c7ef8afb15e0bb8cf5f1f34c59d9813e65072a",
  timestamp: "2026-09-25T01:38:47.952Z",
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

const ORGANIZATIONAL_EVIDENCE = {
  "ethereum-sepolia": {
    provider: "evm-ethereum-sepolia-organizational",
    contracts: [
      "0x5a10a22ffbd1f2db3415c96731a07ee8d35c11bc",
      "0x6c7362977625a0c1a403f02fef606cb6315e953f",
      "0xb0698a8462b62654773a0171f39c0cce86c9a95d",
      "0x5134fa0a560ae838f1e0324ce38a385a26711d68",
    ],
    assets: ["ETH"],
    commit: "b0fed5204",
    timestamp: "2026-10-11T23:56:56.361Z",
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
      "0xd3e604000917d0edd557005a8af39a33ee05ff4b",
      "0x6b55c67d83645060cae54ea4246310246afa07d9",
      "0xb93e85befcabcf2cf2c6c4bdd5e8b670b04c82d0",
      "0x21c4cd7d2e039f7debfa87f51fd919be7ea912f1",
    ],
    assets: ["ETH"],
    commit: "b0fed5204",
    timestamp: "2026-10-12T00:15:59.960Z",
  },
  "base-sepolia": {
    provider: "evm-base-sepolia-organizational",
    contracts: [
      "0xbba00deafaa326943390724ab0de021a661a0e51",
      "0x02ab06a15a3c210a5c902513a2195e3e2b7096df",
      "0x7801916f5bfadc99a0e14735a8f49d21d85eb61f",
      "0xf70e48d8bb75757420c7ea231aaaff3e5df2aba0",
    ],
    assets: ["ETH"],
    commit: "b0fed5204",
    timestamp: "2026-10-12T00:13:22.254Z",
  },
  "robinhood-testnet": {
    provider: "evm-robinhood-testnet-organizational",
    contracts: [
      "0x251ea5ec76e21c8b694903ac8e45c1c4587a5291",
      "0xc26ca8381e0c55e128348ae54e39aaa5a384753f",
      "0x290c6498cef5bf0b80461aa62d8e199a79695b6d",
      "0xba041bea600ad3f0f115f18dd24fe9a1e2623442",
    ],
    assets: ["ETH"],
    commit: "b0fed5204",
    timestamp: "2026-10-12T00:21:40.273Z",
  },
  "bnb-testnet": {
    provider: "evm-bnb-testnet-organizational",
    contracts: [
      "0x9d03c14562852092b39c1dd96c441dd9484b5a2b",
      "0x0a1a6467fdcc858899692c0f7d15beca2483d069",
      "0x3fc47618e59c5bf8a19fe6a5298938fc9b8c3bdc",
      "0x9dfc12d43a60ec0edcc2da33a6c5f943839ea392",
    ],
    assets: ["BNB"],
    commit: "b0fed5204",
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
  if (network.family === "utxo") return network.id === "zcash-testnet" ? "TAZ" : "ZEC";
  if (network.family === "exchange") return "USDC";
  return null;
}

function defaultStatus(declared: boolean, network: NetworkDescriptor): NativeCapabilityStatus {
  if (!declared || network.stage === "planned") return "planned";
  return "implementation";
}

function applyEthereumSepoliaEvidence(entry: NativeCapabilityEntry): NativeCapabilityEntry {
  const isBlind = entry.product === "blind-verification" && entry.capability === "verification.blind.prove";
  const isRecord = entry.product === "record-verification" && ["verification.record.create", "verification.record.verify"].includes(entry.capability);
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

function applyBnbTestnetEvidence(entry: NativeCapabilityEntry): NativeCapabilityEntry {
  const isBlind = entry.product === "blind-verification" && entry.capability === "verification.blind.prove";
  const isRecord = entry.product === "record-verification" && ["verification.record.create", "verification.record.verify"].includes(entry.capability);
  const isPayroll = entry.product === "payroll" && entry.capability === "payroll.settle";
  if (entry.network !== "bnb-testnet" || (!isBlind && !isRecord && !isPayroll)) return entry;
  return {
    ...entry,
    provider: isPayroll ? "evm-bnb-testnet-organizational" : BNB_TESTNET_EVIDENCE.provider,
    contracts: isPayroll ? ["0x62f8f7ffc4235a1dde58ba811fa9c448c56f7620"] : BNB_TESTNET_EVIDENCE.contracts,
    verifier: BNB_TESTNET_EVIDENCE.verifier,
    walletModel: "provider-wallet",
    supportsExecution: true,
    supportsPrivateExecution: isPayroll ? false : true,
    supportsPrivateSettlement: isPayroll ? false : true,
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
    verifier: HYPERLIQUID_TESTNET_EVIDENCE.verifier,
    walletModel: "provider-wallet",
    supportsExecution: true,
    supportsProof: isBlind,
    supportsReceipt: true,
    supportsReconciliation: false,
    status: "testnet_verified",
    lastVerifiedCommit: HYPERLIQUID_TESTNET_EVIDENCE.commit,
    lastVerifiedTimestamp: HYPERLIQUID_TESTNET_EVIDENCE.timestamp,
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
  if (!["payroll.calculate", "payroll.approve"].includes(entry.capability)) return entry;
  return {
    ...entry,
    provider: PAYROLL_SOLANA_DEVNET_EVIDENCE.provider,
    supportedAssets: [PAYROLL_SOLANA_DEVNET_EVIDENCE.asset],
    contracts: [],
    walletModel: "external-wallet",
    supportsExecution: true,
    supportsPrivateExecution: false,
    supportsPrivateSettlement: false,
    supportsProof: false,
    supportsReceipt: true,
    supportsReconciliation: false,
    status: "devnet_verified",
    lastVerifiedCommit: PAYROLL_SOLANA_DEVNET_EVIDENCE.commit,
    lastVerifiedTimestamp: PAYROLL_SOLANA_DEVNET_EVIDENCE.timestamp,
    evidence: "devnet-e2e",
  };
}

function applyPayrollEvmPolicyEvidence(entry: NativeCapabilityEntry): NativeCapabilityEntry {
  if (entry.product !== "payroll" || !["payroll.calculate", "payroll.approve"].includes(entry.capability)) return entry;
  if (!["ethereum-sepolia", "arbitrum-sepolia", "tempo-testnet", "base-sepolia"].includes(entry.network)) return entry;
  return {
    ...entry,
    provider: "privatedao-payroll-kernel",
    contracts: [],
    walletModel: "none",
    supportsExecution: true,
    supportsPrivateExecution: false,
    supportsPrivateSettlement: false,
    supportsProof: false,
    supportsReceipt: true,
    supportsReconciliation: false,
    status: "testnet_verified",
    evidence: "kernel-policy-testnet",
  };
}

function applyZcashTestnetEvidence(entry: NativeCapabilityEntry): NativeCapabilityEntry {
  if (entry.network === "zcash-testnet" && [
    "verification.blind.prove",
    "verification.record.create",
    "verification.record.verify",
    "payroll.calculate",
    "payroll.approve",
    "governance.proposal.execute",
    "treasury.policy.check",
    "auction.bid.commit",
    "auction.settle",
  ].includes(entry.capability)) {
    return {
      ...entry,
      provider: "privatedao-kernel-policy",
      walletModel: "none",
      supportsExecution: true,
      supportsPrivateExecution: false,
      supportsPrivateSettlement: false,
      supportsProof: !["treasury.policy.check", "payroll.calculate", "payroll.approve"].includes(entry.capability),
      supportsReceipt: true,
      supportsReconciliation: true,
      status: "testnet_ready",
      evidence: "runtime-only",
    };
  }
  if (entry.product !== "payroll" || entry.network !== "zcash-testnet") return entry;
  if (entry.capability !== "payroll.settle") return entry;
  return {
    ...entry,
    provider: ZCASH_TESTNET_PAYROLL_EVIDENCE.provider,
    supportedAssets: ["TAZ"],
    walletModel: "provider-wallet",
    supportsExecution: true,
    supportsPrivateExecution: true,
    supportsPrivateSettlement: true,
    supportsReceipt: true,
    supportsReconciliation: true,
    status: "testnet_verified",
    lastVerifiedCommit: ZCASH_TESTNET_PAYROLL_EVIDENCE.commit,
    lastVerifiedTimestamp: ZCASH_TESTNET_PAYROLL_EVIDENCE.timestamp,
    evidence: "testnet-e2e",
  };
}

function applySolanaKernelPolicyReadiness(entry: NativeCapabilityEntry): NativeCapabilityEntry {
  if (entry.network !== "solana-devnet" || !["verification.blind.prove", "verification.record.create", "verification.record.verify"].includes(entry.capability)) return entry;
  return {
    ...entry,
    provider: "privatedao-kernel-policy",
    walletModel: "none",
    supportsExecution: true,
    supportsPrivateExecution: false,
    supportsPrivateSettlement: false,
    supportsProof: true,
    supportsReceipt: true,
    supportsReconciliation: true,
    status: "testnet_ready",
    evidence: "kernel-policy-testnet",
  };
}

function applyFutureKernelPolicyReadiness(entry: NativeCapabilityEntry): NativeCapabilityEntry {
  if (!["bnb-testnet", "robinhood-testnet", "hyperliquid-testnet", "hypercore-testnet"].includes(entry.network)) return entry;
  if (!["verification.blind.prove", "verification.record.create", "verification.record.verify", "payroll.calculate", "payroll.approve", "treasury.policy.check", "governance.proposal.execute", "auction.bid.commit", "auction.settle"].includes(entry.capability)) return entry;
  return {
    ...entry,
    provider: "privatedao-kernel-policy",
    walletModel: "none",
    supportsExecution: true,
    supportsPrivateExecution: false,
    supportsPrivateSettlement: false,
    supportsProof: !["treasury.policy.check", "payroll.calculate", "payroll.approve"].includes(entry.capability),
    supportsReceipt: true,
    supportsReconciliation: true,
    status: "testnet_ready",
    evidence: "runtime-only",
  };
}

function applyStellarTestnetReadiness(entry: NativeCapabilityEntry): NativeCapabilityEntry {
  if (entry.network !== "stellar-testnet" || entry.product === "agent") return entry;
  if (!entry.declared) return entry;
  const lifecycleVerified = (STELLAR_TESTNET_EVIDENCE.capabilities as readonly string[]).includes(entry.capability);
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
    status: lifecycleVerified ? "testnet_verified" : "testnet_ready",
    lastVerifiedCommit: lifecycleVerified ? STELLAR_TESTNET_EVIDENCE.commit : null,
    lastVerifiedTimestamp: STELLAR_TESTNET_EVIDENCE.timestamp,
    evidence: lifecycleVerified ? "testnet-e2e" : "runtime-only",
  };
}

function applySolanaDevnetOrganizationalEvidence(entry: NativeCapabilityEntry): NativeCapabilityEntry {
  if (entry.network !== "solana-devnet") return entry;
  const isTreasury = entry.product === "treasury" && entry.capability === "treasury.policy.check";
  const isGovernance = entry.product === "governance" && entry.capability === "governance.proposal.execute";
  const isAuction = entry.product === "auction" && ["auction.bid.commit", "auction.settle"].includes(entry.capability);
  if (!isTreasury && !isGovernance && !isAuction) return entry;
  const isAuctionSettlement = entry.capability === "auction.settle";
  return {
    ...entry,
    provider: SOLANA_DEVNET_ORGANIZATIONAL_EVIDENCE.provider,
    contracts: [isAuction ? SOLANA_DEVNET_ORGANIZATIONAL_EVIDENCE.auctionProgram : SOLANA_DEVNET_ORGANIZATIONAL_EVIDENCE.governanceProgram],
    walletModel: "external-wallet",
    supportsExecution: true,
    supportsPrivateExecution: isAuction,
    supportsPrivateSettlement: isAuctionSettlement,
    supportsProof: isGovernance || isAuction,
    supportsReceipt: true,
    supportsReconciliation: true,
    status: "devnet_verified",
    lastVerifiedCommit: SOLANA_DEVNET_ORGANIZATIONAL_EVIDENCE.commit,
    lastVerifiedTimestamp: SOLANA_DEVNET_ORGANIZATIONAL_EVIDENCE.timestamp,
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

function applyOrganizationalEvidence(entry: NativeCapabilityEntry): NativeCapabilityEntry {
  const evidence = ORGANIZATIONAL_EVIDENCE[entry.network as keyof typeof ORGANIZATIONAL_EVIDENCE];
  const supportedCapability =
    (entry.product === "treasury" && entry.capability === "treasury.policy.check") ||
    (entry.product === "governance" && entry.capability === "governance.proposal.execute") ||
    (entry.product === "auction" && ["auction.bid.commit", "auction.settle"].includes(entry.capability)) ||
    (entry.product === "payroll" && entry.capability === "payroll.settle" && entry.network !== "tempo-testnet");
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

/**
 * Conservative native capability registry. Planned entries are emitted so
 * discovery can explain the roadmap, but only evidence-backed entries are
 * executable or presented as verified support.
 */
export function buildNativeCapabilityRegistry(): readonly NativeCapabilityEntry[] {
  return PRODUCT_CATALOG.flatMap((product) =>
    product.capabilities.flatMap((capability) =>
      NETWORK_MATRIX.map((network) => {
        const declared = product.networks.includes(network.id) && capability.networks.includes(network.id);
        const baseEntry: NativeCapabilityEntry = {
          product: product.id,
          capability: capability.id,
          network: network.id,
          networkFamily: network.family,
          declared,
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
          status: defaultStatus(declared, network),
          lastVerifiedCommit: null,
          lastVerifiedTimestamp: null,
          evidence: "none",
        };
        const withEthereum = applyEthereumSepoliaEvidence(baseEntry);
        const withBase = applyBaseSepoliaEvidence(withEthereum);
        const withArbitrum = applyArbitrumSepoliaEvidence(withBase);
        const withAgent = applyAgentMainnetEvidence(withArbitrum);
        const withPayroll = applyPayrollDevnetEvidence(withAgent);
        const withPayrollEvm = applyPayrollEvmPolicyEvidence(withPayroll);
        const withZcash = applyZcashTestnetEvidence(withPayrollEvm);
        const withTempo = applyTempoTestnetEvidence(withZcash);
        const withSolanaPolicy = applySolanaKernelPolicyReadiness(withTempo);
        const withFuturePolicy = applyFutureKernelPolicyReadiness(withSolanaPolicy);
        const withSolanaOrg = applySolanaDevnetOrganizationalEvidence(withFuturePolicy);
        const withBnb = applyBnbTestnetEvidence(withSolanaOrg);
        const withHyperliquid = applyHyperliquidTestnetEvidence(withBnb);
        const withStellar = applyStellarTestnetReadiness(withHyperliquid);
        return applyOrganizationalEvidence(withStellar);
      }),
    ),
  );
}
