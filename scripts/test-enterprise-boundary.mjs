import assert from "node:assert/strict";

import {
  AGENT_EXCHANGE_PRODUCT_IDS,
  APPLICATION_CAPABILITY_BINDINGS,
  ENTERPRISE_PRODUCT_IDS,
  PRODUCT_CATALOG,
  validateApplicationBindings,
} from "../packages/privatedao-runtime/src/index.ts";

const bindingErrors = validateApplicationBindings();
assert.deepEqual(bindingErrors, [], `application bindings are invalid: ${bindingErrors.join("; ")}`);
assert.equal(ENTERPRISE_PRODUCT_IDS.length, 6, "enterprise scope must contain exactly six products");
assert.deepEqual(AGENT_EXCHANGE_PRODUCT_IDS, ["agent"], "Agent Exchange scope must remain isolated");

const enterpriseIds = new Set(ENTERPRISE_PRODUCT_IDS);
const agentIds = new Set(AGENT_EXCHANGE_PRODUCT_IDS);
assert.equal([...enterpriseIds].some((id) => agentIds.has(id)), false, "enterprise and Agent Exchange scopes overlap");

for (const product of PRODUCT_CATALOG) {
  if (enterpriseIds.has(product.id)) assert.equal(product.domain, "enterprise", `${product.id} must be enterprise-scoped`);
  if (agentIds.has(product.id)) assert.equal(product.domain, "agent-exchange", `${product.id} must be Agent Exchange-scoped`);
}

for (const binding of APPLICATION_CAPABILITY_BINDINGS) {
  if (enterpriseIds.has(binding.product)) {
    assert.equal(binding.mode, "kernel-gateway", `${binding.product}/${binding.capability}/${binding.network} must use the Kernel gateway`);
    assert.match(binding.entrypoint ?? "", /^kernel:\/\//, `${binding.product}/${binding.capability}/${binding.network} must expose a kernel:// entrypoint`);
  }
  if (agentIds.has(binding.product)) assert.equal(binding.product, "agent", "Agent Exchange binding leaked to another product id");
}

console.log(`[enterprise-boundary] PASS enterprise=${ENTERPRISE_PRODUCT_IDS.length} agentExchange=${AGENT_EXCHANGE_PRODUCT_IDS.length}`);
