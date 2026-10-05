import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildPoseidon } from "circomlibjs";
import * as snarkjs from "snarkjs";
import {
  createPublicClient,
  createWalletClient,
  defineChain,
  encodeAbiParameters,
  http,
  keccak256,
  parseEventLogs,
  parseAbi,
  toBytes,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { createClient as createTempoClient } from "viem/tempo";
import { tempoModerato } from "viem/chains";
import { Attribution } from "ox/erc8021";
import { EVM_NETWORK_CONFIGS, EvmNetworkAdapter, InMemoryProtocolRegistry, ViemEvmTransport } from "../../privatedao-runtime/src/index.ts";

const { groth16 } = snarkjs;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const PACKAGE = path.join(ROOT, "packages/evm-verification");
const CIRCUIT = "private_dao_blind_policy_overlay";
const TEMPO_FEE_TOKEN = "0x20c0000000000000000000000000000000000001";
const erc20BalanceAbi = parseAbi(["function balanceOf(address) view returns (uint256)"]);
const BASE_BUILDER_CODE = process.env.PDAO_BASE_BUILDER_CODE?.trim() || "bc_dxjpt7gf";
const BASE_BUILDER_WALLET = (process.env.PDAO_BASE_BUILDER_WALLET?.trim() || "0x1c3D6757651B617D7e5c08aE6F7a7F65eEafD75F").toLowerCase();
const RECEIPT_TIMEOUT_MS = Number(process.env.PRIVATEDAO_EVM_RECEIPT_TIMEOUT_MS || 120_000);
const FIELD = 21888242871839275222246405745257275088548364400416034343698204186575808495617n;
const PRODUCT_ID = keccak256(toBytes("blind-verification"));
const SCHEMA_ID = keccak256(toBytes("private-dao-blind-policy-v1"));
const rawDeployerKey = process.env.PDAO_EVM_DEPLOYER_PRIVATE_KEY?.trim();
const DEPLOYER_KEY = rawDeployerKey && /^[0-9a-fA-F]{64}$/.test(rawDeployerKey)
  ? `0x${rawDeployerKey}`
  : rawDeployerKey;

if (!DEPLOYER_KEY || !/^0x[0-9a-fA-F]{64}$/.test(DEPLOYER_KEY)) {
  throw new Error("PDAO_EVM_DEPLOYER_PRIVATE_KEY is required and must be a 32-byte hex key.");
}

const networks = [
  { id: "ethereum-sepolia", chainId: 11155111, nativeAsset: "ETH", rpcEnv: "PDAO_EVM_ETHEREUM_SEPOLIA_RPC_URL", explorer: "https://sepolia.etherscan.io" },
  { id: "base-sepolia", chainId: 84532, nativeAsset: "ETH", rpcEnv: "PDAO_EVM_BASE_SEPOLIA_RPC_URL", explorer: "https://sepolia.basescan.org" },
  { id: "arbitrum-sepolia", chainId: 421614, nativeAsset: "ETH", rpcEnv: "PDAO_EVM_ARBITRUM_SEPOLIA_RPC_URL", explorer: "https://sepolia.arbiscan.io" },
  { id: "bnb-testnet", chainId: 97, nativeAsset: "tBNB", rpcEnv: "PDAO_EVM_BNB_TESTNET_RPC_URL", explorer: "https://testnet.bscscan.com" },
  { id: "robinhood-testnet", chainId: 46630, nativeAsset: "ETH", rpcEnv: "PDAO_EVM_ROBINHOOD_TESTNET_RPC_URL", explorer: "https://explorer.testnet.chain.robinhood.com" },
  { id: "hyperliquid-testnet", chainId: 998, nativeAsset: "HYPE", rpcEnv: "PDAO_EVM_HYPERLIQUID_TESTNET_RPC_URL", explorer: "https://www.hyperscan.com" },
  { id: "tempo-testnet", chainId: 42431, nativeAsset: "USD", rpcEnv: "PDAO_EVM_TEMPO_TESTNET_RPC_URL", explorer: "https://explore.testnet.tempo.xyz" },
];
const requestedNetworks = process.env.PDAO_EVM_NETWORKS
  ? process.env.PDAO_EVM_NETWORKS.split(",").map((value) => value.trim()).filter(Boolean)
  : ["ethereum-sepolia"];
const activeNetworks = networks.filter(({ id }) => requestedNetworks.includes(id));
if (activeNetworks.length !== requestedNetworks.length || activeNetworks.length === 0) {
  throw new Error(`PDAO_EVM_NETWORKS must contain known networks: ${networks.map(({ id }) => id).join(", ")}`);
}

const blindAbi = JSON.parse(await readFile(path.join(PACKAGE, "artifacts/BlindVerificationRegistry.abi"), "utf8"));
const recordAbi = JSON.parse(await readFile(path.join(PACKAGE, "artifacts/RecordVerificationRegistry.abi"), "utf8"));
const verifierBytecode = `0x${(await readFile(path.join(PACKAGE, "artifacts/Groth16Verifier.bin"), "utf8")).trim()}`;
const blindBytecode = `0x${(await readFile(path.join(PACKAGE, "artifacts/BlindVerificationRegistry.bin"), "utf8")).trim()}`;
const recordBytecode = `0x${(await readFile(path.join(PACKAGE, "artifacts/RecordVerificationRegistry.bin"), "utf8")).trim()}`;

const poseidon = await buildPoseidon();
const poseidonField = (values) => BigInt(poseidon.F.toString(poseidon(values.map((value) => BigInt(value)))));

const domainTypes = [
  { type: "string" }, { type: "uint256" }, { type: "address" },
  { type: "bytes32" }, { type: "bytes32" }, { type: "bytes32" },
];
const blindFunctionAbi = parseAbi(["function verifyAndAnchor(bytes32,bytes32,bytes32,uint256,uint64,uint256[2],uint256[2][2],uint256[2],uint256[4]) returns (bytes32)"]);
const recordFunctionAbi = parseAbi(["function anchorRecord(bytes32,bytes32,bytes32,bytes32,uint256,uint64) returns (bytes32)"]);
const revokeFunctionAbi = parseAbi(["function revoke(bytes32)"]);
const verifyRecordAbi = parseAbi(["function verifyRecord(bytes32,bytes32) view returns (bool)", "function isValid(bytes32) view returns (bool)"]);
const verifyBlindAbi = parseAbi(["function isValid(bytes32) view returns (bool)"]);

function createCapabilityRegistry(networkId) {
  const registry = new InMemoryProtocolRegistry();
  for (const [product, capability, action] of [
    ["blind-verification", "verification.blind.prove", "verify-and-anchor"],
    ["record-verification", "verification.record.create", "anchor-record"],
    ["record-verification", "verification.record.verify", "verify-record"],
    ["record-verification", "verification.record.revoke", "revoke-record"],
    ["blind-verification", "verification.blind.revoke", "revoke-blind"],
  ]) {
    registry.register({
      capability: { id: capability, version: "1.0.0", product, networks: [networkId], requiresSignature: true, supportsAsync: false, receiptSchema: "privatedao.evm.v1" },
      product,
      action,
      policy: { roles: ["maker", "auditor"], permissions: ["execution.prepare", "execution.submit", "receipt.read", "proof.verify"] },
    });
  }
  return registry;
}

async function executeViaKernel(adapter, registry, { network, product, capability, requestId, payload }) {
  const registration = registry.resolve(capability);
  expect(registration.product === product && registry.authorize(capability, "execution.submit", "maker"), `capability registry rejected ${capability}`);
  const intent = {
    context: { requestId, idempotencyKey: `${network}:${requestId}`, product, capability, network },
    payload,
    accounts: [{ role: "payer", address: payload.account, network }],
  };
  const prepared = await adapter.prepare(intent);
  await adapter.submit(prepared, prepared.unsignedPayload);
  return adapter.receipt(prepared.executionId);
}

function chainFor(network) {
  if (network.id === "tempo-testnet") return tempoModerato;
  return defineChain({
    id: network.chainId,
    name: network.id,
    nativeCurrency: { name: network.nativeAsset, symbol: network.nativeAsset, decimals: 18 },
    rpcUrls: { default: { http: [process.env[network.rpcEnv]] } },
  });
}

function builderDataSuffix(network, account) {
  if (network.id !== "base-sepolia") return undefined;
  expect(account.address.toLowerCase() === BASE_BUILDER_WALLET, "Base Builder Code wallet does not match the E2E deployer.");
  return Attribution.toDataSuffix({ codes: [BASE_BUILDER_CODE] });
}

function proofArgs(proof) {
  return [
    proof.pi_a.slice(0, 2).map(BigInt),
    [[BigInt(proof.pi_b[0][1]), BigInt(proof.pi_b[0][0])], [BigInt(proof.pi_b[1][1]), BigInt(proof.pi_b[1][0])]],
    proof.pi_c.slice(0, 2).map(BigInt),
    proof.publicSignals.map(BigInt),
  ];
}

function expect(condition, message) {
  if (!condition) throw new Error(message);
}

async function readAtConfirmedBlock(publicClient, request, label) {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    try {
      return await publicClient.readContract({ ...request, blockNumber: BigInt(request.blockNumber) });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!/block not found|resource not found|unknown block/i.test(message) || attempt === 11) throw error;
      await new Promise((resolve) => setTimeout(resolve, 1_000));
    }
  }
  throw new Error(`${label} confirmed-block read did not converge`);
}

