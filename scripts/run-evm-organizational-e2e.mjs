import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import {
  createPublicClient,
  createWalletClient,
  defineChain,
  encodeAbiParameters,
  http,
  keccak256,
  formatUnits,
  parseAbi,
  parseEther,
  parseUnits,
  zeroHash,
} from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { createClient as createTempoClient } from "viem/tempo";
import { tempoModerato } from "viem/chains";
import { EVM_NETWORK_CONFIGS, EvmNetworkAdapter, InMemoryProviderRegistry, ViemEvmTransport, createPrivateDaoRuntime } from "../packages/privatedao-runtime/src/index.ts";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PACKAGE = path.join(ROOT, "packages/evm-verification");
const TEMPO_FEE_TOKEN = "0x20c0000000000000000000000000000000000001";
const TEMPO_TOKEN_DECIMALS = 6;
const NETWORK = process.env.PDAO_EVM_NETWORK?.trim() || "ethereum-sepolia";
const PRODUCT_MODE = process.env.PDAO_EVM_PRODUCT?.trim() || "all";
if (!new Set(["all", "payroll"]).has(PRODUCT_MODE)) throw new Error("PDAO_EVM_PRODUCT must be all or payroll.");
const NETWORK_CONFIG = {
  "ethereum-sepolia": { chainId: 11155111, rpcEnv: "PDAO_EVM_ETHEREUM_SEPOLIA_RPC_URL", currency: { name: "Sepolia Ether", symbol: "ETH", decimals: 18 } },
  "arbitrum-sepolia": { chainId: 421614, rpcEnv: "PDAO_EVM_ARBITRUM_SEPOLIA_RPC_URL", currency: { name: "Arbitrum Sepolia Ether", symbol: "ETH", decimals: 18 } },
  "bnb-testnet": { chainId: 97, rpcEnv: "PDAO_EVM_BNB_TESTNET_RPC_URL", currency: { name: "BNB Testnet", symbol: "tBNB", decimals: 18 } },
  "base-sepolia": { chainId: 84532, rpcEnv: "PDAO_EVM_BASE_SEPOLIA_RPC_URL", currency: { name: "Base Sepolia Ether", symbol: "ETH", decimals: 18 } },
  "robinhood-testnet": { chainId: 46630, rpcEnv: "PDAO_EVM_ROBINHOOD_TESTNET_RPC_URL", currency: { name: "Robinhood Testnet Ether", symbol: "ETH", decimals: 18 } },
  "hyperliquid-testnet": { chainId: 998, rpcEnv: "PDAO_EVM_HYPERLIQUID_TESTNET_RPC_URL", currency: { name: "Hyperliquid Testnet HYPE", symbol: "HYPE", decimals: 18 } },
  "tempo-testnet": { chainId: 42431, rpcEnv: "PDAO_EVM_TEMPO_TESTNET_RPC_URL", currency: { name: "Tempo Testnet pathUSD", symbol: "USD", decimals: 6 } },
};
const networkConfig = NETWORK_CONFIG[NETWORK];
if (!networkConfig) throw new Error(`Unsupported organizational E2E network: ${NETWORK}. Use a configured testnet only.`);
const providerConfig = EVM_NETWORK_CONFIGS.find((entry) => entry.network === NETWORK);
if (!providerConfig) throw new Error(`No registered EVM provider configuration for ${NETWORK}.`);
if (providerConfig.environment !== "testnet" || providerConfig.mainnetEnabled) throw new Error(`Organizational E2E is testnet-only: ${NETWORK}.`);
const CHAIN_ID = networkConfig.chainId;
const RPC_ENV = networkConfig.rpcEnv;
const rawKey = process.env.PDAO_EVM_DEPLOYER_PRIVATE_KEY?.trim();
const deployerKey = rawKey && /^[0-9a-fA-F]{64}$/.test(rawKey) ? `0x${rawKey}` : rawKey;
if (!deployerKey || !/^0x[0-9a-fA-F]{64}$/.test(deployerKey)) throw new Error("PDAO_EVM_DEPLOYER_PRIVATE_KEY is required for Testnet execution.");
const rpcUrl = process.env[RPC_ENV];
if (!rpcUrl || !/^https:\/\//.test(rpcUrl)) throw new Error(`${RPC_ENV} must be an explicit HTTPS RPC URL.`);

const chain = defineChain({
  id: CHAIN_ID,
  name: NETWORK,
  nativeCurrency: networkConfig.currency,
  rpcUrls: { default: { http: [rpcUrl] } },
});
const deployer = privateKeyToAccount(deployerKey);
const rpcTimeoutMs = Number(process.env.PDAO_EVM_RPC_TIMEOUT_MS || 120_000);
if (!Number.isInteger(rpcTimeoutMs) || rpcTimeoutMs < 10_000 || rpcTimeoutMs > 300_000) {
  throw new Error("PDAO_EVM_RPC_TIMEOUT_MS must be an integer between 10000 and 300000.");
}
const txReceiptTimeoutMs = Number(process.env.PDAO_EVM_TX_RECEIPT_TIMEOUT_MS || 120_000);
if (!Number.isInteger(txReceiptTimeoutMs) || txReceiptTimeoutMs < 10_000 || txReceiptTimeoutMs > 300_000) {
  throw new Error("PDAO_EVM_TX_RECEIPT_TIMEOUT_MS must be an integer between 10000 and 300000.");
}
const transport = http(rpcUrl, {
  timeout: rpcTimeoutMs,
  // A lost response must not cause viem to replay a side-effecting transaction.
  // Callers can opt into read retries explicitly, but writes stay single-submit.
  retryCount: Number(process.env.PDAO_EVM_RPC_RETRY_COUNT || 0),
  retryDelay: 1_000,
});
const writeGasLimit = BigInt(process.env.PDAO_EVM_WRITE_GAS_LIMIT || "200000");
if (writeGasLimit < 50_000n || writeGasLimit > 2_000_000n) throw new Error("PDAO_EVM_WRITE_GAS_LIMIT must be between 50000 and 2000000.");
const deployerTempoClient = NETWORK === "tempo-testnet"
  ? createTempoClient({ account: deployer, chain: tempoModerato.extend({ feeToken: TEMPO_FEE_TOKEN }), transport })
  : null;
const publicClient = deployerTempoClient ?? createPublicClient({ chain, transport });
const deployerWallet = deployerTempoClient ?? createWalletClient({ account: deployer, chain, transport });
let checker;
for (let attempt = 0; attempt < 8; attempt += 1) {
  const candidate = privateKeyToAccount(generatePrivateKey());
  const code = await publicClient.getBytecode({ address: candidate.address });
  if (!code || code === "0x") {
    checker = candidate;
    break;
  }
}
if (!checker) throw new Error("Could not allocate a fresh checker EOA without deployed code.");
const checkerTempoClient = NETWORK === "tempo-testnet"
  ? createTempoClient({ account: checker, chain: tempoModerato.extend({ feeToken: TEMPO_FEE_TOKEN }), transport })
  : null;
const checkerWallet = checkerTempoClient ?? createWalletClient({ account: checker, chain, transport });
const tempoTokenMode = NETWORK === "tempo-testnet";
if (PRODUCT_MODE === "payroll" && tempoTokenMode) throw new Error("Tempo payroll-only E2E is disabled until the token payroll lane is independently evidenced.");
const ownerProviderId = `evm-${NETWORK}-organizational-owner`;
const checkerProviderId = `evm-${NETWORK}-organizational-checker`;
const organizationalCapabilities = ["treasury.policy.check", "payroll.calculate", "payroll.approve", "payroll.settle", "governance.proposal.execute", "auction.bid.commit", "auction.settle"];
const providers = new InMemoryProviderRegistry();
providers.register(new EvmNetworkAdapter({
  id: ownerProviderId,
  config: providerConfig,
  capabilities: organizationalCapabilities,
  transport: new ViemEvmTransport(publicClient, deployerWallet, providerConfig.network, providerConfig.chainId, providerConfig.environment, providerConfig.explorerBaseUrl, providerConfig.nativeAsset),
}));
providers.register(new EvmNetworkAdapter({
  id: checkerProviderId,
  config: providerConfig,
  capabilities: organizationalCapabilities,
  transport: new ViemEvmTransport(publicClient, checkerWallet, providerConfig.network, providerConfig.chainId, providerConfig.environment, providerConfig.explorerBaseUrl, providerConfig.nativeAsset),
}));
const runtime = createPrivateDaoRuntime(providers);
const erc20Abi = parseAbi([
  "function approve(address spender, uint256 amount) returns (bool)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function transferFrom(address from, address to, uint256 amount) returns (bool)",
  "function balanceOf(address account) view returns (uint256)",
]);

const treasuryAbi = JSON.parse(await readFile(path.join(PACKAGE, `artifacts/${tempoTokenMode ? "PrivateDaoTokenTreasury" : "PrivateDaoTreasury"}.abi`), "utf8"));
const treasuryBytecode = `0x${(await readFile(path.join(PACKAGE, `artifacts/${tempoTokenMode ? "PrivateDaoTokenTreasury" : "PrivateDaoTreasury"}.bin`), "utf8")).trim()}`;
const payrollAbi = JSON.parse(await readFile(path.join(PACKAGE, "artifacts/PrivateDaoPayroll.abi"), "utf8"));
const payrollBytecode = `0x${(await readFile(path.join(PACKAGE, "artifacts/PrivateDaoPayroll.bin"), "utf8")).trim()}`;
const governanceAbi = JSON.parse(await readFile(path.join(PACKAGE, "artifacts/PrivateDaoGovernance.abi"), "utf8"));
const governanceBytecode = `0x${(await readFile(path.join(PACKAGE, "artifacts/PrivateDaoGovernance.bin"), "utf8")).trim()}`;
const auctionAbi = JSON.parse(await readFile(path.join(PACKAGE, `artifacts/${tempoTokenMode ? "PrivateDaoTokenSealedAuction" : "PrivateDaoSealedAuction"}.abi`), "utf8"));
const auctionBytecode = `0x${(await readFile(path.join(PACKAGE, `artifacts/${tempoTokenMode ? "PrivateDaoTokenSealedAuction" : "PrivateDaoSealedAuction"}.bin`), "utf8")).trim()}`;

const runId = `${Date.now()}-${process.pid}`;
async function gatewayWrite(providerId, wallet, product, capability, label, address, abi, functionName, args, value) {
  const requestId = `${NETWORK}-${product}-${label}-${runId}`;
  const payload = { kind: "contract-write", address, abi, functionName, args, account: wallet.account.address, ...(value === undefined ? {} : { value }) };
  const intent = {
    context: { requestId, idempotencyKey: requestId, product, capability, network: NETWORK, provider: providerId, organizationId: "privatedao-organizational-e2e", actorId: wallet.account.address },
    payload,
    accounts: [{ role: "payer", address: wallet.account.address, network: NETWORK }],
  };
  const prepared = await runtime.gateway.prepare(intent, providerId === checkerProviderId ? "checker" : "maker");
  const role = providerId === checkerProviderId ? "checker" : "maker";
  await runtime.gateway.submit(prepared, prepared.unsignedPayload, role);
  const receipt = await runtime.gateway.receipt({ executionId: prepared.executionId, intent: prepared.intent }, role);
  assert.equal(receipt.state, "confirmed");
  return receipt.signatures[0];
}
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function waitForPaymentState(address, paymentId, minimumState, label) {
  let lastError;
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const payment = await publicClient.readContract({ address, abi: treasuryAbi, functionName: "payments", args: [paymentId] });
      if (Number(payment[3]) >= minimumState) return payment;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!/UnknownPayment|payment.*not found/i.test(message)) throw error;
      lastError = error;
    }
    await sleep(1_000);
  }
  throw new Error(`${label} did not become visible after the confirmed transaction${lastError ? `: ${lastError.message}` : ""}`);
}
async function waitForBatchState(address, batchId, minimumState, label) {
  let lastError;
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const batch = await publicClient.readContract({ address, abi: payrollAbi, functionName: "batches", args: [batchId] });
      if (Number(batch[3]) >= minimumState) return batch;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!/UnknownBatch|batch.*not found/i.test(message)) throw error;
      lastError = error;
    }
    await sleep(1_000);
  }
  throw new Error(`${label} did not become visible after the confirmed transaction${lastError ? `: ${lastError.message}` : ""}`);
}
async function waitForChainTimestamp(target) {
  for (let attempt = 0; attempt < 180; attempt += 1) {
    const block = await publicClient.getBlock({ blockTag: "latest" });
    if (block.timestamp >= target) return;
    await sleep(1_000);
  }
  throw new Error("chain timestamp did not reach the requested test window");
}
const nonceCache = new Map();
async function takeNonce(account) {
  const address = account.address;
  // Public testnet RPCs can lag while another submission is being indexed.
  // Refresh pending state for every write and never move the local cursor back.
  const observed = await publicClient.getTransactionCount({ address, blockTag: "pending" });
  const nonce = Math.max(nonceCache.get(address) ?? 0, observed);
  nonceCache.set(address, nonce + 1);
  return nonce;
}
async function feeOverrides() {
  const multiplier = Number(process.env.PDAO_EVM_FEE_MULTIPLIER || "1");
  if (!Number.isFinite(multiplier) || multiplier < 1) throw new Error("PDAO_EVM_FEE_MULTIPLIER must be at least 1.");
  if (multiplier === 1) return {};
  const gasPrice = await publicClient.getGasPrice();
  const scaled = BigInt(Math.ceil(multiplier * 1000)) * gasPrice / 1000n;
  return { maxFeePerGas: scaled, maxPriorityFeePerGas: gasPrice };
}
const tx = async (hash) => {
  const receipt = await publicClient.waitForTransactionReceipt({ hash, timeout: txReceiptTimeoutMs });
  assert.equal(receipt.status, "success", `transaction reverted: ${hash}`);
  return receipt;
};
const write = async (wallet, address, abi, functionName, args = [], value) => {
  const hash = await wallet.writeContract({ address, abi, functionName, args, gas: writeGasLimit, nonce: await takeNonce(wallet.account), ...(value === undefined ? {} : { value }), ...(await feeOverrides()) });
  await tx(hash);
  return hash;
};
const deploy = async (wallet, abi, bytecode, args) => {
  const hash = await wallet.deployContract({ abi, bytecode, args, nonce: await takeNonce(wallet.account), ...(await feeOverrides()) });
  const receipt = await tx(hash);
  assert.ok(receipt.contractAddress, `deployment has no contract address: ${hash}`);
  return { address: receipt.contractAddress, hash, blockNumber: receipt.blockNumber.toString() };
};
const expectRevert = async (operation, label) => {
  try { await operation(); } catch { return; }
  throw new Error(`${label} unexpectedly succeeded`);
};

