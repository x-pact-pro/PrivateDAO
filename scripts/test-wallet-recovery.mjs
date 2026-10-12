import assert from "node:assert/strict";
import { EvmNetworkAdapter, EVM_NETWORK_CONFIGS, HyperCoreNetworkAdapter, SolanaBrowserExecutionProvider, ZcashNetworkAdapter, ZCASH_NETWORK_CONFIGS } from "../packages/privatedao-runtime/src/index.ts";

const session = (network, address) => ({
  address,
  network,
  connectedAt: "2026-10-11T00:00:00.000Z",
});

const solanaProgramId = "EP9xE8MJZ6FfyEwLqns6HDdUZBknEa7WGYs1Jzsecuva";
const solanaProvider = new SolanaBrowserExecutionProvider(async () => new Response("{}", { status: 200 }), "https://devnet.example.test");
const solanaIntent = {
  context: {
    requestId: "recovery-solana-browser",
    idempotencyKey: "recovery-solana-browser-key",
    product: "governance",
    capability: "governance.proposal.execute",
    network: "solana-devnet",
  },
  payload: {
    kind: "solana-browser-transaction",
    operation: "governance.proposal.execute",
    account: "11111111111111111111111111111111",
    programId: solanaProgramId,
  },
  accounts: [],
};
const recoveredSolana = await solanaProvider.prepare(solanaIntent);
assert.equal(recoveredSolana.signingMode, "browser");
assert.equal(recoveredSolana.requiredSigners[0].network, "solana-devnet");
assert.equal((await solanaProvider.prepare(solanaIntent)).executionId, recoveredSolana.executionId);
await assert.rejects(
  () => solanaProvider.prepare({ ...solanaIntent, context: { ...solanaIntent.context, network: "ethereum-sepolia" } }),
  /Devnet-only/,
);

const evmNetworks = [
  "ethereum-sepolia",
  "arbitrum-sepolia",
  "tempo-testnet",
  "base-sepolia",
  "robinhood-testnet",
  "hyperliquid-testnet",
];
for (const network of evmNetworks) {
  const evmConfig = EVM_NETWORK_CONFIGS.find((entry) => entry.network === network);
  assert(evmConfig, `${network} EVM config is required for recovery coverage`);
  let switchedChain;
  const evmAdapter = new EvmNetworkAdapter({
    id: `recovery-test-${network}`,
    config: evmConfig,
    capabilities: ["governance.proposal.execute"],
    transport: {
      health: async () => ({ ok: true, chainId: evmConfig.chainId, latencyMs: 1 }),
      prepare: async () => { throw new Error("not used in recovery test"); },
      submit: async () => { throw new Error("not used in recovery test"); },
      status: async () => { throw new Error("not used in recovery test"); },
      receipt: async () => { throw new Error("not used in recovery test"); },
      estimateFee: async () => ({ network, atomicAmount: "0", asset: evmConfig.nativeAsset }),
    },
    wallet: {
      connect: async () => session(network, "0x1111111111111111111111111111111111111111"),
      switchChain: async (chainId) => { switchedChain = chainId; },
      sign: async (payload) => payload,
    },
  });
  const recoveredEvm = await evmAdapter.connectWallet();
  assert.equal(recoveredEvm.network, network);
  await evmAdapter.switchWalletChain();
  assert.equal(switchedChain, evmConfig.chainId);
}

const evmConfig = EVM_NETWORK_CONFIGS.find((entry) => entry.network === "hyperliquid-testnet");
assert(evmConfig, "Hyperliquid EVM config is required for wrong-network coverage");
const evmTransport = {
  health: async () => ({ ok: true, chainId: evmConfig.chainId, latencyMs: 1 }),
  prepare: async () => { throw new Error("not used in recovery test"); },
  submit: async () => { throw new Error("not used in recovery test"); },
  status: async () => { throw new Error("not used in recovery test"); },
  receipt: async () => { throw new Error("not used in recovery test"); },
  estimateFee: async () => ({ network: evmConfig.network, atomicAmount: "0", asset: evmConfig.nativeAsset }),
};

const wrongEvmAdapter = new EvmNetworkAdapter({
  id: "recovery-test-wrong-evm",
  config: evmConfig,
  capabilities: ["governance.proposal.execute"],
  transport: evmTransport,
  wallet: {
    connect: async () => session("ethereum-sepolia", "0x1111111111111111111111111111111111111111"),
    switchChain: async () => undefined,
    sign: async (payload) => payload,
  },
});
await assert.rejects(() => wrongEvmAdapter.connectWallet(), /different network/);

const zcashConfig = ZCASH_NETWORK_CONFIGS.find((entry) => entry.network === "zcash-testnet");
assert(zcashConfig, "Zcash Testnet config is required for recovery coverage");
const zcashTransport = {
  health: async () => ({ ok: true, network: "zcash-testnet", latencyMs: 1 }),
  prepare: async () => { throw new Error("not used in recovery test"); },
  submit: async () => { throw new Error("not used in recovery test"); },
  status: async () => { throw new Error("not used in recovery test"); },
  receipt: async () => { throw new Error("not used in recovery test"); },
  estimateFee: async () => ({ network: "zcash-testnet", atomicAmount: "0", asset: "TAZ" }),
};
const zcashAdapter = new ZcashNetworkAdapter({
  id: "recovery-test-zcash",
  config: zcashConfig,
  capabilities: ["payroll.settle"],
  transport: zcashTransport,
  wallet: {
    connect: async () => session("zcash-testnet", "utest1recovery"),
    sign: async (payload) => payload,
  },
});
const recoveredZcash = await zcashAdapter.connectWallet();
assert.equal(recoveredZcash.network, "zcash-testnet");
const wrongZcashAdapter = new ZcashNetworkAdapter({
  id: "recovery-test-wrong-zcash",
  config: zcashConfig,
  capabilities: ["payroll.settle"],
  transport: zcashTransport,
  wallet: {
    connect: async () => session("ethereum-sepolia", "wrong-network"),
    sign: async (payload) => payload,
  },
});
await assert.rejects(() => wrongZcashAdapter.connectWallet(), /different Zcash network/);

let hypercoreCalls = 0;
const hypercore = new HyperCoreNetworkAdapter({
  apiUrl: "https://api.hyperliquid-testnet.xyz/info",
  fetchImpl: async () => {
    hypercoreCalls += 1;
    return new Response(JSON.stringify({ universe: [{ name: "ETH" }] }), { status: 200 });
  },
});
assert.equal((await hypercore.health()).ok, true);
assert.equal((await hypercore.health()).ok, true);
assert.equal(hypercoreCalls, 2, "HyperCore recovery must remain stateless and reconnect per health check");

console.log("WALLET_RECOVERY: PASS solana-browser-recovery=PASS evm-chain-check=PASS zcash-testnet-check=PASS hypercore-stateless-recovery=PASS wrong-network-rejection=PASS");
