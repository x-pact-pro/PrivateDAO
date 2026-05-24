import fs from "fs";
import path from "path";

type FrontierIntegrations = {
  project: string;
  network: string;
  programId: string;
  verificationWallet: string;
  reviewerEntry: string;
  readNode: {
    readPath: string;
    rpcEndpoint: string;
    rpcPoolSize: number;
    rpcProviderClass: string;
    magicBlockApiBase: string;
    magicBlockHealth: string;
    overview: {
      proposals: number;
      zkEnforced: number;
      confidentialPayouts: number;
      magicblockSettled: number;
      refheSettled: number;
    };
  };
  simpleGovernance: {
    dao: string;
    treasury: string;
    proposal: string;
    proposalSource?: string;
    proofRegistryProposal?: string;
    accountChecks: Array<{ label: string; pubkey: string; exists: boolean; executable: boolean }>;
    lifecycleStatus: string;
    txChecks: Array<{ label: string; signature: string; confirmed: boolean; status: string }>;
    verificationStatus: string;
  };
  confidentialOperations: {
    proposal: string;
    proposalSource?: string;
    runtimeCaptureProposal?: string | null;
    payoutPlan: string;
    payoutStatus: string;
    refheEnvelope: string;
    refheStatus: string;
    magicblockCorridor: string;
    magicblockStatus: string;
    accountChecks: Array<{ label: string; pubkey: string; exists: boolean; executable: boolean }>;
    txChecks: Array<{ label: string; signature: string; confirmed: boolean; status: string }>;
    status: string;
  };
  zk: {
    verificationMode: string;
    anchorCount: number;
    anchorChecks: Array<{ layer: string; signature: string; confirmed: boolean; account: { exists: boolean } }>;
    status: string;
  };
  docs: string[];
  commands: string[];
  notes: string[];
};

function resolveExpectedCluster() {
  const raw = (process.env.SOLANA_CLUSTER || process.env.NEXT_PUBLIC_SOLANA_NETWORK || "testnet").toLowerCase();
  return raw === "devnet" ? "devnet" : "testnet";
}

