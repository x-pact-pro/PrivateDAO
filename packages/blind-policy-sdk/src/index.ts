import { randomUUID } from "node:crypto";

export type BlindPolicyPrivateInputs = {
  organizationId: string;
  subjectId: string;
  membershipVerified: boolean;
  records: Array<{ amountUsd: number }>;
  riskScore: number;
  liabilitiesUsd: number;
};

export type BlindPolicyProofPackage = {
  proofId: string;
  nonce: string;
  issuedAt: string;
  expiresAt: string;
  circuitId: "private_dao_blind_policy_overlay";
  circuitVersion: "groth16-v1";
  policyVersion: string;
  workflowId: string;
  originalProofHash: string;
  publicOutcome: "policy-satisfied";
  policySatisfied: true;
  decision: string;
  policyCommitment: string;
  inputCommitment: string;
  verificationKeyHash: string;
  verifierInputs: {
    provingSystem: "groth16";
    circuit: "private_dao_blind_policy_overlay";
    verificationCommand: "snarkjs groth16 verify";
    publicSignals: ["policyId", "policyCommitment", "inputCommitment", "satisfiedClaim"];
  };
  completedStages: Array<{ id: string; label: string; status: "completed" }>;
  publicChecks: Array<{ id: string; label: string; satisfied: true }>;
  groth16Proof: {
    provingSystem: "groth16";
    circuit: "private_dao_blind_policy_overlay";
    verificationMode: "groth16-snarkjs";
    verified: true;
    publicSignals: string[];
    proof: unknown;
    verificationKey: unknown;
    proofHash: string;
    publicSignalsHash: string;
    verificationKeyHash: string;
  };
  providerLanes: Array<{
    id: "zk-policy-proof" | "refhe-encrypted-evaluation" | "ika-encrypt-2pc-boundary" | "magicblock-fast-session";
    label: string;
    status: "verified" | "committed";
    evidenceClass: "groth16-verified" | "commitment-boundary";
    publicCommitment: string;
    verifierNote: string;
  }>;
  valuesUsedButNotRevealed: string[];
  verifierStatement: string;
};

export type BlindPolicyProveResult =
  | {
      ok: true;
      status: "proof-issued";
      workflowId: string;
      publicOutcome: "policy-satisfied";
      decision: string;
      proofHash: string;
      publicProofPackage: BlindPolicyProofPackage;
      verification: BlindPolicyVerifyResult;
    }
  | {
      ok: false;
      status: string;
      workflowId?: string;
      publicOutcome?: string;
      validationErrors?: string[];
      error?: string;
    };

export type BlindPolicyVerifyResult =
  | {
      ok: true;
      status: "verified";
      match: true;
      originalHash: string;
      recomputedHash: string;
      circuitVersion: string;
      message: string;
    }
  | {
      ok: false;
      status:
        | "policy-not-satisfied"
        | "missing-original-proof-hash"
        | "invalid-proof-package"
        | "mismatch"
        | "expired-proof"
        | "unsupported-circuit-version";
      match: false;
      originalHash: string | null;
      recomputedHash: string | null;
      message: string;
    };

export type BlindPolicyOnchainReceiptResult =
  | {
      ok: true;
      status: "onchain-receipt-stored" | "onchain-receipt-existing" | "onchain-memo-receipt-stored";
      source: "solana-anchor-receipt-registry" | "solana-memo-receipt";
      verification: BlindPolicyVerifyResult;
      onchainReceipt: {
        storageMode: "anchor-pda" | "solana-memo-receipt";
        cluster: "testnet" | "devnet" | "mainnet-beta" | string;
        programId: string;
        authority: string;
        receiptAccount: string;
        receiptAccountExplorerUrl: string;
        proofId: string;
        proofIdHash: string;
        proofHash: string;
        policyCommitmentHash: string;
        inputCommitmentHash: string;
        verificationKeyHash: string;
        circuitVersionHash: string;
        policyVersionHash: string;
        bump: number;
        signature: string | null;
        transactionExplorerUrl: string | null;
      };
    }
  | {
      ok: false;
      status: string;
      source?: string;
      error?: string;
      verification?: BlindPolicyVerifyResult;
    };

export type TxlineMatch = {
  matchId: string;
  homeTeam: string;
  awayTeam: string;
  status: "scheduled" | "live" | "final";
  startsAt: string;
  updatedAt: string;
  score: { home: number; away: number };
  oddsSnapshot?: { market: string; home: number; draw?: number; away: number };
  txlineProofHash?: string;
};

