import fs from "fs";
import path from "path";

type SubmissionRegistry = {
  project: string;
  programId: string;
  verificationWallet: string;
  status: Record<string, string>;
};

type ProofRegistry = {
  programId?: string;
  deployTx: string;
  dao: string;
  governanceMint: string;
  treasury: string;
  proposal: string;
  pdaoToken?: {
    privateDaoProgramId?: string;
    canonicalGovernanceDao?: string;
  };
};

function main() {
  const reportPath = path.resolve("docs/mainnet-readiness.generated.md");
  if (!fs.existsSync(reportPath)) {
    throw new Error("missing generated mainnet readiness report");
  }

  const report = fs.readFileSync(reportPath, "utf8");
  const submission = readJson<SubmissionRegistry>("docs/submission-registry.json");
  const proof = readJson<ProofRegistry>("docs/proof-registry.json");
  const currentProgramId = proof.pdaoToken?.privateDaoProgramId ?? submission.programId;
  const currentDao = proof.pdaoToken?.canonicalGovernanceDao ?? proof.dao;

  for (const token of [
    "# Mainnet Readiness Report",
    submission.project,
    currentProgramId,
    submission.verificationWallet,
    proof.deployTx,
    currentDao,
    proof.governanceMint,
    proof.treasury,
    proof.proposal,
    "external audit",
    "docs/mainnet-blockers.json",
    "docs/mainnet-blockers.md",
    "docs/launch-ops-checklist.json",
    "docs/launch-ops-checklist.md",
    "blocked-external-steps",
    "Production mainnet claim allowed",
    "external-audit-completion",
    "upgrade-authority-multisig",
    "production-monitoring-alerts",
    "real-device-wallet-runtime",
    "magicblock-refhe-source-receipts",
    "mainnet-cutover-ceremony",
    "create-production-multisig",
    "transfer-program-upgrade-authority",
    "configure-production-timelock",
    "backup-and-recovery-procedures",
    "monitoring-setup",
    "alerting-rules",
    "operator-runbooks",
    "emergency-procedures",
    "real-device-testing",
    "wallet-integration",
    "end-to-end-flows",
    "npm run verify:launch-ops",
    "npm run verify:monitoring-alerts",
    "npm run verify:mainnet-blockers",
    "runtime wallet QA",
    "npm run build:mainnet-readiness-report",
    "npm run build:deployment-attestation",
    "npm run build:runtime-attestation",
    "npm run build:go-live-attestation",
    "npm run verify:mainnet-readiness-report",
    "npm run verify:deployment-attestation",
    "npm run verify:runtime-attestation",
    "npm run verify:go-live-attestation",
    "docs/runtime-attestation.generated.json",
    "docs/go-live-criteria.md",
    "docs/operational-drillbook.md",
    "docs/go-live-attestation.generated.json",
    "docs/governance-hardening-v3.md",
    "docs/settlement-hardening-v3.md",
    "docs/test-wallet-live-proof-v3.generated.md",
    "additive V3 governance and settlement hardening paths are Devnet-proven",
    "npm run verify:all",
    "bash scripts/check-mainnet-readiness.sh",
  ]) {
    assertContains(report, token);
  }

  for (const [key, status] of Object.entries(submission.status)) {
    assertContains(report, `\`${key}\``);
    if (status !== "verified") {
      assertContains(report, `\`${status}\``);
    }
  }

  console.log("Mainnet readiness report verification: PASS");
}

function readJson<T>(relativePath: string): T {
  return JSON.parse(fs.readFileSync(path.resolve(relativePath), "utf8")) as T;
}

function assertContains(body: string, fragment: string) {
  if (!body.includes(fragment)) {
    throw new Error(`mainnet readiness report is missing: ${fragment}`);
  }
}

main();
