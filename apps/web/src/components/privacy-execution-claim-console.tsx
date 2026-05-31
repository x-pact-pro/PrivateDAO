"use client";

import { useEffect, useMemo, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey, Transaction, TransactionInstruction } from "@solana/web3.js";

import { buttonVariants } from "@/components/ui/button";
import { captureVisitorTransaction } from "@/lib/visitor-transaction-capture";
import { buildSolanaTxUrl, SOLANA_NETWORK_LABEL } from "@/lib/solana-network";
import { cn } from "@/lib/utils";

const MEMO_PROGRAM_ID = new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr");
const API_BASE = process.env.NEXT_PUBLIC_PRIVATE_DAO_API_BASE || "https://api.privatedao.org";

type PrivacyClaim = {
  id: string;
  label: string;
  route: string;
  tier?: "tier-1" | "tier-2" | "tier-3";
  requestUseCase?: string;
  phases?: string[];
  roles?: string[];
  coordinationGraph?: string[];
  proofQuestions?: string[];
  privacyBoundary?: string;
  auditSurface?: string;
  nativeProofClass: string;
  claimProofClass: "visitor-wallet-memo-attestation";
  claim: string;
};

type EncryptedClaimPacket = {
  version: "pdao-encrypted-claim-v1";
  algorithm: "AES-GCM-256";
  digest: string;
  iv: string;
  key: string;
  ciphertext: string;
  commitmentMemo: string;
  memoProgram: string;
  disclosureMode: "local-selective-disclosure";
  plaintextPreview: {
    rail: string;
    proofClass: string;
    network: string;
    visitor: string;
    createdAt: string;
  };
};

