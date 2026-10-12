import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import {
  InMemoryProviderRegistry,
  InMemoryProtocolRegistry,
  PrivateDaoKernel,
  ProductExecutionGateway,
  STELLAR_KERNEL_CAPABILITIES,
  STELLAR_NETWORK_CONFIGS,
  StellarHorizonTransport,
  StellarNetworkAdapter,
  registerCatalogCapabilities,
} from "../packages/privatedao-runtime/src/index.ts";

const horizon = process.env.PDAO_STELLAR_TESTNET_HORIZON_URL?.replace(/\/$/, "") || "https://horizon-testnet.stellar.org";
if (process.env.PDAO_STELLAR_TESTNET_E2E_APPROVED !== "1" || process.env.PDAO_STELLAR_TESTNET_BROADCAST_ENABLED !== "1") {
  throw new Error("Stellar product E2E requires both explicit Testnet approval gates.");
}
const envFile = process.env.PDAO_STELLAR_TESTNET_SIGNER_ENV_FILE;
if (!envFile) throw new Error("PDAO_STELLAR_TESTNET_SIGNER_ENV_FILE is required.");
const envText = await readFile(envFile, "utf8");
const values = Object.fromEntries(envText.split(/\r?\n/).filter((line) => line && !line.startsWith("#")).map((line) => {
  const index = line.indexOf("=");
  return [line.slice(0, index), line.slice(index + 1).trim()];
}));
const publicKey = values.STELLAR_TESTNET_PUBLIC_KEY;
const secretKey = values.STELLAR_TESTNET_SECRET_KEY;
if (!publicKey || !secretKey) throw new Error("Stellar signer file is missing the required identity fields.");

const { Keypair } = await import("@stellar/stellar-sdk");
const keypair = Keypair.fromSecret(secretKey);
assert.equal(keypair.publicKey(), publicKey, "Signer public key does not match the authorized account.");
const config = STELLAR_NETWORK_CONFIGS[0];
const transport = new StellarHorizonTransport(fetch, horizon);
const adapter = new StellarNetworkAdapter({
  id: "privatedao-stellar-testnet-product-e2e",
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

function productFor(capability) {
  if (capability.startsWith("verification.blind")) return "blind-verification";
  if (capability.startsWith("verification.record")) return "record-verification";
  if (capability.startsWith("payroll")) return "payroll";
  if (capability.startsWith("treasury")) return "treasury";
  if (capability.startsWith("governance")) return "governance";
  return "auction";
}

function commitment(label) {
  return createHash("sha256").update(`privatedao:stellar-testnet:${label}`).digest("hex");
}

function workflowFor(capability) {
  const workflow = {
    workflowId: `stellar-testnet:${capability}:${Date.now()}`,
    inputCommitment: commitment(`${capability}:input`),
  };
  if (["payroll.calculate", "payroll.approve", "treasury.policy.check", "governance.proposal.execute"].includes(capability)) {
    workflow.policyCommitment = commitment(`${capability}:policy`);
  }
  if (capability === "auction.settle") workflow.outcomeCommitment = commitment(`${capability}:outcome`);
  return workflow;
}

const results = [];
const verifiedCapabilities = STELLAR_KERNEL_CAPABILITIES.filter((capability) => capability !== "payroll.settle");
for (const capability of verifiedCapabilities) {
  const product = productFor(capability);
  const requestId = `stellar-product-e2e-${capability}-${Date.now()}`;
  const workflow = workflowFor(capability);
  const intent = {
    context: {
      requestId,
      idempotencyKey: requestId,
      organizationId: "privatedao-stellar-testnet-e2e",
      actorId: "stellar-testnet-authorized-signer",
      product,
      capability,
      network: "stellar-testnet",
      provider: adapter.id,
    },
    payload: { kind: "stellar-payment", destination: publicKey, amount: "0.000001", memo: `PDAO-${product.slice(0, 16)}`, workflow },
    accounts: [{ role: "payer", address: publicKey, network: "stellar-testnet" }],
  };
  const prepared = await gateway.prepare(intent, "maker");
  assert.equal(prepared.unsignedPayload.transactionKind, "payment");
  const transaction = (await import("@stellar/stellar-sdk")).TransactionBuilder.fromXDR(
    prepared.unsignedPayload.transactionXdr,
    (await import("@stellar/stellar-sdk")).Networks.TESTNET,
  );
  transaction.sign(keypair);
  const submitted = await gateway.submit(prepared, {
    kind: "stellar-signed-xdr",
    network: "stellar-testnet",
    signedTransactionXdr: transaction.toXDR(),
  }, "maker");
  let status;
  for (let attempt = 0; attempt < 30; attempt += 1) {
    status = await gateway.status(prepared, "maker");
    if (status.state === "confirmed" || status.state === "failed") break;
    await new Promise((resolve) => setTimeout(resolve, 1_000));
  }
  assert.equal(status?.state, "confirmed", `${product}/${capability} did not confirm`);
  const receipt = await gateway.receipt(prepared, "maker");
  results.push({
    product,
    capability,
    network: receipt.network,
    provider: receipt.provider,
    state: receipt.state,
    transactionHash: submitted.signatures[0],
    ledger: receipt.blockNumber,
    explorerUrl: receipt.explorerUrl,
    asset: receipt.asset,
    workflow,
    receiptMetadata: receipt.metadata,
  });
}

assert.equal(results.length, 9, "This runner must only produce the nine independently verified Stellar product receipts.");

const evidence = {
  schema: "privatedao.stellar-testnet-product-e2e.v1",
  network: "stellar-testnet",
  environment: "testnet",
  provider: "stellar-testnet-horizon",
  executionPath: "product-gateway->protocol->kernel->stellar-adapter->horizon",
  signerPublicKey: publicKey,
  broadcastExecuted: true,
  capabilityCount: results.length,
  preparedOnly: ["payroll.settle"],
  results,
  generatedAt: new Date().toISOString(),
};
await mkdir("docs/evidence", { recursive: true });
await writeFile("docs/evidence/stellar-testnet-product-e2e.json", `${JSON.stringify(evidence, null, 2)}\n`);
console.log(JSON.stringify({ ...evidence, signerPublicKey: publicKey }, null, 2));
