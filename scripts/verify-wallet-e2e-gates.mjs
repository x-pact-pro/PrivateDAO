import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";

const root = process.cwd();
const hasMongoUri = Boolean((process.env.PDAO_WALLET_MONGODB_URI
  || process.env.MONGODB_URI
  || process.env.PDAO_WALLET_MONGODB_SECRET_ID
  || "").trim());
const hasBrowserArtifact = existsSync(path.join(root, "apps/web/out"));
const liveBrowserSurface = process.env.PDAO_WALLET_LIVE_SURFACE === "1";

const gates = [
  { id: "wallet-security-local", args: ["--import", "tsx", "scripts/test-wallet-security-layer.mjs"] },
  { id: "evm-transaction-safety-local", args: ["--experimental-strip-types", "apps/web/scripts/test-evm-transaction-safety.mjs"] },
  {
    id: "kernel-gateway-local",
    args: ["scripts/test-kernel-gateway.mjs"],
    // This gate asserts the gateway's fail-closed behavior when durable
    // wallet storage and identity are absent. Do not let production runtime
    // references supplied to the parent orchestrator change that fixture.
    clearEnv: [
      "PDAO_WALLET_MONGODB_URI",
      "MONGODB_URI",
      "PDAO_WALLET_MONGODB_SECRET_ID",
      "PDAO_MONGODB_SECRET_DATABASE",
      "PDAO_WALLET_MONGODB_DATABASE",
      "MONGODB_DATABASE",
      "PDAO_IDENTITY_PROVIDER",
      "PDAO_COGNITO_USER_POOL_ID",
      "PDAO_COGNITO_ISSUER",
      "PDAO_COGNITO_AUDIENCE",
      "PDAO_AUTH0_ISSUER",
      "PDAO_AUTH0_AUDIENCE",
      "PRIVY_APP_ID",
      "PRIVY_APP_SECRET",
      "PDAO_PRIVY_SECRET_ID",
      "PDAO_AUTONOMOUS_SIGNER_PROVIDER",
      "PDAO_AUTONOMOUS_SIGNER_SECRET_ID",
      "PDAO_KERNEL_EVM_ENABLED",
      "PDAO_KERNEL_EVM_BROADCAST_ENABLED",
      "PDAO_KERNEL_EVM_BROWSER_ENABLED",
      "PDAO_KERNEL_EVM_NETWORKS",
      "PDAO_KERNEL_EVM_PRODUCT_EXECUTION_NETWORKS",
      "PDAO_KERNEL_EVM_ALLOWED_CONTRACTS",
      "PDAO_KERNEL_EVM_ALLOWED_FUNCTIONS",
      "PDAO_KERNEL_EVM_ALLOWED_FUNCTION_SELECTORS",
      "PDAO_EVM_ETHEREUM_SEPOLIA_RPC_URL",
      "PDAO_EVM_ARBITRUM_SEPOLIA_RPC_URL",
      "PDAO_EVM_TEMPO_TESTNET_RPC_URL",
      "PDAO_EVM_BASE_SEPOLIA_RPC_URL",
      "PDAO_EVM_BNB_TESTNET_RPC_URL",
      "PDAO_EVM_ROBINHOOD_TESTNET_RPC_URL",
      "PDAO_EVM_HYPERLIQUID_TESTNET_RPC_URL",
      "PDAO_PQC_KEY_PROVIDER",
      "PDAO_PQC_KEY_ID",
      "PDAO_PQC_CLASSICAL_KEY_ID",
      "PDAO_PQC_ACTIVE_KEY_ID",
      "PDAO_PQC_ROTATION_ID",
      "PDAO_PQC_REQUIRE_HYBRID_AUTHORIZATION",
      "PDAO_PQC_PUBLIC_KEYS_JSON",
    ],
  },
  { id: "wallet-commerce-live", args: ["scripts/verify-wallet-commerce-gates.mjs"] },
  {
    id: "mongodb-live",
    args: ["--import", "tsx", "scripts/test-wallet-security-mongodb.mjs"],
    skip: !hasMongoUri,
    reason: "MongoDB URI is not configured",
  },
  {
    id: "browser-desktop-mobile",
    args: ["--import", "tsx", "scripts/verify-wallet-connect-surface.ts"],
    skip: !hasBrowserArtifact && !liveBrowserSurface,
    reason: hasBrowserArtifact ? undefined : "apps/web/out is not present and live browser surface was not requested",
    env: liveBrowserSurface ? { PDAO_WALLET_SURFACE_URL: process.env.PDAO_WALLET_SURFACE_URL || "https://privatedao.org/wallet/" } : undefined,
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
  const gateEnv = { ...process.env, ...(gate.env || {}) };
  for (const name of gate.clearEnv || []) delete gateEnv[name];
  const result = spawnSync(process.execPath, gate.args, {
    cwd: root,
    env: gateEnv,
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
    const useful = lines.find((line) => /wallet-commerce-gate:|MONGODB_WALLET_LIVE:|AUTONOMOUS_WALLET_GATEWAY_E2E:|B2B_B2C_WALLET_GATEWAY_E2E:|wallet production readiness:/i.test(line))
    || lines.find((line) => /AssertionError|bad auth|authentication failed|MongoServerError|ERR_MODULE_NOT_FOUND|Cannot find (?:package|module)|did not become healthy|Error:|\bFAIL\b|\bBLOCKED\b/i.test(line));
  return redactDiagnostic((useful || lines.at(-1)).slice(0, 240));
}

function redactDiagnostic(value) {
  return value
    .replace(/mongodb(?:\+srv)?:\/\/[^\s]+/gi, "mongodb://[redacted]")
    .replace(/(authorization|token|secret|password)=([^\s&]+)/gi, "$1=[redacted]");
}
