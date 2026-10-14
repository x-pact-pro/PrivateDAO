import type { NetworkId } from "./index.js";

export type NetworkStage = "available" | "planned";
export type NetworkFamily = "solana" | "evm" | "utxo" | "stellar" | "exchange";
export type EcosystemId =
  | "solana"
  | "ethereum"
  | "arbitrum"
  | "bnb"
  | "base"
  | "robinhood"
  | "tempo"
  | "zcash"
  | "hyperliquid"
  | "stellar";

export interface EcosystemDescriptor {
  id: EcosystemId;
  label: string;
  networks: readonly NetworkId[];
  status: "configured" | "planned";
}

export interface NetworkDescriptor {
  id: NetworkId;
  label: string;
  family: NetworkFamily;
  stage: NetworkStage;
  environment: "devnet" | "testnet" | "mainnet" | "integration";
  chainId?: string;
  finalityModel?: string;
  explorerBaseUrl?: string;
  adapterId?: string;
}

export const NETWORK_MATRIX: readonly NetworkDescriptor[] = [
  {
    id: "solana-devnet",
    label: "Solana Devnet",
    family: "solana",
    stage: "available",
    environment: "devnet",
    finalityModel: "confirmed/finalized commitment",
    explorerBaseUrl: "https://explorer.solana.com/?cluster=devnet",
    adapterId: "solana-devnet",
  },
  {
    id: "solana-mainnet-beta",
    label: "Solana Mainnet",
    family: "solana",
    stage: "available",
    environment: "mainnet",
    finalityModel: "confirmed/finalized commitment",
    explorerBaseUrl: "https://explorer.solana.com/",
    adapterId: "solana-mainnet-beta",
  },
  {
    id: "ethereum-sepolia",
    label: "Ethereum Sepolia",
    family: "evm",
    stage: "available",
    environment: "testnet",
    chainId: "11155111",
    finalityModel: "EVM block finality",
    explorerBaseUrl: "https://sepolia.etherscan.io/",
    adapterId: "evm-ethereum-sepolia",
  },
  {
    id: "ethereum-mainnet",
    label: "Ethereum Mainnet",
    family: "evm",
    stage: "planned",
    environment: "mainnet",
    chainId: "1",
    finalityModel: "EVM block finality",
    explorerBaseUrl: "https://etherscan.io/",
    adapterId: "evm-ethereum-mainnet",
  },
  {
    id: "arbitrum-sepolia",
    label: "Arbitrum Sepolia",
    family: "evm",
    // The chain adapter and RPC are available; product execution remains gated by evidence.
    stage: "available",
    environment: "testnet",
    chainId: "421614",
    finalityModel: "Arbitrum batch/finality lifecycle",
    explorerBaseUrl: "https://sepolia.arbiscan.io/",
    adapterId: "evm-arbitrum-sepolia",
  },
  {
    id: "arbitrum-one",
    label: "Arbitrum One",
    family: "evm",
    stage: "planned",
    environment: "mainnet",
    chainId: "42161",
    finalityModel: "Arbitrum batch/finality lifecycle",
    explorerBaseUrl: "https://arbiscan.io/",
    adapterId: "evm-arbitrum-one",
  },
  {
    id: "bnb-testnet",
    label: "BNB Smart Chain Testnet",
    family: "evm",
    // The chain adapter and RPC are available; product execution remains gated by evidence.
    stage: "available",
    environment: "testnet",
    chainId: "97",
    finalityModel: "EVM block finality",
    explorerBaseUrl: "https://testnet.bscscan.com/",
    adapterId: "evm-bnb-testnet",
  },
  {
    id: "bnb-mainnet",
    label: "BNB Smart Chain",
    family: "evm",
    stage: "planned",
    environment: "mainnet",
    chainId: "56",
    finalityModel: "EVM block finality",
    explorerBaseUrl: "https://bscscan.com/",
    adapterId: "evm-bnb-mainnet",
  },
  {
    id: "base-sepolia",
    label: "Base Sepolia",
    family: "evm",
    // The chain adapter and RPC are available; product execution remains gated by evidence.
    stage: "available",
    environment: "testnet",
    chainId: "84532",
    finalityModel: "EVM block finality",
    explorerBaseUrl: "https://sepolia.basescan.org/",
    adapterId: "evm-base-sepolia",
  },
  {
    id: "base-mainnet",
    label: "Base Mainnet",
    family: "evm",
    stage: "planned",
    environment: "mainnet",
    chainId: "8453",
    finalityModel: "EVM block finality",
    explorerBaseUrl: "https://basescan.org/",
    adapterId: "evm-base-mainnet",
  },
  {
    id: "robinhood-testnet",
    label: "Robinhood Chain Testnet",
    family: "evm",
    // The chain adapter and RPC are available; product execution remains gated by evidence.
    stage: "available",
    environment: "testnet",
    chainId: "46630",
    finalityModel: "Arbitrum rollup finality lifecycle",
    explorerBaseUrl: "https://explorer.testnet.chain.robinhood.com/",
    adapterId: "evm-robinhood-testnet",
  },
  {
    id: "robinhood-mainnet",
    label: "Robinhood Chain",
    family: "evm",
    stage: "planned",
    environment: "mainnet",
    chainId: "4663",
    finalityModel: "Arbitrum rollup finality lifecycle",
    explorerBaseUrl: "https://robinhoodchain.blockscout.com/",
    adapterId: "evm-robinhood-mainnet",
  },
  {
    id: "tempo-testnet",
    label: "Tempo Testnet",
    family: "evm",
    stage: "available",
    environment: "testnet",
    chainId: "42431",
    finalityModel: "EVM block finality",
    explorerBaseUrl: "https://explore.testnet.tempo.xyz/",
    adapterId: "evm-tempo-testnet",
  },
  {
    id: "tempo-mainnet",
    label: "Tempo Mainnet",
    family: "evm",
    stage: "planned",
    environment: "mainnet",
    finalityModel: "EVM block finality",
    adapterId: "evm-tempo-mainnet",
  },
  {
    id: "zcash-testnet",
    label: "Zcash Testnet",
    family: "utxo",
    stage: "planned",
    environment: "testnet",
    finalityModel: "shielded transaction confirmation",
  },
  {
    id: "hyperliquid-testnet",
    label: "Hyperliquid Testnet",
    family: "evm",
    // HyperEVM JSON-RPC adapter is available; product execution remains gated by evidence.
    stage: "available",
    environment: "testnet",
    chainId: "998",
    finalityModel: "HyperBFT/EVM block finality",
    explorerBaseUrl: "https://www.hyperscan.com/",
    adapterId: "evm-hyperliquid-testnet",
  },
  {
    id: "stellar-testnet",
    label: "Stellar Testnet",
    family: "stellar",
    stage: "available",
    environment: "testnet",
    chainId: "Test SDF Network ; September 2015",
    finalityModel: "Stellar ledger finality",
    explorerBaseUrl: "https://stellar.expert/explorer/testnet/tx/",
    adapterId: "stellar-testnet-horizon",
  },
];