const observedChainId = await publicClient.getChainId();
assert.equal(observedChainId, CHAIN_ID, "RPC chain mismatch");
const deployerBalance = tempoTokenMode
  ? await publicClient.readContract({ address: TEMPO_FEE_TOKEN, abi: erc20Abi, functionName: "balanceOf", args: [deployer.address] })
  : await publicClient.getBalance({ address: deployer.address });
const minimumFunding = tempoTokenMode
  ? parseUnits(process.env.PDAO_EVM_MINIMUM_FUNDING || "2", TEMPO_TOKEN_DECIMALS)
  : parseEther(process.env.PDAO_EVM_MINIMUM_FUNDING || "0.01");
if (deployerBalance <= minimumFunding) {
  const unit = tempoTokenMode ? "pathUSD" : networkConfig.currency.symbol;
  const decimals = tempoTokenMode ? TEMPO_TOKEN_DECIMALS : 18;
  throw new Error(
    `deployer lacks enough ${unit} for ${NETWORK} E2E: ` +
    `balance=${formatUnits(deployerBalance, decimals)} ${unit}, ` +
    `required>${formatUnits(minimumFunding, decimals)} ${unit}, ` +
    `address=${deployer.address}`,
  );
}

const deployments = {
  network: NETWORK,
  chainId: CHAIN_ID,
  environment: "testnet",
  deployer: deployer.address,
  checker: checker.address,
  createdAt: new Date().toISOString(),
  contracts: {},
  evidence: {},
};

