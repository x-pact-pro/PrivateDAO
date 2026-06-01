export type TransparencyReportKind = "grant-review" | "treasury-payout" | "confidential-vesting" | "private-room-vote";

export type TransparencyReport = {
  id: string;
  kind: TransparencyReportKind;
  proposalTitle: string;
  finalOutcome: "passed" | "failed" | "prepared";
  executionStatus: "ready" | "executed" | "verified";
  proofHash: string;
  networkReference?: string;
  privateDuringCoordination: string[];
  publicAfterCompletion: string[];
  publicSummary: string;
};

export const sampleTransparencyReports: TransparencyReport[] = [
  {
    id: "grant-review",
    kind: "grant-review",
    proposalTitle: "Grant review for contributor funding",
    finalOutcome: "passed",
    executionStatus: "verified",
    proofHash: "pdao-proof-grant-review-001",
    networkReference: "Solana Testnet receipt",
    privateDuringCoordination: ["Reviewer notes", "scores before reveal", "vote momentum"],
    publicAfterCompletion: ["Final outcome", "approved amount", "proof hash", "audit summary"],
    publicSummary: "Review stayed independent during coordination. The final decision is public and verifiable.",
  },
  {
    id: "treasury-payout",
    kind: "treasury-payout",
    proposalTitle: "Treasury payout for approved work",
    finalOutcome: "passed",
    executionStatus: "ready",
    proofHash: "pdao-proof-treasury-payout-001",
    networkReference: "Testnet execution route",
    privateDuringCoordination: ["Recipient review", "internal justification", "live vote direction"],
    publicAfterCompletion: ["Execution status", "asset context", "proof hash", "treasury receipt"],
    publicSummary: "The payout is reviewed privately, then published as a verification report after approval.",
  },
  {
    id: "confidential-vesting",
    kind: "confidential-vesting",
    proposalTitle: "Confidential vesting for contributor allocation",
    finalOutcome: "prepared",
    executionStatus: "ready",
    proofHash: "pdao-proof-confidential-vesting-001",
    networkReference: "Sandbox Testnet receipt",
    privateDuringCoordination: ["Recipient identity", "vesting notes", "review discussion"],
    publicAfterCompletion: ["Vesting approval", "proof hash", "public summary"],
    publicSummary: "Contributor privacy is protected during coordination while the final approval remains accountable.",
  },
  {
    id: "private-room-vote",
    kind: "private-room-vote",
    proposalTitle: "Private room vote for sensitive DAO action",
    finalOutcome: "passed",
    executionStatus: "verified",
    proofHash: "pdao-proof-private-room-001",
    networkReference: "Room proof packet",
    privateDuringCoordination: ["Room notes", "member discussion", "live counts", "wallet behavior"],
    publicAfterCompletion: ["Decision result", "proof hash", "room policy summary"],
    publicSummary: "The room keeps sensitive coordination private and exports a public accountability packet.",
  },
];

export function getTransparencyReport(id: string) {
  return sampleTransparencyReports.find((report) => report.id === id) ?? sampleTransparencyReports[0];
}

export function buildTransparencyReport(report: TransparencyReport) {
  return {
    ...report,
    frame: "Public accountability / Private coordination",
    plainLanguage: `${report.proposalTitle}: ${report.publicSummary}`,
  };
}