function main() {
  const jsonPath = path.resolve("docs/frontier-integrations.generated.json");
  const mdPath = path.resolve("docs/frontier-integrations.generated.md");
  if (!fs.existsSync(jsonPath) || !fs.existsSync(mdPath)) {
    throw new Error("missing Frontier integration evidence artifacts");
  }

  const expectedCluster = resolveExpectedCluster();
  const evidence = JSON.parse(fs.readFileSync(jsonPath, "utf8")) as FrontierIntegrations;
  const markdown = fs.readFileSync(mdPath, "utf8");

  assert(evidence.project === "PrivateDAO", "Frontier integration evidence project mismatch");
  const artifactCluster =
    evidence.network === "devnet" ? "devnet" : evidence.network === "testnet" ? "testnet" : null;
  if (!artifactCluster) {
    throw new Error("Frontier integration evidence network mismatch");
  }
  if (artifactCluster !== expectedCluster) {
    console.warn(
      `Frontier integration evidence cluster (${artifactCluster}) differs from expected runtime (${expectedCluster}); validating against artifact cluster.`,
    );
  }
  const expectedProgram =
    artifactCluster === "testnet"
      ? "EP9xE8MJZ6FfyEwLqns6HDdUZBknEa7WGYs1Jzsecuva"
      : "5AhUsbQ4mJ8Xh7QJEomuS85qGgmK9iNvFqzF669Y7Psx";
  assert(evidence.programId === expectedProgram, "Frontier integration evidence program mismatch");
  assert(evidence.verificationWallet === "4Mm5YTRbJuyA8NcWM85wTnx6ZQMXNph2DSnzCCKLhsMD", "Frontier integration evidence verification wallet mismatch");
  assert(evidence.reviewerEntry.includes("/proof/?judge=1"), "Frontier integration evidence reviewer entry mismatch");

  assert(evidence.readNode.readPath === "backend-indexer", "Frontier integration evidence read path mismatch");
  assert(Boolean(evidence.readNode.rpcEndpoint), "Frontier integration evidence missing rpc endpoint");
  assert(evidence.readNode.rpcPoolSize >= 1, "Frontier integration evidence rpc pool is unexpectedly weak");
  assert(Boolean(evidence.readNode.magicBlockApiBase), "Frontier integration evidence missing MagicBlock API base");
  assert(evidence.readNode.overview.proposals >= 1, "Frontier integration evidence missing indexed proposals");
  assert(evidence.readNode.overview.confidentialPayouts >= 1, "Frontier integration evidence missing indexed confidential payout proposals");
  assert(evidence.readNode.overview.magicblockSettled >= 1, "Frontier integration evidence missing settled MagicBlock proposals");
  assert(evidence.readNode.overview.refheSettled >= 1, "Frontier integration evidence missing settled REFHE proposals");

  assert(Boolean(evidence.simpleGovernance.proposal), "Frontier integration evidence missing simple governance proposal");
  assert(evidence.simpleGovernance.txChecks.length >= 5, "Frontier integration evidence simple governance tx coverage is weak");
  assert(
    evidence.simpleGovernance.accountChecks.some((entry) => entry.label === "program" && entry.exists && entry.executable),
    "Frontier integration evidence program account is not live",
  );
  assert(
    evidence.simpleGovernance.accountChecks.some((entry) => entry.label === "simple-proposal" && entry.exists),
    "Frontier integration evidence simple proposal account is not live",
  );
  assert(Boolean(evidence.simpleGovernance.lifecycleStatus), "Frontier integration evidence simple governance lifecycle status is missing");
  assert(
    evidence.simpleGovernance.verificationStatus === `verified-${artifactCluster}-governance-path` ||
      evidence.simpleGovernance.verificationStatus === `degraded-${artifactCluster}-governance-path`,
    "Frontier integration evidence simple governance path status is invalid",
  );

  assert(Boolean(evidence.confidentialOperations.proposal), "Frontier integration evidence missing confidential proposal");
  assert(Boolean(evidence.confidentialOperations.payoutPlan), "Frontier integration evidence missing payout plan");
  assert(Boolean(evidence.confidentialOperations.refheEnvelope), "Frontier integration evidence missing REFHE envelope");
  assert(Boolean(evidence.confidentialOperations.magicblockCorridor), "Frontier integration evidence missing MagicBlock corridor");
  assert(evidence.confidentialOperations.refheStatus === "Settled", "Frontier integration evidence REFHE status is not settled");
  assert(evidence.confidentialOperations.magicblockStatus === "Settled", "Frontier integration evidence MagicBlock status is not settled");
  assert(evidence.confidentialOperations.txChecks.length >= 5, "Frontier integration evidence confidential tx coverage is weak");
  for (const label of ["confidential-proposal", "confidential-payout-plan", "refhe-envelope", "magicblock-corridor"]) {
    assert(
      evidence.confidentialOperations.accountChecks.some((entry) => entry.label === label && entry.exists),
      `Frontier integration evidence missing live account: ${label}`,
    );
  }
  assert(
    evidence.confidentialOperations.status === `verified-${artifactCluster}-confidential-path` ||
      evidence.confidentialOperations.status === `degraded-${artifactCluster}-confidential-path`,
    "Frontier integration evidence confidential path status is invalid",
  );

  assert(evidence.zk.verificationMode === "offchain-groth16", "Frontier integration evidence zk mode drift detected");
  assert(evidence.zk.anchorCount >= 3, "Frontier integration evidence zk anchor count is unexpectedly low");
  assert(
    evidence.zk.status === `proof-anchors-recorded-on-${artifactCluster}` ||
      evidence.zk.status === "proof-anchor-gap-detected",
    "Frontier integration evidence zk status is invalid",
  );

  for (const doc of [
    "docs/runtime/devnet-feature-sweep-2026-04-06.md",
    "docs/magicblock/private-payments.md",
    "docs/magicblock/runtime.generated.md",
    "docs/refhe-protocol.md",
    "docs/refhe-operator-flow.md",
    "docs/zk-proof-registry.json",
    "docs/zk-standalone-verifier-testnet-2026-05-23.md",
    "docs/read-node/snapshot.generated.md",
    "docs/read-node/ops.generated.md",
    "docs/rpc-architecture.md",
  ]) {
    assert(evidence.docs.includes(doc), `Frontier integration evidence is missing doc: ${doc}`);
  }

  for (const command of [
    "npm run build:frontier-integrations",
    "npm run verify:frontier-integrations",
    "npm run verify:read-node",
    "npm run verify:magicblock-runtime",
    "npm run verify:zk-registry",
    "npm run verify:all",
  ]) {
    assert(evidence.commands.includes(command), `Frontier integration evidence is missing command: ${command}`);
  }

  assert(markdown.includes("# Frontier Integration Evidence"), "Frontier integration markdown missing title");
  assert(markdown.includes("RPC Fast / Read Node"), "Frontier integration markdown missing read node section");
  assert(markdown.includes("Confidential MagicBlock + REFHE Path"), "Frontier integration markdown missing confidential section");
  assert(markdown.includes("ZK Anchor Path"), "Frontier integration markdown missing zk section");

  console.log("Frontier integration evidence verification: PASS");
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

main();
