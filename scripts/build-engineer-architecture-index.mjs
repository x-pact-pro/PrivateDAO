import { writeFile } from "node:fs/promises";
import {
  APPLICATION_CAPABILITY_BINDINGS,
  NETWORK_MATRIX,
  PRODUCT_CATALOG,
  buildNativeCapabilityRegistry,
} from "../packages/privatedao-runtime/src/index.ts";

const outputPath = process.env.ENGINEER_ARCHITECTURE_INDEX_OUTPUT || "docs/generated/engineer-architecture-index.json";
const nativeEntries = buildNativeCapabilityRegistry();
const families = new Map();
for (const network of NETWORK_MATRIX) {
  const entry = families.get(network.family) ?? { family: network.family, networks: [] };
  entry.networks.push({
    id: network.id,
    label: network.label,
    environment: network.environment,
    chainId: network.chainId ?? null,
    adapterId: network.adapterId ?? null,
    finalityModel: network.finalityModel ?? null,
  });
  families.set(network.family, entry);
}

const products = PRODUCT_CATALOG.map((product) => ({
  id: product.id,
  name: product.name,
  availability: product.availability,
  declaredNetworks: product.networks,
  capabilities: product.capabilities.map((capability) => ({
    id: capability.id,
    networks: capability.networks,
    requiresSignature: capability.requiresSignature,
    supportsAsync: capability.supportsAsync,
  })),
  bindingCount: APPLICATION_CAPABILITY_BINDINGS.filter((binding) => binding.product === product.id).length,
}));

const payload = {
  schema: "privatedao.engineer-architecture-index.v1",
  generatedAt: new Date().toISOString(),
  bridgeFree: true,
  sources: {
    protocol: "packages/privatedao-runtime/src/protocol.ts",
    catalog: "packages/privatedao-runtime/src/catalog.ts",
    networks: "packages/privatedao-runtime/src/networks.ts",
    bindings: "packages/privatedao-runtime/src/application-bindings.ts",
    nativeCapabilityRegistry: "packages/privatedao-runtime/src/native-capability-registry.ts",
    evidenceDirectory: "packages/evm-verification/deployments/",
  },
  requestPath: ["product", "protocol", "kernel-gateway", "family-adapter", "network-adapter", "provider-wallet", "rpc-or-node", "receipt", "reconciliation-evidence"],
  families: [...families.values()],
  products,
  evidenceSummary: {
    entries: nativeEntries.length,
    testnetVerified: nativeEntries.filter((entry) => entry.status === "testnet_verified").length,
    devnetVerified: nativeEntries.filter((entry) => entry.status === "devnet_verified").length,
    mainnetLive: nativeEntries.filter((entry) => entry.status === "mainnet_live").length,
    statuses: [...new Set(nativeEntries.map((entry) => entry.status))].sort(),
  },
};

await writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`);
console.log(JSON.stringify({ outputPath, products: products.length, networks: NETWORK_MATRIX.length, bindings: APPLICATION_CAPABILITY_BINDINGS.length, evidenceEntries: nativeEntries.length }, null, 2));