const checkerFundingHash = tempoTokenMode
  ? await write(deployerWallet, TEMPO_FEE_TOKEN, erc20Abi, "transfer", [checker.address, parseUnits("10", TEMPO_TOKEN_DECIMALS)])
  : await deployerWallet.sendTransaction({ to: checker.address, value: parseEther("0.002"), nonce: await takeNonce(deployerWallet.account), ...(await feeOverrides()) });
if (!tempoTokenMode) await tx(checkerFundingHash);

const treasury = await deploy(deployerWallet, treasuryAbi, treasuryBytecode, tempoTokenMode ? [checker.address, TEMPO_FEE_TOKEN] : [checker.address]);
deployments.contracts.treasury = treasury;
const treasuryAmount = tempoTokenMode ? parseUnits("1", TEMPO_TOKEN_DECIMALS) : parseEther("0.001");
const treasuryApprovalHash = tempoTokenMode ? await write(deployerWallet, TEMPO_FEE_TOKEN, erc20Abi, "approve", [treasury.address, treasuryAmount]) : null;
const treasuryFundingHash = tempoTokenMode
  ? await write(deployerWallet, treasury.address, treasuryAbi, "deposit", [treasuryAmount])
  : await deployerWallet.sendTransaction({ to: treasury.address, value: treasuryAmount, gas: 100_000n, nonce: await takeNonce(deployerWallet.account), ...(await feeOverrides()) });
