import fs from "fs";
import path from "path";

const DOC = path.resolve("docs/frontier-track-closure-matrix-2026-05-25.md");
const CURATED_DOCUMENTS = path.resolve("apps/web/src/lib/curated-documents.ts");
const JUDGE_PAGE = path.resolve("apps/web/src/app/judge/page.tsx");
const PROOF_PAGE = path.resolve("apps/web/src/app/proof/page.tsx");
const MAIN_FRONTIER_PAGE = path.resolve("apps/web/src/app/services/main-frontier-closure/page.tsx");
const TRACK_TECHNOLOGY_GRID = path.resolve("apps/web/src/components/track-technology-grid.tsx");
const IKA_WORKBENCH = path.resolve("apps/web/src/components/ika-dwallet-custody-workbench.tsx");
const ENCRYPT_IKA_PROOF = path.resolve("apps/web/src/components/encrypt-ika-desktop-proof-workbench.tsx");
const README = path.resolve("README.md");

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function includes(body: string, fragment: string, label: string) {
  assert(body.includes(fragment), `${label} missing ${fragment}`);
}

function main() {
  assert(fs.existsSync(DOC), "missing frontier track closure matrix");
  const doc = fs.readFileSync(DOC, "utf8");
  const curatedDocuments = fs.readFileSync(CURATED_DOCUMENTS, "utf8");
  const judgePage = fs.readFileSync(JUDGE_PAGE, "utf8");
  const proofPage = fs.readFileSync(PROOF_PAGE, "utf8");
  const mainFrontierPage = fs.readFileSync(MAIN_FRONTIER_PAGE, "utf8");
  const trackTechnologyGrid = fs.readFileSync(TRACK_TECHNOLOGY_GRID, "utf8");
  const ikaWorkbench = fs.readFileSync(IKA_WORKBENCH, "utf8");
  const encryptedProof = fs.readFileSync(ENCRYPT_IKA_PROOF, "utf8");
  const readme = fs.readFileSync(README, "utf8");

  for (const required of [
    "Frontier Track Closure Matrix",
    "Solana Testnet",
    "EP9xE8MJZ6FfyEwLqns6HDdUZBknEa7WGYs1Jzsecuva",
    "Encrypt / Ika",
    "/services/encrypt-ika-operations",
    "/proof/encrypted-capital-markets",
    "/api/v1/ika/solana-prealpha/readiness",
    "/api/v1/refhe/payroll/proof",
    "MagicBlock",
    "/api/v1/magicblock/onchain-proof",
    "Umbra",
    "/api/v1/umbra/relayer/health",
    "Jupiter",
    "NEXT_PUBLIC_JUPITER_ORDER_ENDPOINT",
    "Developer Platform `/order` mode",
    "docs/DX-REPORT-JUPITER.md",
    "QuickNode",
    "/api/v1/quicknode/stream/stats",
    "Solflare",
    "Eitherway",
    "https://preview.eitherway.ai/169057d4-cf4e-4a3e-88e5-2fe436eac112/",
    "Birdeye / GoldRush / QVAC intelligence",
    "DFlow / Kamino capital routes",
    "full claim submission still requires SDK-generated proof account data and UTXO slot data",
    "final funded Ika dWallet DKG is not claimed",
    "npm run verify:frontier-track-closure",
    "https://privatedao.org/services/jupiter-treasury-route/",
    "https://privatedao.org/services/umbra-confidential-payout/",
    "https://privatedao.org/services/eitherway-live-dapp/",
    "https://privatedao.org/services/encrypt-ika-operations/",
  ]) {
    includes(doc, required, "frontier track closure matrix");
  }

  includes(curatedDocuments, 'slug: "frontier-track-closure-matrix-2026-05-25"', "curated documents");
  includes(judgePage, "/documents/frontier-track-closure-matrix-2026-05-25", "judge page");
  includes(judgePage, "https://privatedao.org/services/jupiter-treasury-route/", "judge page");
  includes(judgePage, "https://privatedao.org/services/umbra-confidential-payout/", "judge page");
  includes(judgePage, "https://privatedao.org/services/eitherway-live-dapp/", "judge page");
  includes(judgePage, "https://privatedao.org/services/encrypt-ika-operations/", "judge page");
  includes(proofPage, "/documents/frontier-track-closure-matrix-2026-05-25", "proof page");
  includes(mainFrontierPage, "/documents/frontier-track-closure-matrix-2026-05-25", "main Frontier page");
  includes(trackTechnologyGrid, "/documents/frontier-track-closure-matrix-2026-05-25", "track technology grid");
  includes(readme, "frontier-track-closure-matrix-2026-05-25", "README");

  assert(!ikaWorkbench.includes("funded devnet operator wallet"), "Ika workbench still says funded devnet operator wallet");
  assert(!encryptedProof.includes("funded operator wallet on devnet"), "Encrypt/Ika proof workbench still says devnet operator wallet");
  assert(!readme.includes("Devnet-verified review surface"), "README still frames integration evidence as Devnet-verified current surface");

  assert(!/[a-f0-9]{40,}/i.test(doc), "track matrix leaked a long hex credential-like token");
  assert(!doc.toLowerCase().includes("private key"), "track matrix must not mention sensitive key material");

  console.log("Frontier track closure verification: PASS");
}

main();
