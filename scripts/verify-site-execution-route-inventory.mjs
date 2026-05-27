import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const servicesRoot = path.join(repoRoot, "apps/web/src/app/services");
const inventoryPath = path.join(repoRoot, "docs/site-execution-route-inventory-2026-05-27.md");

const canonicalExecutionSignals = [
  "OperationsShell",
  "Workbench",
  "Surface",
  "Status",
  "Testnet",
  "api.privatedao.org",
  "proof",
  "Proof",
  "wallet",
  "Wallet",
  "on-chain",
  "onchain",
  "signature",
  "receipt",
];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function read(file) {
  return fs.readFileSync(file, "utf8");
}

function servicePages() {
  return fs
    .readdirSync(servicesRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      const route = `/services/${entry.name}/`;
      const file = path.join(servicesRoot, entry.name, "page.tsx");
      return fs.existsSync(file) ? { route, file, body: read(file) } : null;
    })
    .filter(Boolean)
    .sort((a, b) => a.route.localeCompare(b.route));
}

function isBridge(body) {
  return body.includes("LegacyRouteRedirect") || (body.includes("export { default }") && body.includes("from "));
}

function hasExecutionSignal(body) {
  return canonicalExecutionSignals.some((signal) => body.includes(signal));
}

function main() {
  const inventory = read(inventoryPath);
  const pages = servicePages();
  const failures = [];

  for (const page of pages) {
    if (!inventory.includes(page.route)) {
      failures.push(`${page.route} is missing from site execution route inventory`);
    }

    if (isBridge(page.body)) {
      if (!inventory.includes(page.route)) failures.push(`${page.route} bridge is not indexed`);
      if (!page.body.includes("target=") && !page.body.includes("export { default }")) {
        failures.push(`${page.route} bridge does not expose a target or canonical export`);
      }
      continue;
    }

    if (!hasExecutionSignal(page.body)) {
      failures.push(`${page.route} has no execution signal, proof signal, or bridge target`);
    }

    if (page.body.length < 900) {
      failures.push(`${page.route} is too small for a canonical service route; convert it to a bridge or complete it`);
    }
  }

  for (const required of [
    "/intelligence/",
    "/services/encrypt-ika-operations/",
    "/services/qvac-sovereign-ai/",
    "/services/pusd-stablecoin/",
    "/services/torque-growth-loop/",
    "/services/runtime-infrastructure/",
    "Normal users should not need code or a terminal",
    "Every canonical route must expose at least one of",
  ]) {
    if (!inventory.includes(required)) failures.push(`inventory missing required fragment: ${required}`);
  }

  if (failures.length) {
    throw new Error(`Site execution route inventory verification failed:\n- ${failures.join("\n- ")}`);
  }

  console.log(`Site execution route inventory verification: PASS (${pages.length} service routes indexed)`);
}

main();
