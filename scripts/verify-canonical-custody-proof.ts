import fs from "fs";
import path from "path";

type CanonicalProofPacket = {
  project: string;
  status: string;
  productionMainnetClaimAllowed: boolean;
  network: string;
  multisig: {
    threshold: string;
    implementation: string | null;
  };
  observedReadouts: Array<{
    id: string;
    cluster: string;
    status: string;
    address: string;
  }>;
  pendingItems: string[];
  rawSources: Array<{ label: string; href: string }>;
};

function main() {
  const jsonPath = path.resolve("docs/canonical-custody-proof.generated.json");
  const mdPath = path.resolve("docs/canonical-custody-proof.generated.md");

  if (!fs.existsSync(jsonPath) || !fs.existsSync(mdPath)) {
    throw new Error("missing canonical custody proof artifacts");
  }

  const packet = JSON.parse(fs.readFileSync(jsonPath, "utf8")) as CanonicalProofPacket;
  const markdown = fs.readFileSync(mdPath, "utf8");

  assert(packet.project === "PrivateDAO", "canonical custody proof project mismatch");
  assert(packet.status === "ready-for-transfer", "canonical custody proof must reflect the recorded Testnet custody transfer");
  assert(packet.productionMainnetClaimAllowed === false, "canonical custody proof must not allow production mainnet claims");
  assert(packet.network === "testnet", "canonical custody proof must target the current reviewer-facing Testnet custody transfer");
  assert(packet.multisig.threshold === "2-of-3", "canonical custody proof threshold mismatch");
  assert(
    packet.multisig.implementation === "pending-selection" || packet.multisig.implementation === "Squads Protocol",
    "canonical custody proof implementation boundary drifted",
  );
  assert(!packet.pendingItems.includes("multisig public address"), "canonical custody proof must not keep completed multisig address pending");
  assert(!packet.pendingItems.includes("program upgrade authority transfer signature"), "canonical custody proof must not keep completed upgrade transfer pending");
  assert(
    packet.pendingItems.includes("dao authority transfer signature"),
    "canonical custody proof must keep DAO authority transfer pending",
  );
  assert(
    packet.pendingItems.includes("treasury operator authority transfer signature"),
    "canonical custody proof must keep treasury operator transfer pending",
  );

  const devnetProgram = packet.observedReadouts.find((entry) => entry.id === "testnet-program");
  const mainnetProgram = packet.observedReadouts.find((entry) => entry.id === "mainnet-program");
  assert(devnetProgram?.cluster === "testnet" && devnetProgram.status === "observed", "canonical custody proof missing observed Testnet program readout");
  assert(mainnetProgram?.cluster === "mainnet-beta", "canonical custody proof missing target-network program readout");

  assert(
    packet.rawSources.some((entry) => entry.href.endsWith("/docs/canonical-custody-proof.generated.md")),
    "canonical custody proof missing self source link",
  );

  for (const token of [
    "# Canonical Custody Proof",
    "Observed Chain Readouts",
    "Current Testnet deployed program readout after Squads transfer",
    "Target network program readout",
    "Exact Pending Items",
    "Exact Blocker",
    "dao authority transfer signature",
  ]) {
    assert(markdown.includes(token), `canonical custody proof markdown is missing: ${token}`);
  }

  console.log("Canonical custody proof verification: PASS");
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

main();