/**
 * The enterprise roadmap names ten ecosystems. This inventory is deliberately
 * separate from execution evidence: a configured ecosystem is not an
 * executable product lane until it has a provider, Kernel binding, receipt,
 * and independent test evidence.
 */
export const PRIMARY_ECOSYSTEMS: readonly EcosystemDescriptor[] = [
  { id: "solana", label: "Solana", networks: ["solana-devnet", "solana-mainnet-beta"], status: "configured" },
  { id: "ethereum", label: "Ethereum", networks: ["ethereum-sepolia", "ethereum-mainnet"], status: "configured" },
  { id: "arbitrum", label: "Arbitrum", networks: ["arbitrum-sepolia", "arbitrum-one"], status: "configured" },
  { id: "bnb", label: "BNB Chain", networks: ["bnb-testnet", "bnb-mainnet"], status: "configured" },
  { id: "base", label: "Base", networks: ["base-sepolia", "base-mainnet"], status: "configured" },
  { id: "robinhood", label: "Robinhood Chain", networks: ["robinhood-testnet", "robinhood-mainnet"], status: "configured" },
  { id: "tempo", label: "Tempo", networks: ["tempo-testnet", "tempo-mainnet"], status: "configured" },
  { id: "zcash", label: "Zcash", networks: ["zcash-testnet"], status: "configured" },
  { id: "hyperliquid", label: "Hyperliquid", networks: ["hyperliquid-testnet"], status: "configured" },
  { id: "stellar", label: "Stellar", networks: ["stellar-testnet"], status: "configured" },
];

export function validatePrimaryEcosystems(): string[] {
  const errors: string[] = [];
  const ecosystemIds = new Set<EcosystemId>();
  const networkIds = new Set(NETWORK_MATRIX.map((network) => network.id));
  for (const ecosystem of PRIMARY_ECOSYSTEMS) {
    if (ecosystemIds.has(ecosystem.id)) errors.push(`duplicate ecosystem ${ecosystem.id}`);
    ecosystemIds.add(ecosystem.id);
    for (const network of ecosystem.networks) {
      if (!networkIds.has(network)) errors.push(`${ecosystem.id}: unknown network ${network}`);
    }
  }
  if (PRIMARY_ECOSYSTEMS.length !== 10) errors.push(`expected 10 primary ecosystems, found ${PRIMARY_ECOSYSTEMS.length}`);
  return errors;
}

if (validatePrimaryEcosystems().length > 0) {
  throw new Error(`Invalid PrivateDAO ecosystem catalog:\n${validatePrimaryEcosystems().join("\n")}`);
}

export function getNetwork(networkId: NetworkId): NetworkDescriptor {
  const descriptor = NETWORK_MATRIX.find((network) => network.id === networkId);
  if (!descriptor) throw new Error(`Unknown PrivateDAO network: ${networkId}`);
  return descriptor;
}

export function isNetworkAvailable(networkId: NetworkId): boolean {
  return getNetwork(networkId).stage === "available";
}
