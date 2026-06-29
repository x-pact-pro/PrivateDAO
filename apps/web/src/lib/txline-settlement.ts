import { createHash } from "crypto";

export type TxlineProviderMode = "live-txline-provider" | "simulated-txline-provider";

export type TxlineMatchStatus = "scheduled" | "live" | "final";

export type TxlineMatch = {
  matchId: string;
  officialFixtureId?: string;
  competition?: string;
  fixtureGroup?: string;
  country?: string;
  sourceReference?: string;
  displayFlags?: string;
  coverageNote?: string;
  txlineValidationTarget?: string;
  homeTeam: string;
  awayTeam: string;
  status: TxlineMatchStatus;
  startsAt: string;
  updatedAt: string;
  score: {
    home: number;
    away: number;
  };
  oddsSnapshot?: {
    market: string;
    home: number;
    draw?: number;
    away: number;
  };
  txlineProofHash?: string;
  rawSource?: string;
};

export type TxlineSettlementGroth16Proof = {
  provingSystem: "groth16";
  circuit: "private_dao_blind_policy_overlay";
  verificationMode: "groth16-snarkjs";
  verified: true;
  publicSignals: string[];
  proof: unknown;
  verificationKey?: unknown;
  proofHash: string;
  publicSignalsHash: string;
  verificationKeyHash: string;
};

export type TxlineSettlementProofPackage = {
  proofId: string;
  nonce: string;
  matchId: string;
  marketId: string;
  providerMode: TxlineProviderMode;
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
  groth16Proof: TxlineSettlementGroth16Proof;
  verificationKeyHash: string;
  originalProofHash: string;
  publicOutcome: "settlement-resolved";
  matchSummary: {
    label: string;
    status: "final";
    score: string;
    winner: "home" | "away" | "draw";
  };
  publicChecks: Array<{
    id:
      | "txline-data-verified"
      | "match-final"
      | "settlement-policy-satisfied"
      | "groth16-proof-verified"
      | "public-receipt-generated";
    label: string;
    satisfied: true;
  }>;
  valuesUsedButNotRevealed: string[];
  verifierStatement: string;
  onchainReceipt?: TxlineOnchainReceipt;
};

export type TxlineSettlementVerification =
  | {
      ok: true;
      status: "verified";
      match: true;
      originalHash: string;
      recomputedHash: string;
      circuitVersion: string;
      policyVersion: string;
      message: string;
    }
  | {
      ok: false;
      status:
        | "missing-original-proof-hash"
        | "invalid-proof-package"
        | "mismatch"
        | "expired-proof"
        | "unsupported-circuit-version"
        | "unsupported-match-status";
      match: false;
      originalHash: string | null;
      recomputedHash: string | null;
      message: string;
    };

export type TxlineOnchainReceipt = {
  storageMode: "solana-memo-receipt";
  cluster: string;
  programId: string;
  authority: string;
  proofId: string;
  proofIdHash: string;
  matchIdHash: string;
  marketIdHash: string;
  txlineSnapshotHash: string;
  settlementPolicyCommitment: string;
  outcomeCommitment: string;
  verificationKeyHash: string;
  originalProofHash: string;
  signature: string;
  transactionExplorerUrl: string;
};

export const txlineSettlementCircuitId = "private_dao_blind_policy_overlay" as const;
export const txlineSettlementCircuitVersion = "groth16-v1" as const;
export const txlineSettlementPolicyVersion = "2026-06-26.txline-world-cup-settlement.v1";

