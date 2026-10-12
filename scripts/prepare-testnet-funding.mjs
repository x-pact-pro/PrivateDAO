import { privateKeyToAccount } from "viem/accounts";

const networks = [
  {
    id: "ethereum-sepolia",
    chainId: 11155111,
    asset: "ETH",
    recommended: "0.05 ETH",
    purpose: "contract deployment, verification writes, negative checks and revocations",
    faucet: "official Ethereum Sepolia faucet/provider",
  },
  {
    id: "base-sepolia",
    chainId: 84532,
    asset: "ETH",
    recommended: "0.02 ETH",
    purpose: "contract deployment, verification writes, negative checks and revocations",
    faucet: "official Base Sepolia faucet/provider",
  },
  {
    id: "arbitrum-sepolia",
    chainId: 421614,
    asset: "ETH",
    recommended: "0.02 ETH",
    purpose: "contract deployment, verification writes, negative checks and revocations",
    faucet: "official Arbitrum Sepolia faucet/provider",
  },
  {
    id: "robinhood-testnet",
    chainId: 46630,
    asset: "ETH",
    recommended: "0.05 ETH",
    purpose: "contract deployment and verification lifecycle writes",
    faucet: "official Robinhood Chain testnet faucet/provider",
  },
  {
    id: "hyperliquid-testnet",
    chainId: 998,
    asset: "HYPE",
    recommended: "0.05 HYPE",
    purpose: "HyperEVM contract deployment and verification lifecycle writes",
    faucet: "official Hyperliquid testnet faucet/provider",
  },
  {
    id: "tempo-testnet",
    chainId: 42431,
    asset: "AlphaUSD",
    token: "0x20c0000000000000000000000000000000000001",
    recommended: "5 AlphaUSD",
    purpose: "Tempo fee-token balance plus tokenized Treasury/Auction and verification writes",
    faucet: "official Tempo Moderato testnet faucet/provider",
  },
];

const rawKey = process.env.PDAO_EVM_DEPLOYER_PRIVATE_KEY?.trim();
const suppliedAddress = process.env.PDAO_EVM_TEST_WALLET?.trim();
let address = suppliedAddress;

if (address && !/^0x[0-9a-fA-F]{40}$/.test(address)) {
  throw new Error("PDAO_EVM_TEST_WALLET must be a public 20-byte EVM address.");
}

if (!address && rawKey) {
  const normalizedKey = rawKey.startsWith("0x") ? rawKey : `0x${rawKey}`;
  if (!/^0x[0-9a-fA-F]{64}$/.test(normalizedKey)) {
    throw new Error("PDAO_EVM_DEPLOYER_PRIVATE_KEY must be a 32-byte hex key.");
  }
  address = privateKeyToAccount(normalizedKey).address;
}

if (!address) {
  throw new Error("Provide PDAO_EVM_TEST_WALLET or PDAO_EVM_DEPLOYER_PRIVATE_KEY through the secure environment.");
}

const requested = process.env.PDAO_EVM_NETWORKS
  ? process.env.PDAO_EVM_NETWORKS.split(",").map((value) => value.trim()).filter(Boolean)
  : networks.map(({ id }) => id);
const selected = networks.filter(({ id }) => requested.includes(id));
if (selected.length !== requested.length || selected.length === 0) {
  throw new Error(`PDAO_EVM_NETWORKS must contain only: ${networks.map(({ id }) => id).join(", ")}`);
}

const output = {
  schema: "privatedao.testnet-funding-pack.v1",
  generatedAt: new Date().toISOString(),
  mode: "funding-preparation-only",
  readOnly: true,
  rpcCalls: false,
  balanceReads: false,
  signing: false,
  transactions: false,
  deployerAddress: address,
  networks: selected,
};

if (process.env.PDAO_FUNDING_PACK_OUTPUT) {
  const { writeFile } = await import("node:fs/promises");
  await writeFile(process.env.PDAO_FUNDING_PACK_OUTPUT, `${JSON.stringify(output, null, 2)}\n`, { mode: 0o600 });
}

console.log(JSON.stringify(output, null, 2));
