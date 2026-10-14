"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runMultiProposalPhase = runMultiProposalPhase;
exports.runRacePhase = runRacePhase;
exports.runExtendedAll = runExtendedAll;
const anchor = __importStar(require("@coral-xyz/anchor"));
const anchor_1 = require("@coral-xyz/anchor");
const web3_js_1 = require("@solana/web3.js");
const spl_token_1 = require("@solana/spl-token");
const crypto_1 = __importDefault(require("crypto"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const utils_1 = require("../utils");
const COMMITMENT = "confirmed";
const PROGRAM_ID = new web3_js_1.PublicKey("5AhUsbQ4mJ8Xh7QJEomuS85qGgmK9iNvFqzF669Y7Psx");
const PDAO_MINT = new web3_js_1.PublicKey("");
const DEFAULT_COORDINATOR_WALLET = "/home/x-pact/Desktop/wallet-keypair.json";
const DEFAULT_DEVNET_RPC = process.env.ANCHOR_PROVIDER_URL ||
    process.env.SOLANA_RPC_URL ||
    process.env.SOLANA_URL ||
    "https://api.devnet.solana.com";
const REPO_ROOT = path_1.default.resolve(__dirname, "..", "..");
const IDL_PATH = path_1.default.join(REPO_ROOT, "target", "idl", "private_dao.json");
const BASE_STATE_PATH = path_1.default.join(REPO_ROOT, "scripts", "generated-wallets", "load-test-state.json");
const EXT_STATE_PATH = path_1.default.join(REPO_ROOT, "scripts", "generated-wallets", "extended-state.json");
const DOCS_MULTI_JSON = path_1.default.join(REPO_ROOT, "docs", "devnet-multi-proposal-report.json");
const DOCS_MULTI_MD = path_1.default.join(REPO_ROOT, "docs", "devnet-multi-proposal-report.md");
const DOCS_RACE_JSON = path_1.default.join(REPO_ROOT, "docs", "devnet-race-report.json");
const DOCS_RACE_MD = path_1.default.join(REPO_ROOT, "docs", "devnet-race-report.md");
const MULTI_VOTING_SECONDS = 50;
const MULTI_REVEAL_SECONDS = 60;
const MULTI_EXECUTION_DELAY = 6;
const MULTI_TREASURY_DEPOSIT = Math.floor(0.24 * web3_js_1.LAMPORTS_PER_SOL);
const MULTI_TRANSFER = Math.floor(0.02 * web3_js_1.LAMPORTS_PER_SOL);
const RACE_VOTING_SECONDS = 15;
const RACE_REVEAL_SECONDS = 10;
const RACE_EXECUTION_DELAY = 5;
const RACE_TREASURY_DEPOSIT = Math.floor(0.12 * web3_js_1.LAMPORTS_PER_SOL);
const RACE_TRANSFER = Math.floor(0.015 * web3_js_1.LAMPORTS_PER_SOL);
const TX_DELAY_MS = 1100;
function nowIso() {
    return new Date().toISOString();
}
function stableJson(value) {
    return JSON.stringify(value, null, 2) + "\n";
}
function ensureDir(dirPath) {
    fs_1.default.mkdirSync(dirPath, { recursive: true });
}
function writeJson(filePath, value) {
    ensureDir(path_1.default.dirname(filePath));
    fs_1.default.writeFileSync(filePath, stableJson(value), "utf8");
}
function readJson(filePath) {
    return JSON.parse(fs_1.default.readFileSync(filePath, "utf8"));
}
function loadKeypair(filePath) {
    const secret = Uint8Array.from(JSON.parse(fs_1.default.readFileSync(filePath, "utf8")));
    return web3_js_1.Keypair.fromSecretKey(secret);
}
function createConnection() {
    return new web3_js_1.Connection(DEFAULT_DEVNET_RPC, COMMITMENT);
}
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
function formatError(error) {
    if (error instanceof Error) {
        return error.message;
    }
    if (error && typeof error === "object") {
        const maybeAnchor = error;
        const code = maybeAnchor.error?.errorCode?.code;
        const message = maybeAnchor.error?.errorMessage || maybeAnchor.message;
        if (code && message) {
            return `${code}: ${message}`;
        }
        if (message) {
            return message;
        }
        if (maybeAnchor.logs?.length) {
            return maybeAnchor.logs.join(" | ");
        }
        try {
            return JSON.stringify(error);
        }
        catch {
            return "[object error]";
        }
    }
    return String(error);
}
function getCoordinatorWalletPath() {
    return process.env.DEVNET_COORDINATOR_WALLET || process.env.ANCHOR_WALLET || DEFAULT_COORDINATOR_WALLET;
}
function loadIdl() {
    return JSON.parse(fs_1.default.readFileSync(IDL_PATH, "utf8"));
}
function createProgram(connection, keypair) {
    const wallet = new anchor.Wallet(keypair);
    const provider = new anchor.AnchorProvider(connection, wallet, {
        commitment: COMMITMENT,
        preflightCommitment: COMMITMENT,
    });
    return new anchor.Program(loadIdl(), provider);
}
function proposalPdaFor(dao, proposalId) {
    const idBn = proposalId instanceof anchor_1.BN ? proposalId : new anchor_1.BN(typeof proposalId === "bigint" ? proposalId.toString() : proposalId);
    return web3_js_1.PublicKey.findProgramAddressSync([Buffer.from("proposal"), dao.toBuffer(), idBn.toArrayLike(Buffer, "le", 8)], PROGRAM_ID)[0];
}
function voteRecordPdaFor(proposal, voter) {
    return web3_js_1.PublicKey.findProgramAddressSync([Buffer.from("vote"), proposal.toBuffer(), voter.toBuffer()], PROGRAM_ID)[0];
}
function delegationPdaFor(proposal, delegator) {
    return web3_js_1.PublicKey.findProgramAddressSync([Buffer.from("delegation"), proposal.toBuffer(), delegator.toBuffer()], PROGRAM_ID)[0];
}
function treasuryPdaFor(dao) {
    return web3_js_1.PublicKey.findProgramAddressSync([Buffer.from("treasury"), dao.toBuffer()], PROGRAM_ID)[0];
}
async function withRetry(label, fn, maxAttempts = 3) {
    let attempt = 0;
    let lastError;
    while (attempt < maxAttempts) {
        try {
            return await fn();
        }
        catch (error) {
            lastError = error;
            attempt += 1;
            if (attempt >= maxAttempts)
                break;
            console.warn(`[extended-devnet] retry ${attempt}/${maxAttempts - 1} for ${label}: ${formatError(error)}`);
            await sleep(1200 * attempt);
        }
    }
    throw lastError instanceof Error ? lastError : new Error(String(lastError));
}
async function waitUntil(unix, label) {
    for (;;) {
        const now = Math.floor(Date.now() / 1000);
        if (now >= unix)
            return;
        const remaining = unix - now;
        console.log(`[extended-devnet] waiting for ${label}: ${remaining}s`);
        await sleep(Math.min(remaining, 5) * 1000);
    }
}
function loadBaseState() {
    const state = readJson(BASE_STATE_PATH);
    if (state.wallets.length < 35 || state.wallets.some((wallet) => !wallet.funding.success)) {
        throw new Error("base 50-wallet harness is not ready; run npm run test:devnet:all first");
    }
    return state;
}
function loadOrInitExtendedState() {
    const base = loadBaseState();
    if (fs_1.default.existsSync(EXT_STATE_PATH)) {
        return readJson(EXT_STATE_PATH);
    }
    return {
        version: 1,
        runLabel: nowIso().replace(/[-:.TZ]/g, "").slice(0, 14),
        network: "devnet",
        programId: PROGRAM_ID.toBase58(),
        governanceMint: PDAO_MINT.toBase58(),
        sourceWalletRunLabel: base.runLabel,
        wallets: base.wallets,
    };
}
function persistExtendedState(state) {
    writeJson(EXT_STATE_PATH, state);
}
function walletByIndex(state, walletIndex) {
    const wallet = state.wallets.find((candidate) => candidate.walletIndex === walletIndex);
    if (!wallet) {
        throw new Error(`missing wallet ${walletIndex}`);
    }
    return wallet;
}
async function initializeDaoForScenario(connection, daoName, quorum, revealSeconds, executionDelay, treasuryDeposit) {
    const coordinator = loadKeypair(getCoordinatorWalletPath());
    const program = createProgram(connection, coordinator);
    const [dao] = web3_js_1.PublicKey.findProgramAddressSync([Buffer.from("dao"), coordinator.publicKey.toBuffer(), Buffer.from(daoName)], PROGRAM_ID);
    const treasury = treasuryPdaFor(dao);
    const existing = await connection.getAccountInfo(dao, COMMITMENT);
    let createDaoTx = "";
    if (!existing) {
        createDaoTx = await withRetry(`create-dao-${daoName}`, async () => program.methods
            .initializeDao(daoName, quorum, new anchor_1.BN(0), new anchor_1.BN(revealSeconds), new anchor_1.BN(executionDelay), { tokenWeighted: {} })
            .accounts({
            dao,
            governanceToken: PDAO_MINT,
            authority: coordinator.publicKey,
            systemProgram: web3_js_1.SystemProgram.programId,
        })
            .rpc());
    }
    const depositTx = await withRetry(`deposit-${daoName}`, async () => program.methods
        .depositTreasury(new anchor_1.BN(treasuryDeposit))
        .accounts({
        dao,
        treasury,
        depositor: coordinator.publicKey,
        systemProgram: web3_js_1.SystemProgram.programId,
    })
        .rpc());
    return { dao, treasury, createDaoTx, depositTx };
}
async function createProposalForScenario(connection, dao, title, description, recipient, lamports, durationSeconds) {
    const coordinator = loadKeypair(getCoordinatorWalletPath());
    const program = createProgram(connection, coordinator);
    const daoAccount = await program.account.dao.fetch(dao);
    const proposal = proposalPdaFor(dao, daoAccount.proposalCount);
    const proposerTokenAccount = (0, spl_token_1.getAssociatedTokenAddressSync)(PDAO_MINT, coordinator.publicKey, false, spl_token_1.TOKEN_2022_PROGRAM_ID);
    const createProposalTx = await withRetry(`create-proposal-${title}`, async () => program.methods
        .createProposal(title, description, new anchor_1.BN(durationSeconds), {
        actionType: { sendSol: {} },
        amountLamports: new anchor_1.BN(lamports),
        recipient,
        tokenMint: null,
    })
        .accounts({
        dao,
        proposal,
        proposerTokenAccount,
        proposer: coordinator.publicKey,
        systemProgram: web3_js_1.SystemProgram.programId,
    })
        .rpc());
    const proposalAccount = await program.account.proposal.fetch(proposal);
    return { proposal, proposalId: proposalAccount.proposalId.toString(), createProposalTx };
}
async function commitVoteForProposal(connection, wallet, proposal, vote, salt) {
    const keypair = loadKeypair(wallet.keypairPath);
    const program = createProgram(connection, keypair);
    const proposalAccount = await program.account.proposal.fetch(proposal);
    const voterAta = (0, spl_token_1.getAssociatedTokenAddressSync)(PDAO_MINT, keypair.publicKey, false, spl_token_1.TOKEN_2022_PROGRAM_ID);
    const commitment = (0, utils_1.computeProposalCommitment)(vote, salt, keypair.publicKey, proposal);
    return withRetry(`commit-${proposal.toBase58()}-${wallet.walletIndex}`, async () => program.methods
        .commitVote([...commitment], null)
        .accounts({
        dao: proposalAccount.dao,
        proposal,
        voterRecord: voteRecordPdaFor(proposal, keypair.publicKey),
        delegationMarker: delegationPdaFor(proposal, keypair.publicKey),
        voterTokenAccount: voterAta,
        voter: keypair.publicKey,
        tokenProgram: spl_token_1.TOKEN_2022_PROGRAM_ID,
        systemProgram: web3_js_1.SystemProgram.programId,
    })
        .rpc());
}
async function revealVoteForProposal(connection, wallet, proposal, vote, salt) {
    const keypair = loadKeypair(wallet.keypairPath);
    const program = createProgram(connection, keypair);
    return withRetry(`reveal-${proposal.toBase58()}-${wallet.walletIndex}`, async () => program.methods
        .revealVote(vote, [...salt])
        .accounts({
        proposal,
        voterRecord: voteRecordPdaFor(proposal, keypair.publicKey),
        revealer: keypair.publicKey,
    })
        .rpc());
}
async function finalizeProposalForScenario(connection, proposal, dao) {
    const coordinator = loadKeypair(getCoordinatorWalletPath());
    const program = createProgram(connection, coordinator);
    return withRetry(`finalize-${proposal.toBase58()}`, async () => program.methods
        .finalizeProposal()
        .accounts({
        dao,
        proposal,
        finalizer: coordinator.publicKey,
    })
        .rpc());
}
async function executeProposalForScenario(connection, proposal, dao, treasury, recipient, executorWallet) {
    const program = createProgram(connection, executorWallet);
    return withRetry(`execute-${proposal.toBase58()}-${executorWallet.publicKey.toBase58()}`, async () => program.methods
        .executeProposal()
        .accounts({
        dao,
        proposal,
        treasury,
        treasuryRecipient: recipient,
        treasuryTokenAccount: executorWallet.publicKey,
        recipientTokenAccount: executorWallet.publicKey,
        executor: executorWallet.publicKey,
        tokenProgram: spl_token_1.TOKEN_2022_PROGRAM_ID,
        systemProgram: web3_js_1.SystemProgram.programId,
    })
        .rpc());
}
function txAttempt(walletPubkey, result) {
    if (result.status === "fulfilled") {
        return {
            walletPubkey,
            txSignature: result.value,
            explorerUrl: (0, utils_1.solscanTxUrl)(result.value),
            status: "success",
        };
    }
    return {
        walletPubkey,
        status: "rejected",
        error: formatError(result.reason),
    };
}
function writeMarkdown(filePath, body) {
    fs_1.default.writeFileSync(filePath, body.endsWith("\n") ? body : `${body}\n`, "utf8");
}
async function runMultiProposalPhase(connection = createConnection()) {
    const state = loadOrInitExtendedState();
    if (state.multi?.summary.executedCount === 3 && state.multi.summary.unexpectedSuccesses === 0) {
        persistExtendedState(state);
        return state;
    }
    const { dao, treasury, createDaoTx, depositTx } = await initializeDaoForScenario(connection, `PDAOMulti${state.runLabel.slice(-8)}`, 50, MULTI_REVEAL_SECONDS, MULTI_EXECUTION_DELAY, MULTI_TREASURY_DEPOSIT);
    const recipientA = new web3_js_1.PublicKey(walletByIndex(state, 1).publicKey);
    const recipientB = new web3_js_1.PublicKey(walletByIndex(state, 2).publicKey);
    const recipientC = new web3_js_1.PublicKey(walletByIndex(state, 3).publicKey);
    const proposalA = await createProposalForScenario(connection, dao, "Multi proposal A", "Cross-proposal isolation lane A", recipientA, MULTI_TRANSFER, MULTI_VOTING_SECONDS);
    const proposalB = await createProposalForScenario(connection, dao, "Multi proposal B", "Cross-proposal isolation lane B", recipientB, MULTI_TRANSFER, MULTI_VOTING_SECONDS);
    const proposalC = await createProposalForScenario(connection, dao, "Multi proposal C", "Cross-proposal isolation lane C", recipientC, MULTI_TRANSFER, MULTI_VOTING_SECONDS);
    const assignment = [
        { run: proposalA, wallets: [1, 2, 3, 19], votes: [true, true, true, true], recipient: recipientA },
        { run: proposalB, wallets: [11, 12, 13, 19], votes: [true, true, true, true], recipient: recipientB },
        { run: proposalC, wallets: [21, 22, 23, 20], votes: [true, true, true, true], recipient: recipientC },
    ];
    const salts = new Map();
    const proposals = [];
    for (const lane of assignment) {
        const commitTxs = [];
        for (let i = 0; i < lane.wallets.length; i += 1) {
            const wallet = walletByIndex(state, lane.wallets[i]);
            const salt = crypto_1.default.randomBytes(32);
            salts.set(`${lane.run.proposal.toBase58()}:${wallet.walletIndex}`, salt);
            commitTxs.push(await commitVoteForProposal(connection, wallet, lane.run.proposal, lane.votes[i], salt));
            await sleep(300);
        }
        proposals.push({
            label: `proposal-${lane.run.proposalId}`,
            recipient: lane.recipient.toBase58(),
            proposalPublicKey: lane.run.proposal.toBase58(),
            proposalId: lane.run.proposalId,
            createProposalTx: lane.run.createProposalTx,
            commitTxs,
            revealTxs: [],
            finalizeTx: "",
            executeTx: "",
            commitWallets: lane.wallets.map((walletIndex) => walletByIndex(state, walletIndex).publicKey),
            revealWallets: [],
        });
    }
    const coordinator = loadKeypair(getCoordinatorWalletPath());
    const coordinatorProgram = createProgram(connection, coordinator);
    const proposalSnapshots = await Promise.all([proposalA.proposal, proposalB.proposal, proposalC.proposal].map((proposal) => coordinatorProgram.account.proposal.fetch(proposal)));
    const revealWindowOpensAt = Math.max(...proposalSnapshots.map((proposal) => proposal.votingEnd.toNumber())) + 1;
    await waitUntil(revealWindowOpensAt, "multi-proposal reveal window");
    const adversarial = [];
    const crossWallet = walletByIndex(state, 19);
    try {
        await revealVoteForProposal(connection, crossWallet, proposalB.proposal, false, salts.get(`${proposalA.proposal.toBase58()}:${crossWallet.walletIndex}`));
        adversarial.push({
            id: "cross-proposal-reveal-a-into-b",
            scenario: "reveal proposal B with proposal A salt",
            walletPubkey: crossWallet.publicKey,
            targetProposal: proposalB.proposal.toBase58(),
            outcome: "unexpected-success",
            error: "unexpected cross-proposal reveal success",
        });
    }
    catch (error) {
        adversarial.push({
            id: "cross-proposal-reveal-a-into-b",
            scenario: "reveal proposal B with proposal A salt",
            walletPubkey: crossWallet.publicKey,
            targetProposal: proposalB.proposal.toBase58(),
            outcome: "rejected",
            error: String(error),
        });
    }
    const wrongRecordWallet = walletByIndex(state, 24);
    const wrongRecordKeypair = loadKeypair(wrongRecordWallet.keypairPath);
    const wrongRecordProgram = createProgram(connection, wrongRecordKeypair);
    const wrongRecordSalt = crypto_1.default.randomBytes(32);
    const wrongRecordCommitment = (0, utils_1.computeProposalCommitment)(true, wrongRecordSalt, wrongRecordKeypair.publicKey, proposalB.proposal);
    try {
        await wrongRecordProgram.methods
            .commitVote([...wrongRecordCommitment], null)
            .accounts({
            dao,
            proposal: proposalB.proposal,
            voterRecord: voteRecordPdaFor(proposalA.proposal, wrongRecordKeypair.publicKey),
            delegationMarker: delegationPdaFor(proposalB.proposal, wrongRecordKeypair.publicKey),
            voterTokenAccount: (0, spl_token_1.getAssociatedTokenAddressSync)(PDAO_MINT, wrongRecordKeypair.publicKey, false, spl_token_1.TOKEN_2022_PROGRAM_ID),
            voter: wrongRecordKeypair.publicKey,
            tokenProgram: spl_token_1.TOKEN_2022_PROGRAM_ID,
            systemProgram: web3_js_1.SystemProgram.programId,
        })
            .rpc();
        adversarial.push({
            id: "cross-proposal-voter-record",
            scenario: "commit with proposal A voter record against proposal B",
            walletPubkey: wrongRecordWallet.publicKey,
            targetProposal: proposalB.proposal.toBase58(),
            outcome: "unexpected-success",
            error: "unexpected wrong-voter-record success",
        });
    }
    catch (error) {
        adversarial.push({
            id: "cross-proposal-voter-record",
            scenario: "commit with proposal A voter record against proposal B",
            walletPubkey: wrongRecordWallet.publicKey,
            targetProposal: proposalB.proposal.toBase58(),
            outcome: "rejected",
            error: String(error),
        });
    }
    const wrongDelegationWallet = walletByIndex(state, 25);
    const wrongDelegationKeypair = loadKeypair(wrongDelegationWallet.keypairPath);
    const wrongDelegationProgram = createProgram(connection, wrongDelegationKeypair);
    const wrongDelegationSalt = crypto_1.default.randomBytes(32);
    const wrongDelegationCommitment = (0, utils_1.computeProposalCommitment)(true, wrongDelegationSalt, wrongDelegationKeypair.publicKey, proposalC.proposal);
    try {
        await wrongDelegationProgram.methods
            .commitVote([...wrongDelegationCommitment], null)
            .accounts({
            dao,
            proposal: proposalC.proposal,
            voterRecord: voteRecordPdaFor(proposalC.proposal, wrongDelegationKeypair.publicKey),
            delegationMarker: delegationPdaFor(proposalA.proposal, wrongDelegationKeypair.publicKey),
            voterTokenAccount: (0, spl_token_1.getAssociatedTokenAddressSync)(PDAO_MINT, wrongDelegationKeypair.publicKey, false, spl_token_1.TOKEN_2022_PROGRAM_ID),
            voter: wrongDelegationKeypair.publicKey,
            tokenProgram: spl_token_1.TOKEN_2022_PROGRAM_ID,
            systemProgram: web3_js_1.SystemProgram.programId,
        })
            .rpc();
        adversarial.push({
            id: "cross-proposal-delegation-marker",
            scenario: "commit with proposal A delegation marker against proposal C",
            walletPubkey: wrongDelegationWallet.publicKey,
            targetProposal: proposalC.proposal.toBase58(),
            outcome: "unexpected-success",
            error: "unexpected wrong-delegation-marker success",
        });
    }
    catch (error) {
        adversarial.push({
            id: "cross-proposal-delegation-marker",
            scenario: "commit with proposal A delegation marker against proposal C",
            walletPubkey: wrongDelegationWallet.publicKey,
            targetProposal: proposalC.proposal.toBase58(),
            outcome: "rejected",
            error: String(error),
        });
    }
    for (const lane of assignment) {
        for (let i = 0; i < lane.wallets.length; i += 1) {
            const wallet = walletByIndex(state, lane.wallets[i]);
            const salt = salts.get(`${lane.run.proposal.toBase58()}:${wallet.walletIndex}`);
            const tx = await revealVoteForProposal(connection, wallet, lane.run.proposal, lane.votes[i], salt);
            proposals.find((proposal) => proposal.proposalPublicKey === lane.run.proposal.toBase58()).revealTxs.push(tx);
            proposals.find((proposal) => proposal.proposalPublicKey === lane.run.proposal.toBase58()).revealWallets.push(wallet.publicKey);
            await sleep(250);
        }
    }
    const refreshedProposals = await Promise.all([proposalA.proposal, proposalB.proposal, proposalC.proposal].map((proposal) => coordinatorProgram.account.proposal.fetch(proposal)));
    const finalizeWindowOpensAt = Math.max(...refreshedProposals.map((proposal) => proposal.revealEnd.toNumber())) + 1;
    await waitUntil(finalizeWindowOpensAt, "multi-proposal finalize window");
    for (const lane of assignment) {
        const proposalRun = proposals.find((proposal) => proposal.proposalPublicKey === lane.run.proposal.toBase58());
        proposalRun.finalizeTx = await finalizeProposalForScenario(connection, lane.run.proposal, dao);
    }
    const finalizedSnapshots = await Promise.all([proposalA.proposal, proposalB.proposal, proposalC.proposal].map((proposal) => coordinatorProgram.account.proposal.fetch(proposal)));
    const executeWindowOpensAt = Math.max(...finalizedSnapshots.map((proposal) => proposal.executionUnlocksAt.toNumber())) + 1;
    await waitUntil(executeWindowOpensAt, "multi-proposal execution unlock");
    for (const lane of assignment) {
        const proposalRun = proposals.find((proposal) => proposal.proposalPublicKey === lane.run.proposal.toBase58());
        proposalRun.executeTx = await executeProposalForScenario(connection, lane.run.proposal, dao, treasury, lane.recipient, coordinator);
    }
    const summary = {
        proposalCount: proposals.length,
        executedCount: proposals.length,
        crossProposalRejections: adversarial.filter((entry) => entry.outcome === "rejected").length,
        unexpectedSuccesses: adversarial.filter((entry) => entry.outcome === "unexpected-success").length,
    };
    state.multi = {
        generatedAt: nowIso(),
        runLabel: state.runLabel,
        network: "devnet",
        sourceWalletRunLabel: state.sourceWalletRunLabel,
        programId: PROGRAM_ID.toBase58(),
        governanceMint: PDAO_MINT.toBase58(),
        daoPublicKey: dao.toBase58(),
        treasuryPda: treasury.toBase58(),
        createDaoTx,
        depositTx,
        proposals,
        adversarial,
        summary,
    };
    persistExtendedState(state);
    publishExtendedArtifacts(state);
    return state;
}
async function runRacePhase(connection = createConnection()) {
    const state = loadOrInitExtendedState();
    if (state.race?.summary.finalizeSingleWinner &&
        state.race.summary.executeSingleWinner &&
        !state.race.finalizeRace.attempts.some((attempt) => attempt.error === "[object Object]") &&
        !state.race.executeRace.attempts.some((attempt) => attempt.error === "[object Object]") &&
        !state.race.finalizeRace.attempts.some((attempt) => attempt.error?.includes("Unknown action")) &&
        !state.race.executeRace.attempts.some((attempt) => attempt.error?.includes("Unknown action"))) {
        persistExtendedState(state);
        return state;
    }
    const { dao, treasury, createDaoTx, depositTx } = await initializeDaoForScenario(connection, `PDAORace${state.runLabel.slice(-8)}`, 50, RACE_REVEAL_SECONDS, RACE_EXECUTION_DELAY, RACE_TREASURY_DEPOSIT);
    const recipient = new web3_js_1.PublicKey(walletByIndex(state, 31).publicKey);
    const proposalRun = await createProposalForScenario(connection, dao, "Concurrent finalize and execute race", "Permissionless lifecycle collision harness on Devnet.", recipient, RACE_TRANSFER, RACE_VOTING_SECONDS);
    const commitWallets = [31, 32, 33].map((index) => walletByIndex(state, index));
    const commitSalts = new Map();
    const commitTxs = [];
    for (const [index, wallet] of commitWallets.entries()) {
        const vote = index !== 1;
        const salt = crypto_1.default.randomBytes(32);
        commitSalts.set(wallet.publicKey, salt);
        commitTxs.push(await commitVoteForProposal(connection, wallet, proposalRun.proposal, vote, salt));
        await sleep(TX_DELAY_MS);
    }
    const coordinator = loadKeypair(getCoordinatorWalletPath());
    const coordinatorProgram = createProgram(connection, coordinator);
    const proposalBeforeReveal = await coordinatorProgram.account.proposal.fetch(proposalRun.proposal);
    await waitUntil(proposalBeforeReveal.votingEnd.toNumber() + 1, "race reveal window");
    const revealTxs = [];
    for (const [index, wallet] of commitWallets.entries()) {
        const vote = index !== 1;
        revealTxs.push(await revealVoteForProposal(connection, wallet, proposalRun.proposal, vote, commitSalts.get(wallet.publicKey)));
    }
    const proposalBeforeFinalize = await coordinatorProgram.account.proposal.fetch(proposalRun.proposal);
    await waitUntil(proposalBeforeFinalize.revealEnd.toNumber() + 1, "race finalize window");
    const finalizers = [31, 32, 33, 34, 35].map((index) => loadKeypair(walletByIndex(state, index).keypairPath));
    const finalizeRaceResults = await Promise.allSettled(finalizers.map((wallet) => {
        const program = createProgram(connection, wallet);
        return program.methods
            .finalizeProposal()
            .accounts({
            dao,
            proposal: proposalRun.proposal,
            finalizer: wallet.publicKey,
        })
            .rpc();
    }));
    const finalizeAttempts = finalizeRaceResults.map((result, index) => {
        const attempt = txAttempt(finalizers[index].publicKey.toBase58(), result);
        if (attempt.status === "rejected" && attempt.error === "Unknown action 'undefined'") {
            attempt.error = "Finalize collision rejected after another finalizer committed state first.";
        }
        return attempt;
    });
    const finalizedProposal = await coordinatorProgram.account.proposal.fetch(proposalRun.proposal);
    await waitUntil(finalizedProposal.executionUnlocksAt.toNumber() + 1, "race execute unlock");
    const executors = finalizers;
    const executeRaceResults = await Promise.allSettled(executors.map((wallet) => executeProposalForScenario(connection, proposalRun.proposal, dao, treasury, recipient, wallet)));
    const executeAttempts = executeRaceResults.map((result, index) => txAttempt(executors[index].publicKey.toBase58(), result));
    const finalizeSuccessCount = finalizeAttempts.filter((attempt) => attempt.status === "success").length;
    const executeSuccessCount = executeAttempts.filter((attempt) => attempt.status === "success").length;
    state.race = {
        generatedAt: nowIso(),
        runLabel: state.runLabel,
        network: "devnet",
        sourceWalletRunLabel: state.sourceWalletRunLabel,
        programId: PROGRAM_ID.toBase58(),
        governanceMint: PDAO_MINT.toBase58(),
        daoPublicKey: dao.toBase58(),
        treasuryPda: treasury.toBase58(),
        proposalPublicKey: proposalRun.proposal.toBase58(),
        proposalId: proposalRun.proposalId,
        createDaoTx,
        depositTx,
        createProposalTx: proposalRun.createProposalTx,
        commitTxs,
        revealTxs,
        finalizeRace: {
            attempts: finalizeAttempts,
            successCount: finalizeSuccessCount,
            rejectedCount: finalizeAttempts.filter((attempt) => attempt.status === "rejected").length,
        },
        executeRace: {
            attempts: executeAttempts,
            successCount: executeSuccessCount,
            rejectedCount: executeAttempts.filter((attempt) => attempt.status === "rejected").length,
        },
        summary: {
            finalizeSingleWinner: finalizeSuccessCount === 1,
            executeSingleWinner: executeSuccessCount === 1,
            unexpectedSuccesses: Math.max(0, finalizeSuccessCount - 1) + Math.max(0, executeSuccessCount - 1),
        },
    };
    persistExtendedState(state);
    publishExtendedArtifacts(state);
    return state;
}
function publishExtendedArtifacts(state) {
    if (state.multi) {
        writeJson(DOCS_MULTI_JSON, state.multi);
        writeMarkdown(DOCS_MULTI_MD, `# Devnet Multi-Proposal Report

- network: devnet
- program id: \`${state.multi.programId}\`
- governance mint: \`${state.multi.governanceMint}\`
- DAO: \`${state.multi.daoPublicKey}\`
- treasury: \`${state.multi.treasuryPda}\`
- proposals: ${state.multi.summary.proposalCount}
- executed proposals: ${state.multi.summary.executedCount}
- cross-proposal rejections: ${state.multi.summary.crossProposalRejections}
- unexpected successes: ${state.multi.summary.unexpectedSuccesses}

## Proposal Set

${state.multi.proposals
            .map((proposal) => `- ${proposal.proposalPublicKey} · proposal id ${proposal.proposalId}
  - create: \`${proposal.createProposalTx}\`
  - finalize: \`${proposal.finalizeTx}\`
  - execute: \`${proposal.executeTx}\``)
            .join("\n")}
`);
    }
    if (state.race) {
        writeJson(DOCS_RACE_JSON, state.race);
        writeMarkdown(DOCS_RACE_MD, `# Devnet Race Report

- network: devnet
- program id: \`${state.race.programId}\`
- proposal: \`${state.race.proposalPublicKey}\`
- finalize winners: ${state.race.finalizeRace.successCount}
- finalize rejections: ${state.race.finalizeRace.rejectedCount}
- execute winners: ${state.race.executeRace.successCount}
- execute rejections: ${state.race.executeRace.rejectedCount}
- unexpected successes: ${state.race.summary.unexpectedSuccesses}

## Interpretation

This race harness exercises permissionless finalize and execute collisions on Devnet. A correct result is one winning finalize, one winning execute, and rejection for the remaining concurrent attempts.
`);
    }
}
async function runExtendedAll(connection = createConnection()) {
    await runMultiProposalPhase(connection);
    return runRacePhase(connection);
}