async function readLatestUntilTrue(publicClient, request, label) {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    try {
      const value = await publicClient.readContract(request);
      if (value) return value;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!/block not found|resource not found|unknown block/i.test(message) || attempt === 11) throw error;
    }
    await new Promise((resolve) => setTimeout(resolve, 1_000));
  }
  throw new Error(`${label} latest read did not converge`);
}

async function eventArgsFromReceipt(publicClient, hash, abi, eventName) {
  const receipt = await publicClient.getTransactionReceipt({ hash });
  const events = parseEventLogs({ abi, eventName, logs: receipt.logs, strict: false });
  expect(events[0]?.args, `${eventName} event missing from transaction receipt`);
  return events[0].args;
}

async function expectRevert(operation, label) {
  try {
    await operation();
  } catch {
    return;
  }
  throw new Error(`${label} unexpectedly succeeded`);
}

async function deploy(wallet, publicClient, abi, bytecode, args = []) {
  const hash = await wallet.deployContract({ abi, bytecode, args });
  const receipt = await publicClient.waitForTransactionReceipt({ hash, timeout: RECEIPT_TIMEOUT_MS });
  expect(receipt.status === "success", `deployment reverted: ${hash}`);
  expect(receipt.contractAddress, `deployment did not return an address: ${hash}`);
  return { address: receipt.contractAddress, hash, blockNumber: receipt.blockNumber.toString() };
}