export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map((item) => stableStringify(item)).join(",")}]`;

  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, entryValue]) => entryValue !== undefined)
    .sort(([left], [right]) => left.localeCompare(right));

  return `{${entries.map(([key, entryValue]) => `${JSON.stringify(key)}:${stableStringify(entryValue)}`).join(",")}}`;
}

export function sha256StableJsonHex(value: unknown): string {
  return createHash("sha256").update(stableStringify(value)).digest("hex");
}

export function buildTxlineSnapshotHash(match: TxlineMatch): string {
  return sha256StableJsonHex({
    matchId: match.matchId,
    homeTeam: match.homeTeam,
    awayTeam: match.awayTeam,
    status: match.status,
    score: match.score,
    oddsSnapshot: match.oddsSnapshot,
    updatedAt: match.updatedAt,
    txlineProofHash: match.txlineProofHash ?? null,
    officialFixtureId: match.officialFixtureId ?? null,
    competition: match.competition ?? null,
    fixtureGroup: match.fixtureGroup ?? null,
    country: match.country ?? null,
    sourceReference: match.sourceReference ?? null,
    coverageNote: match.coverageNote ?? null,
    txlineValidationTarget: match.txlineValidationTarget ?? null,
  });
}

export function resolveTxlineWinner(match: TxlineMatch): "home" | "away" | "draw" {
  if (match.score.home > match.score.away) return "home";
  if (match.score.away > match.score.home) return "away";
  return "draw";
}

export function buildTxlineSettlementPayload(proofPackage: TxlineSettlementProofPackage) {
  const payload: Omit<TxlineSettlementProofPackage, "originalProofHash" | "onchainReceipt"> & {
    originalProofHash?: string;
    onchainReceipt?: TxlineOnchainReceipt;
  } = { ...proofPackage };
  delete payload.originalProofHash;
  delete payload.onchainReceipt;
  return payload;
}

export function computeTxlineSettlementProofHash(proofPackage: TxlineSettlementProofPackage): string {
  return sha256StableJsonHex(buildTxlineSettlementPayload(proofPackage));
}

export function buildTxlineSettlementProofPackage(input: {
  proofId: string;
  nonce: string;
  match: TxlineMatch;
  marketId: string;
  providerMode: TxlineProviderMode;
  issuedAt: string;
  expiresAt: string;
  settlementPolicyCommitment: string;
  outcomeCommitment?: string;
  inputCommitment: string;
  groth16Proof: TxlineSettlementGroth16Proof;
  policyVersion?: string;
}): TxlineSettlementProofPackage {
  if (input.match.status !== "final") {
    throw new Error("Settlement proof can only be issued after the match is final.");
  }
  if (!input.groth16Proof?.verified) throw new Error("Verified Groth16 proof is required.");

  const winner = resolveTxlineWinner(input.match);
  const txlineSnapshotHash = buildTxlineSnapshotHash(input.match);
  const outcomeCommitment =
    input.outcomeCommitment ??
    sha256StableJsonHex({
      matchId: input.match.matchId,
      marketId: input.marketId,
      winner,
      score: input.match.score,
      txlineSnapshotHash,
    });
  const unsigned: TxlineSettlementProofPackage = {
    proofId: input.proofId,
    nonce: input.nonce,
    matchId: input.match.matchId,
    marketId: input.marketId,
    providerMode: input.providerMode,
    txlineSnapshotHash,
    txlineProofHash: input.match.txlineProofHash,
    settlementPolicyCommitment: input.settlementPolicyCommitment,
    outcomeCommitment,
    inputCommitment: input.inputCommitment,
    circuitId: txlineSettlementCircuitId,
    circuitVersion: txlineSettlementCircuitVersion,
    policyVersion: input.policyVersion ?? txlineSettlementPolicyVersion,
    issuedAt: input.issuedAt,
    expiresAt: input.expiresAt,
    groth16Proof: input.groth16Proof,
    verificationKeyHash: input.groth16Proof.verificationKeyHash,
    originalProofHash: "",
    publicOutcome: "settlement-resolved",
    matchSummary: {
      label: `${input.match.displayFlags ? `${input.match.displayFlags} ` : ""}${input.match.homeTeam} vs ${input.match.awayTeam}`,
      status: "final",
      score: `${input.match.score.home}-${input.match.score.away}`,
      winner,
    },
    publicChecks: [
      { id: "txline-data-verified", label: "TxLINE data verified", satisfied: true },
      { id: "match-final", label: "Match result is final", satisfied: true },
      { id: "settlement-policy-satisfied", label: "Settlement policy satisfied", satisfied: true },
      { id: "groth16-proof-verified", label: "Groth16 proof verified", satisfied: true },
      { id: "public-receipt-generated", label: "Public receipt generated", satisfied: true },
    ],
    valuesUsedButNotRevealed: [
      "Internal settlement policy",
      "Market maker exposure rules",
      "Risk thresholds",
      "Payout routing logic",
      "Operator review notes",
    ],
    verifierStatement:
      "We verify the TxLINE snapshot hash, the Groth16 proof material, and the public settlement package hash. If any public result or commitment changes, verification fails.",
  };

  return {
    ...unsigned,
    originalProofHash: computeTxlineSettlementProofHash(unsigned),
  };
}

export function assertTxlineSettlementProofPackage(value: unknown): TxlineSettlementProofPackage {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Settlement proof package must be an object.");
  const proofPackage = value as Partial<TxlineSettlementProofPackage>;
  if (!proofPackage.proofId || typeof proofPackage.proofId !== "string") throw new Error("proofId is required.");
  if (!proofPackage.nonce || typeof proofPackage.nonce !== "string") throw new Error("nonce is required.");
  if (!proofPackage.matchId || typeof proofPackage.matchId !== "string") throw new Error("matchId is required.");
  if (!proofPackage.marketId || typeof proofPackage.marketId !== "string") throw new Error("marketId is required.");
  if (proofPackage.providerMode !== "live-txline-provider" && proofPackage.providerMode !== "simulated-txline-provider") {
    throw new Error("providerMode is invalid.");
  }
  if (!proofPackage.txlineSnapshotHash || typeof proofPackage.txlineSnapshotHash !== "string") {
    throw new Error("txlineSnapshotHash is required.");
  }
  if (!proofPackage.settlementPolicyCommitment || typeof proofPackage.settlementPolicyCommitment !== "string") {
    throw new Error("settlementPolicyCommitment is required.");
  }
  if (!proofPackage.outcomeCommitment || typeof proofPackage.outcomeCommitment !== "string") {
    throw new Error("outcomeCommitment is required.");
  }
  if (!proofPackage.inputCommitment || typeof proofPackage.inputCommitment !== "string") throw new Error("inputCommitment is required.");
  if (proofPackage.circuitId !== txlineSettlementCircuitId) throw new Error("circuitId is invalid.");
  if (!proofPackage.circuitVersion || typeof proofPackage.circuitVersion !== "string") throw new Error("circuitVersion is required.");
  if (!proofPackage.policyVersion || typeof proofPackage.policyVersion !== "string") throw new Error("policyVersion is required.");
  if (!proofPackage.issuedAt || typeof proofPackage.issuedAt !== "string") throw new Error("issuedAt is required.");
  if (!proofPackage.expiresAt || typeof proofPackage.expiresAt !== "string") throw new Error("expiresAt is required.");
  if (!proofPackage.groth16Proof || proofPackage.groth16Proof.verified !== true) {
    throw new Error("verified groth16Proof is required.");
  }
  if (proofPackage.groth16Proof.provingSystem !== "groth16") throw new Error("Groth16 proof is required.");
  if (proofPackage.groth16Proof.circuit !== txlineSettlementCircuitId) throw new Error("Groth16 circuit is invalid.");
  if (proofPackage.groth16Proof.verificationMode !== "groth16-snarkjs") throw new Error("Groth16 verification mode is invalid.");
  if (!Array.isArray(proofPackage.groth16Proof.publicSignals)) throw new Error("Groth16 public signals are required.");
  if (!proofPackage.groth16Proof.proof || typeof proofPackage.groth16Proof.proof !== "object") {
    throw new Error("Groth16 proof object is required.");
  }
  if (!proofPackage.groth16Proof.verificationKeyHash || typeof proofPackage.groth16Proof.verificationKeyHash !== "string") {
    throw new Error("verificationKeyHash is required.");
  }
  if (proofPackage.verificationKeyHash !== proofPackage.groth16Proof.verificationKeyHash) {
    throw new Error("verificationKeyHash does not match Groth16 proof material.");
  }
  if (typeof proofPackage.originalProofHash !== "string") throw new Error("originalProofHash is required.");
  if (proofPackage.publicOutcome !== "settlement-resolved") throw new Error("publicOutcome is invalid.");
  if (!proofPackage.matchSummary || proofPackage.matchSummary.status !== "final") throw new Error("matchSummary is invalid.");
  if (!Array.isArray(proofPackage.publicChecks) || proofPackage.publicChecks.length < 5) throw new Error("publicChecks are required.");
  if (proofPackage.publicChecks.some((check) => check.satisfied !== true)) throw new Error("publicChecks are invalid.");
  if (!Array.isArray(proofPackage.valuesUsedButNotRevealed)) throw new Error("valuesUsedButNotRevealed are required.");
  return proofPackage as TxlineSettlementProofPackage;
}

export function verifyTxlineSettlementProofPackage(value: unknown): TxlineSettlementVerification {
  try {
    const proofPackage = assertTxlineSettlementProofPackage(value);
    const recomputedHash = computeTxlineSettlementProofHash(proofPackage);
    const originalHash = proofPackage.originalProofHash.trim() || null;
    if (!originalHash) {
      return {
        ok: false,
        status: "missing-original-proof-hash",
        match: false,
        originalHash,
        recomputedHash,
        message: "Missing original proof hash.",
      };
    }
    if (originalHash !== recomputedHash) {
      return {
        ok: false,
        status: "mismatch",
        match: false,
        originalHash,
        recomputedHash,
        message: "422 mismatch. The settlement proof package was changed after the original hash was created.",
      };
    }
    if (proofPackage.circuitVersion !== txlineSettlementCircuitVersion) {
      return {
        ok: false,
        status: "unsupported-circuit-version",
        match: false,
        originalHash,
        recomputedHash,
        message: `Unsupported circuit version: ${proofPackage.circuitVersion}.`,
      };
    }
    if (Number.isNaN(Date.parse(proofPackage.expiresAt)) || Date.parse(proofPackage.expiresAt) <= Date.now()) {
      return {
        ok: false,
        status: "expired-proof",
        match: false,
        originalHash,
        recomputedHash,
        message: "The settlement proof package has expired.",
      };
    }
    return {
      ok: true,
      status: "verified",
      match: true,
      originalHash,
      recomputedHash,
      circuitVersion: proofPackage.circuitVersion,
      policyVersion: proofPackage.policyVersion,
      message: "Verified. The TxLINE settlement proof package matches the original hash.",
    };
  } catch (error) {
    return {
      ok: false,
      status: "invalid-proof-package",
      match: false,
      originalHash: null,
      recomputedHash: null,
      message: error instanceof Error ? error.message : "Invalid TxLINE settlement proof package.",
    };
  }
}

export function buildTxlineSettlementMemoFields(proofPackage: TxlineSettlementProofPackage) {
  const proof = assertTxlineSettlementProofPackage(proofPackage);
  return {
    protocol: "PDAO-TXL1",
    proofIdHash: createHash("sha256").update(proof.proofId).digest("hex"),
    matchIdHash: createHash("sha256").update(proof.matchId).digest("hex"),
    marketIdHash: createHash("sha256").update(proof.marketId).digest("hex"),
    txlineSnapshotHash: proof.txlineSnapshotHash,
    settlementPolicyCommitment: proof.settlementPolicyCommitment,
    outcomeCommitment: proof.outcomeCommitment,
    verificationKeyHash: proof.verificationKeyHash,
    originalProofHash: proof.originalProofHash,
  };
}

export function buildTxlineSettlementMemoPayload(proofPackage: TxlineSettlementProofPackage): string {
  const fields = buildTxlineSettlementMemoFields(proofPackage);
  return [
    fields.protocol,
    fields.proofIdHash,
    fields.matchIdHash,
    fields.marketIdHash,
    fields.txlineSnapshotHash,
    fields.settlementPolicyCommitment,
    fields.outcomeCommitment,
    fields.verificationKeyHash,
    fields.originalProofHash,
  ].join("|");
}

export function buildSimulatedTxlineMatches(now = new Date()): TxlineMatch[] {
  const updatedAt = now.toISOString();
  const txlineValidationTarget = "TxLINE validate_stat CPI target";
  const sourceReference = "Official txdoc World Cup schedule";
  return [
    {
      matchId: "17588386",
      officialFixtureId: "17588386",
      competition: "World Cup",
      fixtureGroup: "World Cup > Group Stage",
      country: "International",
      sourceReference,
      displayFlags: "BR-MA",
      coverageNote: "Full TxLINE coverage: real-time feeds, on-chain verification, complete statistics.",
      txlineValidationTarget,
      homeTeam: "Brazil",
      awayTeam: "Morocco",
      status: "final",
      startsAt: "2026-06-13T22:00:00.000Z",
      updatedAt,
      score: { home: 2, away: 1 },
      oddsSnapshot: { market: "match-winner", home: 1.82, draw: 3.45, away: 4.1 },
      txlineProofHash: sha256StableJsonHex({
        simulatedTxlineMerklePrimitive: "official-worldcup-fixture-17588386",
        officialFixtureId: "17588386",
        sourceReference,
        updatedAt,
      }).slice(0, 64),
      rawSource: "simulated-txline-provider",
    },
    {
      matchId: "17588322",
      officialFixtureId: "17588322",
      competition: "World Cup",
      fixtureGroup: "World Cup > Group Stage",
      country: "International",
      sourceReference,
      displayFlags: "AR-DZ",
      coverageNote: "Official schedule fixture; simulated score until live TxLINE token is configured.",
      txlineValidationTarget,
      homeTeam: "Argentina",
      awayTeam: "Algeria",
      status: "final",
      startsAt: "2026-06-17T01:00:00.000Z",
      updatedAt,
      score: { home: 1, away: 0 },
      oddsSnapshot: { market: "match-winner", home: 1.67, draw: 3.85, away: 5.2 },
      txlineProofHash: sha256StableJsonHex({
        simulatedTxlineMerklePrimitive: "official-worldcup-fixture-17588322",
        officialFixtureId: "17588322",
        sourceReference,
        updatedAt,
      }).slice(0, 64),
      rawSource: "simulated-txline-provider",
    },
    {
      matchId: "17588234",
      officialFixtureId: "17588234",
      competition: "World Cup",
      fixtureGroup: "World Cup > Group Stage",
      country: "International",
      sourceReference,
      displayFlags: "NO-FR",
      coverageNote: "Official Jun 26 fixture; used as live-in-progress demo row when API token is not active.",
      txlineValidationTarget,
      homeTeam: "Norway",
      awayTeam: "France",
      status: "live",
      startsAt: "2026-06-26T22:00:00.000Z",
      updatedAt,
      score: { home: 1, away: 1 },
      oddsSnapshot: { market: "match-winner", home: 4.8, draw: 3.6, away: 1.78 },
      rawSource: "simulated-txline-provider",
    },
    {
      matchId: "17588404",
      officialFixtureId: "17588404",
      competition: "World Cup",
      fixtureGroup: "World Cup > Group Stage",
      country: "International",
      sourceReference,
      displayFlags: "UY-ES",
      coverageNote: "Official Jun 27 fixture; scheduled market preview.",
      txlineValidationTarget,
      homeTeam: "Uruguay",
      awayTeam: "Spain",
      status: "scheduled",
      startsAt: "2026-06-27T00:00:00.000Z",
      updatedAt,
      score: { home: 0, away: 0 },
      oddsSnapshot: { market: "match-winner", home: 3.2, draw: 3.15, away: 2.18 },
      rawSource: "simulated-txline-provider",
    },
  ];
}
