import fs from "fs";
import path from "path";
import { Connection, PublicKey } from "@solana/web3.js";
import { PrivateDaoReadNode, resolveDevnetRpcEndpoints } from "./lib/read-node";

type ProofRegistry = {
  programId: string;
  verificationWallet: string;
  dao: string;
  treasury: string;
  proposal: string;
  transactions: Record<string, string>;
};

type ZkProofRegistry = {
  network: string;
  verification_mode: string;
  onchain_verifier: boolean;
  proposal_public_key: string;
  onchain_proof_anchors?: {
    proposal_public_key: string;
    entries: Array<{
      layer: string;
      circuit: string;
      anchor_pda: string;
      tx_signature: string;
      explorer_url: string;
    }>;
  };
};

type MagicBlockRuntimeEvidence = {
  project: string;
  network: string;
  captures: Array<{
    walletLabel: string;
    proposalPublicKey: string;
    corridorPda: string;
    settlementWallet: string;
    depositTxSignature?: string | null;
    transferTxSignature?: string | null;
    withdrawTxSignature?: string | null;
    settleTxSignature?: string | null;
    executeTxSignature?: string | null;
  }>;
};

type SubmissionRegistry = {
  project: string;
  frontend: string;
};

type TxCheck = {
  label: string;
  signature: string;
  endpoint: string;
  status: string;
  slot: number;
  confirmed: boolean;
};

type AccountCheck = {
  label: string;
  pubkey: string;
  endpoint: string;
  exists: boolean;
  executable: boolean;
};

const JSON_PATH = path.resolve("docs/frontier-integrations.generated.json");
const MD_PATH = path.resolve("docs/frontier-integrations.generated.md");

function resolveActiveCluster() {
  const raw = (process.env.SOLANA_CLUSTER || process.env.NEXT_PUBLIC_SOLANA_NETWORK || "testnet").toLowerCase();
  return raw === "devnet" ? "devnet" : "testnet";
}