if (!tempoTokenMode) await tx(treasuryFundingHash);
const budgetId = keccak256(`0x${Buffer.from(`budget:${runId}`).toString("hex")}`);
const paymentId = keccak256(`0x${Buffer.from(`payment:${runId}`).toString("hex")}`);
const recipient = checker.address;
const paymentAmount = tempoTokenMode ? parseUnits("0.1", TEMPO_TOKEN_DECIMALS) : parseEther("0.0001");
await gatewayWrite(ownerProviderId, deployerWallet, "treasury", "treasury.policy.check", "configure-budget", treasury.address, treasuryAbi, "configureBudget", [budgetId, paymentAmount]);
let configuredBudget = 0n;
for (let attempt = 0; attempt < 20; attempt += 1) {
  configuredBudget = await publicClient.readContract({ address: treasury.address, abi: treasuryAbi, functionName: "budgetRemaining", args: [budgetId] });
  if (configuredBudget === paymentAmount) break;
  await sleep(1_000);
}
assert.equal(configuredBudget, paymentAmount, "configured budget was not visible after its successful receipt");
const requestedHash = await gatewayWrite(ownerProviderId, deployerWallet, "treasury", "treasury.policy.check", "request-payment", treasury.address, treasuryAbi, "requestPayment", [paymentId, budgetId, recipient, paymentAmount]);
await waitForPaymentState(treasury.address, paymentId, 1, "requested payment");
const approvedHash = await gatewayWrite(checkerProviderId, checkerWallet, "treasury", "treasury.policy.check", "approve-payment", treasury.address, treasuryAbi, "approvePayment", [paymentId]);
const approvedPayment = await waitForPaymentState(treasury.address, paymentId, 2, "approved payment");
assert.equal(Number(approvedPayment[3]), 2, "approved payment was not visible before execution");
const executedHash = await gatewayWrite(ownerProviderId, deployerWallet, "treasury", "treasury.policy.check", "execute-payment", treasury.address, treasuryAbi, "executePayment", [paymentId]);
let payment;
for (let attempt = 0; attempt < 90; attempt += 1) {
  payment = await publicClient.readContract({ address: treasury.address, abi: treasuryAbi, functionName: "payments", args: [paymentId] });
  if (Number(payment[3]) === 3) break;
  await sleep(1_000);
}
assert.equal(Number(payment[3]), 3, "treasury payment was not executed after receipt confirmation");
deployments.evidence.treasury = { checkerFundingHash, treasuryApprovalHash, treasuryFundingHash, requestedHash, approvedHash, executedHash, paymentId, status: "executed" };

