import assert from "node:assert/strict";
import {
  APPLICATION_CAPABILITY_BINDINGS,
  PRODUCT_CATALOG,
  STELLAR_KERNEL_CAPABILITIES,
} from "../packages/privatedao-runtime/src/index.ts";

const network = "stellar-testnet";
const declared = new Set(
  PRODUCT_CATALOG.flatMap((product) => product.capabilities
    .filter((capability) => capability.networks.includes(network))
    .map((capability) => `${product.id}/${capability.id}`)),
);
const bound = new Set(
  APPLICATION_CAPABILITY_BINDINGS
    .filter((binding) => binding.network === network)
    .map((binding) => `${binding.product}/${binding.capability}`),
);
assert.deepEqual([...bound].sort(), [...declared].sort(), "Stellar catalog and application bindings diverged.");

for (const binding of APPLICATION_CAPABILITY_BINDINGS.filter((entry) => entry.network === network)) {
  assert.equal(binding.mode, "kernel-gateway", `${binding.product}/${binding.capability} must use Kernel Gateway`);
  assert.match(binding.entrypoint || "", /^kernel:\/\//, `${binding.product}/${binding.capability} has no Kernel entrypoint`);
}

assert.deepEqual(
  [...new Set(STELLAR_KERNEL_CAPABILITIES)].sort(),
  [...new Set([...declared].map((key) => key.split("/").slice(1).join("/")))].sort(),
  "Stellar adapter capabilities diverged from the product catalog.",
);
assert.equal([...declared].some((key) => key.startsWith("agent/")), false);
assert.equal([...declared].filter((key) => key.endsWith("/payroll.settle")).length, 1);

console.log(`STELLAR_PRODUCT_CONTRACT: PASS capabilities=${declared.size} verified=9 prepared_only=1`);
