import { mkdir, readFile, writeFile } from "node:fs/promises";

const readJson = async (path) => JSON.parse(await readFile(path, "utf8"));
const verification = await readJson("packages/evm-verification/deployments/phase-2-e2e-base-sepolia.json");
const organizational = await readJson("packages/evm-verification/deployments/organizational-base-sepolia.json");
const builder = await readJson("packages/evm-verification/base-builder-code.json");
const source = verification.networks[0];
const org = organizational.evidence;

const evidence = {
  schema: "privatedao.base-integration-evidence.v1",
  generatedAt: new Date().toISOString(),
  network: "base-sepolia",
  chainId: 84532,
  environment: "testnet",
  mainnetExecution: "disabled",
  explorerBaseUrl: "https://sepolia.basescan.org",
  builderCode: builder,
  workflows: [
    { product: "Record Verification", status: verification.status, txHash: source.record.txHash, blockNumber: source.record.blockNumber, verification: source.checks.recordVerified, builderCodeAttribution: "historical evidence predates Builder Code wiring", explorerUrl: source.record.explorerUrl, proofUrl: source.links.record },
    { product: "Blind Verification", status: verification.status, txHash: source.blind.txHash, blockNumber: source.blind.blockNumber, verification: source.checks.blindProofVerified, builderCodeAttribution: "historical evidence predates Builder Code wiring", explorerUrl: source.blind.explorerUrl, proofUrl: source.links.blind },
    { product: "Private Treasury", status: organizational.evidence.treasury.status === "executed" ? "testnet_verified" : "unverified", txHash: org.treasury.executedHash, verification: org.treasury.status === "executed", builderCodeAttribution: "historical evidence predates Builder Code wiring", explorerUrl: `https://sepolia.basescan.org/tx/${org.treasury.executedHash}` },
    { product: "Private Governance", status: organizational.evidence.governance.status === "passed" ? "testnet_verified" : "unverified", txHash: org.governance.proposalFinalizeHash, verification: org.governance.status === "passed", builderCodeAttribution: "historical evidence predates Builder Code wiring", explorerUrl: `https://sepolia.basescan.org/tx/${org.governance.proposalFinalizeHash}` },
    { product: "Confidential Auctions", status: organizational.evidence.auction.status === "settled" ? "testnet_verified" : "unverified", txHash: org.auction.auctionSettleHash, verification: org.auction.status === "settled", builderCodeAttribution: "historical evidence predates Builder Code wiring", explorerUrl: `https://sepolia.basescan.org/tx/${org.auction.auctionSettleHash}` },
  ],
  sourceArtifacts: ["packages/evm-verification/deployments/phase-2-e2e-base-sepolia.json", "packages/evm-verification/deployments/organizational-base-sepolia.json"],
};

await mkdir("apps/web/public/evm-verification", { recursive: true });
await writeFile("apps/web/public/evm-verification/base-integration.json", `${JSON.stringify(evidence, null, 2)}\n`);
console.log(JSON.stringify({ status: "pass", output: "apps/web/public/evm-verification/base-integration.json", workflows: evidence.workflows.length, network: evidence.network, chainId: evidence.chainId }));
