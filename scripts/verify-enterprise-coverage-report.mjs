import { readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";

const generated = JSON.parse(await readFile("docs/generated/enterprise-10-ecosystem-coverage.json", "utf8"));
if (generated.schema !== "privatedao.enterprise-10-ecosystem-coverage.v1") throw new Error("unexpected enterprise coverage schema");
if (generated.scope.agentExchangeExcluded !== true) throw new Error("coverage report must exclude Agent Exchange");
if (generated.scope.products.length !== 6) throw new Error(`expected six enterprise products, found ${generated.scope.products.length}`);
if (generated.scope.ecosystems.length !== 10) throw new Error(`expected ten ecosystems, found ${generated.scope.ecosystems.length}`);
if (generated.rows.length !== 60) throw new Error(`expected 60 product/ecosystem rows, found ${generated.rows.length}`);
for (const row of generated.rows) {
  if (row.status === "verified" && row.executableLaneCount !== row.declaredLaneCount) {
    throw new Error(`verified row is incomplete: ${row.product}/${row.ecosystem}`);
  }
  for (const capability of row.capabilities) {
    for (const lane of capability.lanes) {
      if (lane.executable && (lane.mode !== "kernel-gateway" || !lane.supportsExecution || !["devnet_verified", "testnet_verified", "mainnet_live"].includes(lane.status))) {
        throw new Error(`executable lane is missing Kernel/evidence gates: ${row.product}/${row.ecosystem}/${capability.capability}/${lane.network}`);
      }
    }
  }
}

const result = spawnSync(process.execPath, ["--import", "tsx", "scripts/build-enterprise-coverage-report.mjs"], { encoding: "utf8" });
if (result.status !== 0) throw new Error(result.stderr || "coverage report regeneration failed");
const regenerated = JSON.parse(await readFile("docs/generated/enterprise-10-ecosystem-coverage.json", "utf8"));
if (JSON.stringify(generated) !== JSON.stringify(regenerated)) throw new Error("enterprise coverage report is out of sync");
console.log(JSON.stringify({ schema: generated.schema, rows: generated.rows.length, synchronized: true }, null, 2));