// Payroll binds only a commitment and the approved payout on-chain. Tempo's
// token-denominated lane remains disabled until a token payroll contract is
// independently evidenced; this branch is native-asset EVM only.
if (!tempoTokenMode) {
  const payroll = await deploy(deployerWallet, payrollAbi, payrollBytecode, [checker.address]);
  deployments.contracts.payroll = payroll;
  const payrollBatchId = keccak256(`0x${Buffer.from(`payroll-batch:${runId}`).toString("hex")}`);
  const payrollBatchCommitment = keccak256(`0x${Buffer.from(`payroll-commitment:${runId}`).toString("hex")}`);
  const payrollAmount = parseEther("0.0001");
  const payrollFundingHash = await deployerWallet.sendTransaction({ to: payroll.address, value: payrollAmount, gas: 100_000n, nonce: await takeNonce(deployerWallet.account), ...(await feeOverrides()) });
  await tx(payrollFundingHash);
  const payrollCreateHash = await gatewayWrite(ownerProviderId, deployerWallet, "payroll", "payroll.approve", "create-payroll", payroll.address, payrollAbi, "createPayroll", [payrollBatchId, payrollBatchCommitment, recipient, payrollAmount]);
  await waitForBatchState(payroll.address, payrollBatchId, 1, "created payroll batch");
  const payrollApproveHash = await gatewayWrite(checkerProviderId, checkerWallet, "payroll", "payroll.approve", "approve-payroll", payroll.address, payrollAbi, "approvePayroll", [payrollBatchId]);
  await waitForBatchState(payroll.address, payrollBatchId, 2, "approved payroll batch");
  const payrollSettleHash = await gatewayWrite(ownerProviderId, deployerWallet, "payroll", "payroll.settle", "settle-payroll", payroll.address, payrollAbi, "settlePayroll", [payrollBatchId]);
  const payrollBatch = await waitForBatchState(payroll.address, payrollBatchId, 3, "settled payroll batch");
  assert.equal(Number(payrollBatch[3]), 3, "payroll batch was not settled");
  deployments.evidence.payroll = { payrollFundingHash, payrollCreateHash, payrollApproveHash, payrollSettleHash, payrollBatchId, payrollBatchCommitment, status: "settled" };
}

