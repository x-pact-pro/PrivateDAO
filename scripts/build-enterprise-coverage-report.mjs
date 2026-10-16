import { writeFile } from "node:fs/promises";

import {
  APPLICATION_CAPABILITY_BINDINGS,
  ENTERPRISE_PRODUCT_IDS,
  NETWORK_MATRIX,
  PRIMARY_ECOSYSTEMS,
  PRODUCT_CATALOG,
  buildNativeCapabilityRegistry,
} from "../packages/privatedao-runtime/src/index.ts";

const VERIFIED_EVIDENCE = new Set(["devnet_verified", "testnet_verified", "mainnet_live"]);
const enterpriseProducts = PRODUCT_CATALOG.filter((product) => ENTERPRISE_PRODUCT_IDS.includes(product.id));
const native = buildNativeCapabilityRegistry();

function networksForEcosystem(ecosystem) {
  return NETWORK_MATRIX.filter((network) => ecosystem.networks.includes(network.id));
}

function summarize(product, ecosystem) {
  const networks = networksForEcosystem(ecosystem);
  const capabilities = product.capabilities.map((capability) => {
    const lanes = networks.map((network) => {
      const declared = product.networks.includes(network.id) && capability.networks.includes(network.id);
      const binding = APPLICATION_CAPABILITY_BINDINGS.find(
        (entry) => entry.product === product.id && entry.capability === capability.id && entry.network === network.id,
      );
      const evidence = native.find(
        (entry) => entry.product === product.id && entry.capability === capability.id && entry.network === network.id,
      );
      const kernelEvidence = binding?.mode === "kernel-gateway" ? evidence : undefined;
      const executable = Boolean(
        declared && kernelEvidence?.supportsExecution && VERIFIED_EVIDENCE.has(kernelEvidence.status),
      );
      return {
        network: network.id,
        environment: network.environment,
        declared,
        mode: binding?.mode ?? "unbound",
        status: kernelEvidence?.status ?? "missing",
        evidence: kernelEvidence?.evidence ?? "none",
        provider: kernelEvidence?.provider ?? null,
        supportsExecution: kernelEvidence?.supportsExecution ?? false,
        supportsReceipt: kernelEvidence?.supportsReceipt ?? false,
        supportsReconciliation: kernelEvidence?.supportsReconciliation ?? false,
        executable,
        entrypoint: binding?.entrypoint ?? null,
        note: binding?.note ?? "Missing application binding.",
      };
    });
    return { capability: capability.id, lanes };
  });
  const lanes = capabilities.flatMap((entry) => entry.lanes);
  const declared = lanes.filter((lane) => lane.declared);
  const executable = declared.filter((lane) => lane.executable);
  const hasLegacy = declared.some((lane) => lane.mode === "legacy-provider");
  const hasUnbound = declared.some((lane) => lane.mode === "unbound");
  return {
    product: product.id,
    ecosystem: ecosystem.id,
    declaredLaneCount: declared.length,
    executableLaneCount: executable.length,
    status: executable.length > 0 ? (executable.length === declared.length ? "verified" : "partial") : hasLegacy ? "legacy" : hasUnbound ? "unbound" : "planned",
    capabilities,
  };
}

const rows = enterpriseProducts.flatMap((product) => PRIMARY_ECOSYSTEMS.map((ecosystem) => summarize(product, ecosystem)));
const payload = {
  schema: "privatedao.enterprise-10-ecosystem-coverage.v1",
  generatedFrom: [
    "packages/privatedao-runtime/src/catalog.ts",
    "packages/privatedao-runtime/src/networks.ts",
    "packages/privatedao-runtime/src/application-bindings.ts",
    "packages/privatedao-runtime/src/native-capability-registry.ts",
  ],
  scope: {
    products: ENTERPRISE_PRODUCT_IDS,
    ecosystems: PRIMARY_ECOSYSTEMS.map((ecosystem) => ecosystem.id),
    agentExchangeExcluded: true,
  },
  rows,
};

await writeFile("docs/generated/enterprise-10-ecosystem-coverage.json", `${JSON.stringify(payload, null, 2)}\n`);

const markdownRows = rows.map((row) => {
  const laneSummary = row.capabilities
    .map((capability) => `${capability.capability}: ${capability.lanes.map((lane) => `${lane.network}=${lane.mode}/${lane.status}`).join(", ")}`)
    .join("; ");
  return `| ${row.product} | ${row.ecosystem} | ${row.status} | ${row.executableLaneCount}/${row.declaredLaneCount} | ${laneSummary.replaceAll("|", "\\|")} |`;
});
const markdown = `# Enterprise Product Coverage: Ten Ecosystems\n\nGenerated from the runtime catalog, application bindings, network inventory, and native capability registry. Agent Exchange is intentionally excluded.\n\nA lane is **verified** only when it is declared, bound through kernel://, has an execution-capable provider, and has devnet/testnet/mainnet evidence. Legacy and unbound lanes remain visible as gaps and are not customer-executable through the Kernel gateway.\n\n| Product | Ecosystem | Status | Executable / Declared | Capability lanes |\n| --- | --- | --- | ---: | --- |\n${markdownRows.join("\n")}\n`;
await writeFile("docs/enterprise-10-ecosystem-coverage.md", markdown);

console.log(JSON.stringify({
  products: ENTERPRISE_PRODUCT_IDS.length,
  ecosystems: PRIMARY_ECOSYSTEMS.length,
  rows: rows.length,
  verifiedRows: rows.filter((row) => row.status === "verified").length,
  partialRows: rows.filter((row) => row.status === "partial").length,
  legacyRows: rows.filter((row) => row.status === "legacy").length,
  unboundRows: rows.filter((row) => row.status === "unbound").length,
  output: ["docs/generated/enterprise-10-ecosystem-coverage.json", "docs/enterprise-10-ecosystem-coverage.md"],
}, null, 2));
