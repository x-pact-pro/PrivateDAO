import fs from "fs";
import path from "path";

type Packet = {
  project: string;
  decision: string;
  productionMainnetClaimAllowed: boolean;
  custody: {
    status: string;
    implementation: string;
    threshold: string;
    signerSlotsConfigured: number;
    minimumTimelockHours: number;
    pendingAuthorityTransfers: string[];
    observedDevnetAuthority: string | null;
    observedMainnetProgramStatus: string;
  };
  runtime: {
    status: string;
    completedTargetCount: number;
    targetCount: number;
    pendingTargets: string[];
  };
  audit: { status: string; pendingAction: string };
  pilot: { status: string; lifecycle: string[]; packs: string[] };
  v3Evidence: {
    governance: string;
    settlement: string;
    liveProof: string;
    status: string;
    boundary: string;
  };
  linkedDocs: string[];
  requiredExternalInputs: string[];
  commands: string[];
};

function main() {
  const jsonPath = path.resolve("docs/launch-trust-packet.generated.json");
  const mdPath = path.resolve("docs/launch-trust-packet.generated.md");
  if (!fs.existsSync(jsonPath) || !fs.existsSync(mdPath)) {
    throw new Error("missing launch trust packet artifacts");
  }

  const packet = JSON.parse(fs.readFileSync(jsonPath, "utf8")) as Packet;
  const markdown = fs.readFileSync(mdPath, "utf8");

  assert(packet.project === "PrivateDAO", "launch trust packet project mismatch");
  assert(packet.decision === "blocked-external-steps", "launch trust packet must preserve blocked-external decision");
  assert(packet.productionMainnetClaimAllowed === false, "launch trust packet must not allow production mainnet claims");
  assert(packet.custody.threshold === "2-of-3", "launch trust packet threshold mismatch");
  assert(packet.custody.minimumTimelockHours >= 48, "launch trust packet timelock floor is too low");
  assert(!packet.custody.pendingAuthorityTransfers.includes("program-upgrade-authority"), "launch trust packet must not keep completed program authority transfer pending");
  assert(packet.custody.pendingAuthorityTransfers.includes("dao-authority"), "launch trust packet missing pending DAO authority transfer");
  assert(packet.custody.pendingAuthorityTransfers.includes("treasury-operator-authority"), "launch trust packet missing pending treasury authority transfer");
  assert(packet.runtime.targetCount >= 5, "launch trust packet runtime target count is too low");
  assert(packet.runtime.pendingTargets.includes("Phantom"), "launch trust packet missing Phantom pending target");
  assert(packet.audit.status === "pending-external", "launch trust packet audit boundary must remain pending");
  assert(packet.pilot.lifecycle.join(" -> ") === "Create DAO -> Submit proposal -> Private vote -> Execute treasury", "launch trust packet pilot lifecycle mismatch");
  assert(packet.pilot.packs.includes("Grant Committee Pack"), "launch trust packet missing Grant Committee pack");
  assert(packet.v3Evidence.liveProof === "docs/test-wallet-live-proof-v3.generated.md", "launch trust packet missing V3 live proof");
  assert(packet.v3Evidence.status === "devnet-proven", "launch trust packet V3 evidence status mismatch");
  assert(packet.v3Evidence.boundary === "test-wallet-devnet-only", "launch trust packet V3 boundary mismatch");
  assert(packet.linkedDocs.includes("docs/production-custody-ceremony.md"), "launch trust packet missing custody ceremony doc");
  assert(packet.linkedDocs.includes("docs/canonical-custody-proof.generated.md"), "launch trust packet missing canonical custody proof doc");
  assert(packet.linkedDocs.includes("docs/custody-proof-reviewer-packet.generated.md"), "launch trust packet missing custody reviewer packet doc");
  assert(packet.linkedDocs.includes("docs/custody-observed-readouts.json"), "launch trust packet missing custody observed readouts source");
  assert(packet.linkedDocs.includes("docs/governance-hardening-v3.md"), "launch trust packet missing governance v3 doc");
  assert(packet.linkedDocs.includes("docs/settlement-hardening-v3.md"), "launch trust packet missing settlement v3 doc");
  assert(packet.linkedDocs.includes("docs/test-wallet-live-proof-v3.generated.md"), "launch trust packet missing V3 live proof doc");
  assert(packet.linkedDocs.includes("docs/external-audit-engagement.md"), "launch trust packet missing external audit engagement doc");
  assert(packet.linkedDocs.includes("docs/pilot-onboarding-playbook.md"), "launch trust packet missing pilot onboarding playbook");
  assert(packet.commands.includes("npm run verify:launch-trust-packet"), "launch trust packet missing self verification command");
  assert(packet.commands.includes("npm run verify:custody-proof-reviewer-packet"), "launch trust packet missing reviewer packet verification command");

  for (const token of [
    "# Launch Trust Packet",
    "docs/production-custody-ceremony.md",
    "docs/canonical-custody-proof.generated.md",
    "docs/custody-proof-reviewer-packet.generated.md",
    "docs/external-audit-engagement.md",
    "docs/pilot-onboarding-playbook.md",
    "authority transfer signatures, explorer links, and readouts",
    "Pending authority transfers",
    "Create DAO",
    "Submit proposal",
    "Private vote",
    "Execute treasury",
    "docs/test-wallet-live-proof-v3.generated.md",
    "V3 evidence status",
    "npm run verify:custody-proof-reviewer-packet",
  ]) {
    assert(markdown.includes(token), `launch trust packet markdown is missing: ${token}`);
  }

  console.log("Launch trust packet verification: PASS");
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

main();