if (PRODUCT_MODE === "payroll") {
  await mkdir(path.join(PACKAGE, "deployments"), { recursive: true });
  const outputPath = path.join(PACKAGE, `deployments/organizational-${NETWORK}-payroll.json`);
  await writeFile(outputPath, `${JSON.stringify({ ...deployments, schema: "privatedao.organizational-payroll-e2e.v1" }, null, 2)}\n`);
  console.log(JSON.stringify({ network: NETWORK, chainId: CHAIN_ID, product: "payroll", contracts: deployments.contracts, evidence: { payroll: deployments.evidence.payroll } }, null, 2));
  process.exit(0);
}

const governance = await deploy(deployerWallet, governanceAbi, governanceBytecode, []);
deployments.contracts.governance = governance;
const proposalId = keccak256(`0x${Buffer.from(`proposal:${runId}`).toString("hex")}`);
const actionHash = keccak256(`0x${Buffer.from(`action:${runId}`).toString("hex")}`);
const now = (await publicClient.getBlock({ blockTag: "latest" })).timestamp;
const governanceCommitSeconds = Number(process.env.PDAO_EVM_GOVERNANCE_COMMIT_SECONDS || "120");
const governanceRevealSeconds = Number(process.env.PDAO_EVM_GOVERNANCE_REVEAL_SECONDS || "300");
if (!Number.isInteger(governanceCommitSeconds) || !Number.isInteger(governanceRevealSeconds) || governanceCommitSeconds < 5 || governanceRevealSeconds <= governanceCommitSeconds) throw new Error("Invalid governance test windows.");
const windowSafetySeconds = BigInt(process.env.PDAO_EVM_WINDOW_SAFETY_SECONDS || "30");
if (windowSafetySeconds < 30n) throw new Error("PDAO_EVM_WINDOW_SAFETY_SECONDS must be at least 30 seconds for RPC propagation safety.");
const commitEnd = now + BigInt(governanceCommitSeconds) + windowSafetySeconds;
const revealEnd = now + BigInt(governanceRevealSeconds) + windowSafetySeconds;
const proposalHash = await gatewayWrite(ownerProviderId, deployerWallet, "governance", "governance.proposal.execute", "create-proposal", governance.address, governanceAbi, "createProposal", [proposalId, actionHash, commitEnd, revealEnd, 1n]);
const voteSalt = keccak256(`0x${Buffer.from(`vote-salt:${runId}`).toString("hex")}`);
const voteCommitment = keccak256(encodeAbiParameters([{ type: "bytes32" }, { type: "address" }, { type: "bool" }, { type: "bytes32" }], [proposalId, deployer.address, true, voteSalt]));
const voteCommitHash = await gatewayWrite(ownerProviderId, deployerWallet, "governance", "governance.proposal.execute", "commit-vote", governance.address, governanceAbi, "commitVote", [proposalId, voteCommitment]);
await expectRevert(() => publicClient.simulateContract({ address: governance.address, abi: governanceAbi, functionName: "revealVote", args: [proposalId, true, voteSalt], account: deployer.address }), "early governance reveal");
await waitForChainTimestamp(commitEnd + 1n);
const voteRevealHash = await gatewayWrite(ownerProviderId, deployerWallet, "governance", "governance.proposal.execute", "reveal-vote", governance.address, governanceAbi, "revealVote", [proposalId, true, voteSalt]);
await waitForChainTimestamp(revealEnd + 1n);
const proposalFinalizeHash = await gatewayWrite(ownerProviderId, deployerWallet, "governance", "governance.proposal.execute", "finalize-proposal", governance.address, governanceAbi, "finalizeProposal", [proposalId]);
let proposal;
for (let attempt = 0; attempt < 90; attempt += 1) {
  proposal = await publicClient.readContract({ address: governance.address, abi: governanceAbi, functionName: "proposals", args: [proposalId] });
  if (Number(proposal[7]) === 2) break;
  await sleep(1_000);
}
assert.equal(Number(proposal[7]), 2, "governance proposal did not pass");
deployments.evidence.governance = { proposalHash, voteCommitHash, voteRevealHash, proposalFinalizeHash, proposalId, status: "passed" };