function resolveRuntimeRpcEndpointsSafe(cluster: "devnet" | "testnet") {
  const endpoints: string[] = [];
  const add = (value?: string | null) => {
    const normalized = (value || "").trim();
    if (!normalized || !/^https?:\/\//.test(normalized)) return;
    if (!endpoints.includes(normalized)) endpoints.push(normalized);
  };

  add(process.env.SOLANA_RPC_URL);
  if (cluster === "devnet") {
    for (const endpoint of resolveDevnetRpcEndpoints()) add(endpoint);
    add(process.env.RPC_FAST_DEVNET_RPC);
    add("https://api.devnet.solana.com");
    return endpoints;
  }

  add(process.env.RPC_FAST_TESTNET_RPC);
  add(process.env.QUICKNODE_TESTNET_RPC);
  add("https://api.testnet.solana.com");
  return endpoints;
}

async function main() {
  const proof = readJson<ProofRegistry>("docs/proof-registry.json");
  const zkProof = readJson<ZkProofRegistry>("docs/zk-proof-registry.json");
  const magicBlockRuntime = readJson<MagicBlockRuntimeEvidence>("docs/magicblock/runtime.generated.json");
  const submission = readJson<SubmissionRegistry>("docs/submission-registry.json");

  const activeCluster = resolveActiveCluster();
  if (process.env.CI === "true" && fs.existsSync(JSON_PATH) && fs.existsSync(MD_PATH)) {
    console.log("CI environment detected; preserving committed Frontier integration artifacts to avoid public RPC rate limits.");
    return;
  }

  const readNode = new PrivateDaoReadNode({ rpcEndpoints: resolveRuntimeRpcEndpointsSafe(activeCluster) });
  const proposals = await readNode.fetchProposals({ force: false });
  if (proposals.length === 0 && fs.existsSync(JSON_PATH) && fs.existsSync(MD_PATH)) {
    console.log(
      "No indexed proposals returned from the current cluster; preserving committed Frontier integration artifacts.",
    );
    return;
  }

  const [runtime, overview, magicblock] = await Promise.all([
    readNode.getRuntimeSnapshot(false),
    readNode.getOpsOverview(false),
    readNode.getMagicBlockRuntime(false),
  ]);

  const simpleProposal =
    proposals.find((proposal) => proposal.pubkey === proof.proposal) ??
    proposals.find((proposal) => !proposal.confidentialPayoutPlan) ??
    proposals[0];
  if (!simpleProposal) {
    throw new Error("missing live proposal for Frontier integration build");
  }
  const simpleProposalSource =
    simpleProposal.pubkey === proof.proposal ? "proof-registry" : "live-read-node-fallback";
  const effectiveProgramId = runtime.programId || proof.programId;
  const effectiveDao = simpleProposal.dao;
  const effectiveTreasury = deriveTreasuryAddress(effectiveDao, effectiveProgramId);

  const confidentialCapture = magicBlockRuntime.captures.find((capture) => capture.executeTxSignature) ?? magicBlockRuntime.captures[0];
  const capturedConfidentialProposal = confidentialCapture
    ? proposals.find((proposal) => proposal.pubkey === confidentialCapture.proposalPublicKey)
    : null;
  const confidentialProposal =
    capturedConfidentialProposal ??
    proposals.find(
      (proposal) =>
        proposal.confidentialPayoutPlan &&
        proposal.refheEnvelope?.status === "Settled" &&
        proposal.magicblockCorridor?.status === "Settled",
    ) ??
    proposals.find(
      (proposal) =>
        proposal.confidentialPayoutPlan &&
        proposal.refheEnvelope &&
        proposal.magicblockCorridor,
    );
  if (!confidentialProposal) {
    throw new Error("missing live confidential proposal with REFHE and MagicBlock evidence for Frontier integration build");
  }
  const confidentialProposalSource = capturedConfidentialProposal
    ? "magicblock-runtime-capture"
    : "live-read-node-fallback";
  if (!confidentialProposal.confidentialPayoutPlan) {
    throw new Error("confidential proposal is missing payout plan in read-node view");
  }
  if (!confidentialProposal.refheEnvelope) {
    throw new Error("confidential proposal is missing REFHE envelope in read-node view");
  }
  if (!confidentialProposal.magicblockCorridor) {
    throw new Error("confidential proposal is missing MagicBlock corridor in read-node view");
  }

  const rpcEndpoints = resolveRuntimeRpcEndpointsSafe(activeCluster);
  const connectionEndpoints = [runtime.rpcEndpoint, ...rpcEndpoints].filter(Boolean).filter((value, index, arr) => arr.indexOf(value) === index);

  const simpleTxChecks = await verifyTxMap(
    connectionEndpoints,
    Object.entries(proof.transactions)
      .filter(([, signature]) => signature && !signature.startsWith("reused-"))
      .map(([label, signature]) => ({ label, signature })),
  );

  const confidentialTxChecks = await verifyTxMap(connectionEndpoints, [
    { label: "magicblock-deposit", signature: confidentialCapture?.depositTxSignature },
    { label: "magicblock-private-transfer", signature: confidentialCapture?.transferTxSignature },
    { label: "magicblock-withdraw", signature: confidentialCapture?.withdrawTxSignature },
    { label: "magicblock-settle", signature: confidentialCapture?.settleTxSignature },
    { label: "magicblock-execute", signature: confidentialCapture?.executeTxSignature },
  ]);

  const zkAnchorChecks = await verifyZkAnchors(connectionEndpoints, zkProof);

  const accountChecks = await verifyAccounts(connectionEndpoints, [
    { label: "program", pubkey: effectiveProgramId },
    { label: "simple-dao", pubkey: effectiveDao },
    { label: "simple-treasury", pubkey: effectiveTreasury },
    { label: "simple-proposal", pubkey: simpleProposal.pubkey },
    { label: "confidential-proposal", pubkey: confidentialProposal.pubkey },
    { label: "confidential-payout-plan", pubkey: confidentialProposal.confidentialPayoutPlan.pubkey },
    { label: "refhe-envelope", pubkey: confidentialProposal.refheEnvelope.pubkey },
    { label: "magicblock-corridor", pubkey: confidentialProposal.magicblockCorridor.pubkey },
  ]);

  const payload = {
    project: submission.project,
    generatedAt: new Date().toISOString(),
    network: activeCluster,
    programId: effectiveProgramId,
    verificationWallet: proof.verificationWallet,
    reviewerEntry: `${submission.frontend}proof/?judge=1`,
    readNode: {
      readPath: runtime.readPath,
      rpcEndpoint: runtime.rpcEndpoint,
      rpcPoolSize: runtime.rpcPoolSize,
      rpcProviderClass: classifyRpcEndpoint(runtime.rpcEndpoint),
      magicBlockApiBase: magicblock.apiBase,
      magicBlockHealth: magicblock.health,
      overview,
    },
    simpleGovernance: {
      dao: effectiveDao,
      treasury: effectiveTreasury,
      proofRegistryDao: proof.dao,
      proofRegistryTreasury: proof.treasury,
      proposal: simpleProposal.pubkey,
      proposalSource: simpleProposalSource,
      proofRegistryProposal: proof.proposal,
      phase: simpleProposal.phase,
      lifecycleStatus: simpleProposal.status,
      accountChecks: accountChecks.filter((entry) => entry.label.startsWith("simple-") || entry.label === "program"),
      txChecks: simpleTxChecks,
      verificationStatus: simpleTxChecks.every((entry) => entry.confirmed)
        ? `verified-${activeCluster}-governance-path`
        : `degraded-${activeCluster}-governance-path`,
    },
    confidentialOperations: {
      proposal: confidentialProposal.pubkey,
      proposalSource: confidentialProposalSource,
      runtimeCaptureProposal: confidentialCapture?.proposalPublicKey ?? null,
      payoutPlan: confidentialProposal.confidentialPayoutPlan.pubkey,
      payoutStatus: confidentialProposal.confidentialPayoutPlan.status,
      refheEnvelope: confidentialProposal.refheEnvelope.pubkey,
      refheStatus: confidentialProposal.refheEnvelope.status,
      refheVerifierProgram: confidentialProposal.refheEnvelope.verifierProgram,
      magicblockCorridor: confidentialProposal.magicblockCorridor.pubkey,
      magicblockStatus: confidentialProposal.magicblockCorridor.status,
      settlementWallet: confidentialProposal.magicblockCorridor.settlementWallet,
      accountChecks: accountChecks.filter((entry) => !entry.label.startsWith("simple-") && entry.label !== "program"),
      txChecks: confidentialTxChecks,
      status:
        confidentialTxChecks.every((entry) => entry.confirmed) &&
        confidentialProposal.refheEnvelope.status === "Settled" &&
        confidentialProposal.magicblockCorridor.status === "Settled"
          ? `verified-${activeCluster}-confidential-path`
          : `degraded-${activeCluster}-confidential-path`,
    },
    zk: {
      verificationMode: zkProof.verification_mode,
      onchainVerifier: zkProof.onchain_verifier,
      proposal: zkProof.onchain_proof_anchors?.proposal_public_key ?? zkProof.proposal_public_key,
      anchorChecks: zkAnchorChecks,
      anchorCount: zkAnchorChecks.length,
      status:
        zkAnchorChecks.every((entry) => entry.confirmed && entry.account.exists)
          ? `proof-anchors-recorded-on-${activeCluster}`
          : "proof-anchor-gap-detected",
    },
    docs: [
      "docs/runtime/devnet-feature-sweep-2026-04-06.md",
      "docs/magicblock/private-payments.md",
      "docs/magicblock/operator-flow.md",
      "docs/magicblock/runtime.generated.md",
      "docs/refhe-protocol.md",
      "docs/refhe-operator-flow.md",
      "docs/zk-proof-registry.json",
      "docs/zk-registry.generated.json",
      "docs/zk-standalone-verifier-testnet-2026-05-23.md",
      "docs/read-node/snapshot.generated.md",
      "docs/read-node/ops.generated.md",
      "docs/rpc-architecture.md",
    ],
    commands: [
      "npm run build:frontier-integrations",
      "npm run verify:frontier-integrations",
      "npm run verify:read-node",
      "npm run verify:magicblock-runtime",
      "npm run verify:zk-registry",
      "npm run verify:all",
    ],
    notes: [
      `This package verifies live ${activeCluster} transaction and account evidence for the current Frontier-facing integrations.`,
      "ZK remains proof-anchored and threshold-attested rather than verifier-CPI complete.",
      `MagicBlock and REFHE are proposal-bound and runtime-evidenced on ${activeCluster}; source-verifiable external receipts remain a mainnet blocker.`,
      "RPC Fast readiness is shown through backend-indexer mode, pooled RPC endpoints, and the current managed-provider classification when present.",
    ],
  };

  fs.writeFileSync(JSON_PATH, JSON.stringify(payload, null, 2) + "\n");
  fs.writeFileSync(MD_PATH, buildMarkdown(payload));
  console.log("Wrote Frontier integration evidence package");
}

function deriveTreasuryAddress(dao: string, programId: string) {
  const [treasury] = PublicKey.findProgramAddressSync(
    [Buffer.from("treasury"), new PublicKey(dao).toBuffer()],
    new PublicKey(programId),
  );
  return treasury.toBase58();
}

async function verifyTxMap(endpoints: string[], entries: Array<{ label: string; signature?: string | null }>): Promise<TxCheck[]> {
  const checks: TxCheck[] = [];
  for (const entry of entries) {
    if (!entry.signature) continue;
    const signature = entry.signature as string;
    const status = await verifyTxStatus(endpoints, entry.label, signature);
    checks.push(status);
  }
  return checks;
}

async function verifyTxStatus(endpoints: string[], label: string, signature: string): Promise<TxCheck> {
  try {
    return await withConnectionFallback(endpoints, async (connection, endpoint) => {
      const response = await connection.getSignatureStatuses([signature], { searchTransactionHistory: true });
      const value = response.value[0];
      if (!value || value.err) {
        return null;
      }
      const confirmationStatus = value.confirmationStatus || "processed";
      return {
        label,
        signature,
        endpoint,
        status: confirmationStatus,
        slot: value.slot,
        confirmed: confirmationStatus === "confirmed" || confirmationStatus === "finalized",
      } satisfies TxCheck;
    });
  } catch {
    return {
      label,
      signature,
      endpoint: "unavailable",
      status: "not-returned-by-current-rpc",
      slot: 0,
      confirmed: false,
    };
  }
}

async function verifyZkAnchors(
  endpoints: string[],
  registry: ZkProofRegistry,
): Promise<Array<TxCheck & { layer: string; anchorPda: string; account: AccountCheck }>> {
  const anchors = registry.onchain_proof_anchors?.entries ?? [];
  const checks: Array<TxCheck & { layer: string; anchorPda: string; account: AccountCheck }> = [];
  for (const entry of anchors) {
    const [tx, account] = await Promise.all([
      verifyTxStatus(endpoints, `zk-anchor-${entry.layer}`, entry.tx_signature),
      verifyAccount(endpoints, `zk-anchor-account-${entry.layer}`, entry.anchor_pda),
    ]);
    checks.push({ ...tx, layer: entry.layer, anchorPda: entry.anchor_pda, account });
  }
  return checks;
}

async function verifyAccounts(endpoints: string[], entries: Array<{ label: string; pubkey: string }>): Promise<AccountCheck[]> {
  return Promise.all(entries.map((entry) => verifyAccount(endpoints, entry.label, entry.pubkey)));
}

async function verifyAccount(endpoints: string[], label: string, pubkey: string): Promise<AccountCheck> {
  try {
    return await withConnectionFallback(endpoints, async (connection, endpoint) => {
      const info = await connection.getAccountInfo(new PublicKey(pubkey), "confirmed");
      if (!info) {
        return null;
      }
      return {
        label,
        pubkey,
        endpoint,
        exists: true,
        executable: Boolean(info.executable),
      } satisfies AccountCheck;
    });
  } catch {
    return {
      label,
      pubkey,
      endpoint: "unavailable",
      exists: false,
      executable: false,
    };
  }
}

async function withConnectionFallback<T>(
  endpoints: string[],
  operation: (connection: Connection, endpoint: string) => Promise<T | null>,
): Promise<T> {
  const errors: string[] = [];
  for (const endpoint of endpoints) {
    try {
      const connection = new Connection(endpoint, "confirmed");
      const result = await Promise.race<T | null>([
        operation(connection, endpoint),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 12_000)),
      ]);
      if (result) {
        return result;
      }
      errors.push(`${endpoint}: no result`);
    } catch (error) {
      errors.push(`${endpoint}: ${String((error as Error)?.message || error)}`);
    }
  }
  throw new Error(`unable to verify frontier integration evidence: ${errors.join(" | ")}`);
}

