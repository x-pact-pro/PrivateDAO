"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const web3_js_1 = require("@solana/web3.js");
const read_node_1 = require("./lib/read-node");
async function main() {
    const proof = readJson("docs/proof-registry.json");
    const zkProof = readJson("docs/zk-proof-registry.json");
    const magicBlockRuntime = readJson("docs/magicblock/runtime.generated.json");
    const submission = readJson("docs/submission-registry.json");
    const readNode = new read_node_1.PrivateDaoReadNode();
    const [runtime, overview, magicblock, simpleProposal] = await Promise.all([
        readNode.getRuntimeSnapshot(false),
        readNode.getOpsOverview(false),
        readNode.getMagicBlockRuntime(false),
        readNode.fetchProposal(proof.proposal),
    ]);
    const confidentialCapture = magicBlockRuntime.captures.find((capture) => capture.executeTxSignature) ?? magicBlockRuntime.captures[0];
    if (!confidentialCapture) {
        throw new Error("missing MagicBlock runtime capture for Frontier integration build");
    }
    const confidentialProposal = await readNode.fetchProposal(confidentialCapture.proposalPublicKey);
    if (!confidentialProposal.confidentialPayoutPlan) {
        throw new Error("confidential proposal is missing payout plan in read-node view");
    }
    if (!confidentialProposal.refheEnvelope) {
        throw new Error("confidential proposal is missing REFHE envelope in read-node view");
    }
    if (!confidentialProposal.magicblockCorridor) {
        throw new Error("confidential proposal is missing MagicBlock corridor in read-node view");
    }
    const rpcEndpoints = (0, read_node_1.resolveDevnetRpcEndpoints)();
    const connectionEndpoints = [runtime.rpcEndpoint, ...rpcEndpoints].filter(Boolean).filter((value, index, arr) => arr.indexOf(value) === index);
    const simpleTxChecks = await verifyTxMap(connectionEndpoints, Object.entries(proof.transactions)
        .filter(([, signature]) => signature && !signature.startsWith("reused-"))
        .map(([label, signature]) => ({ label, signature })));
    const confidentialTxChecks = await verifyTxMap(connectionEndpoints, [
        { label: "magicblock-deposit", signature: confidentialCapture.depositTxSignature },
        { label: "magicblock-private-transfer", signature: confidentialCapture.transferTxSignature },
        { label: "magicblock-withdraw", signature: confidentialCapture.withdrawTxSignature },
        { label: "magicblock-settle", signature: confidentialCapture.settleTxSignature },
        { label: "magicblock-execute", signature: confidentialCapture.executeTxSignature },
    ]);
    const zkAnchorChecks = await verifyZkAnchors(connectionEndpoints, zkProof);
    const accountChecks = await verifyAccounts(connectionEndpoints, [
        { label: "program", pubkey: proof.programId },
        { label: "simple-dao", pubkey: proof.dao },
        { label: "simple-treasury", pubkey: proof.treasury },
        { label: "simple-proposal", pubkey: proof.proposal },
        { label: "confidential-proposal", pubkey: confidentialProposal.pubkey },
        { label: "confidential-payout-plan", pubkey: confidentialProposal.confidentialPayoutPlan.pubkey },
        { label: "refhe-envelope", pubkey: confidentialProposal.refheEnvelope.pubkey },
        { label: "magicblock-corridor", pubkey: confidentialProposal.magicblockCorridor.pubkey },
    ]);
    const payload = {
        project: submission.project,
        generatedAt: new Date().toISOString(),
        network: "devnet",
        programId: proof.programId,
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
            dao: proof.dao,
            treasury: proof.treasury,
            proposal: proof.proposal,
            phase: simpleProposal.phase,
            lifecycleStatus: simpleProposal.status,
            accountChecks: accountChecks.filter((entry) => entry.label.startsWith("simple-") || entry.label === "program"),
            txChecks: simpleTxChecks,
            verificationStatus: simpleTxChecks.every((entry) => entry.confirmed) ? "verified-devnet-governance-path" : "degraded-devnet-governance-path",
        },
        confidentialOperations: {
            proposal: confidentialProposal.pubkey,
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
            status: confidentialTxChecks.every((entry) => entry.confirmed) &&
                confidentialProposal.refheEnvelope.status === "Settled" &&
                confidentialProposal.magicblockCorridor.status === "Settled"
                ? "verified-devnet-confidential-path"
                : "degraded-devnet-confidential-path",
        },
        zk: {
            verificationMode: zkProof.verification_mode,
            onchainVerifier: zkProof.onchain_verifier,
            proposal: zkProof.onchain_proof_anchors?.proposal_public_key ?? zkProof.proposal_public_key,
            anchorChecks: zkAnchorChecks,
            anchorCount: zkAnchorChecks.length,
            status: zkAnchorChecks.every((entry) => entry.confirmed && entry.account.exists) ? "proof-anchors-recorded-on-devnet" : "proof-anchor-gap-detected",
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
            "This package verifies live Devnet transaction and account evidence for the current Frontier-facing integrations.",
            "ZK remains proof-anchored and threshold-attested rather than verifier-CPI complete.",
            "MagicBlock and REFHE are proposal-bound and runtime-evidenced on Testnet; the remaining mainnet work is verifier CPI or externally audited residual-trust acceptance, not missing Testnet activation.",
            "RPC Fast readiness is shown through backend-indexer mode, pooled RPC endpoints, and the current managed-provider classification when present.",
        ],
    };
    fs_1.default.writeFileSync(path_1.default.resolve("docs/frontier-integrations.generated.json"), JSON.stringify(payload, null, 2) + "\n");
    fs_1.default.writeFileSync(path_1.default.resolve("docs/frontier-integrations.generated.md"), buildMarkdown(payload));
    console.log("Wrote Frontier integration evidence package");
}
async function verifyTxMap(endpoints, entries) {
    const checks = [];
    for (const entry of entries) {
        if (!entry.signature)
            continue;
        const signature = entry.signature;
        const status = await withConnectionFallback(endpoints, async (connection, endpoint) => {
            const response = await connection.getSignatureStatuses([signature], { searchTransactionHistory: true });
            const value = response.value[0];
            if (!value || value.err) {
                return null;
            }
            const confirmationStatus = value.confirmationStatus || "processed";
            return {
                label: entry.label,
                signature,
                endpoint,
                status: confirmationStatus,
                slot: value.slot,
                confirmed: confirmationStatus === "confirmed" || confirmationStatus === "finalized",
            };
        });
        checks.push(status);
    }
    return checks;
}
async function verifyZkAnchors(endpoints, registry) {
    const anchors = registry.onchain_proof_anchors?.entries ?? [];
    const checks = [];
    for (const entry of anchors) {
        const [tx, account] = await Promise.all([
            withConnectionFallback(endpoints, async (connection, endpoint) => {
                const response = await connection.getSignatureStatuses([entry.tx_signature], { searchTransactionHistory: true });
                const value = response.value[0];
                if (!value || value.err) {
                    return null;
                }
                const confirmationStatus = value.confirmationStatus || "processed";
                return {
                    label: `zk-anchor-${entry.layer}`,
                    signature: entry.tx_signature,
                    endpoint,
                    status: confirmationStatus,
                    slot: value.slot,
                    confirmed: confirmationStatus === "confirmed" || confirmationStatus === "finalized",
                };
            }),
            verifyAccount(endpoints, `zk-anchor-account-${entry.layer}`, entry.anchor_pda),
        ]);
        checks.push({ ...tx, layer: entry.layer, anchorPda: entry.anchor_pda, account });
    }
    return checks;
}
async function verifyAccounts(endpoints, entries) {
    return Promise.all(entries.map((entry) => verifyAccount(endpoints, entry.label, entry.pubkey)));
}
async function verifyAccount(endpoints, label, pubkey) {
    return withConnectionFallback(endpoints, async (connection, endpoint) => {
        const info = await connection.getAccountInfo(new web3_js_1.PublicKey(pubkey), "confirmed");
        if (!info) {
            return null;
        }
        return {
            label,
            pubkey,
            endpoint,
            exists: true,
            executable: Boolean(info.executable),
        };
    });
}
async function withConnectionFallback(endpoints, operation) {
    const errors = [];
    for (const endpoint of endpoints) {
        try {
            const connection = new web3_js_1.Connection(endpoint, "confirmed");
            const result = await Promise.race([
                operation(connection, endpoint),
                new Promise((resolve) => setTimeout(() => resolve(null), 12000)),
            ]);
            if (result) {
                return result;
            }
            errors.push(`${endpoint}: no result`);
        }
        catch (error) {
            errors.push(`${endpoint}: ${String(error?.message || error)}`);
        }
    }
    throw new Error(`unable to verify frontier integration evidence: ${errors.join(" | ")}`);
}
function classifyRpcEndpoint(endpoint) {
    const normalized = endpoint.toLowerCase();
    if (normalized.includes("alchemy"))
        return "rpc-fast-alchemy";
    if (normalized.includes("helius"))
        return "rpc-fast-helius";
    if (normalized.includes("quicknode"))
        return "rpc-fast-quicknode";
    if (normalized.includes("api.devnet.solana.com"))
        return "public-devnet";
    return "custom-devnet";
}
function buildMarkdown(payload) {
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

- proposal: \`${payload.simpleGovernance.proposal}\`
- phase: \`${payload.simpleGovernance.phase}\`
- lifecycle status: \`${payload.simpleGovernance.lifecycleStatus}\`
- verification status: \`${payload.simpleGovernance.verificationStatus}\`

${payload.simpleGovernance.txChecks.map((entry) => `- ${entry.label}: \`${entry.signature}\` | \`${entry.status}\` | endpoint=\`${entry.endpoint}\``).join("\n")}

## Confidential MagicBlock + REFHE Path

- proposal: \`${payload.confidentialOperations.proposal}\`
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
function readJson(relativePath) {
    return JSON.parse(fs_1.default.readFileSync(path_1.default.resolve(relativePath), "utf8"));
}
main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
});