export type TxlineSettlementProofPackage = {
  proofId: string;
  nonce: string;
  matchId: string;
  marketId: string;
  providerMode: "live-txline-provider" | "simulated-txline-provider";
  txlineSnapshotHash: string;
  txlineProofHash?: string;
  settlementPolicyCommitment: string;
  outcomeCommitment: string;
  inputCommitment: string;
  circuitId: "private_dao_blind_policy_overlay";
  circuitVersion: "groth16-v1";
  policyVersion: string;
  issuedAt: string;
  expiresAt: string;
  groth16Proof: BlindPolicyProofPackage["groth16Proof"];
  verificationKeyHash: string;
  originalProofHash: string;
  publicOutcome: "settlement-resolved";
};

export type TxlineMatchesResult = {
  ok: boolean;
  providerMode: "live-txline-provider" | "simulated-txline-provider";
  source: string;
  note: string;
  matches: TxlineMatch[];
};

export type TxlineResolveResult =
  | {
      ok: true;
      status: "settlement-proof-issued";
      providerMode: "live-txline-provider" | "simulated-txline-provider";
      match: TxlineMatch;
      marketId: string;
      winner: "home" | "away" | "draw";
      txlineSnapshotHash: string;
      proofHash: string;
      publicProofPackage: TxlineSettlementProofPackage;
      verification: BlindPolicyVerifyResult;
    }
  | {
      ok: false;
      status: string;
      error?: string;
    };

export type BlindPolicyClientOptions = {
  baseUrl?: string;
  mode?: "local" | "cloud";
  controlPlaneBaseUrl?: string;
  fetchImpl?: typeof fetch;
};

export type BlindPolicyLocalReceiptResult = {
  ok: boolean;
  status: string;
  receipt?: {
    schema: "privatedao.local-receipt.v1";
    createdAt: string;
    proofId: string;
    proofHash: string;
    policyCommitment: string;
    inputCommitment: string;
    storageMode: "local-file-receipt";
  };
  error?: string;
};

export type RecordVerificationRequest = {
  schema_version: "1";
  record_type: string;
  record_id: string;
  issuer: string;
  issued_at: string;
  effective_at?: string;
  payload: Record<string, unknown>;
  source_refs?: string[];
};

export type RecordVerificationInput = {
  record: RecordVerificationRequest;
  schema?: Record<string, unknown>;
  schema_profile_id?: string;
  policy?: Record<string, unknown>;
  public_fields?: string[];
  mode?: "integrity" | "private";
  publicProofPackage?: BlindPolicyProofPackage;
  organizationId?: string;
};

export type RecordVerificationReceipt = {
  receipt_id: string;
  record_type: string;
  record_id: string;
  issuer: string;
  canonicalization_version: string;
  canonical_record_digest: string;
  schema_id: string;
  schema_version: string;
  schema_digest: string;
  verification_status: "VERIFIED" | "INVALID";
  evidence_digest: string;
  anchor_network: "solana" | "pending";
  anchor_reference: string | null;
  anchor_status?: "pending" | "submitted" | "confirmed" | "failed";
  anchor_signature?: string | null;
  anchor_slot?: number | null;
  anchor_program_id?: string | null;
  anchor_cluster?: string | null;
  anchor_confirmed_at?: string | null;
  anchor_payload_digest?: string | null;
  public_fields: Record<string, unknown>;
};

export type RecordVerificationResult = { ok: boolean; status: string; receipt?: RecordVerificationReceipt; anchor?: { network: string; reference: string | null; status: string; anchor_signature?: string | null; anchor_slot?: number | null; anchor_program_id?: string | null; anchor_cluster?: string | null; anchor_confirmed_at?: string | null; anchor_payload_digest?: string | null }; error?: string };

export class BlindPolicyClient {
  private readonly baseUrl: string;
  private readonly mode: "local" | "cloud";
  private readonly controlPlaneBaseUrl: string;
  private readonly fetchImpl: typeof fetch;

