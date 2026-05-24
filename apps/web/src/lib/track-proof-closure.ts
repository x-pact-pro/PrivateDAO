import type { CompetitionTrackWorkspace } from "@/lib/site-data";

export const TRACK_PROOF_PRIORITY_SLUGS = new Set([
  "colosseum-frontier",
  "privacy-track",
  "rpc-infrastructure",
]);

export type TrackProofContext = {
  externallyProven: Array<{
    label: string;
    href: string;
    summary: string;
  }>;
  exactBlocker: string;
  exactBlockerSummary: string;
  pendingSummary: string;
};

export function getTrackSpecificProofContext(workspace: CompetitionTrackWorkspace): TrackProofContext {
  if (workspace.slug === "privacy-track") {
    return {
      externallyProven: [
        {
          label: "Live Proof V3",
          href: "/documents/live-proof-v3",
          summary: "Testnet proposal lifecycle, V3 hardening, and explorer-verifiable proof anchors are already documented.",
        },
        {
          label: "ZK capability matrix",
          href: "/documents/zk-capability-matrix",
          summary: "The repo already states what the privacy layer proves today and what remains outside the claim boundary.",
        },
      ],
      exactBlocker: "magicblock-refhe-source-receipts",
      exactBlockerSummary:
        "Testnet REFHE and MagicBlock receipts are closed; real-funds mainnet still requires verifier CPI or externally audited residual-trust acceptance.",
      pendingSummary:
        "Custody evidence is still required, and the signer or transfer packet can now be ingested through /custody in a strict repo-safe shape. The privacy-side work is now production hardening around verifier or audit acceptance, not missing Testnet activation.",
    };
  }

  if (workspace.slug === "rpc-infrastructure") {
    return {
      externallyProven: [
        {
          label: "Diagnostics",
          href: "/diagnostics",
          summary: "Latency, success rate, wallet coverage, proof completion, and incident-facing diagnostics are already surfaced live.",
        },
        {
          label: "Core integrations",
          href: "/documents/frontier-integrations",
          summary: "Hosted-read and runtime evidence already prove the infrastructure story on Testnet with reviewer-facing artifacts.",
        },
      ],
      exactBlocker: "production-monitoring-alerts",
      exactBlockerSummary:
        "RPC and hosted-read mainnet claims remain blocked until live monitoring, alert delivery, and tested operator ownership are recorded.",
      pendingSummary:
        "Custody still matters for buyer trust, and the new /custody ingestion flow reduces operator drift when the real signer and transfer data arrives. The exact infrastructure blocker remains monitored operations, not generic product maturity.",
    };
  }

  return {
    externallyProven: [
      {
        label: "Proof center",
        href: "/proof",
        summary: "The full governance lifecycle, proof packets, and reviewer path are already visible inside the live product.",
      },
      {
        label: "Launch trust packet",
        href: "/documents/launch-trust-packet",
        summary: "The repo already binds launch truth, blockers, and buyer-safe trust wording into one explicit packet.",
      },
    ],
    exactBlocker: "upgrade-authority-multisig",
    exactBlockerSummary:
      "The startup-quality path remains blocked until production multisig, authority transfer signatures, and post-transfer readouts are recorded.",
    pendingSummary:
      "For the main submission, custody is not a side detail. It is the exact trust gate that separates a strong Testnet product from a real-funds launch claim, and the strict ingestion route now makes that ceremony packet reproducible instead of manual.",
  };
}
