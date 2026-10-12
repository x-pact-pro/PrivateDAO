import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { APPLICATION_CAPABILITY_BINDINGS, PRODUCT_CATALOG } from "../packages/privatedao-runtime/src/index.ts";

const productModules = [
  "agent-provider.ts",
  "auction-bid-provider.ts",
  "auction-outcome-provider.ts",
  "auction-proof-service.ts",
  "blind-policy-provider.ts",
  "governance-policy-provider.ts",
  "payroll-approval-provider.ts",
  "payroll-provider.ts",
  "record-provider.ts",
  "solana-payroll-settlement-provider.ts",
  "treasury-policy-provider.ts",
];
const forbidden = /\b(?:fetch\s*\(|new\s+Connection\s*\(|new\s+Horizon\.Server\s*\(|sendTransaction\s*\(|sendRawTransaction\s*\(|createPublicClient\s*\(|http\s*\()/;

for (const module of productModules) {
  const source = await readFile(`packages/privatedao-runtime/src/${module}`, "utf8");
  assert.equal(forbidden.test(source), false, `${module} contains a direct network or signing call`);
}

const declared = new Set(
  PRODUCT_CATALOG
    .filter((product) => product.id !== "agent")
    .flatMap((product) => product.capabilities.flatMap((capability) => capability.networks.map((network) => `${product.id}/${capability.id}/${network}`))),
);
const bound = new Set(
  APPLICATION_CAPABILITY_BINDINGS
    .filter((binding) => binding.product !== "agent")
    .map((binding) => `${binding.product}/${binding.capability}/${binding.network}`),
);
for (const key of declared) assert.equal(bound.has(key), true, `missing Kernel binding: ${key}`);
for (const binding of APPLICATION_CAPABILITY_BINDINGS.filter((entry) => entry.product !== "agent")) {
  assert.equal(binding.mode, "kernel-gateway", `non-Kernel product binding: ${binding.product}/${binding.capability}/${binding.network}`);
  assert.match(binding.entrypoint || "", /^kernel:\/\//, `missing Kernel entrypoint: ${binding.product}/${binding.capability}/${binding.network}`);
}

console.log(JSON.stringify({
  productModules: productModules.length,
  directNetworkCalls: 0,
  declaredBindings: declared.size,
  kernelBindings: bound.size,
  boundary: "product->protocol->kernel->adapter",
}, null, 2));
