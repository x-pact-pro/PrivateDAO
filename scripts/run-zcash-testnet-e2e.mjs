import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import {
  ZCASH_NETWORK_CONFIGS,
  ZalletCliTransport,
  ZcashNetworkAdapter,
} from "../packages/privatedao-runtime/src/index.ts";

const required = (name) => {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required.`);
  return value;
};

const binaryPath = required("PDAO_ZCASH_ZALLET_BINARY");
const dataDirectory = required("PDAO_ZCASH_ZALLET_DATA_DIR");
const configPath = required("PDAO_ZCASH_ZALLET_CONFIG");
const sourceAddress = required("PDAO_ZCASH_SOURCE_ADDRESS");
const recipientAddress = process.env.PDAO_ZCASH_RECIPIENT_ADDRESS?.trim() || sourceAddress;
const atomicAmount = process.env.PDAO_ZCASH_ATOMIC_AMOUNT?.trim() || "10000";
const confirmationDepth = Number(process.env.PDAO_ZCASH_CONFIRMATIONS || "1");
const receiptTimeoutMs = Number(process.env.PDAO_ZCASH_RECEIPT_TIMEOUT_MS || "900000");
const allowBalanceReadinessProbe = process.env.PDAO_ZCASH_ALLOW_BALANCE_CHECK === "1";
const broadcastEnabled = process.env.PDAO_ZCASH_BROADCAST_ENABLED === "1";
const dryRun = process.env.PDAO_ZCASH_DRY_RUN === "1";
const outputPath = process.env.PDAO_ZCASH_E2E_OUTPUT?.trim();
assert.match(atomicAmount, /^\d+$/);
assert.ok(BigInt(atomicAmount) > 0n);
assert.ok(Number.isInteger(confirmationDepth) && confirmationDepth >= 1);
if (!allowBalanceReadinessProbe) {
  throw new Error("PDAO_ZCASH_ALLOW_BALANCE_CHECK=1 is required for the write-enabled Zcash E2E readiness gate.");
}
if (!broadcastEnabled && !dryRun) {
  throw new Error("PDAO_ZCASH_BROADCAST_ENABLED=1 is required before sending a Zcash Testnet transaction. Use PDAO_ZCASH_DRY_RUN=1 for readiness-only checks.");
}

const transport = new ZalletCliTransport({
  binaryPath,
  dataDirectory,
  configPath,
  network: "zcash-testnet",
  explorerBaseUrl: "https://explorer.testnet.z.cash",
  confirmationDepth,
  commandTimeoutMs: 30_000,
  allowBalanceReadinessProbe,
  broadcastEnabled,
});
const adapter = new ZcashNetworkAdapter({
  id: "privatedao-zcash-testnet-zallet",
  config: ZCASH_NETWORK_CONFIGS[0],
  capabilities: ["payroll.settle", "treasury.policy.check"],
  transport,
});

const health = await adapter.health();
assert.equal(health.ok, true, "Zcash node and wallet must be synchronized before a write-enabled E2E run.");

const requestId = `zcash-testnet-e2e-${Date.now()}`;
const intent = {
  context: {
    requestId,
    idempotencyKey: requestId,
    product: "payroll",
    capability: "payroll.settle",
    organizationId: "privatedao-devnet-e2e",
    actorId: "zallet-testnet-signer",
    network: "zcash-testnet",
    provider: "privatedao-zcash-testnet-zallet",
  },
  payload: {
    kind: "zallet-send",
    fromAddress: sourceAddress,
    recipients: [{ address: recipientAddress, atomicAmount }],
    minConfirmations: 1,
    privacyPolicy: "FullPrivacy",
  },
  accounts: [
    { role: "payer", address: sourceAddress, network: "zcash-testnet" },
    { role: "recipient", address: recipientAddress, network: "zcash-testnet" },
  ],
};

const prepared = await adapter.prepare(intent);
if (dryRun) {
  await emitResult({
    network: "zcash-testnet",
    state: "prepared",
    executionId: prepared.executionId,
    requiredSigners: prepared.requiredSigners,
    sourceAddress,
    recipientAddress,
    atomicAmount,
    balanceReadinessChecked: true,
    broadcastAttempted: false,
  });
  process.exit(0);
}
const submitted = await adapter.submit(prepared, prepared.unsignedPayload);
const deadline = Date.now() + receiptTimeoutMs;
let receipt;
while (Date.now() < deadline) {
  try {
    receipt = await adapter.receipt(submitted.executionId);
    break;
  } catch (error) {
    if (!(error instanceof Error) || !/not sufficiently confirmed/i.test(error.message)) throw error;
    await new Promise((resolve) => setTimeout(resolve, 5_000));
  }
}
assert.ok(receipt, "Zcash transaction did not reach the requested confirmation depth.");
assert.equal(receipt.network, "zcash-testnet");
assert.equal(receipt.environment, "testnet");
assert.equal(receipt.asset, "TAZ");
assert.equal(receipt.signatures.length, 1);

await emitResult({
  network: receipt.network,
  state: receipt.state,
  executionId: receipt.executionId,
  signature: receipt.signatures[0],
  blockNumber: receipt.blockNumber,
  explorerUrl: receipt.explorerUrl,
  reconciliation: { expectedRecipients: 1, settledRecipients: 1, failedRecipients: 0, duplicateRecipients: 0, atomicAmount },
});

async function emitResult(result) {
  const payload = {
    generatedAt: new Date().toISOString(),
    product: "PrivateDAO Zcash Testnet E2E",
    ...result,
  };
  const text = `${JSON.stringify(payload, null, 2)}\n`;
  if (outputPath) {
    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(outputPath, text, { mode: 0o600 });
  }
  console.log(text.trimEnd());
}
