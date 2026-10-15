import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createPublicClient, defineChain, http } from "viem";

const network = process.env.PDAO_EVM_NETWORK?.trim() || "ethereum-sepolia";
const config = {
  "ethereum-sepolia": { chainId: 11155111, rpcEnv: "PDAO_EVM_ETHEREUM_SEPOLIA_RPC_URL", currency: { name: "Sepolia Ether", symbol: "ETH", decimals: 18 } },
  "arbitrum-sepolia": { chainId: 421614, rpcEnv: "PDAO_EVM_ARBITRUM_SEPOLIA_RPC_URL", currency: { name: "Arbitrum Sepolia Ether", symbol: "ETH", decimals: 18 } },
  "bnb-testnet": { chainId: 97, rpcEnv: "PDAO_EVM_BNB_TESTNET_RPC_URL", currency: { name: "BNB Testnet", symbol: "tBNB", decimals: 18 } },
  "base-sepolia": { chainId: 84532, rpcEnv: "PDAO_EVM_BASE_SEPOLIA_RPC_URL", currency: { name: "Base Sepolia Ether", symbol: "ETH", decimals: 18 } },
  "robinhood-testnet": { chainId: 46630, rpcEnv: "PDAO_EVM_ROBINHOOD_TESTNET_RPC_URL", currency: { name: "Robinhood Testnet Ether", symbol: "ETH", decimals: 18 } },
  "hyperliquid-testnet": { chainId: 998, rpcEnv: "PDAO_EVM_HYPERLIQUID_TESTNET_RPC_URL", currency: { name: "Hyperliquid Testnet HYPE", symbol: "HYPE", decimals: 18 } },
};
const selected = config[network];
if (!selected) throw new Error(`Payroll evidence verifier does not support ${network}.`);
const rpc = process.env[selected.rpcEnv]?.trim();
if (!rpc || !/^https:\/\//.test(rpc)) throw new Error(`${selected.rpcEnv} must be an explicit HTTPS Testnet RPC URL.`);
const artifact = JSON.parse(await readFile(`packages/evm-verification/deployments/organizational-${network}-payroll.json`, "utf8"));
assert.equal(artifact.schema, "privatedao.organizational-payroll-e2e.v1");
assert.equal(artifact.network, network);
assert.equal(String(artifact.chainId), String(selected.chainId));
const payroll = artifact.evidence?.payroll;
assert.equal(payroll?.status, "settled");
assert.match(artifact.contracts?.payroll?.address || "", /^0x[0-9a-fA-F]{40}$/);
const transactions = [payroll.payrollFundingHash, payroll.payrollCreateHash, payroll.payrollApproveHash, payroll.payrollSettleHash];
assert.ok(transactions.every((hash) => /^0x[0-9a-fA-F]{64}$/.test(hash)), "payroll evidence must contain four transaction hashes");
assert.equal(new Set(transactions).size, transactions.length, "payroll transaction hashes must be unique");
const chain = defineChain({ id: selected.chainId, name: network, nativeCurrency: selected.currency, rpcUrls: { default: { http: [rpc] } } });
const client = createPublicClient({ chain, transport: http(rpc, { retryCount: 0, timeout: 120_000 }) });
assert.equal(await client.getChainId(), selected.chainId);
const receipts = await Promise.all(transactions.map((hash) => client.getTransactionReceipt({ hash })));
assert.ok(receipts.every((receipt) => receipt.status === "success"), "every payroll transaction must have a successful receipt");
const payrollAbi = JSON.parse(await readFile("packages/evm-verification/artifacts/PrivateDaoPayroll.abi", "utf8"));
const batch = await client.readContract({ address: artifact.contracts.payroll.address, abi: payrollAbi, functionName: "batches", args: [payroll.payrollBatchId] });
assert.equal(Number(batch[3]), 3, "payroll batch must be settled on-chain");
console.log(JSON.stringify({ network, chainId: selected.chainId, product: "payroll", transactionCount: transactions.length, status: "verified", blockNumbers: receipts.map((receipt) => receipt.blockNumber.toString()) }, null, 2));