function classifyRpcEndpoint(endpoint: string) {
  const normalized = endpoint.toLowerCase();
  if (normalized.includes("alchemy")) return "rpc-fast-alchemy";
  if (normalized.includes("helius")) return "rpc-fast-helius";
  if (normalized.includes("quicknode")) return "rpc-fast-quicknode";
  if (normalized.includes("api.testnet.solana.com")) return "public-testnet";
  if (normalized.includes("api.devnet.solana.com")) return "public-devnet";
  return "custom-rpc";
}

function buildMarkdown(payload: {
  project: string;
  generatedAt: string;
  network: string;
  programId: string;
  verificationWallet: string;
  reviewerEntry: string;
  readNode: {
    readPath: string;
    rpcEndpoint: string;
    rpcPoolSize: number;
    rpcProviderClass: string;
    magicBlockApiBase: string;
    magicBlockHealth: string;
    overview: { proposals: number; zkEnforced: number; confidentialPayouts: number; magicblockSettled: number; refheSettled: number };
  };
  simpleGovernance: {
    dao: string;
    treasury: string;
    proofRegistryDao: string;
    proofRegistryTreasury: string;
    proposal: string;
    proposalSource: string;
    proofRegistryProposal: string;
    phase: string;
    lifecycleStatus: string;
    txChecks: TxCheck[];
    verificationStatus: string;
  };
  confidentialOperations: {
    proposal: string;
    proposalSource: string;
    runtimeCaptureProposal: string | null;
    payoutPlan: string;
    payoutStatus: string;
    refheEnvelope: string;
    refheStatus: string;
    refheVerifierProgram: string | null;
    magicblockCorridor: string;
    magicblockStatus: string;
    settlementWallet: string;
    txChecks: TxCheck[];
    status: string;
  };
  zk: {
    verificationMode: string;
    onchainVerifier: boolean;
    proposal: string;
    anchorChecks: Array<TxCheck & { layer: string; anchorPda: string; account: AccountCheck }>;
    anchorCount: number;
    status: string;
  };
  docs: string[];
  commands: string[];
  notes: string[];
}) {
  return `# Frontier Integration Evidence

## Overview

- project: \`${payload.project}\`
- generated at: \`${payload.generatedAt}\`
- network: \`${payload.network}\`
- program id: \`${payload.programId}\`
- verification wallet: \`${payload.verificationWallet}\`
- judge entry: \`${payload.reviewerEntry}\`

## RPC Fast / Read Node

- read path: \`${payload.readNode.readPath}\`
- rpc endpoint: \`${payload.readNode.rpcEndpoint}\`
- rpc pool size: \`${payload.readNode.rpcPoolSize}\`
- rpc provider class: \`${payload.readNode.rpcProviderClass}\`
- MagicBlock API base: \`${payload.readNode.magicBlockApiBase}\`
- MagicBlock health: \`${payload.readNode.magicBlockHealth}\`
- indexed proposals: \`${payload.readNode.overview.proposals}\`
- indexed zk_enforced proposals: \`${payload.readNode.overview.zkEnforced}\`
- indexed confidential payout proposals: \`${payload.readNode.overview.confidentialPayouts}\`
- indexed MagicBlock-settled proposals: \`${payload.readNode.overview.magicblockSettled}\`
- indexed REFHE-settled proposals: \`${payload.readNode.overview.refheSettled}\`

## Simple Governance Path

- dao: \`${payload.simpleGovernance.dao}\`
- treasury: \`${payload.simpleGovernance.treasury}\`
- proposal: \`${payload.simpleGovernance.proposal}\`
- proposal source: \`${payload.simpleGovernance.proposalSource}\`
- proof-registry proposal: \`${payload.simpleGovernance.proofRegistryProposal}\`
- phase: \`${payload.simpleGovernance.phase}\`
- lifecycle status: \`${payload.simpleGovernance.lifecycleStatus}\`
- verification status: \`${payload.simpleGovernance.verificationStatus}\`

${payload.simpleGovernance.txChecks.map((entry) => `- ${entry.label}: \`${entry.signature}\` | \`${entry.status}\` | endpoint=\`${entry.endpoint}\``).join("\n")}

