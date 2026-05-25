import fs from "fs";
import path from "path";

const DOC = path.resolve("docs/mainnet-cryptographic-readiness-ladder-2026-05-25.md");
const CURATED_DOCUMENTS = path.resolve("apps/web/src/lib/curated-documents.ts");
const JUDGE_PAGE = path.resolve("apps/web/src/app/judge/page.tsx");
const SECURITY_PAGE = path.resolve("apps/web/src/app/security/page.tsx");
const CRYPTO_MATRIX = path.resolve("docs/cryptographic-onchain-matrix-2026-05-25.md");

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function includes(body: string, fragment: string, label: string) {
  assert(body.includes(fragment), `${label} missing ${fragment}`);
}

function main() {
  assert(fs.existsSync(DOC), "missing mainnet cryptographic readiness ladder");

  const doc = fs.readFileSync(DOC, "utf8");
  const curatedDocuments = fs.readFileSync(CURATED_DOCUMENTS, "utf8");
  const judgePage = fs.readFileSync(JUDGE_PAGE, "utf8");
  const securityPage = fs.readFileSync(SECURITY_PAGE, "utf8");
  const cryptoMatrix = fs.readFileSync(CRYPTO_MATRIX, "utf8");

  for (const required of [
    "Mainnet Cryptographic Readiness Ladder",
    "Solana Testnet production-candidate",
    "Anchor program version: `1.0.1`",
    "EP9xE8MJZ6FfyEwLqns6HDdUZBknEa7WGYs1Jzsecuva",
    "CALHrBqx6jbzcPn2NVcinqSAHeod65v9LcDuTxsdPqBv",
    "Squads proposal index `3`",
    "2026-05-27T02:25:39Z",
    "transfer_dao_authority",
    "transfer_treasury_operator_authority",
    "Standalone ZK verifier",
    "5H7Afyqdh5yPekkZJ5UM2j3HNB2bRvU8aVv8XoqeAW1j",
    "configure_refhe_envelope",
    "settle_refhe_envelope",
    "configure_magicblock_private_payment_corridor",
    "settle_magicblock_private_payment_corridor",
    "executeConfidentialPayoutPlanV3",
    "60000000 -> 10000000",
    "0 -> 50000000",
    "Ika / 2PC-MPC",
    "Funded dWallet DKG",
    "Umbra private payout lane",
    "SDK-generated proof account data",
    "Developer Platform `/order` mode",
    "QuickNode read-node and stream",
    "Monitoring is production-delivering incidents to named owners",
    "npm run verify:mainnet-cryptographic-readiness",
    "Forbidden until recorded",
  ]) {
    includes(doc, required, "mainnet cryptographic readiness ladder");
  }

  for (const forbidden of [
    "mainnet real-funds release is complete outside the recorded gate",
    "final Ika 2PC-MPC signing is live",
    "Umbra full claim settlement is live",
    "external audit has been completed",
  ]) {
    assert(!doc.toLowerCase().includes(forbidden.toLowerCase()), `readiness ladder overclaims: ${forbidden}`);
  }

  for (const sensitive of ["private key", "seed phrase", "a15cf3772672a4ecb986d52659a108a3e6efe160", "jup_"]) {
    assert(!doc.toLowerCase().includes(sensitive.toLowerCase()), `readiness ladder leaked sensitive marker: ${sensitive}`);
  }

  includes(curatedDocuments, 'slug: "mainnet-cryptographic-readiness-ladder-2026-05-25"', "curated documents");
  includes(judgePage, "/documents/mainnet-cryptographic-readiness-ladder-2026-05-25", "judge page");
  includes(securityPage, "/documents/mainnet-cryptographic-readiness-ladder-2026-05-25", "security page");
  includes(cryptoMatrix, "Cryptographic On-Chain Matrix", "cryptographic on-chain matrix");

  console.log("Mainnet cryptographic readiness verification: PASS");
}

main();
