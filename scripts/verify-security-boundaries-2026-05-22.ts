import fs from "fs";
import path from "path";

function read(relativePath: string) {
  return fs.readFileSync(path.resolve(relativePath), "utf8");
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function main() {
  const governanceSession = read("apps/web/src/components/governance-session.tsx");
  const governanceWorkbench = read("apps/web/src/components/governance-action-workbench.tsx");
  const homeShell = read("apps/web/src/components/home-shell.tsx");
  const zkMatrix = read("docs/zk-capability-matrix.md");
  const monitoringEvidence = JSON.parse(read("docs/monitoring-delivery.generated.json")) as {
    status?: string;
    summary?: {
      closedRequirementCount?: number;
      deliveryRequirementCount?: number;
    };
    claimBoundary?: string;
  };
  const telemetryPacket = JSON.parse(read("docs/reviewer-telemetry-packet.generated.json")) as {
    generatedAt?: string;
    truthSources?: Array<{ label: string; generatedAt?: string }>;
  };

  assert(governanceSession.includes("redactGovernanceStateForStorage"), "governance session must redact persisted state");
  assert(governanceSession.includes("saltHex?: string"), "live vote salt must be optional so persisted sessions can omit it");
  assert(!governanceSession.includes("JSON.stringify(state)"), "raw governance state must not be written to localStorage");
  assert(
    governanceSession.includes("JSON.stringify(redactGovernanceStateForStorage(state))"),
    "governance session must persist only redacted state",
  );
  assert(
    !governanceWorkbench.includes("Reveal salt:") && !governanceWorkbench.includes(">Salt {liveVoteRuntime.saltHex}<"),
    "governance UI must not render reveal salt into the DOM",
  );
  assert(
    governanceWorkbench.includes("in-memory preimage") && governanceWorkbench.includes("never written to localStorage"),
    "governance UI must explain the in-memory salt boundary",
  );

  assert(!homeShell.includes("combines ZK privacy"), "homepage must not market ZK as an unqualified core privacy claim");
  assert(homeShell.includes("ZK proofs off-chain today"), "homepage must state the current off-chain ZK boundary");
  assert(zkMatrix.includes("On-chain verifier integration") && zkMatrix.includes("Not implemented"), "ZK matrix must state verifier CPI boundary");
  assert(zkMatrix.includes("Live off-chain"), "ZK matrix must distinguish live off-chain proofs");

  assert(monitoringEvidence.status === "pending-delivery-closure", "monitoring must not be presented as production-delivered without evidence");
  assert(
    monitoringEvidence.summary?.closedRequirementCount === 0,
    "monitoring delivery evidence must not claim closed alert delivery without transcripts",
  );
  assert(
    monitoringEvidence.claimBoundary?.includes("production delivery is pending"),
    "monitoring claim boundary must remain explicit until delivery evidence closes",
  );
  assert(Boolean(telemetryPacket.generatedAt), "reviewer telemetry packet must include generatedAt");

  console.log("Security boundary verification 2026-05-22: PASS");
}

main();