  constructor(options: BlindPolicyClientOptions = {}) {
    this.mode = options.mode ?? "local";
    this.baseUrl = (options.baseUrl ?? (this.mode === "local" ? "http://127.0.0.1:8787/v1" : "https://api.privatedao.org/api/v1")).replace(/\/+$/, "");
    this.controlPlaneBaseUrl = (options.controlPlaneBaseUrl ?? "https://api.privatedao.org/api/v1").replace(/\/+$/, "");
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async status(): Promise<unknown> {
    return this.mode === "local" ? this.get("/license/status") : this.get("/proof-workflows/blind-policy/status");
  }

  async sample(): Promise<unknown> {
    return this.mode === "local" ? this.get("/privacy") : this.get("/proof-workflows/blind-policy/sample");
  }

  async prove(input: { workflowId?: string; privateInputs: BlindPolicyPrivateInputs }): Promise<BlindPolicyProveResult> {
    return this.post<BlindPolicyProveResult>(this.mode === "local" ? "/prove" : "/proof-workflows/blind-policy/prove", input);
  }

  async verify(publicProofPackage: BlindPolicyProofPackage): Promise<BlindPolicyVerifyResult> {
    return this.post<BlindPolicyVerifyResult>(this.mode === "local" ? "/verify" : "/proof-workflows/blind-policy/verify", { publicProofPackage });
  }

  async storeLocalReceipt(publicProofPackage: BlindPolicyProofPackage): Promise<BlindPolicyLocalReceiptResult> {
    return this.post<BlindPolicyLocalReceiptResult>("/receipt", { publicProofPackage });
  }

  async submitOnchainReceipt(publicProofPackage: BlindPolicyProofPackage): Promise<BlindPolicyOnchainReceiptResult> {
    return this.postTo<BlindPolicyOnchainReceiptResult>(this.controlPlaneBaseUrl, "/proof-workflows/blind-policy/onchain-receipt", {
      publicProofPackage,
    });
  }

  async fetchTxlineMatches(): Promise<TxlineMatchesResult> {
    return this.get<TxlineMatchesResult>("/txline/matches");
  }

  async resolveMatchMarket(input: { matchId: string; marketId: string }): Promise<TxlineResolveResult> {
    return this.post<TxlineResolveResult>("/txline/resolve", input);
  }

  async verifySettlementProof(publicProofPackage: TxlineSettlementProofPackage): Promise<BlindPolicyVerifyResult> {
    return this.post<BlindPolicyVerifyResult>("/txline/verify", { publicProofPackage });
  }

  async submitSettlementReceipt(publicProofPackage: TxlineSettlementProofPackage): Promise<BlindPolicyOnchainReceiptResult> {
    return this.post<BlindPolicyOnchainReceiptResult>("/txline/onchain-receipt", { publicProofPackage });
  }

  async verifyRecord(input: RecordVerificationInput, idempotencyKey = `record_${randomUUID()}`): Promise<RecordVerificationResult> {
    return this.post<RecordVerificationResult>("/records/verify", input, { "Idempotency-Key": idempotencyKey });
  }

  async verifyPrivateRecord(input: Omit<RecordVerificationInput, "mode">): Promise<RecordVerificationResult> {
    return this.verifyRecord({ ...input, mode: "private" });
  }

  async getRecordReceipt(receiptId: string): Promise<{ ok: boolean; receipt?: RecordVerificationReceipt; error?: string }> {
    return this.get(`/receipts/${encodeURIComponent(receiptId)}`);
  }

  async reverifyRecord(receiptId: string, record: RecordVerificationRequest): Promise<{ ok: boolean; status: string; recomputed_digest?: string }> {
    return this.post(`/receipts/${encodeURIComponent(receiptId)}/reverify`, { record });
  }

  async registerRecordSchema(input: Record<string, unknown>): Promise<unknown> {
    return this.post("/record-schemas", input);
  }

  private async get<T = unknown>(path: string): Promise<T> {
    const response = await this.fetchImpl(`${this.baseUrl}${path}`, {
      headers: { Accept: "application/json" },
    });
    return this.readJson<T>(response);
  }

  private async post<T>(path: string, body: unknown, extraHeaders: Record<string, string> = {}): Promise<T> {
    return this.postTo<T>(this.baseUrl, path, body, extraHeaders);
  }

  private async postTo<T>(baseUrl: string, path: string, body: unknown, extraHeaders: Record<string, string> = {}): Promise<T> {
    const response = await this.fetchImpl(`${baseUrl}${path}`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        ...extraHeaders,
      },
      body: JSON.stringify(body),
    });
    return this.readJson<T>(response);
  }

  private async readJson<T>(response: Response): Promise<T> {
    const payload = (await response.json()) as T;
    if (!response.ok) return payload;
    return payload;
  }
}

export function createBlindPolicyClient(options?: BlindPolicyClientOptions) {
  return new BlindPolicyClient(options);
}
