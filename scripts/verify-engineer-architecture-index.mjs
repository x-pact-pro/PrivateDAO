import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { APPLICATION_CAPABILITY_BINDINGS, NETWORK_MATRIX, PRODUCT_CATALOG, buildNativeCapabilityRegistry } from "../packages/privatedao-runtime/src/index.ts";

const path = process.argv[2] || "docs/generated/engineer-architecture-index.json";
const index = JSON.parse(await readFile(path, "utf8"));
const nativeEntries = buildNativeCapabilityRegistry();
assert.equal(index.schema, "privatedao.engineer-architecture-index.v1");
assert.equal(index.bridgeFree, true);
assert.deepEqual(index.requestPath, ["product", "protocol", "kernel-gateway", "family-adapter", "network-adapter", "provider-wallet", "rpc-or-node", "receipt", "reconciliation-evidence"]);
assert.equal(index.products.length, PRODUCT_CATALOG.length);
assert.equal(index.networks, undefined, "network count must be represented by family entries");
assert.equal(index.families.reduce((count, family) => count + family.networks.length, 0), NETWORK_MATRIX.length);
assert.equal(index.products.reduce((count, product) => count + product.bindingCount, 0), APPLICATION_CAPABILITY_BINDINGS.length);
assert.equal(index.evidenceSummary.entries, nativeEntries.length);
assert.equal(index.evidenceSummary.testnetVerified, nativeEntries.filter((entry) => entry.status === "testnet_verified").length);
assert.equal(index.evidenceSummary.devnetVerified, nativeEntries.filter((entry) => entry.status === "devnet_verified").length);
assert.equal(index.evidenceSummary.mainnetLive, nativeEntries.filter((entry) => entry.status === "mainnet_live").length);
console.log(JSON.stringify({ status: "PASS", path, products: index.products.length, networks: NETWORK_MATRIX.length, bindings: APPLICATION_CAPABILITY_BINDINGS.length, evidenceEntries: index.evidenceSummary.entries }, null, 2));
