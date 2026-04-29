import type { CoreGovernanceInstructionName } from "@/lib/onchain-parity.generated";

export type GovernanceRuntimeStatus = {
  action: CoreGovernanceInstructionName;
  liveWalletLane: boolean;
  repoScriptProofCaptured: boolean;
  browserWalletProofCaptured: boolean;
  realDeviceProofCaptured: boolean;
  supportNote: string;
};

export const GOVERNANCE_RUNTIME_STATUS: Record<CoreGovernanceInstructionName, GovernanceRuntimeStatus> = {
  initialize_dao: {
    action: "initialize_dao",
    liveWalletLane: true,
    repoScriptProofCaptured: true,
    browserWalletProofCaptured: true,
    realDeviceProofCaptured: true,
    supportNote:
      "DAO bootstrap is live in the web wallet lane. Repo-script proof exists, the full Solflare browser cycle is captured, and Android Solflare now proves the mobile path through DAO bootstrap on Testnet.",
  },
  create_proposal: {
    action: "create_proposal",
    liveWalletLane: true,
    repoScriptProofCaptured: true,
    browserWalletProofCaptured: true,
    realDeviceProofCaptured: true,
    supportNote:
      "Proposal submit is live in the web wallet lane, including the current SendSol and SendToken treasury motions. The full Solflare browser cycle is captured, and Android Solflare now proves proposal creation on Testnet.",
  },
  commit_vote: {
    action: "commit_vote",
    liveWalletLane: true,
    repoScriptProofCaptured: true,
    browserWalletProofCaptured: true,
    realDeviceProofCaptured: true,
    supportNote:
      "Commit vote is live in the web wallet lane once a real DAO and proposal already exist in session state. The full Solflare browser cycle is captured, and Android Solflare now proves commit-vote submission on Testnet.",
  },
  reveal_vote: {
    action: "reveal_vote",
    liveWalletLane: true,
    repoScriptProofCaptured: true,
    browserWalletProofCaptured: true,
    realDeviceProofCaptured: false,
    supportNote:
      "Reveal vote is live in the web wallet lane once a live commit already exists in the same session. The full Solflare browser cycle is captured; Android remains in capture expansion for this stage.",
  },
  finalize_proposal: {
    action: "finalize_proposal",
    liveWalletLane: true,
    repoScriptProofCaptured: true,
    browserWalletProofCaptured: true,
    realDeviceProofCaptured: false,
    supportNote:
      "Finalize proposal is live in the web wallet lane. Repo-script proof exists and the full Solflare browser cycle is captured; Android remains in capture expansion for this stage.",
  },
  execute_proposal: {
    action: "execute_proposal",
    liveWalletLane: true,
    repoScriptProofCaptured: true,
    browserWalletProofCaptured: true,
    realDeviceProofCaptured: false,
    supportNote:
      "Execute proposal is live in the web wallet lane for standard, SendSol, and SendToken proposals. The full Solflare browser cycle is captured; Android capture expansion remains pending and CustomCPI stays outside the current executable release boundary.",
  },
};

export const GOVERNANCE_RUNTIME_STATUS_ORDER: CoreGovernanceInstructionName[] = [
  "initialize_dao",
  "create_proposal",
  "commit_vote",
  "reveal_vote",
  "finalize_proposal",
  "execute_proposal",
];

export function getGovernanceRuntimeStatus(action: CoreGovernanceInstructionName) {
  return GOVERNANCE_RUNTIME_STATUS[action];
}
