import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import {
  InMemoryProviderRegistry,
  InMemoryProtocolRegistry,
  PrivateDaoKernel,
  ProductExecutionGateway,
  StellarHorizonTransport,
  StellarNetworkAdapter,
  STELLAR_KERNEL_CAPABILITIES,
  STELLAR_NETWORK_CONFIGS,
  registerCatalogCapabilities,
} from "../packages/privatedao-runtime/src/index.ts";

if (process.env.PDAO_STELLAR_TESTNET_E2E_APPROVED !== "1" || process.env.PDAO_STELLAR_TESTNET_BROADCAST_ENABLED !== "1") {
  throw new Error("Stellar Testnet payroll E2E requires both explicit Testnet approval gates.");
}
if (process.env.PDAO_STELLAR_PAYROLL_E2E_APPROVED !== "1") {
  throw new Error("Stellar payroll E2E requires the dedicated payroll approval gate.");
}

const envFile = process.env.PDAO_STELLAR_TESTNET_SIGNER_ENV_FILE;
if (!envFile) throw new Error("PDAO_STELLAR_TESTNET_SIGNER_ENV_FILE is required.");
const envText = await readFile(envFile, "utf8");
const values = Object.fromEntries(envText.split(/\r?\n/)
  .map((line) => line.match(/^([A-Z][A-Z0-9_]*)=(.*)$/))
  .filter(Boolean)
  .map((match) => [match[1], match[2].trim()]));
const publicKey = values.STELLAR_TESTNET_PUBLIC_KEY;
const secretKey = values.STELLAR_TESTNET_SECRET_KEY;
if (!publicKey || !secretKey) throw new Error("Stellar signer file is missing signer material.");

const { Keypair, Networks, TransactionBuilder } = await import("@stellar/stellar-sdk");
const signer = Keypair.fromSecret(secretKey);
assert.equal(signer.publicKey(), publicKey, "Stellar signer identity mismatch.");

const recipient = process.env.PDAO_STELLAR_TESTNET_PAYROLL_RECIPIENT?.trim() || publicKey;
const amount = process.env.PDAO_STELLAR_TESTNET_PAYROLL_AMOUNT?.trim() || "0.0000010";
const horizon = process.env.PDAO_STELLAR_TESTNET_HORIZON_URL?.replace(/\/$/, "") || "https://horizon-testnet.stellar.org";
const digest = createHash("sha256").update(`privatedao:stellar-payroll:${recipient}:${amount}`).digest("hex");
const requestId = `stellar-payroll-e2e-${Date.now()}`;
const config = STELLAR_NETWORK_CONFIGS[0];
const transport = new StellarHorizonTransport(fetch, horizon, true);
const adapter = new StellarNetworkAdapter({
  id: "privatedao-stellar-testnet-payroll-e2e",
  config,
  capabilities: STELLAR_KERNEL_CAPABILITIES,
  transport,
});
const providers = new InMemoryProviderRegistry();
providers.register(adapter);
const protocols = new InMemoryProtocolRegistry();
registerCatalogCapabilities(protocols);
const gateway = new ProductExecutionGateway(new PrivateDaoKernel(providers), protocols);

const health = await transport.health();
assert.equal(health.ok, true, `Stellar Horizon is unavailable: ${health.reason || "unknown"}`);
const intent = {
  context: {
    requestId,
    idempotencyKey: requestId,
    organizationId: "privatedao-stellar-testnet-payroll-e2e",
    actorId: "stellar-testnet-authorized-signer",
    product: "payroll",
    capability: "payroll.settle",
    network: "stellar-testnet",
    provider: adapter.id,
  },
  payload: {
    kind: "stellar-payroll-settlement",
    recipients: [{ destination: recipient, amount }],
    totalAmount: amount,
    memo: "PDAO-PAYROLL-E2E",
    workflow: {
      workflowId: `stellar-testnet:payroll.settle:${requestId}`,
      inputCommitment: digest,
      policyCommitment: digest,
    },
  },
  accounts: [{ role: "payer", address: publicKey, network: "stellar-testnet" }],
};

const prepared = await gateway.prepare(intent, "maker");
assert.equal(prepared.unsignedPayload.transactionKind, "payroll-settlement");
const transaction = TransactionBuilder.fromXDR(prepared.unsignedPayload.transactionXdr, Networks.TESTNET);
transaction.sign(signer);
const submitted = await gateway.submit(prepared, {
  kind: "stellar-signed-xdr",
  network: "stellar-testnet",
  signedTransactionXdr: transaction.toXDR(),
}, "maker");

let status;
for (let attempt = 0; attempt < 60; attempt += 1) {
  status = await gateway.status(prepared, "maker");
  if (status.state === "confirmed" || status.state === "failed") break;
  await new Promise((resolve) => setTimeout(resolve, 1_000));
}
assert.equal(status?.state, "confirmed", `Stellar payroll settlement did not confirm: ${status?.state || "unknown"}`);
const receipt = await gateway.receipt(prepared, "maker");
assert.equal(receipt.state, "confirmed");

const evidence = {
  schema: "privatedao.stellar-testnet-payroll-e2e.v1",
  network: "stellar-testnet",
  environment: "testnet",
  provider: "stellar-testnet-horizon",
  executionPath: "product->gateway->protocol->kernel->stellar-adapter->horizon",
  signerPublicKey: publicKey,
  recipient,
  amount,
  broadcastExecuted: true,
  transactionHash: submitted.signatures[0],
  ledger: receipt.blockNumber,
  explorerUrl: receipt.explorerUrl,
  receiptState: receipt.state,
  workflow: receipt.metadata,
  generatedAt: new Date().toISOString(),
};
await mkdir("docs/evidence", { recursive: true });
await writeFile("docs/evidence/stellar-testnet-payroll-e2e.json", `${JSON.stringify(evidence, null, 2)}\n`);
console.log(JSON.stringify(evidence, null, 2));
