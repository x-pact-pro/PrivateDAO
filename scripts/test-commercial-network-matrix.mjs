import assert from "node:assert/strict";

import { APPLICATION_CAPABILITY_BINDINGS, getNetwork, PRODUCT_CATALOG, buildNativeCapabilityRegistry } from "../packages/privatedao-runtime/src/index.ts";

const targetNetworks = [
  "solana-devnet",
  "ethereum-sepolia",
  "base-sepolia",
  "bnb-testnet",
  "tempo-testnet",
  "zcash-testnet",
  "stellar-testnet",
  "arbitrum-sepolia",
  "robinhood-testnet",
  "hyperliquid-testnet",
  "hypercore-testnet",
];
const kernelProducts = ["blind-verification", "record-verification", "payroll", "treasury", "governance", "auction"];
const native = buildNativeCapabilityRegistry();

for (const productId of kernelProducts) {
  const product = PRODUCT_CATALOG.find((entry) => entry.id === productId);
  assert(product, `missing product ${productId}`);
  for (const network of targetNetworks) {
    assert(product.networks.includes(network), `product is missing network ${productId}/${network}`);
  }
  for (const capability of product.capabilities) {
    for (const network of capability.networks) {
      assert(capability.networks.includes(network), `missing catalog network ${productId}/${capability.id}/${network}`);
      const binding = APPLICATION_CAPABILITY_BINDINGS.find(
        (entry) => entry.product === productId && entry.capability === capability.id && entry.network === network,
      );
      assert(binding, `missing application binding ${productId}/${capability.id}/${network}`);
      assert.equal(binding.mode, "kernel-gateway", `non-Kernel product route ${productId}/${capability.id}/${network}`);
      const evidence = native.find(
        (entry) => entry.product === productId && entry.capability === capability.id && entry.network === network,
      );
      assert(evidence, `missing native capability evidence ${productId}/${capability.id}/${network}`);
      assert.notEqual(evidence.status, "disabled", `disabled capability ${productId}/${capability.id}/${network}`);
    }
  }
}

const agentBindings = APPLICATION_CAPABILITY_BINDINGS.filter((entry) => entry.product === "agent");
assert(agentBindings.length > 0, "Agent Exchange bindings are missing");
assert(
  agentBindings.filter((entry) => entry.network === "solana-mainnet-beta").every((entry) => entry.mode === "unbound"),
  "Agent Exchange mainnet surface must remain an external service boundary",
);

const hypercoreEntries = native.filter((entry) => entry.network === "hypercore-testnet");
assert(hypercoreEntries.length > 0, "HyperCore capability rows are missing");
assert(hypercoreEntries.every((entry) => entry.networkFamily === "exchange"), "HyperCore must remain in the exchange family");
assert.equal(getNetwork("hyperliquid-testnet").family, "evm", "Hyperliquid HyperEVM must remain in the EVM family");
assert.equal(getNetwork("hyperliquid-testnet").adapterId, "evm-hyperliquid-testnet");
assert.equal(getNetwork("hypercore-testnet").family, "exchange", "HyperCore must remain in the native exchange family");
assert.equal(getNetwork("hypercore-testnet").adapterId, "hyperliquid-core-testnet");

console.log(`[commercial-network-matrix] PASS products=${kernelProducts.length} networks=${targetNetworks.length} agent=external hypercore=exchange-readiness`);
