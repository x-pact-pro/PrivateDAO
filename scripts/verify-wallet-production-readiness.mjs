import { existsSync } from "node:fs";
import { GetSecretValueCommand, SecretsManagerClient } from "@aws-sdk/client-secrets-manager";
import { createHybridAuthorizationVerifierFromEnv, createHybridAuthorizationVerifierFromKmsEnv } from "../packages/privatedao-runtime/src/index.ts";

const env = process.env;
const pqcRegistry = await loadPqcRegistry();
const gatewayTokenReady = await loadGatewayTokenReadiness();
const checks = [
  {
    id: "mongo",
    ok: Boolean((env.PDAO_WALLET_MONGODB_URI || env.MONGODB_URI)?.trim()),
    remediation: "Set PDAO_WALLET_MONGODB_URI (or MONGODB_URI) to the production MongoDB deployment.",
  },
  {
    id: "identity-provider",
    ok: env.PDAO_IDENTITY_PROVIDER === "aws-cognito"
      && Boolean(env.PDAO_COGNITO_USER_POOL_ID?.trim())
      && Boolean(env.PDAO_COGNITO_ISSUER?.trim())
      && Boolean(env.PDAO_COGNITO_AUDIENCE?.trim()),
    remediation: "Set PDAO_IDENTITY_PROVIDER=aws-cognito and configure the Cognito user-pool ID, issuer, and audience.",
  },
  {
    id: "gateway-token",
    ok: Boolean(env.PDAO_KERNEL_GATEWAY_TOKEN?.trim()) || gatewayTokenReady.valid,
    remediation: `Set PDAO_KERNEL_GATEWAY_TOKEN or configure a readable PDAO_KERNEL_GATEWAY_TOKEN_SECRET_ID${gatewayTokenReady.error ? ` (${gatewayTokenReady.error})` : ""}.`,
  },
  {
    id: "production-auth-mode",
    ok: env.NODE_ENV === "production" && env.PDAO_KERNEL_GATEWAY_ALLOW_UNAUTHENTICATED !== "1",
    remediation: "Run the gateway in production mode with unauthenticated access disabled.",
  },
  {
    id: "managed-autonomous-signer",
    ok: env.PDAO_KERNEL_EVM_ENABLED === "1"
      && env.PDAO_AUTONOMOUS_SIGNER_PROVIDER === "aws-secrets-manager"
      && Boolean(env.PDAO_AUTONOMOUS_SIGNER_SECRET_ID?.trim())
      && env.PDAO_KERNEL_EVM_BROADCAST_ENABLED === "1"
      && Boolean(env.PDAO_KERNEL_EVM_ALLOWED_CONTRACTS?.trim())
      && Boolean(env.PDAO_KERNEL_EVM_ALLOWED_FUNCTIONS?.trim())
      && Boolean(env.PDAO_KERNEL_EVM_ALLOWED_FUNCTION_SELECTORS?.trim()),
    remediation: "Autonomous delivery requires an AWS Secrets Manager signer reference, explicit contract/function/selector allowlists, and an approved broadcast gate; raw private-key environment variables are not accepted for production.",
  },
  {
    id: "pqc-dependency",
    ok: existsSync("node_modules/@noble/post-quantum"),
    remediation: "Install the pinned @noble/post-quantum dependency from the lockfile.",
  },
  {
    id: "pqc-key-custody",
    ok: (env.PDAO_PQC_KEY_PROVIDER === "external-kms-hsm"
      && Boolean(env.PDAO_PQC_KEY_ID?.trim())
      && Boolean(env.PDAO_PQC_ROTATION_ID?.trim()))
      || (env.PDAO_PQC_KEY_PROVIDER === "aws-kms"
        && Boolean(env.PDAO_PQC_KEY_ID?.trim())
        && Boolean(env.PDAO_PQC_CLASSICAL_KEY_ID?.trim())
        && Boolean(env.PDAO_PQC_ROTATION_ID?.trim())
        && pqcRegistry.valid),
    remediation: "Configure AWS KMS ML_DSA_65 plus the classical Ed25519 key, or an approved external KMS/HSM provider, with an active key and rotation ID.",
  },
  {
    id: "pqc-public-key-registry",
    ok: pqcRegistry.valid,
    remediation: `Configure a valid active/retired PQC public-key registry or a reachable AWS KMS hybrid key pair for server-side verification${pqcRegistry.error ? ` (${pqcRegistry.error})` : ""}.`,
  },
  {
    id: "pqc-enforcement",
    ok: env.PDAO_PQC_REQUIRE_HYBRID_AUTHORIZATION === "1",
    remediation: "Set PDAO_PQC_REQUIRE_HYBRID_AUTHORIZATION=1 so production B2B, B2C, and autonomous wallet policies cannot bypass hybrid authorization.",
  },
  {
    id: "pqc-independent-review",
    ok: Boolean(env.PDAO_PQC_REVIEW_REFERENCE?.trim()),
    remediation: "Record the independent cryptographic review reference before making a production quantum-resilience claim.",
  },
];

const failed = checks.filter((check) => !check.ok);
for (const check of checks) console.log(`wallet-readiness ${check.id}: ${check.ok ? "PASS" : "FAIL"}`);
if (failed.length > 0) {
  console.error("wallet production readiness: BLOCKED");
  for (const check of failed) console.error(`- ${check.remediation}`);
  process.exitCode = 1;
} else {
  console.log("wallet production readiness: PASS");
}

async function loadPqcRegistry() {
  if (env.PDAO_PQC_KEY_PROVIDER === "aws-kms") {
    try {
      await createHybridAuthorizationVerifierFromKmsEnv(env);
      return { valid: true };
    } catch (error) {
      return { valid: false, error: error instanceof Error ? error.message : "unavailable AWS KMS hybrid key pair" };
    }
  }
  if (!env.PDAO_PQC_PUBLIC_KEYS_JSON?.trim()) return { valid: false };
  try {
    createHybridAuthorizationVerifierFromEnv(env);
    return { valid: true };
  } catch (error) {
    return { valid: false, error: error instanceof Error ? error.message : "invalid PQC public-key registry" };
  }
}

async function loadGatewayTokenReadiness() {
  if (env.PDAO_KERNEL_GATEWAY_TOKEN?.trim()) return { valid: true };
  const secretId = env.PDAO_KERNEL_GATEWAY_TOKEN_SECRET_ID?.trim();
  if (!secretId) return { valid: false };
  try {
    const client = new SecretsManagerClient({ region: env.AWS_REGION || env.AWS_DEFAULT_REGION || "eu-north-1" });
    const response = await client.send(new GetSecretValueCommand({ SecretId: secretId }));
    return response.SecretString?.trim() ? { valid: true } : { valid: false, error: "the gateway token secret is empty" };
  } catch (error) {
    return { valid: false, error: error instanceof Error ? error.message : "gateway token secret is not readable" };
  }
}
