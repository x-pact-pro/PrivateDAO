import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const outJson = path.join(root, "docs/generated/grant-evidence-index.json");
const outMd = path.join(root, "docs/generated/grant-evidence-index.md");

const products = [
  "blind-verification",
  "record-verification",
  "payroll",
  "treasury",
  "governance",
  "auction",
];
const networks = [
  "solana-devnet",
  "ethereum-sepolia",
  "arbitrum-sepolia",
  "bnb-testnet",
  "base-sepolia",
  "robinhood-testnet",
  "tempo-testnet",
  "zcash-testnet",
  "hyperliquid-testnet",
  "stellar-testnet",
  "hypercore-testnet",
];

const readJson = (relative) => {
  try {
    return JSON.parse(fs.readFileSync(path.join(root, relative), "utf8"));
  } catch {
    return null;
  }
};
const hash = (value) => typeof value === "string" && /^(0x)?[a-f0-9]{32,}$/i.test(value);
const nonEmpty = (value) => typeof value === "string" && value.length > 0;
const evidence = [];

const matrix = readJson("docs/generated/native-capability-matrix-20260911.json");
const matrixByKey = new Map((matrix?.entries ?? []).map((entry) => [`${entry.product}:${entry.network}`, entry]));

const addEvidence = (product, network, source, values, verifiedAt, kind = "transaction") => {
  const hashes = values.filter(hash);
  const proofs = values.filter((value) => nonEmpty(value) && !hash(value));
  if (hashes.length || proofs.length) evidence.push({ product, network, source, hashes, proofs, verifiedAt, kind });
};

for (const network of ["ethereum-sepolia", "arbitrum-sepolia", "bnb-testnet", "base-sepolia", "robinhood-testnet", "tempo-testnet"]) {
  const artifact = readJson(`packages/evm-verification/deployments/organizational-${network}.json`);
  for (const product of products) {
    const row = artifact?.evidence?.[product];
    if (!row) continue;
    const values = Object.entries(row)
      .filter(([key]) => /hash/i.test(key) && key !== "paymentId")
      .map(([, value]) => value);
    addEvidence(product, network, `packages/evm-verification/deployments/organizational-${network}.json`, values, artifact.createdAt);
  }
}

const stellar = readJson("docs/evidence/stellar-testnet-product-e2e.json");
for (const product of products) {
  const rows = (stellar?.results ?? []).filter((row) => row.product === product && row.state === "confirmed");
  addEvidence(product, "stellar-testnet", "docs/evidence/stellar-testnet-product-e2e.json", rows.map((row) => row.transactionHash), stellar?.generatedAt, "transaction");
}

const solanaProofs = [
  ["blind-verification", "docs/evidence/solana-devnet-blind-verification-e2e.json", "proofHash"],
  ["record-verification", "docs/evidence/solana-devnet-record-verification-e2e.json", "anchorSignature"],
  ["payroll", "docs/generated/payroll-devnet-e2e.generated.json", "proof.proofHash"],
];
for (const [product, source, key] of solanaProofs) {
  const artifact = readJson(source);
  const value = key.includes(".") ? key.split(".").reduce((current, part) => current?.[part], artifact) : artifact?.[key];
  addEvidence(product, "solana-devnet", source, [value], artifact?.verifiedAt ?? artifact?.generatedAt, "proof");
}

const zcash = readJson("docs/evidence/zcash-testnet-products-e2e.json");
for (const row of zcash?.products ?? []) {
  evidence.push({
    product: row.product,
    network: "zcash-testnet",
    source: "docs/evidence/zcash-testnet-products-e2e.json",
    hashes: [],
    proofs: [],
    verifiedAt: row.generatedAt ?? zcash.generatedAt,
    kind: zcash.broadcastEnabled ? "transaction" : "prepared",
    prepared: true,
  });
}

const hyperliquid = readJson("packages/evm-verification/deployments/phase-2-e2e-hyperliquid-testnet.json");
for (const product of ["record-verification", "blind-verification"]) {
  const key = product === "record-verification" ? "record" : "blind";
  const row = hyperliquid?.networks?.[0]?.[key];
  addEvidence(product, "hyperliquid-testnet", "packages/evm-verification/deployments/phase-2-e2e-hyperliquid-testnet.json", [row?.txHash], hyperliquid?.generatedAt);
}

