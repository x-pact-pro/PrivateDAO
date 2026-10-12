import { buildNativeCapabilityRegistry } from "../packages/privatedao-runtime/src/native-capability-registry.ts";

const networks = [
  "solana-devnet",
  "ethereum-sepolia",
  "arbitrum-sepolia",
  "bnb-testnet",
  "base-sepolia",
  "robinhood-testnet",
  "tempo-testnet",
  "zcash-testnet",
  "stellar-testnet",
  "hyperliquid-testnet",
  "hypercore-testnet",
];

const productCapabilities = new Map();
for (const entry of buildNativeCapabilityRegistry()) {
  if (!entry.declared || entry.product === "agent") continue;
  const key = `${entry.network}:${entry.product}`;
  const current = productCapabilities.get(key) ?? { verified: true, entries: 0, evidence: new Set() };
  current.entries += 1;
  current.verified &&= (entry.status === "testnet_verified" || entry.status === "devnet_verified")
    && (entry.evidence === "testnet-e2e" || entry.evidence === "devnet-e2e");
  current.evidence.add(entry.evidence);
  productCapabilities.set(key, current);
}

function blockersFor(network, missingCapabilities) {
  if (missingCapabilities.length === 0) return [];
  if (network === "zcash-testnet") {
    return [
      "Zcash product-specific Testnet receipts are missing for the listed capabilities.",
      "The existing Payroll settlement receipt does not prove the other product paths.",
    ];
  }
  if (network === "hyperliquid-testnet") {
    return [
      "HyperEVM organizational E2E requires a funded Testnet signer and fresh receipts.",
      "HyperEVM evidence must not be used as evidence for native HyperCore.",
    ];
  }
  if (network === "hypercore-testnet") {
    return [
      "The current HyperCore adapter is read-only metadata/health; native product execution is not implemented.",
      "A native HyperCore transaction and receipt path is required before any product can be verified.",
    ];
  }
  return ["Independent Testnet/Devnet evidence is missing for the listed capabilities."];
}

const rows = networks.map((network) => {
  const products = [...new Set(
    [...productCapabilities.keys()]
      .filter((key) => key.startsWith(`${network}:`))
      .map((key) => key.slice(network.length + 1)),
  )];
  const incomplete = products.filter((product) => !productCapabilities.get(`${network}:${product}`)?.verified);
  const missingCapabilities = incomplete.map((product) => {
    const entries = [...buildNativeCapabilityRegistry()].filter(
      (entry) => entry.declared && entry.network === network && entry.product === product,
    );
    return {
      product,
      capabilities: entries
        .filter((entry) => entry.status !== "testnet_verified" && entry.status !== "devnet_verified")
        .map((entry) => ({ capability: entry.capability, status: entry.status, evidence: entry.evidence })),
    };
  });
  return {
    network,
    declaredProducts: products.length,
    completeProducts: products.length - incomplete.length,
    incompleteProducts: incomplete,
    missingCapabilities,
    blockers: blockersFor(network, missingCapabilities),
    status: incomplete.length === 0 ? "COMPLETE" : "INCOMPLETE",
  };
});

const complete = rows.every((row) => row.status === "COMPLETE");
console.log(JSON.stringify({
  schema: "privatedao.11-network-e2e-gate.v1",
  networks: rows,
  complete,
  rule: "Every declared product on every listed network requires a testnet/devnet E2E evidence status.",
}, null, 2));

if (!complete) process.exitCode = 1;