## Confidential MagicBlock + REFHE Path

- proposal: \`${payload.confidentialOperations.proposal}\`
- proposal source: \`${payload.confidentialOperations.proposalSource}\`
- runtime capture proposal: \`${payload.confidentialOperations.runtimeCaptureProposal ?? "none"}\`
- payout plan: \`${payload.confidentialOperations.payoutPlan}\`
- payout status: \`${payload.confidentialOperations.payoutStatus}\`
- REFHE envelope: \`${payload.confidentialOperations.refheEnvelope}\`
- REFHE status: \`${payload.confidentialOperations.refheStatus}\`
- REFHE verifier program: \`${payload.confidentialOperations.refheVerifierProgram || "none"}\`
- MagicBlock corridor: \`${payload.confidentialOperations.magicblockCorridor}\`
- MagicBlock corridor status: \`${payload.confidentialOperations.magicblockStatus}\`
- settlement wallet: \`${payload.confidentialOperations.settlementWallet}\`
- verification status: \`${payload.confidentialOperations.status}\`

${payload.confidentialOperations.txChecks.map((entry) => `- ${entry.label}: \`${entry.signature}\` | \`${entry.status}\` | endpoint=\`${entry.endpoint}\``).join("\n")}

## ZK Anchor Path

- verification mode: \`${payload.zk.verificationMode}\`
- on-chain verifier CPI: \`${payload.zk.onchainVerifier}\`
- proposal: \`${payload.zk.proposal}\`
- anchor count: \`${payload.zk.anchorCount}\`
- verification status: \`${payload.zk.status}\`

${payload.zk.anchorChecks.map((entry) => `- ${entry.layer}: tx=\`${entry.signature}\` | anchor=\`${entry.anchorPda}\` | tx-status=\`${entry.status}\` | anchor-exists=\`${entry.account.exists}\``).join("\n")}

## Required Docs

${payload.docs.map((doc) => `- \`${doc}\``).join("\n")}

## Commands

${payload.commands.map((command) => `- \`${command}\``).join("\n")}

## Honest Boundary

${payload.notes.map((note) => `- ${note}`).join("\n")}
`;
}

function readJson<T>(relativePath: string): T {
  return JSON.parse(fs.readFileSync(path.resolve(relativePath), "utf8")) as T;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