async function readDeployment(networkId) {
  try {
    return JSON.parse(await readFile(path.join(PACKAGE, `deployments/${networkId}.json`), "utf8"));
  } catch {
    return null;
  }
}

async function useOrDeploy(existing, key, wallet, publicClient, abi, bytecode, args = []) {
  if (existing?.[key]) {
    const code = await publicClient.getBytecode({ address: existing[key].address });
    expect(code && code !== "0x", `${key} deployment manifest points to an address without contract code`);
    return existing[key];
  }
  return deploy(wallet, publicClient, abi, bytecode, args);
}

async function main() {
  const account = privateKeyToAccount(DEPLOYER_KEY);
  const runId = `${Date.now()}-${process.pid}`;
  const results = [];
  const deployed = {};

  for (const network of activeNetworks) {
    const rpcUrl = process.env[network.rpcEnv];
    if (!rpcUrl || !/^https:\/\//.test(rpcUrl)) throw new Error(`${network.rpcEnv} must be an explicit HTTPS RPC URL.`);
    const chain = chainFor(network);
    const transport = http(rpcUrl, { timeout: 30_000 });
    const dataSuffix = builderDataSuffix(network, account);
    const tempoClient = network.id === "tempo-testnet"
      ? createTempoClient({ account, chain: chain.extend({ feeToken: TEMPO_FEE_TOKEN }), transport })
      : null;
    const publicClient = tempoClient ?? createPublicClient({ chain, transport });
    const wallet = tempoClient ?? createWalletClient({ account, chain, transport, ...(dataSuffix ? { dataSuffix } : {}) });
    const observedChainId = await publicClient.getChainId();
    expect(observedChainId === network.chainId, `${network.id} RPC chain mismatch: ${observedChainId}`);
    const config = EVM_NETWORK_CONFIGS.find((entry) => entry.network === network.id);
    expect(config, `${network.id} is missing from the Kernel EVM configuration`);
    const capabilityRegistry = createCapabilityRegistry(network.id);
    const adapter = new EvmNetworkAdapter({
      id: `privatedao-evm-${network.id}`,
      config,
      capabilities: ["verification.blind.prove", "verification.record.create", "verification.record.verify", "verification.record.revoke", "verification.blind.revoke"],
      transport: new ViemEvmTransport(publicClient, wallet, network.id, String(network.chainId), "testnet", network.explorer, network.nativeAsset),
    });
    const health = await adapter.health();
    expect(health.ok && health.chainId === String(network.chainId), `${network.id} Kernel adapter health failed`);
    const balance = network.id === "tempo-testnet"
      ? await publicClient.readContract({ address: TEMPO_FEE_TOKEN, abi: erc20BalanceAbi, functionName: "balanceOf", args: [account.address] })
      : await publicClient.getBalance({ address: account.address });
    expect(balance > 0n, `${network.id} deployer has no ${network.id === "tempo-testnet" ? "Tempo fee-token" : "native testnet"} balance`);

    await mkdir(path.join(PACKAGE, "deployments"), { recursive: true });
    const existing = await readDeployment(network.id);
    const verifier = await useOrDeploy(existing?.contracts, "verifier", wallet, publicClient, JSON.parse(await readFile(path.join(PACKAGE, "artifacts/Groth16Verifier.abi"), "utf8")), verifierBytecode);
    const blind = await useOrDeploy(existing?.contracts, "blind", wallet, publicClient, blindAbi, blindBytecode, [verifier.address]);
    const record = await useOrDeploy(existing?.contracts, "record", wallet, publicClient, recordAbi, recordBytecode);
    await writeFile(path.join(PACKAGE, `deployments/${network.id}.json`), JSON.stringify({ network: network.id, chainId: network.chainId, environment: "testnet", contracts: { verifier, blind, record } }, null, 2) + "\n");
    deployed[network.id] = { ...network, deployer: account.address, verifier, blind, record };

    const recordId = keccak256(toBytes(`${network.id}:record-${runId}`));
    const expiresAt = BigInt(Math.floor(Date.now() / 1000) + 86400);
    const digest = keccak256(toBytes(JSON.stringify({ schema: "private-dao-record-v1", recordId, claim: "verified" })));
    const recordReceipt = await executeViaKernel(adapter, capabilityRegistry, { network: network.id, product: "record-verification", capability: "verification.record.create", requestId: `${network.id}-record-anchor-${runId}`, payload: { kind: "contract-write", address: record.address, abi: recordFunctionAbi, functionName: "anchorRecord", args: [PRODUCT_ID, SCHEMA_ID, recordId, digest, BigInt(network.chainId), expiresAt], account: account.address } });
    const recordHash = recordReceipt.signatures[0];
    const recordEvent = await eventArgsFromReceipt(publicClient, recordHash, recordAbi, "RecordAnchored");
    const recordVerificationId = recordEvent.verificationId;
    expect(recordVerificationId, `${network.id} record verification event missing`);
    // Some public RPCs briefly serve a stale `latest` state after returning a
    // receipt. Read at the confirmed block first, then require `latest` to
    // converge before promoting the result to E2E evidence.
    const recordVerifiedAtReceipt = await readAtConfirmedBlock(publicClient, { address: record.address, abi: verifyRecordAbi, functionName: "verifyRecord", args: [recordVerificationId, digest], blockNumber: recordReceipt.blockNumber }, `${network.id} record verification`);
    expect(recordVerifiedAtReceipt, `${network.id} record verification failed at confirmed block`);
    let recordVerifiedAtLatest = false;
    for (let attempt = 0; attempt < 5 && !recordVerifiedAtLatest; attempt += 1) {
      recordVerifiedAtLatest = await publicClient.readContract({ address: record.address, abi: verifyRecordAbi, functionName: "verifyRecord", args: [recordVerificationId, digest] });
      if (!recordVerifiedAtLatest) await new Promise((resolve) => setTimeout(resolve, 1_000));
    }
    expect(recordVerifiedAtLatest, `${network.id} record verification did not converge at latest`);

    const domainBytes = encodeAbiParameters(domainTypes, ["PrivateDAO-Blind-Policy-v1", BigInt(network.chainId), blind.address, PRODUCT_ID, SCHEMA_ID, recordId]);
    const domainField = BigInt(keccak256(domainBytes)) % FIELD;
    const inputs = {
      policyId: domainField.toString(), policyCommitment: poseidonField([domainField, 3n, 100n, 10000n, 50n, 777n]).toString(), inputCommitment: poseidonField([11n, 22n, 100n, 100n, 100n, 1n, 80n, 888n]).toString(), satisfiedClaim: "1",
      organizationKey: "11", subjectKey: "22", membershipVerified: "1", record0: "100", record1: "100", record2: "100", liabilitiesUsd: "1", riskScore: "80", minRecordCount: "3", minAverageAmountUsd: "100", maxLiabilityBps: "10000", minRiskScore: "50", policySalt: "777", inputSalt: "888",
    };
    const fullProof = await groth16.fullProve(inputs, path.join(ROOT, `zk/build/${CIRCUIT}_js/${CIRCUIT}.wasm`), path.join(ROOT, `zk/setup/${CIRCUIT}_final.zkey`));
    const [a, b, c, publicSignals] = proofArgs({ ...fullProof.proof, publicSignals: fullProof.publicSignals });
    const blindReceipt = await executeViaKernel(adapter, capabilityRegistry, { network: network.id, product: "blind-verification", capability: "verification.blind.prove", requestId: `${network.id}-blind-anchor-${runId}`, payload: { kind: "contract-write", address: blind.address, abi: blindFunctionAbi, functionName: "verifyAndAnchor", args: [PRODUCT_ID, SCHEMA_ID, recordId, BigInt(network.chainId), expiresAt, a, b, c, publicSignals], account: account.address } });
    const blindHash = blindReceipt.signatures[0];
    const blindEvent = await eventArgsFromReceipt(publicClient, blindHash, blindAbi, "BlindProofVerified");
    const blindVerificationId = blindEvent.verificationId;
    expect(blindVerificationId, `${network.id} blind verification event missing`);
    const blindVerifiedAtReceipt = await readAtConfirmedBlock(publicClient, { address: blind.address, abi: verifyBlindAbi, functionName: "isValid", args: [blindVerificationId], blockNumber: blindReceipt.blockNumber }, `${network.id} blind verification`);
    expect(blindVerifiedAtReceipt, `${network.id} blind receipt verification failed at confirmed block`);
    let blindVerifiedAtLatest = false;
    for (let attempt = 0; attempt < 12 && !blindVerifiedAtLatest; attempt += 1) {
      try { blindVerifiedAtLatest = await publicClient.readContract({ address: blind.address, abi: verifyBlindAbi, functionName: "isValid", args: [blindVerificationId] }); }
      catch (error) {
        if (!/block not found|resource not found|unknown block/i.test(error instanceof Error ? error.message : String(error)) || attempt === 11) throw error;
      }
      if (!blindVerifiedAtLatest) await new Promise((resolve) => setTimeout(resolve, 1_000));
    }
    expect(blindVerifiedAtLatest, `${network.id} blind verification did not converge at latest`);

    await expectRevert(() => publicClient.simulateContract({ address: blind.address, abi: blindFunctionAbi, functionName: "verifyAndAnchor", args: [PRODUCT_ID, SCHEMA_ID, recordId, BigInt(network.chainId === 11155111 ? 84532 : 11155111), expiresAt, a, b, c, publicSignals], account: account.address }), `${network.id} wrong-chain rejection`);
    const alteredSignals = [...publicSignals]; alteredSignals[1] += 1n;
    await expectRevert(() => publicClient.simulateContract({ address: blind.address, abi: blindFunctionAbi, functionName: "verifyAndAnchor", args: [PRODUCT_ID, SCHEMA_ID, recordId, BigInt(network.chainId), expiresAt, a, b, c, alteredSignals], account: account.address }), `${network.id} altered-proof rejection`);
    await expectRevert(() => publicClient.simulateContract({ address: record.address, abi: recordFunctionAbi, functionName: "anchorRecord", args: [PRODUCT_ID, SCHEMA_ID, keccak256(toBytes(`${network.id}:expired-record-${runId}`)), digest, BigInt(network.chainId), 1n], account: account.address }), `${network.id} expired-record rejection`);
    await expectRevert(() => publicClient.simulateContract({ address: blind.address, abi: blindFunctionAbi, functionName: "verifyAndAnchor", args: [PRODUCT_ID, SCHEMA_ID, recordId, BigInt(network.chainId), 1n, a, b, c, publicSignals], account: account.address }), `${network.id} expired-blind rejection`);

    const revokeRecordId = keccak256(toBytes(`${network.id}:revoke-record-${runId}`));
    const revokeDigest = keccak256(toBytes(JSON.stringify({ schema: "private-dao-record-v1", recordId: revokeRecordId, claim: "revocation-test" })));
    const revokeRecordReceipt = await executeViaKernel(adapter, capabilityRegistry, { network: network.id, product: "record-verification", capability: "verification.record.create", requestId: `${network.id}-record-revoke-anchor-${runId}`, payload: { kind: "contract-write", address: record.address, abi: recordFunctionAbi, functionName: "anchorRecord", args: [PRODUCT_ID, SCHEMA_ID, revokeRecordId, revokeDigest, BigInt(network.chainId), expiresAt], account: account.address } });
    const revokeRecordHash = revokeRecordReceipt.signatures[0];
    const revokeRecordEvent = await eventArgsFromReceipt(publicClient, revokeRecordHash, recordAbi, "RecordAnchored");
    const revokeRecordVerificationId = revokeRecordEvent.verificationId;
    await readLatestUntilTrue(publicClient, { address: record.address, abi: verifyRecordAbi, functionName: "isValid", args: [revokeRecordVerificationId] }, `${network.id} disposable record`);
    const recordRevokeReceipt = await executeViaKernel(adapter, capabilityRegistry, { network: network.id, product: "record-verification", capability: "verification.record.revoke", requestId: `${network.id}-record-revoke-${runId}`, payload: { kind: "contract-write", address: record.address, abi: revokeFunctionAbi, functionName: "revoke", args: [revokeRecordVerificationId], account: account.address } });
    let recordRevoked = false;
    for (let attempt = 0; attempt < 12 && !recordRevoked; attempt += 1) {
      recordRevoked = !(await publicClient.readContract({ address: record.address, abi: verifyRecordAbi, functionName: "isValid", args: [revokeRecordVerificationId] }));
      if (!recordRevoked) await new Promise((resolve) => setTimeout(resolve, 1_000));
    }
    expect(recordRevoked, `${network.id} record revocation did not invalidate the record`);

    const revokeDomainBytes = encodeAbiParameters(domainTypes, ["PrivateDAO-Blind-Policy-v1", BigInt(network.chainId), blind.address, PRODUCT_ID, SCHEMA_ID, revokeRecordId]);
    const revokeDomainField = BigInt(keccak256(revokeDomainBytes)) % FIELD;
    const revokeInputs = {
      policyId: revokeDomainField.toString(), policyCommitment: poseidonField([revokeDomainField, 3n, 100n, 10000n, 50n, 777n]).toString(), inputCommitment: poseidonField([11n, 22n, 100n, 100n, 100n, 1n, 80n, 888n]).toString(), satisfiedClaim: "1",
      organizationKey: "11", subjectKey: "22", membershipVerified: "1", record0: "100", record1: "100", record2: "100", liabilitiesUsd: "1", riskScore: "80", minRecordCount: "3", minAverageAmountUsd: "100", maxLiabilityBps: "10000", minRiskScore: "50", policySalt: "777", inputSalt: "888",
    };
    const revokeProof = await groth16.fullProve(revokeInputs, path.join(ROOT, `zk/build/${CIRCUIT}_js/${CIRCUIT}.wasm`), path.join(ROOT, `zk/setup/${CIRCUIT}_final.zkey`));
    const [revokeA, revokeB, revokeC, revokeSignals] = proofArgs({ ...revokeProof.proof, publicSignals: revokeProof.publicSignals });
    const revokeBlindReceipt = await executeViaKernel(adapter, capabilityRegistry, { network: network.id, product: "blind-verification", capability: "verification.blind.prove", requestId: `${network.id}-blind-revoke-anchor-${runId}`, payload: { kind: "contract-write", address: blind.address, abi: blindFunctionAbi, functionName: "verifyAndAnchor", args: [PRODUCT_ID, SCHEMA_ID, revokeRecordId, BigInt(network.chainId), expiresAt, revokeA, revokeB, revokeC, revokeSignals], account: account.address } });
    const revokeBlindHash = revokeBlindReceipt.signatures[0];
    const revokeBlindEvent = await eventArgsFromReceipt(publicClient, revokeBlindHash, blindAbi, "BlindProofVerified");
    const revokeBlindVerificationId = revokeBlindEvent.verificationId;
    await readLatestUntilTrue(publicClient, { address: blind.address, abi: verifyBlindAbi, functionName: "isValid", args: [revokeBlindVerificationId] }, `${network.id} disposable blind proof`);
    const blindRevokeReceipt = await executeViaKernel(adapter, capabilityRegistry, { network: network.id, product: "blind-verification", capability: "verification.blind.revoke", requestId: `${network.id}-blind-revoke-${runId}`, payload: { kind: "contract-write", address: blind.address, abi: revokeFunctionAbi, functionName: "revoke", args: [revokeBlindVerificationId], account: account.address } });
    let blindRevoked = false;
    for (let attempt = 0; attempt < 12 && !blindRevoked; attempt += 1) {
      blindRevoked = !(await publicClient.readContract({ address: blind.address, abi: verifyBlindAbi, functionName: "isValid", args: [revokeBlindVerificationId] }));
      if (!blindRevoked) await new Promise((resolve) => setTimeout(resolve, 1_000));
    }
    expect(blindRevoked, `${network.id} blind proof revocation did not invalidate the proof`);

    results.push({ network: network.id, chainId: network.chainId, attribution: dataSuffix ? { builderCode: BASE_BUILDER_CODE, walletAddress: account.address, dataSuffixConfigured: true } : { dataSuffixConfigured: false }, contracts: { verifier, blind, record }, record: { workflow: "record-verification", txHash: recordHash, blockNumber: recordReceipt.blockNumber.toString(), status: "success", verificationId: recordVerificationId, explorerUrl: `${network.explorer}/tx/${recordHash}` }, blind: { workflow: "blind-verification", txHash: blindHash, blockNumber: blindReceipt.blockNumber.toString(), status: "success", verificationId: blindVerificationId, explorerUrl: `${network.explorer}/tx/${blindHash}` }, revocation: { recordTxHash: recordRevokeReceipt.signatures[0], blindTxHash: blindRevokeReceipt.signatures[0], disposableRecordVerificationId: revokeRecordVerificationId, disposableBlindVerificationId: revokeBlindVerificationId }, checks: { recordVerified: true, blindProofVerified: true, wrongChainRejected: true, alteredProofRejected: true, expiredRecordRejected: true, expiredBlindRejected: true, recordRevoked: true, blindProofRevoked: true }, links: { record: `https://privatedao.org/verify/evm?network=${network.id}&type=record&id=${recordVerificationId}`, blind: `https://privatedao.org/verify/evm?network=${network.id}&type=blind&id=${blindVerificationId}` } });
  }

  if (activeNetworks.length > 1) {
    const first = results[0]; const secondNetwork = activeNetworks[1]; const second = deployed[secondNetwork.id];
    const secondPublicClient = createPublicClient({ chain: chainFor(secondNetwork), transport: http(process.env[secondNetwork.rpcEnv], { timeout: 30_000 }) });
    const secondAccount = privateKeyToAccount(DEPLOYER_KEY);
    const secondRecordId = keccak256(toBytes(`${activeNetworks[0].id}:record-${runId}`));
    const secondDomainBytes = encodeAbiParameters(domainTypes, ["PrivateDAO-Blind-Policy-v1", BigInt(activeNetworks[0].chainId), first.contracts.blind.address, PRODUCT_ID, SCHEMA_ID, secondRecordId]);
    const secondDomainField = BigInt(keccak256(secondDomainBytes)) % FIELD;
    const replayInputs = { policyId: secondDomainField.toString(), policyCommitment: poseidonField([secondDomainField, 3n, 100n, 10000n, 50n, 777n]).toString(), inputCommitment: poseidonField([11n, 22n, 100n, 100n, 100n, 1n, 80n, 888n]).toString(), satisfiedClaim: "1", organizationKey: "11", subjectKey: "22", membershipVerified: "1", record0: "100", record1: "100", record2: "100", liabilitiesUsd: "1", riskScore: "80", minRecordCount: "3", minAverageAmountUsd: "100", maxLiabilityBps: "10000", minRiskScore: "50", policySalt: "777", inputSalt: "888" };
    const replayProof = await groth16.fullProve(replayInputs, path.join(ROOT, `zk/build/${CIRCUIT}_js/${CIRCUIT}.wasm`), path.join(ROOT, `zk/setup/${CIRCUIT}_final.zkey`));
    const [replayA, replayB, replayC, replaySignals] = proofArgs({ ...replayProof.proof, publicSignals: replayProof.publicSignals });
    await expectRevert(() => secondPublicClient.simulateContract({ address: second.blind.address, abi: blindFunctionAbi, functionName: "verifyAndAnchor", args: [PRODUCT_ID, SCHEMA_ID, secondRecordId, BigInt(secondNetwork.chainId), BigInt(Math.floor(Date.now() / 1000) + 86400), replayA, replayB, replayC, replaySignals], account: secondAccount.address }), "cross-network replay rejection");
    results.forEach((entry) => { entry.checks.crossNetworkReplayRejected = true; });
  }

  await mkdir(path.join(PACKAGE, "deployments"), { recursive: true });
  const outputName = activeNetworks.length === networks.length ? "phase-2-e2e.json" : `phase-2-e2e-${activeNetworks.map(({ id }) => id).join("-")}.json`;
  await writeFile(path.join(PACKAGE, "deployments", outputName), JSON.stringify({ generatedAt: new Date().toISOString(), status: "testnet_verified", scope: activeNetworks.map(({ id }) => id), networks: results }, null, 2) + "\n");
  console.log(JSON.stringify({ status: "testnet_verified", scope: activeNetworks.map(({ id }) => id), networks: results }, null, 2));
}

await main();
