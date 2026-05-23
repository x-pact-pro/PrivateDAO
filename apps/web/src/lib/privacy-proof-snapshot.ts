import { getJudgeRuntimeLogsSnapshot } from "@/lib/judge-runtime-logs";
import { readRepoJson } from "@/lib/repo-docs";
import { buildSolanaTxUrl } from "@/lib/solana-network";

type ProofRegistryJson = {
  zkProofAnchors?: {
    proposal?: string;
    entries?: Array<{
      layer: string;
      txSignature: string;
      explorerUrl: string;
    }>;
  };
};

function readJson<T>(relativePath: string): T {
  return readRepoJson<T>(relativePath);
}

export type PrivacyProofSnapshot = {
  governance: {
    proposal: string;
    createProposalTx?: string;
    commitTx?: string;
    revealTx?: string;
    finalizeTx?: string;
    executeTx?: string;
  };
  confidential: {
    proposal: string;
    depositTx?: string;
    privateTransferTx?: string;
    settleTx?: string;
    executeTx?: string;
  };
  zk: {
    proposal?: string;
    voteAnchorTx?: string;
    delegationAnchorTx?: string;
    tallyAnchorTx?: string;
  };
  mobile: {
    routeHref: string;
    docHref: string;
  };
  explorer: {
    governanceRevealHref?: string;
    governanceExecuteHref?: string;
    confidentialSettleHref?: string;
    confidentialExecuteHref?: string;
    zkVoteHref?: string;
    zkTallyHref?: string;
  };
};

export function getPrivacyProofSnapshot(): PrivacyProofSnapshot {
  const runtime = getJudgeRuntimeLogsSnapshot();
  const registry = readJson<ProofRegistryJson>("docs/proof-registry.json");

  const governanceEntries = new Map(runtime.governance.entries.map((entry) => [entry.label, entry.signature]));
  const confidentialEntries = new Map(runtime.confidential.entries.map((entry) => [entry.label, entry.signature]));
  const zkEntries = new Map(
    (registry.zkProofAnchors?.entries ?? []).map((entry) => [entry.layer, entry]),
  );

  const revealTx = governanceEntries.get("reveal");
  const executeTx = governanceEntries.get("execute");
  const settleTx = confidentialEntries.get("magicblock-settle");
  const confidentialExecuteTx = confidentialEntries.get("magicblock-execute");
  const voteAnchor = zkEntries.get("vote");
  const tallyAnchor = zkEntries.get("tally");

  return {
    governance: {
      proposal: runtime.governance.proposal,
      createProposalTx: governanceEntries.get("create-proposal"),
      commitTx: governanceEntries.get("commit"),
      revealTx,
      finalizeTx: governanceEntries.get("finalize"),
      executeTx,
    },
    confidential: {
      proposal: runtime.confidential.proposal,
      depositTx: confidentialEntries.get("magicblock-deposit"),
      privateTransferTx: confidentialEntries.get("magicblock-private-transfer"),
      settleTx,
      executeTx: confidentialExecuteTx,
    },
    zk: {
      proposal: registry.zkProofAnchors?.proposal,
      voteAnchorTx: voteAnchor?.txSignature,
      delegationAnchorTx: zkEntries.get("delegation")?.txSignature,
      tallyAnchorTx: tallyAnchor?.txSignature,
    },
    mobile: {
      routeHref: "/documents/real-device-runtime",
      docHref: "/documents/android-solflare-real-device-capture-2026-04-18",
    },
    explorer: {
      governanceRevealHref: revealTx ? buildSolanaTxUrl(revealTx) : undefined,
      governanceExecuteHref: executeTx ? buildSolanaTxUrl(executeTx) : undefined,
      confidentialSettleHref: settleTx ? buildSolanaTxUrl(settleTx) : undefined,
      confidentialExecuteHref: confidentialExecuteTx ? buildSolanaTxUrl(confidentialExecuteTx) : undefined,
      zkVoteHref: voteAnchor?.explorerUrl,
      zkTallyHref: tallyAnchor?.explorerUrl,
    },
  };
}
