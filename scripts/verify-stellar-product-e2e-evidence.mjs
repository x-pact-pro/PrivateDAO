import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { APPLICATION_CAPABILITY_BINDINGS } from "../packages/privatedao-runtime/src/application-bindings.ts";
import { PRODUCT_CATALOG } from "../packages/privatedao-runtime/src/catalog.ts";
import { STELLAR_KERNEL_CAPABILITIES } from "../packages/privatedao-runtime/src/index.ts";

const horizon = process.env.PDAO_STELLAR_TESTNET_HORIZON_URL?.replace(/\/$/, "") || "https://horizon-testnet.stellar.org";
const evidencePath = process.env.PDAO_STELLAR_PRODUCT_EVIDENCE || "docs/evidence/stellar-testnet-product-e2e.json";
const evidence = JSON.parse(await readFile(evidencePath, "utf8"));

assert.equal(evidence.schema, "privatedao.stellar-testnet-product-e2e.v1");
assert.equal(evidence.network, "stellar-testnet");
assert.equal(evidence.environment, "testnet");
assert.equal(evidence.provider, "stellar-testnet-horizon");
assert.equal(evidence.executionPath, "product-gateway->protocol->kernel->stellar-adapter->horizon");
assert.equal(evidence.broadcastExecuted, true);
assert.deepEqual(evidence.preparedOnly, ["payroll.settle"]);
const expectedProducts = new Map(
  PRODUCT_CATALOG
    .filter((product) => product.id !== "agent")
    .flatMap((product) => product.capabilities
      .filter((capability) => capability.networks.includes("stellar-testnet"))
      .map((capability) => [capability.id, product.id]),
  ),
);
const evidencedProducts = new Map([...expectedProducts].filter(([capability]) => capability !== "payroll.settle"));
assert.deepEqual(
  [...expectedProducts.keys()].sort(),
  [...STELLAR_KERNEL_CAPABILITIES].sort(),
  "Stellar adapter capabilities must match the catalog's declared Stellar capabilities",
);
assert.equal(evidence.results.length, evidencedProducts.size);

for (const [capability, product] of expectedProducts) {
  const binding = APPLICATION_CAPABILITY_BINDINGS.find(
    (entry) => entry.product === product && entry.capability === capability && entry.network === "stellar-testnet",
  );
  assert(binding, `missing Stellar application binding for ${product}/${capability}`);
  assert.equal(binding.mode, "kernel-gateway", `${product}/${capability} must use the Kernel gateway`);
  assert.match(binding.entrypoint || "", /^kernel:\/\//, `${product}/${capability} must expose a Kernel entrypoint`);
}

const seen = new Set();
for (const result of evidence.results) {
  assert.equal(evidencedProducts.get(result.capability), result.product, `wrong product for ${result.capability}`);
  assert.equal(result.network, "stellar-testnet");
  assert.equal(result.provider, "stellar-testnet-horizon");
  assert.equal(result.state, "confirmed");
  assert.match(result.transactionHash, /^[a-f0-9]{64}$/i);
  assert.match(String(result.ledger), /^\d+$/);
  assert.equal(seen.has(result.capability), false, `duplicate evidence for ${result.capability}`);
  seen.add(result.capability);
  if (result.workflow !== undefined) {
    assert.equal(result.workflow.workflowId.startsWith("stellar-testnet:"), true);
    assert.match(result.workflow.inputCommitment, /^[a-f0-9]{64}$/i);
    if (["payroll.calculate", "payroll.approve", "treasury.policy.check", "governance.proposal.execute"].includes(result.capability)) {
      assert.match(result.workflow.policyCommitment, /^[a-f0-9]{64}$/i);
    }
    if (result.capability === "auction.settle") assert.match(result.workflow.outcomeCommitment, /^[a-f0-9]{64}$/i);
    if (result.receiptMetadata !== undefined) {
      assert.equal(result.receiptMetadata.workflowId, result.workflow.workflowId);
      assert.equal(result.receiptMetadata.inputCommitment, result.workflow.inputCommitment);
      if (result.workflow.policyCommitment) assert.equal(result.receiptMetadata.policyCommitment, result.workflow.policyCommitment);
      if (result.workflow.outcomeCommitment) assert.equal(result.receiptMetadata.outcomeCommitment, result.workflow.outcomeCommitment);
      assert.equal(Object.keys(result.receiptMetadata).some((key) => /payload|salary|amount|recipient|address|private|secret/i.test(key)), false);
    }
  }

  const response = await fetch(`${horizon}/transactions/${result.transactionHash}`, { headers: { Accept: "application/json" } });
  assert.equal(response.ok, true, `${result.capability} Horizon HTTP ${response.status}`);
  const transaction = await response.json();
  assert.equal(transaction.hash, result.transactionHash);
  assert.equal(transaction.successful, true, `${result.capability} is not successful on Horizon`);
  assert.equal(String(transaction.ledger), String(result.ledger), `${result.capability} ledger mismatch`);
}

assert.deepEqual([...seen].sort(), [...evidencedProducts.keys()].sort());
console.log(JSON.stringify({
  schema: evidence.schema,
  network: evidence.network,
  provider: evidence.provider,
  executionPath: evidence.executionPath,
  capabilities: seen.size,
  preparedOnly: ["payroll.settle"],
  confirmedOnHorizon: true,
  readOnly: true,
}, null, 2));