const evidenceFor = (product, network) => evidence.filter((item) => item.product === product && item.network === network);
const actionRunUrl = process.env.GITHUB_RUN_URL
  || (process.env.GITHUB_SERVER_URL && process.env.GITHUB_REPOSITORY && process.env.GITHUB_RUN_ID
    ? `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`
    : null);
const rows = [];
for (const network of networks) {
  for (const product of products) {
    const found = evidenceFor(product, network);
    const actual = found.find((item) => item.hashes.length || item.proofs.length);
    const prepared = found.find((item) => item.prepared);
    const registry = matrixByKey.get(`${product}:${network}`);
    const verification = actual ? "verified" : prepared ? "ready" : "missing";
    rows.push({
      product,
      network,
      verification,
      registryStatus: registry?.status ?? "unknown",
      testRunAt: actual?.verifiedAt ?? prepared?.verifiedAt ?? registry?.lastVerifiedTimestamp ?? null,
      transactionHashes: actual?.hashes ?? [],
      proofs: actual?.proofs ?? [],
      evidencePaths: [...new Set(found.map((item) => item.source))],
      gitHubActionsRun: actionRunUrl ? { status: "recorded", url: actionRunUrl } : { status: "not_recorded", url: null },
      note: actual ? "Evidence artifact contains a transaction or proof identifier." : prepared ? "Preparation/runtime evidence only; no broadcast proof." : "No product-specific evidence artifact found.",
    });
  }
}

const generatedAt = new Date().toISOString();
const index = {
  schema: "privatedao.grant-evidence-index.v1",
  generatedAt,
  purpose: "Evidence-first reviewer index for six commercial products across the eleven configured testnet lanes.",
  products,
  networks,
  hosting: {
    productionAuthority: "AWS EC2",
    site: "https://privatedao.org",
    agentExchange: "https://agents.privatedao.org",
    githubRole: "source control and CI evidence; not production hosting",
  },
  agentExchangeExcluded: true,
  githubActionsEvidencePolicy: "A row is not assigned a GitHub Actions run unless a real run URL is stored or supplied by the CI environment.",
  rows,
};

const md = [
  "# PrivateDAO Grant Evidence Index",
  "",
  `Generated: ${generatedAt}`,
  "",
  "This index covers the six commercial products only. Agent Exchange is intentionally excluded from this product matrix and is documented separately.",
  "",
  "## Production boundary",
  "",
  "- Production authority: AWS EC2.",
  "- GitHub: source control and CI evidence, not GitHub Pages production hosting.",
  "- Site: https://privatedao.org",
  "- Agent Exchange: https://agents.privatedao.org",
  "",
  "`verified` requires a transaction hash or an appropriate proof identifier in a committed evidence artifact. `ready` means preparation/runtime evidence without a broadcast proof. `missing` means no product-specific artifact was found.",
  "",
  "## Matrix",
  "",
  "| Network | Product | Verification | Run date | Transaction/proof | Evidence | GitHub Actions run |",
  "| --- | --- | --- | --- | --- | --- | --- |",
  ...rows.map((row) => {
    const proof = [...row.transactionHashes, ...row.proofs].join(", ") || "-";
    const source = row.evidencePaths.map((item) => `\`${item}\``).join(" ") || "-";
    return `| ${row.network} | ${row.product} | **${row.verification}** | ${row.testRunAt ?? "-"} | ${proof} | ${source} | not recorded |`;
  }),
  "",
  "## Reviewer path",
  "",
  "1. Open the linked evidence artifact for the row under review.",
  "2. For `verified`, compare the transaction/proof identifier with the relevant explorer or verifier.",
  "3. Treat `ready` and `missing` as not yet proven E2E; do not infer a successful broadcast from the registry status.",
  "4. Use the commit and CI workflow that generated the artifact when a GitHub Actions run URL is recorded.",
  "",
].join("\n");

fs.mkdirSync(path.dirname(outJson), { recursive: true });
fs.writeFileSync(outJson, `${JSON.stringify(index, null, 2)}\n`);
fs.writeFileSync(outMd, md);
console.log(`[grant-evidence-index] wrote ${rows.length} rows: ${rows.filter((row) => row.verification === "verified").length} verified, ${rows.filter((row) => row.verification === "ready").length} ready, ${rows.filter((row) => row.verification === "missing").length} missing`);