const auction = await deploy(deployerWallet, auctionAbi, auctionBytecode, tempoTokenMode ? [TEMPO_FEE_TOKEN] : []);
deployments.contracts.auction = auction;
const auctionId = keccak256(`0x${Buffer.from(`auction:${runId}`).toString("hex")}`);
const bidAmount = tempoTokenMode ? parseUnits("0.2", TEMPO_TOKEN_DECIMALS) : parseEther("0.0002");
const escrow = tempoTokenMode ? parseUnits("0.3", TEMPO_TOKEN_DECIMALS) : parseEther("0.0003");
const auctionNow = (await publicClient.getBlock({ blockTag: "latest" })).timestamp;
const biddingEnd = auctionNow + BigInt(governanceCommitSeconds) + windowSafetySeconds;
const auctionRevealEnd = auctionNow + BigInt(governanceRevealSeconds) + windowSafetySeconds;
const auctionCreateHash = await gatewayWrite(ownerProviderId, deployerWallet, "auction", "auction.bid.commit", "create-auction", auction.address, auctionAbi, "createAuction", [auctionId, deployer.address, biddingEnd, auctionRevealEnd]);
const bidSalt = keccak256(`0x${Buffer.from(`bid-salt:${runId}`).toString("hex")}`);
const bidCommitment = keccak256(encodeAbiParameters([{ type: "bytes32" }, { type: "address" }, { type: "uint256" }, { type: "bytes32" }], [auctionId, checker.address, bidAmount, bidSalt]));
const bidApprovalHash = tempoTokenMode ? await write(checkerWallet, TEMPO_FEE_TOKEN, erc20Abi, "approve", [auction.address, escrow]) : null;
const bidCommitHash = await gatewayWrite(
  checkerProviderId,
  checkerWallet,
  "auction",
  "auction.bid.commit",
  "commit-bid",
  auction.address,
  auctionAbi,
  "commitBid",
  tempoTokenMode ? [auctionId, bidCommitment, escrow] : [auctionId, bidCommitment],
  tempoTokenMode ? undefined : escrow,
);
await expectRevert(() => publicClient.simulateContract({ address: auction.address, abi: auctionAbi, functionName: "revealBid", args: [auctionId, bidAmount + 1n, bidSalt], account: checker.address }), "altered auction reveal");
await waitForChainTimestamp(biddingEnd + 1n);
const bidRevealHash = await gatewayWrite(checkerProviderId, checkerWallet, "auction", "auction.bid.commit", "reveal-bid", auction.address, auctionAbi, "revealBid", [auctionId, bidAmount, bidSalt]);
await waitForChainTimestamp(auctionRevealEnd + 1n);
const auctionFinalizeHash = await gatewayWrite(ownerProviderId, deployerWallet, "auction", "auction.settle", "finalize-auction", auction.address, auctionAbi, "finalizeAuction", [auctionId]);
const auctionSettleHash = await gatewayWrite(ownerProviderId, deployerWallet, "auction", "auction.settle", "settle-auction", auction.address, auctionAbi, "settleAuction", [auctionId]);
let auctionState;
for (let attempt = 0; attempt < 90; attempt += 1) {
  auctionState = await publicClient.readContract({ address: auction.address, abi: auctionAbi, functionName: "auctions", args: [auctionId] });
  if (Number(auctionState[5]) === 3) break;
  await sleep(1_000);
}
assert.equal(Number(auctionState[5]), 3, "auction was not settled");
deployments.evidence.auction = { bidApprovalHash, auctionCreateHash, bidCommitHash, bidRevealHash, auctionFinalizeHash, auctionSettleHash, auctionId, status: "settled" };

await mkdir(path.join(PACKAGE, "deployments"), { recursive: true });
await writeFile(path.join(PACKAGE, `deployments/organizational-${NETWORK}.json`), `${JSON.stringify(deployments, null, 2)}\n`);
console.log(JSON.stringify({ network: NETWORK, chainId: CHAIN_ID, deployer: deployer.address, contracts: deployments.contracts, evidence: deployments.evidence }, null, 2));