function bytesToBase64(bytes: Uint8Array) {
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return window.btoa(binary);
}

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function base64ToBytes(value: string) {
  const binary = window.atob(value);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

async function buildEncryptedClaimPacket(input: {
  claim: PrivacyClaim;
  visitor: string;
  createdAt: string;
}): Promise<EncryptedClaimPacket> {
  const plaintext = {
    rail: input.claim.id,
    label: input.claim.label,
    proofClass: input.claim.claimProofClass,
    claim: input.claim.claim,
    route: input.claim.route,
    tier: input.claim.tier ?? "execution-rail",
    requestUseCase: input.claim.requestUseCase ?? input.claim.label,
    phases: input.claim.phases ?? ["Review", "Encrypt", "Sign", "Prove", "Verify"],
    roles: input.claim.roles ?? ["Contributor", "Reviewer", "Treasury Manager", "Auditor"],
    coordinationGraph: input.claim.coordinationGraph ?? ["Request", "Review", "Approve", "Execute", "Prove", "Audit"],
    proofQuestions: input.claim.proofQuestions ?? ["who reviewed", "who approved", "who executed", "what was proven"],
    privacyBoundary: input.claim.privacyBoundary ?? "Sensitive context stays encrypted in the local claim packet.",
    auditSurface: input.claim.auditSurface ?? "Public audit surface exposes the digest commitment and explorer signature.",
    network: SOLANA_NETWORK_LABEL,
    visitor: input.visitor,
    createdAt: input.createdAt,
  };
  const encoded = new TextEncoder().encode(JSON.stringify(plaintext));
  const key = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt"]);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoded));
  const rawKey = new Uint8Array(await crypto.subtle.exportKey("raw", key));
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", ciphertext));
  const digestHex = bytesToHex(digest);
  const commitmentMemo = [
    "PDAO_ENCRYPTED_CLAIM_V1",
    input.claim.id,
    input.claim.claimProofClass,
    digestHex.slice(0, 40),
  ].join(":");

  return {
    version: "pdao-encrypted-claim-v1",
    algorithm: "AES-GCM-256",
    digest: digestHex,
    iv: bytesToBase64(iv),
    key: bytesToBase64(rawKey),
    ciphertext: bytesToBase64(ciphertext),
    commitmentMemo,
    memoProgram: MEMO_PROGRAM_ID.toBase58(),
    disclosureMode: "local-selective-disclosure",
    plaintextPreview: {
      rail: input.claim.id,
      proofClass: input.claim.claimProofClass,
      network: SOLANA_NETWORK_LABEL,
      visitor: `${input.visitor.slice(0, 6)}...${input.visitor.slice(-6)}`,
      createdAt: input.createdAt,
    },
  };
}

async function verifyEncryptedClaimPacket(packet: EncryptedClaimPacket) {
  const ciphertext = base64ToBytes(packet.ciphertext);
  const digest = bytesToHex(new Uint8Array(await crypto.subtle.digest("SHA-256", ciphertext)));
  if (digest !== packet.digest) {
    throw new Error("Encrypted receipt digest mismatch.");
  }

  const key = await crypto.subtle.importKey("raw", base64ToBytes(packet.key), { name: "AES-GCM" }, false, ["decrypt"]);
  const plaintextBytes = await crypto.subtle.decrypt({ name: "AES-GCM", iv: base64ToBytes(packet.iv) }, key, ciphertext);
  return JSON.parse(new TextDecoder().decode(plaintextBytes)) as {
    rail: string;
    label: string;
    proofClass: string;
    claim: string;
    route: string;
    tier?: string;
    requestUseCase?: string;
    phases?: string[];
    roles?: string[];
    coordinationGraph?: string[];
    proofQuestions?: string[];
    privacyBoundary?: string;
    auditSurface?: string;
    network: string;
    visitor: string;
    createdAt: string;
  };
}

function buildPublicAttestation(input: {
  packet: EncryptedClaimPacket;
  signature: string | null;
}) {
  return {
    version: "pdao-public-claim-attestation-v1",
    network: input.packet.plaintextPreview.network,
    rail: input.packet.plaintextPreview.rail,
    proofClass: input.packet.plaintextPreview.proofClass,
    digest: input.packet.digest,
    commitmentMemo: input.packet.commitmentMemo,
    memoProgram: input.packet.memoProgram,
    signature: input.signature,
    explorerUrl: input.signature ? buildSolanaTxUrl(input.signature) : null,
    disclosureBoundary: "No AES key, ciphertext plaintext, or private claim payload is included in this public attestation.",
  };
}

function getVisitorSessionId() {
  try {
    return window.localStorage.getItem("privatedao.visitor_session_id.v1") || "privacy-claim-console";
  } catch {
    return "privacy-claim-console";
  }
}

const privacyClaims: PrivacyClaim[] = [
  {
    id: "metadao-grant-review-workflow",
    label: "PrivateDAO grant review workflow",
    route: "/review",
    tier: "tier-1",
    requestUseCase: "A market decision passes, grant reviewers are assigned, a private scoring room opens, treasury approves the award, payout executes, and the public receives an audit receipt.",
    phases: ["Market passes", "Assign reviewers", "Private scoring", "Treasury approval", "Grant payout", "Prove", "Audit receipt"],
    roles: ["Contributor", "Reviewer", "Treasury Manager", "Auditor"],
    coordinationGraph: ["Market Decision", "Grant Review", "Treasury Approval", "Payroll Allocation", "Execution", "Prove", "Audit Proof"],
    proofQuestions: ["who reviewed", "who approved", "who executed", "which receipt proves outcome"],
    privacyBoundary: "Reviewer notes, private scores, applicant context, and treasury reasoning stay encrypted before final award disclosure.",
    auditSurface: "Market state, reviewer quorum digest, treasury approval digest, payout reference, and final audit receipt become verifiable.",
    nativeProofClass: "metadao-market-to-grant-workflow-plus-visitor-wallet-memo-attestation",
    claimProofClass: "visitor-wallet-memo-attestation",
    claim: "PrivateDAO-native grant review workflow that turns a market-passed decision into confidential review, treasury approval, payout, prove layer, and public audit receipt.",
  },
  {
    id: "confidential-treasury-request",
    label: "Confidential treasury request",
    route: "/treasury",
    tier: "tier-1",
    requestUseCase: "Ask for treasury funds without exposing strategy, vendor terms, negotiation context, or supporting documents before approval.",
    phases: ["Discuss", "Review", "Approve", "Execute", "Prove", "Audit"],
    roles: ["Contributor", "Reviewer", "Treasury Manager", "Auditor"],
    coordinationGraph: ["Market Decision", "Treasury Request", "Treasury Approval", "Execution", "Prove", "Audit Proof"],
    proofQuestions: ["who requested", "who reviewed", "who approved", "who executed"],
    privacyBoundary: "Request memo, docs, vendor context, and negotiation details stay encrypted before execution.",
    auditSurface: "Approved amount, digest, wallet signature, and final settlement proof become reviewer-visible.",
    nativeProofClass: "encrypted-treasury-request-plus-visitor-wallet-memo-attestation",
    claimProofClass: "visitor-wallet-memo-attestation",
    claim: "Confidential treasury request with encrypted justification, staged approval, and public-safe audit trail.",
  },
  {
    id: "confidential-payroll-request",
    label: "Confidential payroll request",
    route: "/payroll",
    tier: "tier-1",
    requestUseCase: "Run contributor salary, bonus, or reward approvals without exposing every compensation row to the whole organization.",
    phases: ["Prepare payroll", "Encrypt rows", "Approve batch", "Execute payout", "Prove", "Audit integrity"],
    roles: ["Contributor", "Reviewer", "Treasury Manager", "Auditor"],
    coordinationGraph: ["Treasury Approval", "Payroll Allocation", "Execution", "Prove", "Audit Proof"],
    proofQuestions: ["who prepared", "who approved", "who executed", "which batch digest proves integrity"],
    privacyBoundary: "Contributor names, row-level amounts, and bonus reasons stay in selective-disclosure receipts.",
    auditSurface: "Payroll batch digest, signed memo, REFHE proof route, and payout evidence remain inspectable.",
    nativeProofClass: "refhe-payroll-request-plus-visitor-wallet-memo-attestation",
    claimProofClass: "visitor-wallet-memo-attestation",
    claim: "Confidential payroll request that binds encrypted compensation context to a wallet-signed Testnet commitment.",
  },
  {
    id: "security-incident-room-request",
    label: "Security incident room",
    route: "/security",
    tier: "tier-1",
    requestUseCase: "Coordinate a vulnerability response, freeze recommendation, remediation plan, and disclosure timing before attackers see the details.",
    phases: ["Open room", "Encrypt findings", "Approve response", "Execute mitigation", "Prove", "Publish audit"],
    roles: ["Emergency Operator", "Reviewer", "Treasury Manager", "Auditor"],
    coordinationGraph: ["Security Signal", "Incident Room", "Emergency Approval", "Execution", "Prove", "Audit Proof"],
    proofQuestions: ["who opened the room", "who reviewed", "who approved response", "who executed mitigation"],
    privacyBoundary: "Exploit notes, affected components, patch plan, and responder discussion stay private until disclosure.",
    auditSurface: "Incident digest, signer set, decision timestamp, and mitigation transaction/proof route are public-safe.",
    nativeProofClass: "incident-room-digest-plus-visitor-wallet-memo-attestation",
    claimProofClass: "visitor-wallet-memo-attestation",
    claim: "Security incident coordination room with encrypted response context and on-chain decision attestation.",
  },
  {
    id: "emergency-governance-request",
    label: "Emergency governance request",
    route: "/govern",
    tier: "tier-1",
    requestUseCase: "Run a fast private decision path for exploit, oracle attack, key-loss, or treasury-defense events.",
    phases: ["Trigger", "Review evidence", "Approve emergency action", "Execute", "Prove", "Postmortem audit"],
    roles: ["Emergency Operator", "Reviewer", "Treasury Manager", "Auditor"],
    coordinationGraph: ["Emergency Trigger", "Private Review", "Emergency Governance", "Execution", "Prove", "Audit Proof"],
    proofQuestions: ["who triggered", "who reviewed evidence", "who approved emergency action", "who executed"],
    privacyBoundary: "Evidence, attack hypothesis, and signer debate stay encrypted before action.",
    auditSurface: "Emergency digest, execution authority, final action, and postmortem evidence become verifiable.",
    nativeProofClass: "emergency-governance-plus-visitor-wallet-memo-attestation",
    claimProofClass: "visitor-wallet-memo-attestation",
    claim: "Emergency governance request with private deliberation and public-safe execution accountability.",
  },
  {
    id: "confidential-grant-review-request",
    label: "Confidential grant review",
    route: "/review",
    tier: "tier-1",
    requestUseCase: "Review many grant applications with hidden reviewer notes, blinded scoring, and final award accountability.",
    phases: ["Intake", "Blind review", "Approve awards", "Execute grants", "Prove", "Audit outcomes"],
    roles: ["Contributor", "Reviewer", "Treasury Manager", "Auditor"],
    coordinationGraph: ["Market Decision", "Grant Review", "Treasury Approval", "Execution", "Prove", "Audit Proof"],
    proofQuestions: ["who reviewed", "who approved award", "who executed grant", "what proves outcome"],
    privacyBoundary: "Reviewer notes, applicant weaknesses, scoring disputes, and committee debate stay private.",
    auditSurface: "Award decision digest, reviewer quorum proof, final amount, and grant execution receipt are inspectable.",
    nativeProofClass: "grant-review-digest-plus-visitor-wallet-memo-attestation",
    claimProofClass: "visitor-wallet-memo-attestation",
    claim: "Confidential grant review request with blinded evaluation and public-safe award verification.",
  },
  {
    id: "partnership-negotiation-request",
    label: "Partnership negotiation room",
    route: "/services",
    tier: "tier-2",
    requestUseCase: "Coordinate deal terms, revenue splits, integration milestones, and announcement timing before public launch.",
    phases: ["Draft terms", "Review risk", "Approve partnership", "Execute integration", "Prove", "Audit commitments"],
    roles: ["Contributor", "Reviewer", "Treasury Manager", "Auditor"],
    coordinationGraph: ["Partnership Request", "Private Review", "Treasury Approval", "Execution", "Prove", "Audit Proof"],
    proofQuestions: ["who reviewed terms", "who approved", "who executed integration", "what proves commitments"],
    privacyBoundary: "Terms, counterparties, revenue splits, and negotiation notes stay encrypted until disclosure.",
    auditSurface: "Final approval digest, milestone state, signer evidence, and public announcement proof are preserved.",
    nativeProofClass: "partnership-room-digest-plus-visitor-wallet-memo-attestation",
    claimProofClass: "visitor-wallet-memo-attestation",
    claim: "Confidential partnership room that keeps negotiation private while proving final authorization.",
  },
  {
    id: "ma-discussion-request",
    label: "M&A discussion room",
    route: "/treasury",
    tier: "tier-2",
    requestUseCase: "Handle acquisition or merger proposals with private valuation, offer terms, diligence, and staged approvals.",
    phases: ["Open diligence", "Encrypt valuation", "Approve mandate", "Execute transaction path", "Prove", "Audit decision"],
    roles: ["Contributor", "Reviewer", "Treasury Manager", "Auditor"],
    coordinationGraph: ["M&A Signal", "Private Diligence", "Mandate Approval", "Execution", "Prove", "Audit Proof"],
    proofQuestions: ["who reviewed diligence", "who approved mandate", "who executed path", "which digest proves decision"],
    privacyBoundary: "Valuation, offers, diligence notes, and negotiation strategy stay private.",
    auditSurface: "Mandate digest, approval threshold, final decision state, and execution evidence are verifier-visible.",
    nativeProofClass: "ma-room-digest-plus-visitor-wallet-memo-attestation",
    claimProofClass: "visitor-wallet-memo-attestation",
    claim: "M&A coordination request with encrypted diligence and on-chain authorization proof.",
  },
  {
    id: "hiring-committee-request",
    label: "Hiring committee request",
    route: "/payroll",
    tier: "tier-2",
    requestUseCase: "Review candidates, compensation bands, committee notes, and offer approvals without exposing private hiring context.",
    phases: ["Review candidates", "Encrypt notes", "Approve offer", "Execute payroll setup", "Prove", "Audit fairness"],
    roles: ["Contributor", "Reviewer", "Treasury Manager", "Auditor"],
    coordinationGraph: ["Hiring Request", "Private Review", "Offer Approval", "Payroll Allocation", "Prove", "Audit Proof"],
    proofQuestions: ["who reviewed candidate", "who approved offer", "who prepared payroll", "what proves fairness controls"],
    privacyBoundary: "Candidate data, compensation bands, notes, and offer negotiation stay private.",
    auditSurface: "Offer approval digest, committee quorum, payroll setup claim, and disclosure receipt are available.",
    nativeProofClass: "hiring-committee-digest-plus-visitor-wallet-memo-attestation",
    claimProofClass: "visitor-wallet-memo-attestation",
    claim: "Confidential hiring committee request connected to payroll setup and audit-safe authorization.",
  },
  {
    id: "research-coordination-request",
    label: "Research coordination request",
    route: "/intelligence",
    tier: "tier-2",
    requestUseCase: "Coordinate hypotheses, private findings, reviewer notes, and publication timing before research is ready.",
    phases: ["Collect evidence", "Encrypt findings", "Review internally", "Approve release", "Prove", "Audit provenance"],
    roles: ["Contributor", "Reviewer", "Auditor"],
    coordinationGraph: ["Research Signal", "Private Review", "Release Approval", "Execution", "Prove", "Audit Proof"],
    proofQuestions: ["who reviewed findings", "who approved release", "what evidence changed", "what proves provenance"],
    privacyBoundary: "Hypotheses, early results, failures, and review notes remain encrypted.",
    auditSurface: "Research digest, reviewer approval, release timestamp, and provenance proof become inspectable.",
    nativeProofClass: "research-vault-digest-plus-visitor-wallet-memo-attestation",
    claimProofClass: "visitor-wallet-memo-attestation",
    claim: "Research coordination request with encrypted memory vault and public-safe provenance.",
  },
  {
    id: "reviewer-coordination-request",
    label: "Reviewer coordination request",
    route: "/judge",
    tier: "tier-2",
    requestUseCase: "Coordinate reviewers for hackathons, grants, or committees while limiting bias, leakage, and duplicated review paths.",
    phases: ["Assign reviewers", "Encrypt notes", "Compare signals", "Approve outcome", "Prove", "Audit bias controls"],
    roles: ["Reviewer", "Emergency Operator", "Auditor"],
    coordinationGraph: ["Reviewer Assignment", "Private Review", "Outcome Approval", "Execution", "Prove", "Audit Proof"],
    proofQuestions: ["who reviewed", "who had conflict", "who approved outcome", "what proves bias controls"],
    privacyBoundary: "Reviewer assignments, comments, conflicts, and draft scores stay confidential.",
    auditSurface: "Assignment digest, quorum proof, final score state, and bias-control evidence are verifier-visible.",
    nativeProofClass: "reviewer-coordination-digest-plus-visitor-wallet-memo-attestation",
    claimProofClass: "visitor-wallet-memo-attestation",
    claim: "Reviewer coordination request that proves review integrity without exposing sensitive reviewer behavior.",
  },
  {
    id: "organizational-memory-vault",
    label: "Institutional memory vault",
    route: "/documents/privacy-execution-matrix-2026-05-26",
    tier: "tier-3",
    requestUseCase: "Store why a decision happened, who objected, which alternatives were rejected, what changed after execution, and what can be revealed later by authority.",
    phases: ["Capture decision", "Encrypt memory", "Approve disclosure", "Execute outcome", "Prove", "Audit history"],
    roles: ["Contributor", "Reviewer", "Treasury Manager", "Emergency Operator", "Auditor"],
    coordinationGraph: ["Decision", "Institutional Memory", "Disclosure Approval", "Execution", "Prove", "Audit Proof"],
    proofQuestions: ["why decision happened", "who objected", "what alternatives were rejected", "what outcome proved it"],
    privacyBoundary: "Reasons, source documents, and internal memory stay in selective-disclosure vault packets.",
    auditSurface: "Decision digest, disclosure policy, and proof references preserve continuity across future sessions.",
    nativeProofClass: "memory-vault-digest-plus-visitor-wallet-memo-attestation",
    claimProofClass: "visitor-wallet-memo-attestation",
    claim: "Institutional memory vault that turns private decision history, objections, alternatives, and outcomes into verifiable continuity.",
  },
  {
    id: "agent-governance-request",
    label: "Agent governance request",
    route: "/intelligence",
    tier: "tier-3",
    requestUseCase: "Let AI agents propose budgets, review grants, prepare treasury actions, and leave an auditable execution lineage.",
    phases: ["Agent submits request", "Reviewers approve", "Treasury executes", "Prove", "Audit lineage"],
    roles: ["AI Agent", "Reviewer", "Treasury Manager", "Auditor"],
    coordinationGraph: ["Agent Request", "Private Review", "Treasury Approval", "Execution", "Prove", "Audit Proof"],
    proofQuestions: ["which agent submitted", "who reviewed", "who approved treasury action", "which proof was generated"],
    privacyBoundary: "Agent reasoning, draft analysis, sensitive context, and rejected paths stay encrypted.",
    auditSurface: "Intent digest, human approval, action outcome, and lineage receipt become verifier-visible.",
    nativeProofClass: "agent-governance-lineage-plus-visitor-wallet-memo-attestation",
    claimProofClass: "visitor-wallet-memo-attestation",
    claim: "Agent governance request that binds AI-prepared work to human approval and on-chain auditability.",
  },
  {
    id: "private-governance",
    label: "Private governance",
    route: "/govern",
    nativeProofClass: "wallet-signed-onchain",
    claimProofClass: "visitor-wallet-memo-attestation",
    claim: "Commit/reveal governance with ZK companion proof path.",
  },
  {
    id: "zk-commit-reveal-governance",
    label: "ZK commit/reveal",
    route: "/govern",
    nativeProofClass: "zk-receipt-plus-visitor-wallet-memo-attestation",
    claimProofClass: "visitor-wallet-memo-attestation",
    claim: "ZK-backed commit/reveal governance claim with Testnet memo attestation.",
  },
  {
    id: "confidential-payroll",
    label: "Confidential payroll",
    route: "/payroll",
    nativeProofClass: "onchain-signature",
    claimProofClass: "visitor-wallet-memo-attestation",
    claim: "REFHE envelope plus evidence-gated payout execution.",
  },
  {
    id: "refhe-payroll-computation",
    label: "REFHE payroll computation",
    route: "/services/refhe-payroll-proof",
    nativeProofClass: "encrypted-computation-receipt-plus-visitor-wallet-memo-attestation",
    claimProofClass: "visitor-wallet-memo-attestation",
    claim: "REFHE payroll computation receipt plus Testnet encrypted claim.",
  },
  {
    id: "browser-encrypt-manifest",
    label: "Encrypt manifest",
    route: "/services/encrypt-ika-operations",
    nativeProofClass: "client-encrypted-manifest-plus-visitor-wallet-memo-attestation",
    claimProofClass: "visitor-wallet-memo-attestation",
    claim: "Browser AES-GCM encrypted operation manifest with wallet-signed Testnet commitment.",
  },
  {
    id: "private-payments",
    label: "MagicBlock private payments",
    route: "/services/magicblock-private-payments",
    nativeProofClass: "onchain-signature",
    claimProofClass: "visitor-wallet-memo-attestation",
    claim: "Private payment corridor configured and settled on Testnet.",
  },
  {
    id: "magicblock-private-payments",
    label: "MagicBlock private payments",
    route: "/services/magicblock-private-payments",
    nativeProofClass: "magicblock-corridor-receipt-plus-visitor-wallet-memo-attestation",
    claimProofClass: "visitor-wallet-memo-attestation",
    claim: "MagicBlock private payment corridor claim with Testnet on-chain settlement evidence.",
  },
  {
    id: "umbra-confidential-payout",
    label: "Umbra confidential payout",
    route: "/services/umbra-confidential-payout",
    nativeProofClass: "testnet-intent-receipt",
    claimProofClass: "visitor-wallet-memo-attestation",
    claim: "Recipient-private claim intent with relayer health and next claim gate visible.",
  },
  {
    id: "ika-custody-and-interoperability",
    label: "Ika 2PC-MPC custody",
    route: "/services/encrypt-ika-operations",
    nativeProofClass: "readiness-receipt",
    claimProofClass: "visitor-wallet-memo-attestation",
    claim: "Ika SDK readiness and Solana pre-alpha approval route.",
  },
  {
    id: "ika-2pc-mpc-final-approval",
    label: "Ika 2PC-MPC approval",
    route: "/services/encrypt-ika-operations",
    nativeProofClass: "ika-final-approval-plus-visitor-wallet-memo-attestation",
    claimProofClass: "visitor-wallet-memo-attestation",
    claim: "Ika 2PC-MPC custody approval claim with Solana pre-alpha final approval evidence.",
  },
  {
    id: "intelligence-and-risk",
    label: "Intelligence and risk",
    route: "/intelligence",
    nativeProofClass: "provider-plus-rpc-receipt",
    claimProofClass: "visitor-wallet-memo-attestation",
    claim: "GoldRush, Zerion, QVAC, and QuickNode intelligence before signing.",
  },
  {
    id: "treasury-routing-and-growth",
    label: "Treasury routing and growth",
    route: "/services/jupiter-treasury-route",
    nativeProofClass: "wallet-reviewed-route-plus-ingestion-receipt",
    claimProofClass: "visitor-wallet-memo-attestation",
    claim: "Jupiter route preview and Torque growth event around governed execution.",
  },
  {
    id: "torque-mcp-growth-loop",
    label: "Torque MCP growth loop",
    route: "/services/torque-growth-loop",
    nativeProofClass: "torque-ingestion-receipt-plus-visitor-wallet-memo-attestation",
    claimProofClass: "visitor-wallet-memo-attestation",
    claim: "Torque MCP growth-loop event claim tied to governed treasury execution.",
  },
  {
    id: "pusd-stablecoin-treasury",
    label: "PUSD stablecoin treasury",
    route: "/services/pusd-stablecoin",
    nativeProofClass: "wallet-reviewed-stablecoin-utility-plus-visitor-attestation",
    claimProofClass: "visitor-wallet-memo-attestation",
    claim: "PUSD utility layer for private payroll, grants, gaming rewards, and treasury operations.",
  },
];

const privacyClaimIds = new Set(privacyClaims.map((claim) => claim.id));

export function PrivacyExecutionClaimConsole({ compact = false }: { compact?: boolean }) {
  const { connection } = useConnection();
  const { connected, publicKey, sendTransaction, wallet } = useWallet();
  const [selectedClaimId, setSelectedClaimId] = useState(privacyClaims[0].id);
  const [status, setStatus] = useState(`Connect a ${SOLANA_NETWORK_LABEL} wallet, pick a privacy rail, and anchor the claim on-chain.`);
  const [signature, setSignature] = useState<string | null>(null);
  const [encryptedPacket, setEncryptedPacket] = useState<EncryptedClaimPacket | null>(null);
  const [receiptStatus, setReceiptStatus] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  const selectedClaim = useMemo(
    () => privacyClaims.find((claim) => claim.id === selectedClaimId) ?? privacyClaims[0],
    [selectedClaimId],
  );

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const requestedClaim = params.get("claim") ?? params.get("rail");
    if (requestedClaim && privacyClaimIds.has(requestedClaim)) {
      setSelectedClaimId(requestedClaim);
    }
  }, []);

  async function anchorSelectedClaim() {
    if (!connected || !publicKey) {
      setStatus(`Connect a ${SOLANA_NETWORK_LABEL} wallet first. The claim must be signed by the visitor wallet.`);
      return;
    }

    setIsRunning(true);
    setSignature(null);
    setEncryptedPacket(null);
    setReceiptStatus(null);
    setStatus(`Encrypting ${selectedClaim.label} claim locally before anchoring it on ${SOLANA_NETWORK_LABEL}...`);

    try {
      const latestBlockhash = await connection.getLatestBlockhash("confirmed");
      const createdAt = new Date().toISOString();
      const packet = await buildEncryptedClaimPacket({
        claim: selectedClaim,
        visitor: publicKey.toBase58(),
        createdAt,
      });
      setEncryptedPacket(packet);

      const transaction = new Transaction({
        feePayer: publicKey,
        blockhash: latestBlockhash.blockhash,
        lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
      }).add(
        new TransactionInstruction({
          keys: [],
          programId: MEMO_PROGRAM_ID,
          data: Buffer.from(packet.commitmentMemo, "utf8"),
        }),
      );

      setStatus(`Awaiting wallet signature for ${selectedClaim.label} claim attestation...`);
      const nextSignature = await sendTransaction(transaction, connection, {
        maxRetries: 3,
        skipPreflight: false,
      });

      captureVisitorTransaction({
        txSignature: nextSignature,
        walletAddress: publicKey.toBase58(),
        walletName: wallet?.adapter.name,
        action: `privacy-execution-claim:${selectedClaim.id}`,
        status: "submitted",
      });

      setSignature(nextSignature);
      setStatus(`Signature received. Confirming ${selectedClaim.label} claim on ${SOLANA_NETWORK_LABEL}...`);

      await connection.confirmTransaction(
        {
          signature: nextSignature,
          blockhash: latestBlockhash.blockhash,
          lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
        },
        "confirmed",
      );

      captureVisitorTransaction({
        txSignature: nextSignature,
        walletAddress: publicKey.toBase58(),
        walletName: wallet?.adapter.name,
        action: `privacy-execution-claim:${selectedClaim.id}`,
        status: "confirmed",
      });

      void fetch(`${API_BASE}/api/v1/execution-events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        keepalive: true,
        body: JSON.stringify({
          operationId: `privacy-execution-claim:${selectedClaim.id}`,
          operationLabel: `${selectedClaim.label} encrypted claim`,
          sessionId: getVisitorSessionId(),
          page: window.location.pathname || "/",
          status: "success",
          source: "visitor-wallet",
          receiptHash: nextSignature,
          network: SOLANA_NETWORK_LABEL,
          metadata: {
            rail: selectedClaim.id,
            route: selectedClaim.route,
            digest: packet.digest,
            memo: packet.commitmentMemo,
            memoProgram: packet.memoProgram,
            explorerUrl: buildSolanaTxUrl(nextSignature),
            disclosureBoundary: "The API receives the digest and public memo only; the AES key stays in the browser.",
          },
        }),
      }).catch(() => null);

      setStatus(`${selectedClaim.label} encrypted claim anchored on ${SOLANA_NETWORK_LABEL}. The chain stores the commitment; the encrypted packet remains in this browser session for verification.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Privacy claim attestation failed.");
    } finally {
      setIsRunning(false);
    }
  }

  async function copyEncryptedReceipt() {
    if (!encryptedPacket) return;
    await navigator.clipboard.writeText(JSON.stringify({ signature, packet: encryptedPacket }, null, 2));
    setReceiptStatus("Private disclosure receipt copied locally. It includes the AES key; share it only with a party allowed to decrypt the claim.");
  }

  async function copyPublicAttestation() {
    if (!encryptedPacket) return;
    await navigator.clipboard.writeText(JSON.stringify(buildPublicAttestation({ packet: encryptedPacket, signature }), null, 2));
    setReceiptStatus("Public attestation copied. It proves the digest and on-chain memo without exposing the AES key.");
  }

  function downloadEncryptedReceipt() {
    if (!encryptedPacket) return;
    const payload = JSON.stringify({ signature, explorerUrl: signature ? buildSolanaTxUrl(signature) : null, packet: encryptedPacket }, null, 2);
    const blob = new Blob([payload], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `privatedao-${encryptedPacket.plaintextPreview.rail}-encrypted-claim.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    setReceiptStatus("Encrypted receipt downloaded from this browser session.");
  }

  function downloadPublicAttestation() {
    if (!encryptedPacket) return;
    const payload = JSON.stringify(buildPublicAttestation({ packet: encryptedPacket, signature }), null, 2);
    const blob = new Blob([payload], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `privatedao-${encryptedPacket.plaintextPreview.rail}-public-attestation.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    setReceiptStatus("Public attestation downloaded without the AES key.");
  }

  async function verifyReceiptLocally() {
    if (!encryptedPacket) return;
    try {
      const plaintext = await verifyEncryptedClaimPacket(encryptedPacket);
      setReceiptStatus(`Local verification passed: ${plaintext.label} / ${plaintext.network} / ${plaintext.createdAt}`);
    } catch (error) {
      setReceiptStatus(error instanceof Error ? error.message : "Local receipt verification failed.");
    }
  }

  return (
    <section id="privacy-claim-console-runtime" className="solana-claim-shell max-w-full rounded-[24px] p-4 sm:rounded-[30px] sm:p-5">
      <div className="solana-scanline" />
      <div className="relative z-10">
      <div className="inline-flex items-center rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-[11px] uppercase tracking-[0.3em] text-emerald-100">
        On-chain claim console
      </div>
      <div className={cn("mt-3 grid min-w-0 gap-5", compact ? "lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]" : "xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]")}>
        <div className="min-w-0">
          <h2 className="text-2xl font-semibold text-white">Anchor any privacy rail as a visitor-signed Testnet claim</h2>
          <p className="mt-3 text-sm leading-7 text-white/64">
            This console makes every privacy and encryption lane end-to-end testable from the browser. The visitor
            selects the rail, encrypts the claim locally, signs a Solana Testnet commitment transaction, then verifies
            the signature on-chain. Stronger rails still keep their native REFHE, MagicBlock, Ika, Umbra, Jupiter, and
            Torque proof paths beside this universal claim layer.
          </p>
          <p className="mt-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-xs leading-6 text-white/60">
            Repeatable means every visitor can run a fresh live attempt. Each click creates a new AES-GCM encrypted
            claim packet and a new wallet-signed Testnet commitment from that visitor wallet, not a replay of an old
            project signature.
          </p>
          <div className="mt-4 rounded-2xl border border-emerald-300/14 bg-emerald-300/[0.055] p-4">
            <div className="text-[10px] uppercase tracking-[0.22em] text-emerald-100/70">Confidential coordination graph</div>
            <div className="mt-3 grid min-w-0 grid-cols-1 gap-2 text-xs text-white/62 sm:grid-cols-2 lg:grid-cols-3">
              {["Market Decision", "Grant Review", "Treasury Approval", "Payroll Allocation", "Execution", "Prove", "Audit Proof"].map((node, index) => (
                <span key={node} className="flex min-w-0 items-center gap-2">
                  <span className="min-w-0 flex-1 rounded-full border border-white/10 bg-black/24 px-3 py-1 text-center leading-5 break-words">{node}</span>
                  {index < 6 ? <span className="hidden shrink-0 text-cyan-100/50 sm:inline">→</span> : null}
                </span>
              ))}
            </div>
          </div>
          <div className="solana-progress mt-4 grid gap-3 sm:grid-cols-5">
            {["Review rail", "Encrypt locally", "Sign digest", "Prove actors", "Verify receipt"].map((step, index) => (
              <div key={step} className="solana-rail-card rounded-2xl px-4 py-3">
                <div className="text-[10px] uppercase tracking-[0.22em] text-cyan-100/58">0{index + 1}</div>
                <div className="mt-1 text-sm font-semibold text-white">{step}</div>
              </div>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <a href="https://faucet.solana.com/" target="_blank" rel="noreferrer" className={cn(buttonVariants({ size: "sm" }))}>
              Get Testnet SOL
            </a>
            <a href="https://api.privatedao.org/api/v1/privacy-execution-claims" target="_blank" rel="noreferrer" className={cn(buttonVariants({ size: "sm", variant: "secondary" }))}>
              Claims JSON
            </a>
            <a
              href={`https://api.privatedao.org/api/v1/privacy-execution-claims/prepare?claim=${encodeURIComponent(selectedClaim.id)}`}
              target="_blank"
              rel="noreferrer"
              className={cn(buttonVariants({ size: "sm", variant: "secondary" }))}
            >
              Prepare on-chain memo
            </a>
            <a href="https://api.privatedao.org/api/v1/privacy-execution-matrix" target="_blank" rel="noreferrer" className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>
              Matrix JSON
            </a>
            {signature ? (
              <a href={buildSolanaTxUrl(signature)} target="_blank" rel="noreferrer" className={cn(buttonVariants({ size: "sm" }))}>
                Verify claim on-chain
              </a>
            ) : null}
          </div>
        </div>

        <div className="min-w-0 rounded-[24px] border border-white/10 bg-black/24 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
          <label className="block text-sm text-white/70">
            <span>Privacy rail</span>
            <select
              value={selectedClaimId}
              onChange={(event) => setSelectedClaimId(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-white outline-none"
            >
              {privacyClaims.map((claim) => (
                <option key={claim.id} value={claim.id}>
                  {claim.label}
                </option>
              ))}
            </select>
          </label>
          <div className="solana-rail-card mt-4 rounded-2xl p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-sm font-semibold text-white">{selectedClaim.label}</div>
              {selectedClaim.tier ? (
                <span className="rounded-full border border-emerald-300/18 bg-emerald-300/10 px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-emerald-100">
                  {selectedClaim.tier.replace("-", " ")}
                </span>
              ) : null}
            </div>
            <p className="mt-2 text-xs leading-6 text-white/58">{selectedClaim.claim}</p>
            {selectedClaim.requestUseCase ? (
              <p className="mt-3 rounded-xl border border-cyan-300/12 bg-cyan-300/[0.055] p-3 text-xs leading-6 text-white/62">
                {selectedClaim.requestUseCase}
              </p>
            ) : null}
            {selectedClaim.phases ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {selectedClaim.phases.map((phase) => (
                  <span key={phase} className="max-w-full rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] uppercase tracking-[0.08em] text-white/58 break-words sm:tracking-[0.14em]">
                    {phase}
                  </span>
                ))}
              </div>
            ) : null}
            {selectedClaim.roles ? (
              <div className="mt-3">
                <div className="text-[10px] uppercase tracking-[0.2em] text-emerald-100/60">Role-based coordination</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {selectedClaim.roles.map((role) => (
                    <span key={role} className="max-w-full rounded-full border border-emerald-300/14 bg-emerald-300/[0.06] px-2.5 py-1 text-[10px] uppercase tracking-[0.08em] text-emerald-50/68 break-words sm:tracking-[0.13em]">
                      {role}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
            {selectedClaim.coordinationGraph ? (
              <div className="mt-3">
                <div className="text-[10px] uppercase tracking-[0.2em] text-cyan-100/60">Workflow graph</div>
                <div className="mt-2 grid min-w-0 grid-cols-1 gap-2 text-[11px] text-white/56 sm:grid-cols-2">
                  {selectedClaim.coordinationGraph.map((node, index) => (
                    <span key={`${node}-${index}`} className="flex min-w-0 items-center gap-2">
                      <span className="min-w-0 flex-1 rounded-full border border-white/10 bg-black/24 px-2.5 py-1 text-center leading-5 break-words">{node}</span>
                      {index < selectedClaim.coordinationGraph!.length - 1 ? <span className="hidden shrink-0 text-cyan-100/45 sm:inline">→</span> : null}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
            {selectedClaim.proofQuestions ? (
              <div className="mt-3 rounded-xl border border-white/10 bg-black/20 p-3">
                <div className="text-[10px] uppercase tracking-[0.2em] text-white/45">Prove layer</div>
                <div className="mt-2 grid gap-1 text-[11px] leading-5 text-white/58">
                  {selectedClaim.proofQuestions.map((question) => (
                    <div key={question}>Prove: {question}</div>
                  ))}
                </div>
              </div>
            ) : null}
            {selectedClaim.privacyBoundary || selectedClaim.auditSurface ? (
              <div className="mt-3 grid gap-2 text-[11px] leading-5 text-white/55">
                {selectedClaim.privacyBoundary ? <div>Private: {selectedClaim.privacyBoundary}</div> : null}
                {selectedClaim.auditSurface ? <div>Audit: {selectedClaim.auditSurface}</div> : null}
              </div>
            ) : null}
            <div className="mt-3 space-y-1 font-mono text-[11px] text-cyan-100/70">
              <div>claim: {selectedClaim.claimProofClass}</div>
              <div className="text-white/45">native: {selectedClaim.nativeProofClass}</div>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <button type="button" onClick={() => void anchorSelectedClaim()} disabled={isRunning} className={cn(buttonVariants({ size: "sm" }))}>
              {isRunning ? "Encrypting + anchoring..." : "Encrypt + anchor on-chain"}
            </button>
            <a href={selectedClaim.route} className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>
              Open service
            </a>
          </div>
          <div className="mt-4 rounded-2xl border border-cyan-300/14 bg-black/30 p-3 text-xs leading-6 text-white/66">
            {status}
          </div>
          {signature ? <div className="mt-3 break-all font-mono text-xs text-cyan-100">{signature}</div> : null}
          <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
            <div className="text-[11px] uppercase tracking-[0.22em] text-white/50">Selective disclosure receipt</div>
            <div className="mt-2 text-xs leading-6 text-white/56">
              After anchoring, verify the encrypted packet locally, export a public attestation without the AES key, or
              export a private disclosure receipt for an allowed reviewer.
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" onClick={() => void verifyReceiptLocally()} disabled={!encryptedPacket} className={cn(buttonVariants({ size: "sm", variant: "secondary" }))}>
                Verify receipt locally
              </button>
              <button type="button" onClick={() => void copyPublicAttestation()} disabled={!encryptedPacket} className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>
                Copy public attestation
              </button>
              <button type="button" onClick={downloadPublicAttestation} disabled={!encryptedPacket} className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>
                Download public attestation
              </button>
              <button type="button" onClick={() => void copyEncryptedReceipt()} disabled={!encryptedPacket} className={cn(buttonVariants({ size: "sm", variant: "ghost" }))}>
                Copy private disclosure
              </button>
              <button type="button" onClick={downloadEncryptedReceipt} disabled={!encryptedPacket} className={cn(buttonVariants({ size: "sm", variant: "ghost" }))}>
                Download private disclosure
              </button>
            </div>
            {receiptStatus ? <div className="mt-3 rounded-xl border border-white/10 bg-black/20 p-3 text-xs text-white/62">{receiptStatus}</div> : null}
          </div>
          {encryptedPacket ? (
            <div className="mt-4 rounded-2xl border border-cyan-300/16 bg-cyan-300/[0.05] p-3">
              <div className="text-[11px] uppercase tracking-[0.22em] text-cyan-100/68">Local encrypted claim packet</div>
              <div className="mt-2 text-xs leading-6 text-white/58">
                Only the digest is anchored on-chain. The key and ciphertext are shown locally so the visitor can inspect
                what was committed without publishing private claim context.
              </div>
              <pre className="mt-3 max-h-52 overflow-auto rounded-xl border border-white/10 bg-black/30 p-3 text-[11px] leading-5 text-white/66">
                {JSON.stringify(encryptedPacket, null, 2)}
              </pre>
            </div>
          ) : null}
        </div>
      </div>
      </div>
    </section>
  );
}
