import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";

const root = process.cwd();
const hasMongoUri = Boolean((process.env.PDAO_WALLET_MONGODB_URI || process.env.MONGODB_URI || "").trim());
const hasBrowserArtifact = existsSync(path.join(root, "apps/web/out"));

const gates = [
  { id: "wallet-security-local", args: ["--import", "tsx", "scripts/test-wallet-security-layer.mjs"] },
  { id: "kernel-gateway-local", args: ["scripts/test-kernel-gateway.mjs"] },
  {
    id: "mongodb-live",
    args: ["--import", "tsx", "scripts/test-wallet-security-mongodb.mjs"],
    skip: !hasMongoUri,
    reason: "MongoDB URI is not configured",
  },
  {
    id: "browser-desktop-mobile",
    args: ["--import", "tsx", "scripts/verify-wallet-connect-surface.ts"],
    skip: !hasBrowserArtifact,
    reason: "apps/web/out is not present",
  },
  {
    id: "managed-signer-base-sepolia",
    args: ["--import", "tsx", "scripts/test-managed-signer-base-sepolia-e2e.mjs"],
    skip: process.env.PDAO_AUTONOMOUS_SIGNER_PROVIDER !== "aws-secrets-manager"
      || !process.env.PDAO_AUTONOMOUS_SIGNER_SECRET_ID?.trim(),
    reason: "AWS Secrets Manager managed signer is not configured",
  },
  { id: "autonomous-wallet-gateway", args: ["--import", "tsx", "scripts/test-autonomous-wallet-gateway-e2e.mjs"] },
  { id: "b2b-b2c-wallet-gateway", args: ["--import", "tsx", "scripts/test-b2b-b2c-wallet-gateway-e2e.mjs"] },
  { id: "production-readiness", args: ["--import", "tsx", "scripts/verify-wallet-production-readiness.mjs"] },
];

const results = [];
for (const gate of gates) {
  if (gate.skip) {
    results.push({ id: gate.id, status: "NOT_RUN", reason: gate.reason });
    continue;
  }
  console.log(`wallet-e2e-gate ${gate.id}: RUN`);
  const result = spawnSync(process.execPath, gate.args, {
    cwd: root,
    env: process.env,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: 120_000,
  });
  const diagnostic = summarizeDiagnostic(result.stdout, result.stderr, result.error);
  results.push({
    id: gate.id,
    status: result.status === 0 ? "PASS" : "FAIL",
    ...(diagnostic ? { reason: diagnostic } : {}),
  });
}

for (const result of results) {
  console.log(`wallet-e2e-gate ${result.id}: ${result.status}${result.reason ? ` (${result.reason})` : ""}`);
}

const failed = results.filter((result) => result.status === "FAIL");
const missing = results.filter((result) => result.status === "NOT_RUN");
console.log(JSON.stringify({
  schema: "pdao-wallet-e2e-gates/v1",
  results,
  complete: failed.length === 0 && missing.length === 0,
}));
if (failed.length > 0 || missing.length > 0) process.exitCode = 1;

function summarizeDiagnostic(stdout, stderr, spawnError) {
  if (spawnError?.code === "ETIMEDOUT") return "gate timed out after 120 seconds";
  const lines = `${stderr || ""}\n${stdout || ""}`
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !line.startsWith("> private-dao@"))
    .filter((line) => !line.startsWith("wallet-e2e-gate "));
  if (lines.length === 0) return undefined;
  const useful = lines.find((line) => /bad auth|authentication failed|MongoServerError|Error:|\bFAIL\b|\bBLOCKED\b/i.test(line));
  return redactDiagnostic((useful || lines.at(-1)).slice(0, 240));
}

function redactDiagnostic(value) {
  return value
    .replace(/mongodb(?:\+srv)?:\/\/[^\s]+/gi, "mongodb://[redacted]")
    .replace(/(authorization|token|secret|password)=([^\s&]+)/gi, "$1=[redacted]");
}
