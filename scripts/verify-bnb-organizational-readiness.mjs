import assert from "node:assert/strict";
import { createPublicClient, defineChain, formatEther, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";

const rpcUrl = process.env.PDAO_EVM_BNB_TESTNET_RPC_URL || "https://bsc-testnet-dataseed.bnbchain.org";
const rawKey = process.env.PDAO_EVM_DEPLOYER_PRIVATE_KEY?.trim();
const deployerKey = rawKey && /^[0-9a-fA-F]{64}$/.test(rawKey) ? `0x${rawKey}` : rawKey;
assert.ok(deployerKey && /^0x[0-9a-fA-F]{64}$/.test(deployerKey), "PDAO_EVM_DEPLOYER_PRIVATE_KEY is required; the value is never printed.");
assert.ok(/^https:\/\//.test(rpcUrl), "PDAO_EVM_BNB_TESTNET_RPC_URL must use HTTPS.");

const chain = defineChain({
  id: 97,
  name: "bnb-testnet",
  nativeCurrency: { name: "BNB Testnet", symbol: "tBNB", decimals: 18 },
  rpcUrls: { default: { http: [rpcUrl] } },
});
const account = privateKeyToAccount(deployerKey);
const client = createPublicClient({ chain, transport: http(rpcUrl, { retryCount: 0 }) });
const observedChainId = await client.getChainId();
assert.equal(observedChainId, 97, `RPC chain mismatch: expected 97, got ${observedChainId}`);

const balance = await client.getBalance({ address: account.address });
const minimum = BigInt(process.env.PDAO_EVM_MINIMUM_FUNDING_WEI || "10000000000000000");
const ready = balance > minimum;
const result = {
  status: ready ? "READY" : "FUNDING_REQUIRED",
  network: "bnb-testnet",
  chainId: observedChainId,
  deployer: account.address,
  balanceWei: balance.toString(),
  balanceTBNB: formatEther(balance),
  requiredGreaterThanWei: minimum.toString(),
  requiredGreaterThanTBNB: formatEther(minimum),
  writesPerformed: 0,
  broadcastEnabled: false,
};
console.log(JSON.stringify(result, null, 2));
if (!ready) process.exitCode = 2;
