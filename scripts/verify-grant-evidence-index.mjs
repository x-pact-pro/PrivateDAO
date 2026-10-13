import fs from "node:fs";

const index = JSON.parse(fs.readFileSync("docs/generated/grant-evidence-index.json", "utf8"));
const assert = (condition, message) => { if (!condition) throw new Error(message); };
assert(index.schema === "privatedao.grant-evidence-index.v1", "wrong evidence index schema");
assert(index.products.length === 6, `expected 6 products, got ${index.products.length}`);
assert(index.networks.length === 11, `expected 11 networks, got ${index.networks.length}`);
assert(index.rows.length === 66, `expected 66 matrix rows, got ${index.rows.length}`);
assert(index.agentExchangeExcluded === true, "Agent Exchange must remain outside the commercial product matrix");
assert(index.hosting.productionAuthority === "AWS EC2", "production authority must be AWS EC2");
assert(index.hosting.githubRole.includes("not production hosting"), "GitHub production boundary missing");
for (const row of index.rows) {
  if (row.verification === "verified") {
    assert(row.transactionHashes.length > 0 || row.proofs.length > 0, `${row.product}/${row.network} verified without hash or proof`);
    assert(row.evidencePaths.length > 0, `${row.product}/${row.network} verified without evidence path`);
  }
  if (row.verification === "missing") assert(row.note.includes("No product-specific"), `${row.product}/${row.network} missing row is unclear`);
  assert(["not_recorded", "recorded"].includes(row.gitHubActionsRun.status), `${row.product}/${row.network} invalid CI evidence status`);
  if (row.gitHubActionsRun.status === "recorded") assert(/^https:\/\/github\.com\/[^/]+\/[^/]+\/actions\/runs\/\d+$/.test(row.gitHubActionsRun.url), `${row.product}/${row.network} invalid CI run URL`);
}
console.log(`[grant-evidence-index] PASS rows=${index.rows.length} verified=${index.rows.filter((row) => row.verification === "verified").length} ready=${index.rows.filter((row) => row.verification === "ready").length} missing=${index.rows.filter((row) => row.verification === "missing").length}`);
