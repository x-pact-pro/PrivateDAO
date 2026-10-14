import fs from "fs";
import path from "path";

export type ProofRegistry = {
  programId: string;
  deployTx: string;
  verificationWallet: string;
  dao: string;
  governanceMint: string;
  treasury: string;
  proposal: string;
  zkProofAnchors?: {
    proposal: string;
    entries: Array<{
      layer: string;
      anchorPda: string;
      txSignature: string;
      explorerUrl: string;
    }>;
  };
  pdaoToken?: {
    network?: string;
    privateDaoProgramId?: string;
    mint: string;
    programId?: string;
    tokenAccount?: string;
    metadataUri?: string;
    decimals?: number;
    supplyUi?: string;
    mintAuthorityStatus?: string;
    canonicalGovernanceDao?: string;
    transactions: Record<string, string>;
  };
  transactions: Record<string, string>;
};

export function loadProofRegistry(): ProofRegistry {
  const registryPath = path.resolve("docs/proof-registry.json");
  return JSON.parse(fs.readFileSync(registryPath, "utf8")) as ProofRegistry;
}
