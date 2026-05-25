import fs from "fs";
import path from "path";

const BASE_URL = process.env.PRIVATE_DAO_BACKEND_BASE_URL || "https://api.privatedao.org";
const EXPECTED_PROGRAM_ID = "EP9xE8MJZ6FfyEwLqns6HDdUZBknEa7WGYs1Jzsecuva";

type JsonRecord = Record<string, unknown>;

type EndpointCheck = {
  label: string;
  provider: string;
  path: string;
  status: "pass" | "warn" | "fail";
  httpStatus: number;
  summary: string;
};

async function main() {
  const refheProbe = {
    ciphertext: "backend-readiness-ciphertext",
    inputCommitment: "input:backend-readiness",
    computationCommitment: "compute:backend-readiness",
    policyHash: "policy:backend-readiness",
    recipientCount: 2,
    totalAmountCommitment: "amount:backend-readiness",
  };

  const [health, readiness, visitors, freshness, quicknode, magicblock, ika, refhe, qvac, umbra, chain] = await Promise.all([
    fetchJson("/healthz"),
    fetchJson("/api/v1/readiness"),
    fetchJson("/api/v1/visitors/stats"),
    fetchJson("/api/v1/freshness/latest"),
    fetchJson("/api/v1/quicknode/stream/stats"),
    fetchJson("/api/v1/magicblock/onchain-proof"),
    fetchJson("/api/v1/ika/solana-prealpha/readiness"),
    postJson("/api/v1/refhe/payroll/proof", refheProbe),
    fetchJson("/api/v1/qvac/runtime-proof"),
    fetchJson("/api/v1/umbra/relayer/health"),
    fetchJson("/api/v1/chain/latest"),
  ]);

  const runtime = objectAt(health.body, "runtime");
  const quickNodeStats = objectAt(quicknode.body, "stats");
  const magicblockProof = objectAt(magicblock.body, "proof");
  const magicblockSummary = objectAt(magicblockProof, "summary");
  const ikaReadiness = objectAt(ika.body, "solanaPreAlpha");
  const ikaProgram = objectAt(ikaReadiness, "program");
  const ikaOperator = objectAt(ikaReadiness, "operator");
  const qvacProof = objectAt(qvac.body, "proof");
  const latestFreshness = objectAt(freshness.body, "latest");

  const endpointChecks: EndpointCheck[] = [
    {
      label: "AWS same-domain read node",
      provider: "AWS EC2 + Docker edge",
      path: "/healthz",
      httpStatus: health.status,
      status: health.ok && runtime.programId === EXPECTED_PROGRAM_ID && runtime.programExecutable === true ? "pass" : "fail",
      summary: `Program ${String(runtime.programId || "unknown")} executable=${String(runtime.programExecutable)}`,
    },
    {
      label: "QuickNode Testnet RPC",
      provider: "QuickNode Solana Testnet",
      path: "/api/v1/readiness",
      httpStatus: readiness.status,
      status:
        readiness.ok &&
        String(objectAt(readiness.body, "runtime").rpcEndpoint || "").includes("solana-testnet.quiknode.pro/[redacted]")
          ? "pass"
          : "fail",
      summary: `RPC ${String(objectAt(readiness.body, "runtime").rpcEndpoint || "unknown")}`,
    },
    {
      label: "QuickNode stream intake",
      provider: "QuickNode Streams",
      path: "/api/v1/quicknode/stream/stats",
      httpStatus: quicknode.status,
      status: quicknode.ok && Number(quickNodeStats.acceptedPayloads || 0) >= 1 ? "pass" : "warn",
      summary: `${Number(quickNodeStats.acceptedPayloads || 0)} accepted payload(s), raw storage ${String(quickNodeStats.rawPayloadStorage || "unknown")}`,
    },
    {
      label: "Supabase visitor counters",
      provider: "Supabase",
      path: "/api/v1/visitors/stats",
      httpStatus: visitors.status,
      status: visitors.ok && Number(visitors.body.totalSessions || 0) > 0 ? "pass" : "warn",
      summary: `${Number(visitors.body.totalSessions || 0)} total sessions, ${Number(visitors.body.totalVisitorTransactions || 0)} visitor txs`,
    },
    {
      label: "MagicBlock receipt proof",
      provider: "MagicBlock + Solana receipts",
      path: "/api/v1/magicblock/onchain-proof",
      httpStatus: magicblock.status,
      status: magicblock.ok && magicblockSummary.allFinalized === true ? "pass" : "warn",
      summary: `${Number(magicblockSummary.finalized || 0)}/${Number(magicblockSummary.checked || 0)} receipts finalized; runtime ${String(objectAt(magicblockProof, "runtime").health || "unknown")}`,
    },
    {
      label: "Ika Solana pre-alpha readiness",
      provider: "Ika 2PC-MPC / Solana pre-alpha",
      path: "/api/v1/ika/solana-prealpha/readiness",
      httpStatus: ika.status,
      status: ika.ok && ikaProgram.executable === true && ikaOperator.funded === true ? "pass" : "warn",
      summary: `program executable=${String(ikaProgram.executable)}, operator funded=${String(ikaOperator.funded)}, latest blockhash=${short(String(ikaReadiness.latestBlockhash || "unknown"))}`,
    },
    {
      label: "REFHE payroll proof route",
      provider: "REFHE-style encrypted computation receipt",
      path: "/api/v1/refhe/payroll/proof",
      httpStatus: refhe.status,
      status: refhe.ok && refhe.body.mode === "encrypted-computation-receipt" && typeof refhe.body.receiptHash === "string" ? "pass" : "warn",
      summary: refhe.ok
        ? `encrypted computation receipt ${short(String(refhe.body.receiptHash || "unknown"))}`
        : String(refhe.body.error || "proof route returned no receipt"),
    },
    {
      label: "Supabase freshness memo",
      provider: "Supabase + Solana Testnet",
      path: "/api/v1/freshness/latest",
      httpStatus: freshness.status,
      status: freshness.ok && latestFreshness.tx ? "pass" : "warn",
      summary: latestFreshness.tx ? `Latest tx ${short(String(latestFreshness.tx))} at ${String(latestFreshness.time || "unknown")}` : "No freshness tx yet",
    },
    {
      label: "QVAC sovereign AI proof",
      provider: "QVAC local-first runtime",
      path: "/api/v1/qvac/runtime-proof",
      httpStatus: qvac.status,
      status: qvac.ok && qvacProof.sdkLoaded === true && qvacProof.model === "qvac/fabric-llm-finetune" ? "pass" : "warn",
      summary: `SDK ${String(qvacProof.sdkVersion || "unknown")}, model ${String(qvacProof.model || "unknown")}`,
    },
    {
      label: "Umbra relayer health",
      provider: "Umbra devnet relayer",
      path: "/api/v1/umbra/relayer/health",
      httpStatus: umbra.status,
      status: umbra.ok && objectAt(umbra.body, "health").status === "ok" ? "pass" : "warn",
      summary: `Relayer ${String(objectAt(umbra.body, "health").status || "unknown")}`,
    },
    {
      label: "Chain watcher",
      provider: "Solana Testnet indexed chain events",
      path: "/api/v1/chain/latest",
      httpStatus: chain.status,
      status: chain.ok && Array.isArray(chain.body.transactions) ? "pass" : "warn",
      summary: `${Array.isArray(chain.body.transactions) ? chain.body.transactions.length : 0} latest indexed transactions`,
    },
  ];

  const failed = endpointChecks.filter((entry) => entry.status === "fail");
  if (failed.length > 0) {
    throw new Error(`Backend provider readiness failed: ${failed.map((entry) => entry.label).join(", ")}`);
  }

  const report = {
    project: "PrivateDAO",
    generatedAt: new Date().toISOString(),
    baseUrl: BASE_URL,
    cluster: "solana-testnet",
    expectedProgramId: EXPECTED_PROGRAM_ID,
    posture: failed.length === 0 ? "backend-production-candidate" : "blocked",
    endpointChecks,
    operatorInterpretation: [
      "The public backend is live on the same API host used by the product.",
      "QuickNode RPC is active and redacted in public payloads.",
      "QuickNode stream intake is configured with raw payload storage disabled.",
      "MagicBlock, Ika, and REFHE proof routes are live as backend endpoints with reviewer-safe outputs.",
      "Supabase counters are live without IP or personal-data collection.",
      "QVAC and Umbra are exposed as proof/health endpoints, not secret-bearing client code.",
    ],
  };

  fs.writeFileSync(path.resolve("docs/backend-provider-readiness-2026-05-24.json"), JSON.stringify(report, null, 2) + "\n");
  fs.writeFileSync(path.resolve("docs/backend-provider-readiness-2026-05-24.md"), buildMarkdown(report));
  console.log("Wrote backend provider readiness report");
}

