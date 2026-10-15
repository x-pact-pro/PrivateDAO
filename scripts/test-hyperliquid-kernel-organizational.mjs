import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import {
  EVM_NETWORK_CONFIGS,
  EvmNetworkAdapter,
  InMemoryProviderRegistry,
  ViemEvmTransport,
  createPrivateDaoRuntime,
} from "../packages/privatedao-runtime/src/index.ts";
import {
  createPublicClient,
  createWalletClient,
  defineChain,
  http,
  keccak256,
  toBytes,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";

const NETWORK = "hyperliquid-testnet";
const RPC = process.env.PDAO_EVM_HYPERLIQUID_TESTNET_RPC_URL || "https://rpc.hyperliquid-testnet.xyz/evm";
const rawKey = process.env.PDAO_EVM_DEPLOYER_PRIVATE_KEY?.trim();
const key = rawKey && /^[0-9a-fA-F]{64}$/.test(rawKey) ? `0x${rawKey}` : rawKey;
if (!key || !/^0x[0-9a-fA-F]{64}$/.test(key)) throw new Error("PDAO_EVM_DEPLOYER_PRIVATE_KEY is required for the Testnet Kernel E2E.");
if (!/^https:\/\//.test(RPC)) throw new Error("Hyperliquid Testnet RPC must use HTTPS.");

const config = EVM_NETWORK_CONFIGS.find((entry) => entry.network === NETWORK);
assert.ok(config, "Hyperliquid Testnet must be present in the EVM registry");
const chain = defineChain({
  id: Number(config.chainId),
  name: config.label,
  nativeCurrency: { name: config.nativeAsset, symbol: config.nativeAsset, decimals: 18 },
  rpcUrls: { default: { http: [RPC] } },
});
const account = privateKeyToAccount(key);
const transport = http(RPC, { timeout: 30_000, retryCount: 0 });
const publicClient = createPublicClient({ chain, transport });
const walletClient = createWalletClient({ account, chain, transport });
const artifact = JSON.parse(await readFile("packages/evm-verification/deployments/organizational-hyperliquid-testnet.json", "utf8"));
assert.equal(artifact.network, NETWORK);
assert.equal(artifact.chainId, 998);

const treasuryAbi = JSON.parse(await readFile("packages/evm-verification/artifacts/PrivateDaoTreasury.abi", "utf8"));
const governanceAbi = JSON.parse(await readFile("packages/evm-verification/artifacts/PrivateDaoGovernance.abi", "utf8"));
const auctionAbi = JSON.parse(await readFile("packages/evm-verification/artifacts/PrivateDaoSealedAuction.abi", "utf8"));

const providerId = "evm-hyperliquid-testnet-organizational";
const capabilities = ["treasury.policy.check", "governance.proposal.execute", "auction.bid.commit"];
const evmTransport = new ViemEvmTransport(
  publicClient,
  walletClient,
  NETWORK,
  config.chainId,
  config.environment,
  config.explorerBaseUrl,
  config.nativeAsset,
);
const adapter = new EvmNetworkAdapter({ id: providerId, config, capabilities, transport: evmTransport });
const providers = new InMemoryProviderRegistry();
providers.register(adapter);
const runtime = createPrivateDaoRuntime(providers);

async function execute(product, capability, address, abi, functionName, args, role = "admin") {
  const id = `${product}-${randomUUID()}`;
  const intent = {
    context: {
      requestId: id,
      idempotencyKey: id,
      product,
      capability,
      organizationId: "privatedao-hyperliquid-e2e",
      actorId: account.address,
      network: NETWORK,
      provider: providerId,
    },
    payload: { kind: "contract-write", address, abi, functionName, args, account: account.address },
    accounts: [{ role: "payer", address: account.address, network: NETWORK }],
  };
  const prepared = await runtime.gateway.prepare(intent, role);
  const submission = await runtime.gateway.submit(prepared, prepared.unsignedPayload, role);
  const receipt = await runtime.gateway.receipt({ executionId: prepared.executionId, intent: prepared.intent }, role);
  assert.equal(submission.executionId, prepared.executionId);
  assert.equal(receipt.state, "confirmed");
  assert.equal(receipt.network, NETWORK);
  assert.equal(receipt.chainId, config.chainId);
  assert.equal(receipt.provider, "privatedao-viem-evm");
  return { product, capability, executionId: prepared.executionId, txHash: receipt.signatures[0], blockNumber: receipt.blockNumber, explorerUrl: receipt.explorerUrl };
}

assert.equal(await publicClient.getChainId(), 998);
const run = `${Date.now()}-${process.pid}`;
const budgetId = keccak256(toBytes(`kernel-budget:${run}`));
const proposalId = keccak256(toBytes(`kernel-proposal:${run}`));
const actionHash = keccak256(toBytes(`kernel-action:${run}`));
const auctionId = keccak256(toBytes(`kernel-auction:${run}`));
const latest = await publicClient.getBlock({ blockTag: "latest" });
const now = latest.timestamp;

const results = [];
results.push(await execute("treasury", "treasury.policy.check", artifact.contracts.treasury.address, treasuryAbi, "configureBudget", [budgetId, 1n]));
results.push(await execute("governance", "governance.proposal.execute", artifact.contracts.governance.address, governanceAbi, "createProposal", [proposalId, actionHash, now + 600n, now + 1200n, 1n]));
results.push(await execute("auction", "auction.bid.commit", artifact.contracts.auction.address, auctionAbi, "createAuction", [auctionId, account.address, now + 600n, now + 1200n]));

await writeFile("packages/evm-verification/deployments/kernel-organizational-hyperliquid-testnet.json", `${JSON.stringify({
  schema: "privatedao.kernel-organizational-e2e.v1",
  network: NETWORK,
  chainId: 998,
  environment: "testnet",
  provider: providerId,
  gateway: "ProductExecutionGateway",
  verifiedAt: new Date().toISOString(),
  results,
}, null, 2)}\n`);
console.log(JSON.stringify({ status: "PASS", network: NETWORK, chainId: 998, provider: providerId, gateway: "ProductExecutionGateway", results }, null, 2));
