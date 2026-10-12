import assert from "node:assert/strict";
import {
  APPLICATION_CAPABILITY_BINDINGS,
  PRODUCT_CATALOG,
  STELLAR_KERNEL_CAPABILITIES,
  buildNativeCapabilityRegistry,
} from "../packages/privatedao-runtime/src/index.ts";
import { runtimeCatalog } from "../apps/web/src/lib/runtime-catalog.generated.ts";

const network = "stellar-testnet";
const expected = PRODUCT_CATALOG.flatMap((product) => product.capabilities
  .filter((capability) => capability.networks.includes(network))
  .map((capability) => ({ product: product.id, capability: capability.id })));
const expectedKeys = expected.map(({ product, capability }) => `${product}/${capability}`).sort();

assert.deepEqual(
  [...new Set(STELLAR_KERNEL_CAPABILITIES)].sort(),
  [...new Set(expected.map(({ capability }) => capability))].sort(),
  "Stellar adapter capability set diverges from the Kernel catalog",
);

const bindings = APPLICATION_CAPABILITY_BINDINGS.filter((entry) => entry.network === network);
assert.deepEqual(
  bindings.map(({ product, capability }) => `${product}/${capability}`).sort(),
  expectedKeys,
  "Stellar application bindings diverge from the Kernel catalog",
);
for (const binding of bindings) {
  assert.equal(binding.mode, "kernel-gateway", `${binding.product}/${binding.capability} bypasses the Kernel gateway`);
  assert.match(binding.entrypoint || "", /^kernel:\/\//, `${binding.product}/${binding.capability} has no Kernel entrypoint`);
}

const native = buildNativeCapabilityRegistry();
for (const { product, capability } of expected) {
  const entry = native.find((candidate) => candidate.product === product && candidate.capability === capability && candidate.network === network);
  assert(entry, `missing native registry row for ${product}/${capability}`);
  const verified = capability !== "payroll.settle";
  assert.equal(entry.status, verified ? "testnet_verified" : "testnet_ready", `${product}/${capability} has an unexpected Stellar readiness status`);
  assert.equal(entry.evidence, verified ? "testnet-e2e" : "runtime-only", `${product}/${capability} has an unexpected Stellar evidence level`);
  assert.equal(entry.supportsExecution, true);
  assert.equal(entry.supportsReceipt, true);
}

const webProducts = runtimeCatalog.products ?? [];
for (const { product, capability } of expected) {
  const webProduct = webProducts.find((candidate) => candidate.id === product);
  const webCapability = webProduct?.capabilities?.find((candidate) => candidate.id === capability);
  const webBinding = webCapability?.applicationBindings?.find((candidate) => candidate.network === network);
  assert(webBinding, `web catalog is missing ${product}/${capability}/${network}`);
  assert.equal(webBinding.mode, "kernel-gateway");
  assert.equal(webBinding.evidenceStatus, capability === "payroll.settle" ? "testnet_ready" : "testnet_verified");
}

assert.equal(expected.some(({ product }) => product === "agent"), false, "Agent Exchange must remain outside Stellar");
const payrollSettlement = expected.find(({ capability }) => capability === "payroll.settle");
assert(payrollSettlement, "Stellar payroll settlement must remain represented by the Kernel catalog");

console.log(JSON.stringify({
  status: "PASS",
  network,
  capabilities: expected.length,
  layers: ["catalog", "application-bindings", "native-registry", "web-runtime-catalog"],
  excluded: ["agent"],
  preparedOnly: ["payroll.settle"],
}, null, 2));
