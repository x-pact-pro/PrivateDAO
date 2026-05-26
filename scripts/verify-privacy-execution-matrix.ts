import fs from "fs";
import path from "path";

const READ_NODE = path.resolve("scripts/run-read-node.ts");
const DOC = path.resolve("docs/privacy-execution-matrix-2026-05-26.md");
const LIVE_PROOF = path.resolve("docs/test-wallet-live-proof-v3.generated.json");

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function includes(body: string, fragment: string, label: string) {
  assert(body.includes(fragment), `${label} missing ${fragment}`);
}

function main() {
  const readNode = fs.readFileSync(READ_NODE, "utf8");
  const doc = fs.readFileSync(DOC, "utf8");
  const proof = JSON.parse(fs.readFileSync(LIVE_PROOF, "utf8"));

  assert(proof.cluster === "testnet", "live proof must remain Testnet-scoped");
  assert(proof.programId === "EP9xE8MJZ6FfyEwLqns6HDdUZBknEa7WGYs1Jzsecuva", "unexpected Testnet program id");
  assert(Boolean(proof.settlementV3?.transactions?.executeV3), "missing V3 execution transaction");

  for (const required of [
    "function privacyExecutionMatrixStatus()",
    'pathname === "/api/v1/privacy-execution-matrix"',
    'pathname === "/api/v1/privacy-execution-claims/prepare"',
    'pathname === "/api/v1/provider-integrations/status"',
    "function providerIntegrationStatus()",
    "wallet-first-private-operations",
    "private-governance",
    "confidential-payroll",
    "private-payments",
    "umbra-confidential-payout",
    "ika-custody-and-interoperability",
    "intelligence-and-risk",
    "treasury-routing-and-growth",
    "executionProofClass",
    "visitorRepeatable",
    "blockchainVerificationUrl",
    "currentOnchainStatus",
    "onchain-signature",
    "testnet-intent-receipt",
    "wallet-signed-onchain",
    "PDAO_ENCRYPTED_CLAIM_V1",
    "AES-GCM",
    "privacyExecutionClaimPrepare",
    "selective-disclosure receipt",
    "public attestation",
    "private disclosure",
    "/api/v1/jupiter/order",
    "/api/v1/provider-integrations/status",
    "fetchJupiterOrder",
    "fetchZerionPortfolio",
  ]) {
    includes(readNode, required, "read-node privacy matrix");
  }

  for (const required of [
    "Privacy Execution Matrix",
    "https://api.privatedao.org/api/v1/privacy-execution-matrix",
    "EP9xE8MJZ6FfyEwLqns6HDdUZBknEa7WGYs1Jzsecuva",
    "5H7Afyqdh5yPekkZJ5UM2j3HNB2bRvU8aVv8XoqeAW1j",
    proof.settlementV3.transactions.configureRefheEnvelope,
    proof.settlementV3.transactions.settleRefheEnvelope,
    proof.settlementV3.transactions.configureMagicBlockPrivatePaymentCorridor,
    proof.settlementV3.transactions.settleMagicBlockPrivatePaymentCorridor,
    proof.settlementV3.transactions.executeV3,
    "GoldRush",
    "Zerion",
    "Torque",
    "Jupiter",
    "Umbra",
    "Ika",
    "REFHE",
    "MagicBlock",
    "Review -> Sign -> Verify",
    "AES-GCM encrypted claim packet",
    "PDAO_ENCRYPTED_CLAIM_V1",
    "/api/v1/privacy-execution-claims/prepare?claim=<rail>",
    "selective-disclosure receipt",
    "public attestation",
    "private disclosure receipt",
    "No private keys, provider API keys, RPC tokens, PEM contents, or wallet secret keys are included",
  ]) {
    includes(doc, required, "privacy execution matrix doc");
  }

  for (const forbidden of ["jup_", "qnsec_", `BEGIN ${"PRIVATE"} KEY`]) {
    assert(!doc.includes(forbidden), `privacy execution matrix doc leaked forbidden marker ${forbidden}`);
  }

  console.log("Privacy execution matrix verification: PASS");
}

main();