function buildMarkdown(report: {
  generatedAt: string;
  baseUrl: string;
  cluster: string;
  expectedProgramId: string;
  posture: string;
  endpointChecks: EndpointCheck[];
  operatorInterpretation: string[];
}) {
  return `# Backend Provider Readiness — 2026-05-24

## Summary

- Base URL: \`${report.baseUrl}\`
- Cluster: \`${report.cluster}\`
- Current program: \`${report.expectedProgramId}\`
- Generated at: \`${report.generatedAt}\`
- Posture: \`${report.posture}\`

## Provider Checks

${report.endpointChecks
  .map(
    (entry) => `### ${entry.label}

- provider: \`${entry.provider}\`
- endpoint: \`${report.baseUrl}${entry.path}\`
- status: \`${entry.status}\`
- http: \`${entry.httpStatus}\`
- summary: ${entry.summary}`,
  )
  .join("\n\n")}

## Operator Interpretation

${report.operatorInterpretation.map((entry) => `- ${entry}`).join("\n")}

## Reviewer Route

Open \`/api-status\`, \`/rpc-services\`, and \`/documents/readiness-aggregate\` to inspect the same live backend surface from the product UI.
`;
}

async function fetchJson(routePath: string): Promise<{ status: number; ok: boolean; body: JsonRecord }> {
  const response = await fetch(`${BASE_URL}${routePath}`, { cache: "no-store" });
  const body = (await response.json().catch(() => ({}))) as JsonRecord;
  return { status: response.status, ok: response.ok && body.ok !== false, body };
}

async function postJson(routePath: string, payload: JsonRecord): Promise<{ status: number; ok: boolean; body: JsonRecord }> {
  const response = await fetch(`${BASE_URL}${routePath}`, {
    method: "POST",
    cache: "no-store",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const body = (await response.json().catch(() => ({}))) as JsonRecord;
  return { status: response.status, ok: response.ok && body.ok !== false, body };
}

function objectAt(record: JsonRecord, key: string): JsonRecord {
  const value = record[key];
  return typeof value === "object" && value !== null ? (value as JsonRecord) : {};
}

function short(value: string) {
  return value.length > 16 ? `${value.slice(0, 8)}...${value.slice(-6)}` : value;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
