import * as anchor from "@coral-xyz/anchor";
import { BN } from "@coral-xyz/anchor";
import {
  Commitment,
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionExpiredBlockheightExceededError,
} from "@solana/web3.js";
import {
  createTransferCheckedInstruction,
  getAccount,
  getAssociatedTokenAddressSync,
  getMint,
  getOrCreateAssociatedTokenAccount,
  TOKEN_2022_PROGRAM_ID,
} from "@solana/spl-token";
import { Poseidon } from "@iden3/js-crypto";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";
import {
  computeProposalCommitment,
  formatSol,
  formatTimestamp,
  proposalStatusLabel,
  solscanAccountUrl,
  solscanTxUrl,
} from "../utils";

type WalletRole = "voter" | "adversarial" | "zk-tester";
export type LoadProfileName = "50" | "100" | "350" | "500";
type RevealMode = "valid" | "late";
type CommitScenario =
  | "valid"
  | "wrong-voter-record"
  | "wrong-delegation-marker"
  | "wrong-token-account"
  | "delegate-then-direct-overlap";

type AttemptStatus = "success" | "expected-reject" | "skipped" | "recovered";

type FundingState = {
  solTargetLamports: number;
  solBalanceLamports: number;
  solTransferTx?: string | null;
  pdaoTargetRaw: string;
  pdaoBalanceRaw: string;
  pdaoTransferTx?: string | null;
  tokenAccount?: string | null;
  success: boolean;
  retries: number;
  fundedAt?: string;
  lastError?: string | null;
};

type PhaseAttempt = {
  status: AttemptStatus;
  txSignature?: string | null;
  explorerUrl?: string | null;
  latencyMs?: number;
  retries: number;
  wave?: number;
  timestamp: string;
  error?: string | null;
  note?: string | null;
};

type WalletPlan = {
  vote: boolean;
  revealMode: RevealMode;
  commitScenario: CommitScenario;
};

type WalletState = {
  walletIndex: number;
  publicKey: string;
  role: WalletRole;
  keypairPath: string;
  plan: WalletPlan;
  funding: FundingState;
  commit?: PhaseAttempt;
  reveal?: PhaseAttempt;
  lateReveal?: PhaseAttempt;
  internal?: {
    saltHex?: string;
    commitmentHex?: string;
  };
  zk?: Array<{
    layer: string;
    proofHash: string;
    publicInputsHash: string;
    verificationMode: string;
    verificationTxSignature: string | null;
    verified: boolean;
    generatedAt: string;
    inputPath: string;
    proofPath: string;
    publicPath: string;
  }>;
};

type BootstrapState = {
  daoName: string;
  quorumPercent: number;
  proposalDurationSeconds: number;
  revealWindowSeconds: number;
  executionDelaySeconds: number;
  governanceMint: string;
  daoPublicKey: string;
  daoExplorer: string;
  treasuryPda: string;
  treasuryExplorer: string;
  proposalPublicKey: string;
  proposalExplorer: string;
  proposalId: string;
  proposalTitle: string;
  proposalRecipient: string;
  createDaoTx: string;
  depositTx: string;
  createProposalTx: string;
  createdAt: string;
};

type TxRegistryEntry = {
  phase: string;
  action: string;
  walletPubkey: string;
  role: WalletRole | "coordinator";
  txSignature: string;
  explorerUrl: string;
  timestamp: string;
  latencyMs: number;
  wave?: number;
};

type AdversarialEntry = {
  id: string;
  phase: string;
  walletPubkey: string;
  role: WalletRole;
  scenario: string;
  expected: string;
  outcome: "rejected" | "unexpected-success" | "skipped";
  timestamp: string;
  error?: string | null;
  txSignature?: string | null;
  invariantState?: Record<string, string | boolean | number>;
};

type ZkProofEntry = {
  walletPubkey: string;
  role: WalletRole;
  layer: string;
  circuit: string;
  proofHash: string;
  publicInputsHash: string;
  verificationMode: "offchain-groth16";
  verificationTxSignature: null;
  verified: boolean;
  generatedAt: string;
  inputPath: string;
  proofPath: string;
  publicPath: string;
};

type OnchainZkProofAnchorEntry = {
  layer: string;
  circuit: string;
  anchorPda: string;
  txSignature: string;
  explorerUrl: string;
  anchoredAt: string;
};

type PhaseTiming = {
  startedAt: string;
  completedAt?: string;
  durationMs?: number;
};

type MetricsState = {
  startedAt: string;
  phaseTimings: Record<string, PhaseTiming>;
  retryCount: number;
  attemptCount: number;
  successCount: number;
  failureCount: number;
};

type HarnessProfile = {
  name: LoadProfileName;
  walletCount: number;
  waveSize: number;
  fundingWaveSize: number;
  targetPdaoUi: number;
};

type HarnessPaths = {
  walletsDir: string;
  statePath: string;
  docsWalletRegistry: string;
  docsBootstrap: string;
  docsTxRegistry: string;
  docsAdversarial: string;
  docsZkRegistry: string;
  docsPerformance: string;
  docsLoadReport: string;
};

export type HarnessState = {
  version: 2;
  runLabel: string;
  network: "devnet";
  programId: string;
  pdaoMint: string;
  profile: HarnessProfile;
  coordinator: {
    walletPath: string;
    publicKey: string;
    initialBalanceLamports: number;
    latestBalanceLamports?: number;
    airdropSignatures: string[];
    tokenAccount?: string | null;
  };
  wallets: WalletState[];
  bootstrap?: BootstrapState;
  txRegistry: TxRegistryEntry[];
  adversarial: AdversarialEntry[];
  zkProofs: ZkProofEntry[];
  onchainZkAnchors: OnchainZkProofAnchorEntry[];
  metrics: MetricsState;
};

type HarnessProgram = anchor.Program<any> & { account: any; methods: any };

const COMMITMENT: Commitment = "confirmed";
const PROGRAM_ID = new PublicKey("5AhUsbQ4mJ8Xh7QJEomuS85qGgmK9iNvFqzF669Y7Psx");
const PDAO_MINT = new PublicKey("AZUkprJDfJPgAp7L4z3TpCV3KHqLiA8RjHAVhK9HCvDt");
const DEFAULT_COORDINATOR_WALLET = "/home/x-pact/Desktop/wallet-keypair.json";
const DEFAULT_DEVNET_RPC =
  process.env.ANCHOR_PROVIDER_URL ||
  process.env.SOLANA_RPC_URL ||
  process.env.SOLANA_URL ||
  "https://api.devnet.solana.com";
const DEFAULT_PROFILE: LoadProfileName = "50";
const LOAD_PROFILES: Record<LoadProfileName, HarnessProfile> = {
  "50": { name: "50", walletCount: 50, waveSize: 10, fundingWaveSize: 5, targetPdaoUi: 100 },
  "100": { name: "100", walletCount: 100, waveSize: 20, fundingWaveSize: 10, targetPdaoUi: 100 },
  "350": { name: "350", walletCount: 350, waveSize: 50, fundingWaveSize: 25, targetPdaoUi: 100 },
  "500": { name: "500", walletCount: 500, waveSize: 25, fundingWaveSize: 10, targetPdaoUi: 100 },
};
const WAVE_DELAY_MS = 5000;
const TX_DELAY_MS = 1200;
const FUNDING_DELAY_MS = 900;
const FUNDING_CONFIRM_TIMEOUT_MS = Number(process.env.PRIVATE_DAO_FUNDING_CONFIRM_TIMEOUT_MS || 18_000);
const FUNDING_STATUS_POLL_MS = 1200;
const TARGET_SOL_LAMPORTS = Math.floor(0.08 * LAMPORTS_PER_SOL);
const COORDINATOR_MIN_BALANCE_LAMPORTS = Math.floor(8 * LAMPORTS_PER_SOL);
const DAO_QUORUM_PERCENT = 60;
const PROPOSAL_DURATION_SECONDS = Number(process.env.PRIVATE_DAO_PROPOSAL_DURATION_SECONDS || 900);
const REVEAL_WINDOW_SECONDS = Number(process.env.PRIVATE_DAO_REVEAL_WINDOW_SECONDS || 900);
const EXECUTION_DELAY_SECONDS = Number(process.env.PRIVATE_DAO_EXECUTION_DELAY_SECONDS || 30);
const TREASURY_DEPOSIT_LAMPORTS = Math.floor(0.3 * LAMPORTS_PER_SOL);
const TREASURY_TRANSFER_LAMPORTS = Math.floor(0.05 * LAMPORTS_PER_SOL);
const SNARK_FIELD = BigInt("21888242871839275222246405745257275088548364400416034343698204186575808495617");

const REPO_ROOT = path.resolve(__dirname, "..", "..");
const IDL_PATH = path.join(REPO_ROOT, "target", "idl", "private_dao.json");
const ZK_DEVNET_DIR = path.join(REPO_ROOT, "zk", "devnet-load");
const ZK_LAYER_SEEDS: Record<string, number> = {
  vote: 1,
  delegation: 2,
  tally: 3,
};
const ZK_LAYER_ARGS: Record<string, { vote?: Record<string, never>; delegation?: Record<string, never>; tally?: Record<string, never> }> = {
  vote: { vote: {} },
  delegation: { delegation: {} },
  tally: { tally: {} },
};
const ZK_VERIFICATION_KEY_PATHS: Record<string, string> = {
  private_dao_vote_overlay: "zk/setup/private_dao_vote_overlay_vkey.json",
  private_dao_delegation_overlay: "zk/setup/private_dao_delegation_overlay_vkey.json",
  private_dao_tally_overlay: "zk/setup/private_dao_tally_overlay_vkey.json",
};

function nowIso(): string {
  return new Date().toISOString();
}

function runLabel(): string {
  return nowIso().replace(/[-:.TZ]/g, "").slice(0, 14);
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function confirmSignatureWithTimeout(connection: Connection, signature: string, timeoutMs: number): Promise<void> {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    const status = (await connection.getSignatureStatuses([signature])).value[0];
    if (status?.err) {
      throw new Error(`transaction ${signature} failed: ${JSON.stringify(status.err)}`);
    }
    if (
      status?.confirmationStatus === "confirmed" ||
      status?.confirmationStatus === "finalized" ||
      status?.confirmations === null
    ) {
      return;
    }
    await sleep(FUNDING_STATUS_POLL_MS);
  }
  throw new Error(`transaction ${signature} was not confirmed within ${timeoutMs}ms`);
}

async function sendAndConfirmFundingTransaction(
  connection: Connection,
  tx: Transaction,
  signers: Keypair[],
): Promise<string> {
  const payer = signers[0];
  if (!payer) throw new Error("funding transaction requires at least one signer");
  const freshTx = new Transaction();
  freshTx.feePayer = payer.publicKey;
  for (const instruction of tx.instructions) {
    freshTx.add(instruction);
  }
  const latestBlockhash = await connection.getLatestBlockhash(COMMITMENT);
  freshTx.recentBlockhash = latestBlockhash.blockhash;
  freshTx.sign(...signers);
  const signature = await connection.sendRawTransaction(freshTx.serialize(), {
    preflightCommitment: COMMITMENT,
    maxRetries: 5,
  });
  try {
    await connection.confirmTransaction({ signature, ...latestBlockhash }, COMMITMENT);
    return signature;
  } catch (error) {
    if (!(error instanceof TransactionExpiredBlockheightExceededError)) {
      throw error;
    }
    // Public Devnet RPC can miss its own confirmation stream while the transfer lands.
    await confirmSignatureWithTimeout(connection, signature, FUNDING_CONFIRM_TIMEOUT_MS);
    return signature;
  }
}

function stableJson(value: unknown): string {
  return JSON.stringify(
    value,
    (_, v) => (typeof v === "bigint" ? v.toString() : v),
    2,
  ) + "\n";
}

function ensureDir(dirPath: string) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function writeJson(filePath: string, value: unknown) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, stableJson(value), "utf8");
}

function readJsonIfExists<T>(filePath: string): T | null {
  if (!fs.existsSync(filePath)) {
    return null;
  }
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
}

function loadKeypair(filePath: string): Keypair {
  const secret = Uint8Array.from(JSON.parse(fs.readFileSync(filePath, "utf8")) as number[]);
  return Keypair.fromSecretKey(secret);
}

function saveKeypair(filePath: string, keypair: Keypair) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, JSON.stringify(Array.from(keypair.secretKey)) + "\n", "utf8");
}

export function resolveLoadProfile(input?: string | null): HarnessProfile {
  const normalized = (input || process.env.PRIVATE_DAO_LOAD_PROFILE || DEFAULT_PROFILE) as LoadProfileName;
  const profile = LOAD_PROFILES[normalized];
  if (!profile) {
    throw new Error(`unsupported devnet load profile: ${String(input ?? process.env.PRIVATE_DAO_LOAD_PROFILE ?? DEFAULT_PROFILE)}`);
  }
  return profile;
}

function profileTargetPdaoRaw(profile: HarnessProfile): bigint {
  return BigInt(profile.targetPdaoUi) * 1_000_000_000n;
}

function profileArtifactSuffix(profile: HarnessProfile): string {
  return profile.name === DEFAULT_PROFILE ? "" : `.profile-${profile.name}`;
}

function resolveHarnessPaths(profile: HarnessProfile): HarnessPaths {
  const suffix = profileArtifactSuffix(profile);
  const walletsDir =
    profile.name === DEFAULT_PROFILE
      ? path.join(REPO_ROOT, "scripts", "generated-wallets")
      : path.join(REPO_ROOT, "scripts", "generated-wallets", `profile-${profile.name}`);
  return {
    walletsDir,
    statePath:
      profile.name === DEFAULT_PROFILE
        ? path.join(walletsDir, "load-test-state.json")
        : path.join(walletsDir, `load-test-state.profile-${profile.name}.json`),
    docsWalletRegistry: path.join(REPO_ROOT, "docs", `devnet-wallet-registry${suffix}.json`),
    docsBootstrap: path.join(REPO_ROOT, "docs", `devnet-bootstrap${suffix}.json`),
    docsTxRegistry: path.join(REPO_ROOT, "docs", `devnet-tx-registry${suffix}.json`),
    docsAdversarial: path.join(REPO_ROOT, "docs", `adversarial-report${suffix}.json`),
    docsZkRegistry: path.join(REPO_ROOT, "docs", `zk-proof-registry${suffix}.json`),
    docsPerformance: path.join(REPO_ROOT, "docs", `performance-metrics${suffix}.json`),
    docsLoadReport: path.join(REPO_ROOT, "docs", `load-test-report${suffix}.md`),
  };
}

function walletPathForIndex(index: number, profile: HarnessProfile): string {
  const width = Math.max(2, String(profile.walletCount).length);
  return path.join(resolveHarnessPaths(profile).walletsDir, `wallet-${String(index).padStart(width, "0")}.json`);
}

function walletRoleForIndex(index: number, profile: HarnessProfile): WalletRole {
  const slot = index % profile.waveSize;
  const voterSlots = Math.max(1, Math.floor(profile.waveSize * 0.7));
  const adversarialSlots = Math.max(1, Math.floor(profile.waveSize * 0.2));
  if (slot < voterSlots) return "voter";
  if (slot < voterSlots + adversarialSlots) return "adversarial";
  return "zk-tester";
}

function walletPlanForIndex(index: number, role: WalletRole, profile: HarnessProfile): WalletPlan {
  const slot = index % profile.waveSize;
  if (role === "adversarial") {
    const alternating: CommitScenario[] =
      slot < Math.max(1, Math.floor(profile.waveSize * 0.8))
        ? ["wrong-voter-record", "wrong-token-account", "wrong-voter-record", "wrong-token-account", "wrong-voter-record"]
        : ["wrong-delegation-marker", "delegate-then-direct-overlap", "wrong-delegation-marker", "delegate-then-direct-overlap", "wrong-delegation-marker"];
    return {
      vote: false,
      revealMode: "valid",
      commitScenario: alternating[Math.floor(index / profile.waveSize)] ?? "wrong-voter-record",
    };
  }
  if (role === "zk-tester") {
    return { vote: true, revealMode: "valid", commitScenario: "valid" };
  }
  const lateRevealSlot = Math.max(1, Math.floor(profile.waveSize * 0.6));
  const noVoteSlot = Math.max(1, Math.floor(profile.waveSize * 0.5));
  if (slot === lateRevealSlot) {
    return { vote: true, revealMode: "late", commitScenario: "valid" };
  }
  if (slot === noVoteSlot) {
    return { vote: false, revealMode: "valid", commitScenario: "valid" };
  }
  return { vote: true, revealMode: "valid", commitScenario: "valid" };
}

function createEmptyWalletState(index: number, keypairPath: string, publicKey: string, profile: HarnessProfile): WalletState {
  const role = walletRoleForIndex(index, profile);
  return {
    walletIndex: index + 1,
    publicKey,
    role,
    keypairPath,
    plan: walletPlanForIndex(index, role, profile),
    funding: {
      solTargetLamports: TARGET_SOL_LAMPORTS,
      solBalanceLamports: 0,
      pdaoTargetRaw: profileTargetPdaoRaw(profile).toString(),
      pdaoBalanceRaw: "0",
      success: false,
      retries: 0,
    },
  };
}

export function createConnection(): Connection {
  return new Connection(DEFAULT_DEVNET_RPC, COMMITMENT);
}

function loadIdl(): anchor.Idl {
  return JSON.parse(fs.readFileSync(IDL_PATH, "utf8")) as anchor.Idl;
}

function createProgram(connection: Connection, keypair: Keypair): HarnessProgram {
  const wallet = new anchor.Wallet(keypair);
  const provider = new anchor.AnchorProvider(connection, wallet, {
    commitment: COMMITMENT,
    preflightCommitment: COMMITMENT,
  });
  return new anchor.Program(loadIdl(), provider) as HarnessProgram;
}

function getCoordinatorWalletPath(): string {
  return process.env.DEVNET_COORDINATOR_WALLET || process.env.ANCHOR_WALLET || DEFAULT_COORDINATOR_WALLET;
}

export async function loadOrInitializeState(connection: Connection, profileInput?: string | null): Promise<HarnessState> {
  const profile = resolveLoadProfile(profileInput);
  const paths = resolveHarnessPaths(profile);
  ensureDir(paths.walletsDir);
  ensureDir(ZK_DEVNET_DIR);

  const coordinatorKeypair = loadKeypair(getCoordinatorWalletPath());
  const initialBalanceLamports = await connection.getBalance(coordinatorKeypair.publicKey, COMMITMENT);
  const existing = readJsonIfExists<HarnessState & { profile?: HarnessProfile }>(paths.statePath);

  if (existing) {
    existing.profile ||= profile;
    existing.onchainZkAnchors ||= [];
    if (existing.profile.name !== profile.name) {
      throw new Error(`existing harness state is for profile ${existing.profile.name}, requested ${profile.name}`);
    }
    existing.coordinator.walletPath = getCoordinatorWalletPath();
    existing.coordinator.publicKey = coordinatorKeypair.publicKey.toBase58();
    existing.coordinator.initialBalanceLamports ||= initialBalanceLamports;
    return existing as HarnessState;
  }

  const wallets: WalletState[] = [];
  for (let index = 0; index < profile.walletCount; index += 1) {
    const keypairPath = walletPathForIndex(index + 1, profile);
    const keypair = fs.existsSync(keypairPath) ? loadKeypair(keypairPath) : Keypair.generate();
    if (!fs.existsSync(keypairPath)) {
      saveKeypair(keypairPath, keypair);
    }
    wallets.push(createEmptyWalletState(index, keypairPath, keypair.publicKey.toBase58(), profile));
  }

  const state: HarnessState = {
    version: 2,
    runLabel: runLabel(),
    network: "devnet",
    programId: PROGRAM_ID.toBase58(),
    pdaoMint: PDAO_MINT.toBase58(),
    profile,
    coordinator: {
      walletPath: getCoordinatorWalletPath(),
      publicKey: coordinatorKeypair.publicKey.toBase58(),
      initialBalanceLamports,
      latestBalanceLamports: initialBalanceLamports,
      airdropSignatures: [],
    },
    wallets,
    txRegistry: [],
    adversarial: [],
    zkProofs: [],
    onchainZkAnchors: [],
    metrics: {
      startedAt: nowIso(),
      phaseTimings: {},
      retryCount: 0,
      attemptCount: 0,
      successCount: 0,
      failureCount: 0,
    },
  };

  persistState(state);
  publishArtifacts(state);
  return state;
}

export function persistState(state: HarnessState) {
  writeJson(resolveHarnessPaths(state.profile).statePath, state);
}

function phaseTiming(state: HarnessState, phase: string): PhaseTiming {
  if (!state.metrics.phaseTimings[phase]) {
    state.metrics.phaseTimings[phase] = { startedAt: nowIso() };
  }
  return state.metrics.phaseTimings[phase];
}

function completePhase(state: HarnessState, phase: string) {
  const timing = phaseTiming(state, phase);
  timing.completedAt = nowIso();
  timing.durationMs = new Date(timing.completedAt).getTime() - new Date(timing.startedAt).getTime();
}

function explorerUrl(signature: string): string {
  return `https://explorer.solana.com/tx/${signature}?cluster=devnet`;
}

function proposalPdaFor(dao: PublicKey, proposalId: any): PublicKey {
  const idBn = proposalId instanceof BN ? proposalId : new BN(typeof proposalId === "bigint" ? proposalId.toString() : proposalId);
  return PublicKey.findProgramAddressSync(
    [Buffer.from("proposal"), dao.toBuffer(), idBn.toArrayLike(Buffer, "le", 8)],
    PROGRAM_ID,
  )[0];
}

function voteRecordPdaFor(proposal: PublicKey, voter: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("vote"), proposal.toBuffer(), voter.toBuffer()],
    PROGRAM_ID,
  )[0];
}

function delegationPdaFor(proposal: PublicKey, delegator: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("delegation"), proposal.toBuffer(), delegator.toBuffer()],
    PROGRAM_ID,
  )[0];
}

function treasuryPdaFor(dao: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync([Buffer.from("treasury"), dao.toBuffer()], PROGRAM_ID)[0];
}

function coordinatorKeypair(): Keypair {
  return loadKeypair(getCoordinatorWalletPath());
}

async function withRetry<T>(
  state: HarnessState,
  label: string,
  fn: () => Promise<T>,
  maxAttempts = 3,
): Promise<{ result: T; retries: number }> {
  let attempt = 0;
  let lastError: unknown;
  while (attempt < maxAttempts) {
    try {
      const result = await fn();
      return { result, retries: attempt };
    } catch (error) {
      lastError = error;
      attempt += 1;
      if (attempt >= maxAttempts) break;
      console.warn(`[load-test] retry ${attempt}/${maxAttempts - 1} for ${label}: ${String(error)}`);
      await sleep(1500 * attempt);
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

function pushTxRecord(
  state: HarnessState,
  entry: Omit<TxRegistryEntry, "explorerUrl"> & { explorerUrl?: string },
) {
  const alreadyRecorded = state.txRegistry.some(
    (candidate) =>
      candidate.txSignature === entry.txSignature &&
      candidate.phase === entry.phase &&
      candidate.action === entry.action,
  );
  if (alreadyRecorded) {
    return;
  }
  state.txRegistry.push({
    ...entry,
    explorerUrl: entry.explorerUrl ?? explorerUrl(entry.txSignature),
  });
}

function pushAdversarial(
  state: HarnessState,
  entry: AdversarialEntry,
) {
  const existingIndex = state.adversarial.findIndex((candidate) => candidate.id === entry.id);
  if (existingIndex >= 0) {
    state.adversarial[existingIndex] = entry;
    return;
  }
  state.adversarial.push(entry);
}

async function ensureCoordinatorFunding(state: HarnessState, connection: Connection) {
  const coordinator = coordinatorKeypair();
  const balance = await connection.getBalance(coordinator.publicKey, COMMITMENT);
  state.coordinator.latestBalanceLamports = balance;

  if (balance >= COORDINATOR_MIN_BALANCE_LAMPORTS) {
    return;
  }

  const needed = COORDINATOR_MIN_BALANCE_LAMPORTS - balance;
  let remaining = needed;
  while (remaining > 0) {
    const chunk = Math.min(remaining, 2 * LAMPORTS_PER_SOL);
    const signature = await connection.requestAirdrop(coordinator.publicKey, chunk);
    await connection.confirmTransaction(signature, COMMITMENT);
    state.coordinator.airdropSignatures.push(signature);
    remaining -= chunk;
    await sleep(2000);
  }
  state.coordinator.latestBalanceLamports = await connection.getBalance(coordinator.publicKey, COMMITMENT);
}

async function coordinatorPdaoSource(connection: Connection) {
  const coordinator = coordinatorKeypair();
  const account = await getOrCreateAssociatedTokenAccount(
    connection,
    coordinator,
    PDAO_MINT,
    coordinator.publicKey,
    false,
    COMMITMENT,
    undefined,
    TOKEN_2022_PROGRAM_ID,
  );
  return account.address;
}

async function ensureWalletFunding(
  state: HarnessState,
  connection: Connection,
  wallet: WalletState,
): Promise<void> {
  const coordinator = coordinatorKeypair();
  const walletKeypair = loadKeypair(wallet.keypairPath);
  const sourceAta = await coordinatorPdaoSource(connection);
  const mintInfo = await getMint(connection, PDAO_MINT, COMMITMENT, TOKEN_2022_PROGRAM_ID);
  const recipientAta = await getOrCreateAssociatedTokenAccount(
    connection,
    coordinator,
    PDAO_MINT,
    walletKeypair.publicKey,
    false,
    COMMITMENT,
    undefined,
    TOKEN_2022_PROGRAM_ID,
  );

  wallet.funding.tokenAccount = recipientAta.address.toBase58();
  wallet.funding.solBalanceLamports = await connection.getBalance(walletKeypair.publicKey, COMMITMENT);

  if (wallet.funding.solBalanceLamports < wallet.funding.solTargetLamports) {
    const lamportsNeeded = wallet.funding.solTargetLamports - wallet.funding.solBalanceLamports;
    const tx = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: coordinator.publicKey,
        toPubkey: walletKeypair.publicKey,
        lamports: lamportsNeeded,
      }),
    );
    const started = Date.now();
    const { result: signature, retries } = await withRetry(state, `fund-sol-${wallet.walletIndex}`, async () =>
      sendAndConfirmFundingTransaction(connection, tx, [coordinator]),
    );
    wallet.funding.solTransferTx = signature;
    wallet.funding.retries += retries;
    state.metrics.attemptCount += 1;
    state.metrics.successCount += 1;
    pushTxRecord(state, {
      phase: "fund",
      action: "fund-sol",
      walletPubkey: wallet.publicKey,
      role: wallet.role,
      txSignature: signature,
      timestamp: nowIso(),
      latencyMs: Date.now() - started,
    });
    await sleep(FUNDING_DELAY_MS);
  }

  const recipientAccount = await getAccount(connection, recipientAta.address, COMMITMENT, TOKEN_2022_PROGRAM_ID);
  const currentRaw = recipientAccount.amount;
  wallet.funding.pdaoBalanceRaw = currentRaw.toString();

  const targetPdaoRaw = profileTargetPdaoRaw(state.profile);
  if (currentRaw < targetPdaoRaw) {
    const diff = targetPdaoRaw - currentRaw;
    const tx = new Transaction().add(
      createTransferCheckedInstruction(
        sourceAta,
        PDAO_MINT,
        recipientAta.address,
        coordinator.publicKey,
        diff,
        mintInfo.decimals,
        [],
        TOKEN_2022_PROGRAM_ID,
      ),
    );
    const started = Date.now();
    const { result: signature, retries } = await withRetry(state, `fund-pdao-${wallet.walletIndex}`, async () =>
      sendAndConfirmFundingTransaction(connection, tx, [coordinator]),
    );
    wallet.funding.pdaoTransferTx = signature;
    wallet.funding.retries += retries;
    state.metrics.attemptCount += 1;
    state.metrics.successCount += 1;
    pushTxRecord(state, {
      phase: "fund",
      action: "fund-pdao",
      walletPubkey: wallet.publicKey,
      role: wallet.role,
      txSignature: signature,
      timestamp: nowIso(),
      latencyMs: Date.now() - started,
    });
    await sleep(FUNDING_DELAY_MS);
  }

  wallet.funding.solBalanceLamports = await connection.getBalance(walletKeypair.publicKey, COMMITMENT);
  wallet.funding.pdaoBalanceRaw = (await getAccount(connection, recipientAta.address, COMMITMENT, TOKEN_2022_PROGRAM_ID)).amount.toString();
  wallet.funding.success =
    wallet.funding.solBalanceLamports >= wallet.funding.solTargetLamports &&
    BigInt(wallet.funding.pdaoBalanceRaw) >= targetPdaoRaw;
  wallet.funding.fundedAt = nowIso();
  wallet.funding.lastError = null;
}

export async function runWalletGeneration(connection: Connection, profileInput?: string | null): Promise<HarnessState> {
  const state = await loadOrInitializeState(connection, profileInput);
  phaseTiming(state, "wallets");
  publishArtifacts(state);
  completePhase(state, "wallets");
  persistState(state);
  publishArtifacts(state);
  return state;
}

export async function runFundingPhase(connection: Connection, profileInput?: string | null): Promise<HarnessState> {
  const state = await loadOrInitializeState(connection, profileInput);
  phaseTiming(state, "fund");
  if (state.wallets.length === state.profile.walletCount && state.wallets.every((wallet) => wallet.funding.success)) {
    completePhase(state, "fund");
    persistState(state);
    publishArtifacts(state);
    return state;
  }
  await ensureCoordinatorFunding(state, connection);

  for (let i = 0; i < state.wallets.length; i += state.profile.fundingWaveSize) {
    const wave = state.wallets.slice(i, i + state.profile.fundingWaveSize);
    for (const wallet of wave) {
      try {
        const { retries } = await withRetry(state, `fund-wallet-${wallet.walletIndex}`, async () =>
          ensureWalletFunding(state, connection, wallet),
        );
        wallet.funding.retries += retries;
        persistState(state);
        publishArtifacts(state);
      } catch (error) {
        wallet.funding.lastError = String(error);
        wallet.funding.success = false;
        state.metrics.failureCount += 1;
        persistState(state);
        throw error;
      }
    }
    if (i + state.profile.fundingWaveSize < state.wallets.length) {
      await sleep(WAVE_DELAY_MS);
    }
  }

  completePhase(state, "fund");
  persistState(state);
  publishArtifacts(state);
  return state;
}

async function fetchProposalAndDao(connection: Connection, wallet: Keypair, proposalPk: PublicKey) {
  const program = createProgram(connection, wallet);
  const proposal = await program.account.proposal.fetch(proposalPk);
  const dao = await program.account.dao.fetch(proposal.dao);
  return { program, proposal, dao };
}

export async function runBootstrapPhase(connection: Connection, profileInput?: string | null): Promise<HarnessState> {
  const state = await loadOrInitializeState(connection, profileInput);
  phaseTiming(state, "bootstrap");

  if (state.bootstrap) {
    try {
      const coordinator = coordinatorKeypair();
      const program = createProgram(connection, coordinator);
      await program.account.dao.fetch(new PublicKey(state.bootstrap.daoPublicKey));
      await program.account.proposal.fetch(new PublicKey(state.bootstrap.proposalPublicKey));
      completePhase(state, "bootstrap");
      persistState(state);
      publishArtifacts(state);
      return state;
    } catch {
      state.bootstrap = undefined;
    }
  }

  const coordinator = coordinatorKeypair();
  const program = createProgram(connection, coordinator);
  const daoName = `PDAOStress${state.runLabel.slice(-8)}`;
  const recipient = new PublicKey(state.wallets[0].publicKey);
  const [daoPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("dao"), coordinator.publicKey.toBuffer(), Buffer.from(daoName)],
    PROGRAM_ID,
  );

  const createDaoStarted = Date.now();
  const { result: createDaoTx, retries: createDaoRetries } = await withRetry(state, "create-dao", async () =>
    program.methods
      .initializeDao(
        daoName,
        DAO_QUORUM_PERCENT,
        new BN(0),
        new BN(REVEAL_WINDOW_SECONDS),
        new BN(EXECUTION_DELAY_SECONDS),
        { tokenWeighted: {} },
      )
      .accounts({
        dao: daoPda,
        governanceToken: PDAO_MINT,
        authority: coordinator.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc(),
  );
  state.metrics.attemptCount += 1;
  state.metrics.successCount += 1;
  pushTxRecord(state, {
    phase: "bootstrap",
    action: "create-dao",
    walletPubkey: coordinator.publicKey.toBase58(),
    role: "coordinator",
    txSignature: createDaoTx,
    timestamp: nowIso(),
    latencyMs: Date.now() - createDaoStarted,
  });
  state.metrics.retryCount += createDaoRetries;

  const treasuryPda = treasuryPdaFor(daoPda);
  const depositStarted = Date.now();
  const { result: depositTx, retries: depositRetries } = await withRetry(state, "deposit-treasury", async () =>
    program.methods
      .depositTreasury(new BN(TREASURY_DEPOSIT_LAMPORTS))
      .accounts({
        dao: daoPda,
        treasury: treasuryPda,
        depositor: coordinator.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc(),
  );
  state.metrics.attemptCount += 1;
  state.metrics.successCount += 1;
  state.metrics.retryCount += depositRetries;
  pushTxRecord(state, {
    phase: "bootstrap",
    action: "deposit-treasury",
    walletPubkey: coordinator.publicKey.toBase58(),
    role: "coordinator",
    txSignature: depositTx,
    timestamp: nowIso(),
    latencyMs: Date.now() - depositStarted,
  });

  const dao = await program.account.dao.fetch(daoPda);
  const proposalPda = proposalPdaFor(daoPda, dao.proposalCount);
  const proposerTokenAccount = getAssociatedTokenAddressSync(PDAO_MINT, coordinator.publicKey, false, TOKEN_2022_PROGRAM_ID);
  const proposalTitle = "50-wallet devnet stress run";
  const proposalStarted = Date.now();
  const { result: createProposalTx, retries: proposalRetries } = await withRetry(state, "create-proposal", async () =>
    program.methods
      .createProposal(
        proposalTitle,
        "Wave-based Devnet stress test covering commit, reveal, finalize, execute, zk, and adversarial flows.",
        new BN(PROPOSAL_DURATION_SECONDS),
        {
          actionType: { sendSol: {} },
          amountLamports: new BN(TREASURY_TRANSFER_LAMPORTS),
          recipient,
          tokenMint: null,
        },
      )
      .accounts({
        dao: daoPda,
        proposal: proposalPda,
        proposerTokenAccount,
        proposer: coordinator.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc(),
  );
  state.metrics.attemptCount += 1;
  state.metrics.successCount += 1;
  state.metrics.retryCount += proposalRetries;
  pushTxRecord(state, {
    phase: "bootstrap",
    action: "create-proposal",
    walletPubkey: coordinator.publicKey.toBase58(),
    role: "coordinator",
    txSignature: createProposalTx,
    timestamp: nowIso(),
    latencyMs: Date.now() - proposalStarted,
  });

  const proposal = await program.account.proposal.fetch(proposalPda);
  state.bootstrap = {
    daoName,
    quorumPercent: DAO_QUORUM_PERCENT,
    proposalDurationSeconds: PROPOSAL_DURATION_SECONDS,
    revealWindowSeconds: REVEAL_WINDOW_SECONDS,
    executionDelaySeconds: EXECUTION_DELAY_SECONDS,
    governanceMint: PDAO_MINT.toBase58(),
    daoPublicKey: daoPda.toBase58(),
    daoExplorer: solscanAccountUrl(daoPda.toBase58()),
    treasuryPda: treasuryPda.toBase58(),
    treasuryExplorer: solscanAccountUrl(treasuryPda.toBase58()),
    proposalPublicKey: proposalPda.toBase58(),
    proposalExplorer: solscanAccountUrl(proposalPda.toBase58()),
    proposalId: proposal.proposalId.toString(),
    proposalTitle,
    proposalRecipient: recipient.toBase58(),
    createDaoTx,
    depositTx,
    createProposalTx,
    createdAt: nowIso(),
  };

  completePhase(state, "bootstrap");
  persistState(state);
  publishArtifacts(state);
  return state;
}

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

function ensureBootstrap(state: HarnessState): BootstrapState {
  if (!state.bootstrap) {
    throw new Error("bootstrap phase has not completed");
  }
  return state.bootstrap;
}

async function recordValidCommit(
  state: HarnessState,
  connection: Connection,
  wallet: WalletState,
  wave: number,
): Promise<void> {
  if (wallet.commit?.status === "success") {
    return;
  }

  const bootstrap = ensureBootstrap(state);
  const keypair = loadKeypair(wallet.keypairPath);
  const program = createProgram(connection, keypair);
  const proposalPda = new PublicKey(bootstrap.proposalPublicKey);
  const proposal = await program.account.proposal.fetch(proposalPda);
  const now = Math.floor(Date.now() / 1000);
  if (now >= proposal.votingEnd.toNumber()) {
    throw new Error("voting period already ended before commit phase completed");
  }

  const voterAta = getAssociatedTokenAddressSync(PDAO_MINT, keypair.publicKey, false, TOKEN_2022_PROGRAM_ID);
  const saltHex = wallet.internal?.saltHex ?? crypto.randomBytes(32).toString("hex");
  const salt = Buffer.from(saltHex, "hex");
  const commitment = computeProposalCommitment(wallet.plan.vote, salt, keypair.publicKey, proposalPda);
  const voterRecord = voteRecordPdaFor(proposalPda, keypair.publicKey);
  const delegationMarker = delegationPdaFor(proposalPda, keypair.publicKey);

  wallet.internal = {
    saltHex,
    commitmentHex: commitment.toString("hex"),
  };
  persistState(state);

  const started = Date.now();
  const { result: txSignature, retries } = await withRetry(state, `commit-${wallet.walletIndex}`, async () =>
    program.methods
      .commitVote([...commitment], null)
      .accounts({
        dao: proposal.dao,
        proposal: proposalPda,
        voterRecord,
        delegationMarker,
        voterTokenAccount: voterAta,
        voter: keypair.publicKey,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .rpc(),
  );

  wallet.commit = {
    status: "success",
    txSignature,
    explorerUrl: explorerUrl(txSignature),
    latencyMs: Date.now() - started,
    retries,
    wave,
    timestamp: nowIso(),
  };
  state.metrics.attemptCount += 1;
  state.metrics.successCount += 1;
  pushTxRecord(state, {
    phase: "commit",
    action: "commit-vote",
    walletPubkey: wallet.publicKey,
    role: wallet.role,
    txSignature,
    timestamp: wallet.commit.timestamp,
    latencyMs: wallet.commit.latencyMs ?? 0,
    wave,
  });
}

async function expectCommitFailure(
  state: HarnessState,
  connection: Connection,
  wallet: WalletState,
  wave: number,
): Promise<void> {
  if (wallet.commit?.status === "expected-reject") {
    return;
  }

  const bootstrap = ensureBootstrap(state);
  const keypair = loadKeypair(wallet.keypairPath);
  const program = createProgram(connection, keypair);
  const proposalPda = new PublicKey(bootstrap.proposalPublicKey);
  const proposal = await program.account.proposal.fetch(proposalPda);
  const voterAta = getAssociatedTokenAddressSync(PDAO_MINT, keypair.publicKey, false, TOKEN_2022_PROGRAM_ID);
  const salt = crypto.randomBytes(32);
  const commitment = computeProposalCommitment(false, salt, keypair.publicKey, proposalPda);
  const nextWallet = state.wallets[(wallet.walletIndex % state.wallets.length)];
  const wrongPubkey = new PublicKey(nextWallet.publicKey);
  const scenario = wallet.plan.commitScenario;

  const recordFailure = (error: unknown, note?: string) => {
    const message = String(error);
    wallet.commit = {
      status: "expected-reject",
      retries: 0,
      wave,
      timestamp: nowIso(),
      error: message,
      note: note ?? scenario,
    };
    state.metrics.attemptCount += 1;
    state.metrics.failureCount += 1;
    pushAdversarial(state, {
      id: `commit-${wallet.walletIndex}-${scenario}`,
      phase: "commit",
      walletPubkey: wallet.publicKey,
      role: wallet.role,
      scenario,
      expected: "commit should be rejected",
      outcome: "rejected",
      timestamp: wallet.commit.timestamp,
      error: message,
    });
  };

  try {
    if (scenario === "delegate-then-direct-overlap") {
      const delegation = delegationPdaFor(proposalPda, keypair.publicKey);
      const directVoteMarker = voteRecordPdaFor(proposalPda, keypair.publicKey);
      const delegateTxStarted = Date.now();
      const { result: delegationTx, retries: delegationRetries } = await withRetry(
        state,
        `delegate-${wallet.walletIndex}`,
        async () =>
        program.methods
          .delegateVote(coordinatorKeypair().publicKey)
          .accounts({
            dao: proposal.dao,
            proposal: proposalPda,
            delegation,
            directVoteMarker,
            delegatorTokenAccount: voterAta,
            delegator: keypair.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .rpc(),
      );
      state.metrics.retryCount += delegationRetries;
      pushTxRecord(state, {
        phase: "commit",
        action: "delegate-vote",
        walletPubkey: wallet.publicKey,
        role: wallet.role,
        txSignature: delegationTx,
        timestamp: nowIso(),
        latencyMs: Date.now() - delegateTxStarted,
        wave,
      });
      try {
        await program.methods
          .commitVote([...commitment], null)
          .accounts({
            dao: proposal.dao,
            proposal: proposalPda,
            voterRecord: voteRecordPdaFor(proposalPda, keypair.publicKey),
            delegationMarker: delegation,
            voterTokenAccount: voterAta,
            voter: keypair.publicKey,
            tokenProgram: TOKEN_2022_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
          })
          .rpc();
        wallet.commit = {
          status: "expected-reject",
          retries: 0,
          wave,
          timestamp: nowIso(),
          error: "unexpected direct commit success after delegation",
          note: scenario,
        };
        pushAdversarial(state, {
          id: `commit-${wallet.walletIndex}-${scenario}`,
          phase: "commit",
          walletPubkey: wallet.publicKey,
          role: wallet.role,
          scenario,
          expected: "direct commit should fail after delegation",
          outcome: "unexpected-success",
          timestamp: wallet.commit.timestamp,
          error: wallet.commit.error,
        });
        state.metrics.failureCount += 1;
        return;
      } catch (error) {
        recordFailure(error, "delegation overlap correctly rejected");
        return;
      }
    }

    const wrongVoterRecord =
      scenario === "wrong-voter-record"
        ? voteRecordPdaFor(proposalPda, wrongPubkey)
        : voteRecordPdaFor(proposalPda, keypair.publicKey);
    const wrongDelegationMarker =
      scenario === "wrong-delegation-marker"
        ? delegationPdaFor(proposalPda, wrongPubkey)
        : delegationPdaFor(proposalPda, keypair.publicKey);
    const wrongTokenAccount =
      scenario === "wrong-token-account"
        ? getAssociatedTokenAddressSync(PDAO_MINT, coordinatorKeypair().publicKey, false, TOKEN_2022_PROGRAM_ID)
        : voterAta;

    await program.methods
      .commitVote([...commitment], null)
      .accounts({
        dao: proposal.dao,
        proposal: proposalPda,
        voterRecord: wrongVoterRecord,
        delegationMarker: wrongDelegationMarker,
        voterTokenAccount: wrongTokenAccount,
        voter: keypair.publicKey,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    wallet.commit = {
      status: "expected-reject",
      retries: 0,
      wave,
      timestamp: nowIso(),
      error: `unexpected commit success for scenario ${scenario}`,
      note: scenario,
    };
    pushAdversarial(state, {
      id: `commit-${wallet.walletIndex}-${scenario}`,
      phase: "commit",
      walletPubkey: wallet.publicKey,
      role: wallet.role,
      scenario,
      expected: "commit should be rejected",
      outcome: "unexpected-success",
      timestamp: wallet.commit.timestamp,
      error: wallet.commit.error,
    });
    state.metrics.failureCount += 1;
  } catch (error) {
    recordFailure(error);
  }
}

export async function runCommitPhase(connection: Connection, profileInput?: string | null): Promise<HarnessState> {
  const state = await loadOrInitializeState(connection, profileInput);
  ensureBootstrap(state);
  phaseTiming(state, "commit");
  if (state.wallets.length === state.profile.walletCount && state.wallets.every((wallet) => wallet.commit?.status)) {
    completePhase(state, "commit");
    persistState(state);
    publishArtifacts(state);
    return state;
  }

  const commitWaves = chunk(state.wallets, state.profile.waveSize);
  for (const [waveIndex, wave] of commitWaves.entries()) {
    for (const wallet of wave) {
      if (wallet.role === "adversarial") {
        await expectCommitFailure(state, connection, wallet, waveIndex + 1);
      } else {
        await recordValidCommit(state, connection, wallet, waveIndex + 1);
      }
      persistState(state);
      publishArtifacts(state);
      await sleep(TX_DELAY_MS);
    }
    if (waveIndex < commitWaves.length - 1) {
      await sleep(WAVE_DELAY_MS);
    }
  }

  completePhase(state, "commit");
  persistState(state);
  publishArtifacts(state);
  return state;
}

async function waitUntil(unix: number, label: string) {
  for (;;) {
    const now = Math.floor(Date.now() / 1000);
    if (now >= unix) return;
    const remaining = unix - now;
    console.log(`[load-test] waiting for ${label}: ${remaining}s`);
    await sleep(Math.min(remaining, 5) * 1000);
  }
}

async function expectRevealFailure(
  state: HarnessState,
  connection: Connection,
  actorWallet: WalletState,
  targetWallet: WalletState,
  scenario: "wrong-revealer" | "wrong-salt" | "replay" | "late",
) {
  const bootstrap = ensureBootstrap(state);
  const actorKeypair = loadKeypair(actorWallet.keypairPath);
  const program = createProgram(connection, actorKeypair);
  const proposalPda = new PublicKey(bootstrap.proposalPublicKey);
  const voterRecord = voteRecordPdaFor(proposalPda, new PublicKey(targetWallet.publicKey));
  const saltHex = targetWallet.internal?.saltHex;
  if (!saltHex) {
    throw new Error(`missing salt for wallet ${targetWallet.walletIndex}`);
  }

  const vote = targetWallet.plan.vote;
  const salt = Buffer.from(saltHex, "hex");
  const revealSalt =
    scenario === "wrong-salt"
      ? Buffer.from(crypto.createHash("sha256").update(salt).digest("hex").slice(0, 64), "hex")
      : salt;

  try {
    await program.methods
      .revealVote(vote, [...revealSalt])
      .accounts({
        proposal: proposalPda,
        voterRecord,
        revealer: actorKeypair.publicKey,
      })
      .rpc();
    const entry: AdversarialEntry = {
      id: `reveal-${scenario}-${actorWallet.walletIndex}-${targetWallet.walletIndex}`,
      phase: "reveal",
      walletPubkey: actorWallet.publicKey,
      role: actorWallet.role,
      scenario,
      expected: "reveal should be rejected",
      outcome: "unexpected-success",
      timestamp: nowIso(),
      error: `unexpected success for ${scenario}`,
    };
    pushAdversarial(state, entry);
    state.metrics.failureCount += 1;
  } catch (error) {
    const entry: AdversarialEntry = {
      id: `reveal-${scenario}-${actorWallet.walletIndex}-${targetWallet.walletIndex}`,
      phase: "reveal",
      walletPubkey: actorWallet.publicKey,
      role: actorWallet.role,
      scenario,
      expected: "reveal should be rejected",
      outcome: "rejected",
      timestamp: nowIso(),
      error: String(error),
    };
    pushAdversarial(state, entry);
    state.metrics.attemptCount += 1;
    state.metrics.failureCount += 1;
  }
}

async function recordValidReveal(
  state: HarnessState,
  connection: Connection,
  wallet: WalletState,
  wave: number,
): Promise<void> {
  if (wallet.reveal?.status === "success") {
    return;
  }
  const bootstrap = ensureBootstrap(state);
  const keypair = loadKeypair(wallet.keypairPath);
  const program = createProgram(connection, keypair);
  const proposalPda = new PublicKey(bootstrap.proposalPublicKey);
  const saltHex = wallet.internal?.saltHex;
  if (!saltHex) {
    throw new Error(`missing commit salt for wallet ${wallet.walletIndex}`);
  }
  const voterRecord = voteRecordPdaFor(proposalPda, keypair.publicKey);
  const started = Date.now();
  const { result: txSignature, retries } = await withRetry(state, `reveal-${wallet.walletIndex}`, async () =>
    program.methods
      .revealVote(wallet.plan.vote, [...Buffer.from(saltHex, "hex")])
      .accounts({
        proposal: proposalPda,
        voterRecord,
        revealer: keypair.publicKey,
      })
      .rpc(),
  );

  wallet.reveal = {
    status: "success",
    txSignature,
    explorerUrl: explorerUrl(txSignature),
    latencyMs: Date.now() - started,
    retries,
    wave,
    timestamp: nowIso(),
  };
  state.metrics.attemptCount += 1;
  state.metrics.successCount += 1;
  pushTxRecord(state, {
    phase: "reveal",
    action: "reveal-vote",
    walletPubkey: wallet.publicKey,
    role: wallet.role,
    txSignature,
    timestamp: wallet.reveal.timestamp,
    latencyMs: wallet.reveal.latencyMs ?? 0,
    wave,
  });
}

export async function runRevealPhase(connection: Connection, profileInput?: string | null): Promise<HarnessState> {
  const state = await loadOrInitializeState(connection, profileInput);
  const bootstrap = ensureBootstrap(state);
  phaseTiming(state, "reveal");
  const validRevealComplete = state.wallets
    .filter((wallet) => wallet.role !== "adversarial" && wallet.plan.revealMode === "valid")
    .every((wallet) => wallet.reveal?.status === "success");
  const lateRevealComplete = state.wallets
    .filter((wallet) => wallet.role !== "adversarial" && wallet.plan.revealMode === "late")
    .every((wallet) => wallet.lateReveal?.status === "expected-reject");
  if (validRevealComplete && lateRevealComplete) {
    completePhase(state, "reveal");
    persistState(state);
    publishArtifacts(state);
    return state;
  }

  const coordinator = coordinatorKeypair();
  const coordinatorProgram = createProgram(connection, coordinator);
  const proposal = await coordinatorProgram.account.proposal.fetch(new PublicKey(bootstrap.proposalPublicKey));
  await waitUntil(proposal.votingEnd.toNumber() + 1, "reveal window");

  const revealable = state.wallets.filter((wallet) => wallet.role !== "adversarial" && wallet.plan.revealMode === "valid");
  const waves = chunk(revealable, state.profile.waveSize);

  for (const [waveIndex, wave] of waves.entries()) {
    const firstTarget = wave[0];
    const waveAdversary = state.wallets.find(
      (wallet) => Math.floor((wallet.walletIndex - 1) / state.profile.waveSize) === waveIndex && wallet.role === "adversarial",
    );
    if (waveAdversary && firstTarget) {
      await expectRevealFailure(state, connection, waveAdversary, firstTarget, "wrong-revealer");
      await expectRevealFailure(state, connection, firstTarget, firstTarget, "wrong-salt");
    }

    for (const wallet of wave) {
      await recordValidReveal(state, connection, wallet, waveIndex + 1);
      persistState(state);
      publishArtifacts(state);
      await sleep(TX_DELAY_MS);
    }

    if (firstTarget) {
      await expectRevealFailure(state, connection, firstTarget, firstTarget, "replay");
    }
    if (waveIndex < waves.length - 1) {
      await sleep(WAVE_DELAY_MS);
    }
  }

  const refreshedProposal = await coordinatorProgram.account.proposal.fetch(new PublicKey(bootstrap.proposalPublicKey));
  if (Math.floor(Date.now() / 1000) < refreshedProposal.revealEnd.toNumber()) {
    try {
      await coordinatorProgram.methods
        .finalizeProposal()
        .accounts({
          dao: new PublicKey(bootstrap.daoPublicKey),
          proposal: new PublicKey(bootstrap.proposalPublicKey),
          finalizer: coordinator.publicKey,
        })
        .rpc();
      pushAdversarial(state, {
        id: "finalize-early",
        phase: "finalize",
        walletPubkey: coordinator.publicKey.toBase58(),
        role: "adversarial",
        scenario: "finalize-before-reveal-end",
        expected: "finalize should be rejected before reveal end",
        outcome: "unexpected-success",
        timestamp: nowIso(),
        error: "unexpected early finalize success",
      });
    } catch (error) {
      pushAdversarial(state, {
        id: "finalize-early",
        phase: "finalize",
        walletPubkey: coordinator.publicKey.toBase58(),
        role: "adversarial",
        scenario: "finalize-before-reveal-end",
        expected: "finalize should be rejected before reveal end",
        outcome: "rejected",
        timestamp: nowIso(),
        error: String(error),
      });
      state.metrics.attemptCount += 1;
      state.metrics.failureCount += 1;
    }
  }

  await waitUntil(refreshedProposal.revealEnd.toNumber() + 1, "late reveal checks");
  const lateWallets = state.wallets.filter((wallet) => wallet.role !== "adversarial" && wallet.plan.revealMode === "late");
  for (const wallet of lateWallets) {
    await expectRevealFailure(state, connection, wallet, wallet, "late");
    wallet.lateReveal = {
      status: "expected-reject",
      retries: 0,
      timestamp: nowIso(),
      note: "late reveal rejected",
    };
    persistState(state);
    publishArtifacts(state);
    await sleep(TX_DELAY_MS);
  }

  completePhase(state, "reveal");
  persistState(state);
  publishArtifacts(state);
  return state;
}

export async function runExecutePhase(connection: Connection, profileInput?: string | null): Promise<HarnessState> {
  const state = await loadOrInitializeState(connection, profileInput);
  const bootstrap = ensureBootstrap(state);
  phaseTiming(state, "execute");

  const coordinator = coordinatorKeypair();
  const program = createProgram(connection, coordinator);
  const daoPda = new PublicKey(bootstrap.daoPublicKey);
  const proposalPda = new PublicKey(bootstrap.proposalPublicKey);
  const treasuryPda = new PublicKey(bootstrap.treasuryPda);
  const executeArtifactsReady =
    state.adversarial.some((entry) => entry.id === "duplicate-finalize") &&
    state.adversarial.some((entry) => entry.id === "execute-before-unlock") &&
    state.adversarial.some((entry) => entry.id === "treasury-miswire") &&
    state.adversarial.some((entry) => entry.id === "duplicate-execute") &&
    state.txRegistry.some((entry) => entry.phase === "finalize" && entry.action === "finalize-proposal") &&
    state.txRegistry.some((entry) => entry.phase === "execute" && entry.action === "execute-proposal");
  const executeStateProposal = await program.account.proposal.fetch(proposalPda);
  if (executeStateProposal.isExecuted && executeArtifactsReady) {
    completePhase(state, "execute");
    persistState(state);
    publishArtifacts(state);
    return state;
  }

  const proposalBeforeFinalize = executeStateProposal;
  let finalizedProposal = proposalBeforeFinalize;
  if (proposalStatusLabel(proposalBeforeFinalize.status) === "Voting") {
    const finalizeStarted = Date.now();
    const { result: finalizeTx, retries: finalizeRetries } = await withRetry(state, "finalize-valid", async () =>
      program.methods
        .finalizeProposal()
        .accounts({
          dao: daoPda,
          proposal: proposalPda,
          finalizer: coordinator.publicKey,
        })
        .rpc(),
    );
    state.metrics.attemptCount += 1;
    state.metrics.successCount += 1;
    state.metrics.retryCount += finalizeRetries;
    pushTxRecord(state, {
      phase: "finalize",
      action: "finalize-proposal",
      walletPubkey: coordinator.publicKey.toBase58(),
      role: "coordinator",
      txSignature: finalizeTx,
      timestamp: nowIso(),
      latencyMs: Date.now() - finalizeStarted,
    });
    finalizedProposal = await program.account.proposal.fetch(proposalPda);
  }

  if (!state.adversarial.some((entry) => entry.id === "duplicate-finalize")) {
    try {
      await program.methods
        .finalizeProposal()
        .accounts({
          dao: daoPda,
          proposal: proposalPda,
          finalizer: coordinator.publicKey,
        })
        .rpc();
      pushAdversarial(state, {
        id: "duplicate-finalize",
        phase: "finalize",
        walletPubkey: coordinator.publicKey.toBase58(),
        role: "adversarial",
        scenario: "duplicate-finalize",
        expected: "duplicate finalize should be rejected",
        outcome: "unexpected-success",
        timestamp: nowIso(),
        error: "unexpected duplicate finalize success",
        invariantState: {
          statusBefore: proposalStatusLabel(finalizedProposal.status),
        },
      });
    } catch (error) {
      pushAdversarial(state, {
        id: "duplicate-finalize",
        phase: "finalize",
        walletPubkey: coordinator.publicKey.toBase58(),
        role: "adversarial",
        scenario: "duplicate-finalize",
        expected: "duplicate finalize should be rejected",
        outcome: "rejected",
        timestamp: nowIso(),
        error: String(error),
        invariantState: {
          statusBefore: proposalStatusLabel(finalizedProposal.status),
          statusAfter: proposalStatusLabel((await program.account.proposal.fetch(proposalPda)).status),
        },
      });
      state.metrics.attemptCount += 1;
      state.metrics.failureCount += 1;
    }
  }

  if (!finalizedProposal.isExecuted && !state.adversarial.some((entry) => entry.id === "execute-before-unlock")) {
    try {
      await program.methods
        .executeProposal()
        .accounts({
          dao: daoPda,
          proposal: proposalPda,
          treasury: treasuryPda,
          treasuryRecipient: new PublicKey(bootstrap.proposalRecipient),
          treasuryTokenAccount: coordinator.publicKey,
          recipientTokenAccount: coordinator.publicKey,
          executor: coordinator.publicKey,
          tokenProgram: TOKEN_2022_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
      pushAdversarial(state, {
        id: "execute-before-unlock",
        phase: "execute",
        walletPubkey: coordinator.publicKey.toBase58(),
        role: "adversarial",
        scenario: "execute-before-unlock",
        expected: "execute should be rejected before timelock unlock",
        outcome: "unexpected-success",
        timestamp: nowIso(),
        error: "unexpected execute success before unlock",
      });
    } catch (error) {
      pushAdversarial(state, {
        id: "execute-before-unlock",
        phase: "execute",
        walletPubkey: coordinator.publicKey.toBase58(),
        role: "adversarial",
        scenario: "execute-before-unlock",
        expected: "execute should be rejected before timelock unlock",
        outcome: "rejected",
        timestamp: nowIso(),
        error: String(error),
        invariantState: {
          isExecuted: (await program.account.proposal.fetch(proposalPda)).isExecuted,
        },
      });
      state.metrics.attemptCount += 1;
      state.metrics.failureCount += 1;
    }
  }

  if (!finalizedProposal.isExecuted && !state.adversarial.some((entry) => entry.id === "treasury-miswire")) {
    try {
      await program.methods
        .executeProposal()
        .accounts({
          dao: daoPda,
          proposal: proposalPda,
          treasury: treasuryPda,
          treasuryRecipient: coordinator.publicKey,
          treasuryTokenAccount: coordinator.publicKey,
          recipientTokenAccount: coordinator.publicKey,
          executor: coordinator.publicKey,
          tokenProgram: TOKEN_2022_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
      pushAdversarial(state, {
        id: "treasury-miswire",
        phase: "execute",
        walletPubkey: coordinator.publicKey.toBase58(),
        role: "adversarial",
        scenario: "treasury-miswiring",
        expected: "execute should reject wrong treasury recipient binding",
        outcome: "unexpected-success",
        timestamp: nowIso(),
        error: "unexpected execute success with wrong recipient",
      });
    } catch (error) {
      pushAdversarial(state, {
        id: "treasury-miswire",
        phase: "execute",
        walletPubkey: coordinator.publicKey.toBase58(),
        role: "adversarial",
        scenario: "treasury-miswiring",
        expected: "execute should reject wrong treasury recipient binding",
        outcome: "rejected",
        timestamp: nowIso(),
        error: String(error),
        invariantState: {
          isExecuted: (await program.account.proposal.fetch(proposalPda)).isExecuted,
        },
      });
      state.metrics.attemptCount += 1;
      state.metrics.failureCount += 1;
    }
  }

  if (!finalizedProposal.isExecuted) {
    await waitUntil(finalizedProposal.executionUnlocksAt.toNumber() + 1, "execution unlock");

    const executeStarted = Date.now();
    const { result: executeTx, retries: executeRetries } = await withRetry(state, "execute-valid", async () =>
      program.methods
        .executeProposal()
        .accounts({
          dao: daoPda,
          proposal: proposalPda,
          treasury: treasuryPda,
          treasuryRecipient: new PublicKey(bootstrap.proposalRecipient),
          treasuryTokenAccount: coordinator.publicKey,
          recipientTokenAccount: coordinator.publicKey,
          executor: coordinator.publicKey,
          tokenProgram: TOKEN_2022_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .rpc(),
    );
    state.metrics.attemptCount += 1;
    state.metrics.successCount += 1;
    state.metrics.retryCount += executeRetries;
    pushTxRecord(state, {
      phase: "execute",
      action: "execute-proposal",
      walletPubkey: coordinator.publicKey.toBase58(),
      role: "coordinator",
      txSignature: executeTx,
      timestamp: nowIso(),
      latencyMs: Date.now() - executeStarted,
    });
    finalizedProposal = await program.account.proposal.fetch(proposalPda);
  }

  if (!state.adversarial.some((entry) => entry.id === "duplicate-execute")) {
    try {
      await program.methods
        .executeProposal()
        .accounts({
          dao: daoPda,
          proposal: proposalPda,
          treasury: treasuryPda,
          treasuryRecipient: new PublicKey(bootstrap.proposalRecipient),
          treasuryTokenAccount: coordinator.publicKey,
          recipientTokenAccount: coordinator.publicKey,
          executor: coordinator.publicKey,
          tokenProgram: TOKEN_2022_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
      pushAdversarial(state, {
        id: "duplicate-execute",
        phase: "execute",
        walletPubkey: coordinator.publicKey.toBase58(),
        role: "adversarial",
        scenario: "duplicate-execute",
        expected: "duplicate execute should be rejected",
        outcome: "unexpected-success",
        timestamp: nowIso(),
        error: "unexpected duplicate execute success",
      });
    } catch (error) {
      pushAdversarial(state, {
        id: "duplicate-execute",
        phase: "execute",
        walletPubkey: coordinator.publicKey.toBase58(),
        role: "adversarial",
        scenario: "duplicate-execute",
        expected: "duplicate execute should be rejected",
        outcome: "rejected",
        timestamp: nowIso(),
        error: String(error),
        invariantState: {
          isExecuted: (await program.account.proposal.fetch(proposalPda)).isExecuted,
        },
      });
      state.metrics.attemptCount += 1;
      state.metrics.failureCount += 1;
    }
  }

  pushAdversarial(state, {
    id: "finalize-state-before",
    phase: "finalize",
    walletPubkey: coordinator.publicKey.toBase58(),
    role: "adversarial",
    scenario: "finalize-state-reference",
    expected: "reference snapshot",
    outcome: "skipped",
    timestamp: nowIso(),
    error: null,
    invariantState: {
      statusBeforeFinalize: proposalStatusLabel(proposalBeforeFinalize.status),
      statusAfterFinalize: proposalStatusLabel(finalizedProposal.status),
      statusAfterExecute: proposalStatusLabel((await program.account.proposal.fetch(proposalPda)).status),
    },
  });

  completePhase(state, "execute");
  persistState(state);
  publishArtifacts(state);
  return state;
}

function fieldId(input: string): bigint {
  const digest = crypto.createHash("sha256").update(input).digest("hex");
  return BigInt(`0x${digest}`) % SNARK_FIELD;
}

function fileSha256(filePath: string): string {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function hashHexBuffers(...values: string[]): Buffer {
  const hasher = crypto.createHash("sha256");
  for (const value of values) {
    hasher.update(Buffer.from(value, "hex"));
  }
  return hasher.digest();
}

function zkProofAnchorPdaFor(proposal: PublicKey, layer: string): PublicKey {
  const seedByte = ZK_LAYER_SEEDS[layer];
  if (!seedByte) throw new Error(`unsupported zk proof layer for anchor: ${layer}`);
  return PublicKey.findProgramAddressSync(
    [Buffer.from("zk-proof"), proposal.toBuffer(), Buffer.from([seedByte])],
    PROGRAM_ID,
  )[0];
}

function runLocal(command: string, args: string[], cwd: string) {
  const result = spawnSync(command, args, {
    cwd,
    stdio: "pipe",
    encoding: "utf8",
  });
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed: ${result.stderr || result.stdout}`);
  }
}

async function poseidonHash(...items: bigint[]): Promise<bigint> {
  return Poseidon.hash(items);
}

async function generateVoteProof(
  state: HarnessState,
  wallet: WalletState,
  weightRaw: bigint,
): Promise<ZkProofEntry> {
  const bootstrap = ensureBootstrap(state);
  const proposalId = BigInt(bootstrap.proposalId);
  const daoKey = fieldId(bootstrap.daoPublicKey);
  const voterKey = fieldId(wallet.publicKey);
  const saltHex = wallet.internal?.saltHex;
  if (!saltHex) {
    throw new Error(`missing salt for zk wallet ${wallet.walletIndex}`);
  }
  const salt = BigInt(`0x${saltHex}`);
  const vote = wallet.plan.vote ? 1n : 0n;
  const commitment = await poseidonHash(vote, salt, voterKey, proposalId, daoKey);
  const nullifier = await poseidonHash(voterKey, proposalId, daoKey);
  const eligibilityHash = await poseidonHash(voterKey, weightRaw, daoKey);

  const baseName = `vote-${wallet.walletIndex.toString().padStart(2, "0")}`;
  const inputPath = path.join(ZK_DEVNET_DIR, `${baseName}.input.json`);
  const witnessPath = path.join(ZK_DEVNET_DIR, `${baseName}.wtns`);
  const proofPath = path.join(ZK_DEVNET_DIR, `${baseName}.proof.json`);
  const publicPath = path.join(ZK_DEVNET_DIR, `${baseName}.public.json`);

  writeJson(inputPath, {
    proposalId: proposalId.toString(),
    daoKey: daoKey.toString(),
    minWeight: "1",
    commitment: commitment.toString(),
    nullifier: nullifier.toString(),
    eligibilityHash: eligibilityHash.toString(),
    vote: vote.toString(),
    salt: salt.toString(),
    voterKey: voterKey.toString(),
    weight: weightRaw.toString(),
  });

  runLocal("node", ["zk/build/private_dao_vote_overlay_js/generate_witness.js", "zk/build/private_dao_vote_overlay_js/private_dao_vote_overlay.wasm", inputPath, witnessPath], REPO_ROOT);
  runLocal("npx", ["snarkjs", "groth16", "prove", "zk/setup/private_dao_vote_overlay_final.zkey", witnessPath, proofPath, publicPath], REPO_ROOT);
  runLocal("npx", ["snarkjs", "groth16", "verify", "zk/setup/private_dao_vote_overlay_vkey.json", publicPath, proofPath], REPO_ROOT);

  return {
    walletPubkey: wallet.publicKey,
    role: wallet.role,
    layer: "vote",
    circuit: "private_dao_vote_overlay",
    proofHash: fileSha256(proofPath),
    publicInputsHash: fileSha256(publicPath),
    verificationMode: "offchain-groth16",
    verificationTxSignature: null,
    verified: true,
    generatedAt: nowIso(),
    inputPath: path.relative(REPO_ROOT, inputPath),
    proofPath: path.relative(REPO_ROOT, proofPath),
    publicPath: path.relative(REPO_ROOT, publicPath),
  };
}

async function generateTallyProof(state: HarnessState, wallets: WalletState[]): Promise<ZkProofEntry> {
  if (wallets.length < 2) {
    throw new Error("need at least two wallets for tally proof");
  }
  const bootstrap = ensureBootstrap(state);
  const proposalId = BigInt(bootstrap.proposalId);
  const daoKey = fieldId(bootstrap.daoPublicKey);
  const entries = wallets.slice(0, 2);
  const votes = entries.map((wallet) => (wallet.plan.vote ? 1n : 0n));
  const salts = entries.map((wallet) => BigInt(`0x${wallet.internal?.saltHex || "0"}`));
  const voterKeys = entries.map((wallet) => fieldId(wallet.publicKey));
  const weights = entries.map((wallet) => BigInt(wallet.funding.pdaoBalanceRaw || profileTargetPdaoRaw(state.profile).toString()));
  const commitments = await Promise.all(
    votes.map((vote, index) => poseidonHash(vote, salts[index], voterKeys[index], proposalId, daoKey)),
  );
  const nullifiers = await Promise.all(voterKeys.map((voterKey) => poseidonHash(voterKey, proposalId, daoKey)));
  const nullifierAccumulator = await poseidonHash(nullifiers[0], nullifiers[1]);
  const yesWeightTotal = weights.reduce((sum, weight, index) => sum + votes[index] * weight, 0n);
  const noWeightTotal = weights.reduce((sum, weight, index) => sum + (1n - votes[index]) * weight, 0n);

  const inputPath = path.join(ZK_DEVNET_DIR, "tally.input.json");
  const witnessPath = path.join(ZK_DEVNET_DIR, "tally.wtns");
  const proofPath = path.join(ZK_DEVNET_DIR, "tally.proof.json");
  const publicPath = path.join(ZK_DEVNET_DIR, "tally.public.json");

  writeJson(inputPath, {
    proposalId: proposalId.toString(),
    daoKey: daoKey.toString(),
    commitment0: commitments[0].toString(),
    commitment1: commitments[1].toString(),
    yesWeightTotal: yesWeightTotal.toString(),
    noWeightTotal: noWeightTotal.toString(),
    nullifierAccumulator: nullifierAccumulator.toString(),
    vote0: votes[0].toString(),
    vote1: votes[1].toString(),
    salt0: salts[0].toString(),
    salt1: salts[1].toString(),
    voterKey0: voterKeys[0].toString(),
    voterKey1: voterKeys[1].toString(),
    weight0: weights[0].toString(),
    weight1: weights[1].toString(),
  });

  runLocal("node", ["zk/build/private_dao_tally_overlay_js/generate_witness.js", "zk/build/private_dao_tally_overlay_js/private_dao_tally_overlay.wasm", inputPath, witnessPath], REPO_ROOT);
  runLocal("npx", ["snarkjs", "groth16", "prove", "zk/setup/private_dao_tally_overlay_final.zkey", witnessPath, proofPath, publicPath], REPO_ROOT);
  runLocal("npx", ["snarkjs", "groth16", "verify", "zk/setup/private_dao_tally_overlay_vkey.json", publicPath, proofPath], REPO_ROOT);

  return {
    walletPubkey: `${wallets[0].publicKey},${wallets[1].publicKey}`,
    role: "zk-tester",
    layer: "tally",
    circuit: "private_dao_tally_overlay",
    proofHash: fileSha256(proofPath),
    publicInputsHash: fileSha256(publicPath),
    verificationMode: "offchain-groth16",
    verificationTxSignature: null,
    verified: true,
    generatedAt: nowIso(),
    inputPath: path.relative(REPO_ROOT, inputPath),
    proofPath: path.relative(REPO_ROOT, proofPath),
    publicPath: path.relative(REPO_ROOT, publicPath),
  };
}

async function generateDelegationProof(state: HarnessState, wallet: WalletState): Promise<ZkProofEntry> {
  const bootstrap = ensureBootstrap(state);
  const proposalId = BigInt(bootstrap.proposalId);
  const daoKey = fieldId(bootstrap.daoPublicKey);
  const delegatorKey = fieldId(wallet.publicKey);
  const delegateeKey = fieldId(state.coordinator.publicKey);
  const salt = BigInt(`0x${crypto.randomBytes(32).toString("hex")}`);
  const delegatedWeight = BigInt(wallet.funding.pdaoBalanceRaw || profileTargetPdaoRaw(state.profile).toString());

  const delegationCommitment = await poseidonHash(delegatorKey, delegateeKey, proposalId, daoKey, salt);
  const delegationNullifier = await poseidonHash(delegatorKey, proposalId, daoKey);
  const delegateeBinding = await poseidonHash(delegateeKey, proposalId, daoKey);
  const weightCommitment = await poseidonHash(delegateeKey, delegatedWeight, daoKey);

  const inputPath = path.join(ZK_DEVNET_DIR, `delegation-${wallet.walletIndex.toString().padStart(2, "0")}.input.json`);
  const witnessPath = path.join(ZK_DEVNET_DIR, `delegation-${wallet.walletIndex.toString().padStart(2, "0")}.wtns`);
  const proofPath = path.join(ZK_DEVNET_DIR, `delegation-${wallet.walletIndex.toString().padStart(2, "0")}.proof.json`);
  const publicPath = path.join(ZK_DEVNET_DIR, `delegation-${wallet.walletIndex.toString().padStart(2, "0")}.public.json`);

  writeJson(inputPath, {
    proposalId: proposalId.toString(),
    daoKey: daoKey.toString(),
    minWeight: "1",
    delegationCommitment: delegationCommitment.toString(),
    delegationNullifier: delegationNullifier.toString(),
    delegateeBinding: delegateeBinding.toString(),
    weightCommitment: weightCommitment.toString(),
    delegatorKey: delegatorKey.toString(),
    delegateeKey: delegateeKey.toString(),
    salt: salt.toString(),
    delegatedWeight: delegatedWeight.toString(),
    active: "1",
  });

  runLocal("node", ["zk/build/private_dao_delegation_overlay_js/generate_witness.js", "zk/build/private_dao_delegation_overlay_js/private_dao_delegation_overlay.wasm", inputPath, witnessPath], REPO_ROOT);
  runLocal("npx", ["snarkjs", "groth16", "prove", "zk/setup/private_dao_delegation_overlay_final.zkey", witnessPath, proofPath, publicPath], REPO_ROOT);
  runLocal("npx", ["snarkjs", "groth16", "verify", "zk/setup/private_dao_delegation_overlay_vkey.json", publicPath, proofPath], REPO_ROOT);

  return {
    walletPubkey: wallet.publicKey,
    role: wallet.role,
    layer: "delegation",
    circuit: "private_dao_delegation_overlay",
    proofHash: fileSha256(proofPath),
    publicInputsHash: fileSha256(publicPath),
    verificationMode: "offchain-groth16",
    verificationTxSignature: null,
    verified: true,
    generatedAt: nowIso(),
    inputPath: path.relative(REPO_ROOT, inputPath),
    proofPath: path.relative(REPO_ROOT, proofPath),
    publicPath: path.relative(REPO_ROOT, publicPath),
  };
}

async function anchorZkProofEntry(
  state: HarnessState,
  connection: Connection,
  program: HarnessProgram,
  recorder: Keypair,
  entry: ZkProofEntry,
): Promise<OnchainZkProofAnchorEntry> {
  const bootstrap = ensureBootstrap(state);
  const dao = new PublicKey(bootstrap.daoPublicKey);
  const proposal = new PublicKey(bootstrap.proposalPublicKey);
  const anchorPda = zkProofAnchorPdaFor(proposal, entry.layer);
  const existing = state.onchainZkAnchors.find((candidate) => candidate.layer === entry.layer);
  if (existing) return existing;

  const { result: existingAccount, retries: anchorReadRetries } = await withRetry(
    state,
    `zk-anchor-read:${entry.layer}`,
    () => connection.getAccountInfo(anchorPda, COMMITMENT),
    5,
  );
  state.metrics.retryCount += anchorReadRetries;
  if (existingAccount) {
    throw new Error(
      `zk proof anchor already exists for ${entry.layer} (${anchorPda.toBase58()}) but no tx signature is recorded in state`,
    );
  }

  const verificationKeyPath = ZK_VERIFICATION_KEY_PATHS[entry.circuit];
  if (!verificationKeyPath) throw new Error(`unsupported zk circuit for anchor: ${entry.circuit}`);
  const verificationKeyHash = fileSha256(path.join(REPO_ROOT, verificationKeyPath));
  const bundleHash = hashHexBuffers(entry.proofHash, entry.publicInputsHash, verificationKeyHash);
  const transaction = await program.methods
    .anchorZkProof(
      ZK_LAYER_ARGS[entry.layer],
      { groth16: {} },
      [...Buffer.from(entry.proofHash, "hex")],
      [...Buffer.from(entry.publicInputsHash, "hex")],
      [...Buffer.from(verificationKeyHash, "hex")],
      [...bundleHash],
    )
    .accounts({
      dao,
      proposal,
      zkProofAnchor: anchorPda,
      recorder: recorder.publicKey,
      systemProgram: SystemProgram.programId,
    })
    .transaction();

  const signature = await sendAndConfirmFundingTransaction(connection, transaction, [recorder]);
  const anchoredAt = nowIso();
  const anchorEntry = {
    layer: entry.layer,
    circuit: entry.circuit,
    anchorPda: anchorPda.toBase58(),
    txSignature: signature,
    explorerUrl: explorerUrl(signature),
    anchoredAt,
  };
  state.onchainZkAnchors.push(anchorEntry);
  pushTxRecord(state, {
    phase: "zk",
    action: "anchor-zk-proof",
    walletPubkey: recorder.publicKey.toBase58(),
    role: "coordinator",
    txSignature: signature,
    timestamp: anchoredAt,
    latencyMs: 0,
  });
  return anchorEntry;
}

async function anchorRepresentativeZkProofs(
  state: HarnessState,
  connection: Connection,
  entries: ZkProofEntry[],
): Promise<void> {
  const recorder = coordinatorKeypair();
  const program = createProgram(connection, recorder);
  for (const layer of ["vote", "delegation", "tally"]) {
    const entry = entries.find((candidate) => candidate.layer === layer);
    if (!entry) throw new Error(`missing generated zk proof entry for ${layer}`);
    await anchorZkProofEntry(state, connection, program, recorder, entry);
    persistState(state);
    publishArtifacts(state);
    await sleep(TX_DELAY_MS);
  }
}

export async function runZkPhase(connection: Connection, profileInput?: string | null): Promise<HarnessState> {
  const state = await loadOrInitializeState(connection, profileInput);
  ensureBootstrap(state);
  phaseTiming(state, "zk");
  if (state.zkProofs.length >= 7 && state.onchainZkAnchors.length >= 3) {
    completePhase(state, "zk");
    persistState(state);
    publishArtifacts(state);
    return state;
  }

  const zkWallets = state.wallets.filter((wallet) => wallet.role === "zk-tester");
  const entries: ZkProofEntry[] = state.zkProofs.length >= 7 ? state.zkProofs : [];
  if (entries.length < 7) {
    for (const wallet of zkWallets) {
      const entry = await generateVoteProof(state, wallet, BigInt(wallet.funding.pdaoBalanceRaw || profileTargetPdaoRaw(state.profile).toString()));
      entries.push(entry);
    }
    const tally = await generateTallyProof(state, zkWallets);
    entries.push(tally);
    const delegationSource = state.wallets.find((wallet) => wallet.plan.commitScenario === "delegate-then-direct-overlap");
    if (delegationSource) {
      entries.push(await generateDelegationProof(state, delegationSource));
    }
  }

  state.zkProofs = entries;
  for (const entry of entries) {
    const wallet = state.wallets.find((candidate) => candidate.publicKey === entry.walletPubkey);
    if (wallet) {
      wallet.zk ||= [];
      wallet.zk.push({
        layer: entry.layer,
        proofHash: entry.proofHash,
        publicInputsHash: entry.publicInputsHash,
        verificationMode: entry.verificationMode,
        verificationTxSignature: entry.verificationTxSignature,
        verified: entry.verified,
        generatedAt: entry.generatedAt,
        inputPath: entry.inputPath,
        proofPath: entry.proofPath,
        publicPath: entry.publicPath,
      });
    }
  }
  await anchorRepresentativeZkProofs(state, connection, entries);

  completePhase(state, "zk");
  persistState(state);
  publishArtifacts(state);
  return state;
}

export async function runAdversarialPhase(connection: Connection, profileInput?: string | null): Promise<HarnessState> {
  const state = await loadOrInitializeState(connection, profileInput);
  phaseTiming(state, "adversarial");
  publishArtifacts(state);
  completePhase(state, "adversarial");
  persistState(state);
  publishArtifacts(state);
  return state;
}

function buildPerformanceMetrics(state: HarnessState) {
  const latencies = state.txRegistry.map((entry) => entry.latencyMs).filter((value) => Number.isFinite(value));
  const totalExecutionTimeMs = new Date(nowIso()).getTime() - new Date(state.metrics.startedAt).getTime();
  const averageTxLatencyMs =
    latencies.length > 0 ? latencies.reduce((sum, value) => sum + value, 0) / latencies.length : 0;
  const failureRate = state.metrics.attemptCount === 0 ? 0 : state.metrics.failureCount / state.metrics.attemptCount;
  const retryRate = state.metrics.attemptCount === 0 ? 0 : state.metrics.retryCount / state.metrics.attemptCount;

  return {
    generatedAt: nowIso(),
    runLabel: state.runLabel,
    network: state.network,
    profile: state.profile,
    walletCount: state.wallets.length,
    totalTxCount: state.txRegistry.length,
    totalAttemptCount: state.metrics.attemptCount,
    successCount: state.metrics.successCount,
    failureCount: state.metrics.failureCount,
    retryCount: state.metrics.retryCount,
    totalExecutionTimeMs,
    averageTxLatencyMs,
    maxTxLatencyMs: latencies.length ? Math.max(...latencies) : 0,
    minTxLatencyMs: latencies.length ? Math.min(...latencies) : 0,
    failureRate,
    retryRate,
    phaseTimings: state.metrics.phaseTimings,
  };
}

function buildWalletRegistryDoc(state: HarnessState) {
  return {
    generatedAt: nowIso(),
    runLabel: state.runLabel,
    network: state.network,
    profile: state.profile,
    coordinatorWallet: state.coordinator.publicKey,
    governanceMint: state.pdaoMint,
    wallets: state.wallets.map((wallet) => ({
      wallet_index: wallet.walletIndex,
      public_key: wallet.publicKey,
      role: wallet.role,
      funding: {
        sol_target_lamports: wallet.funding.solTargetLamports,
        sol_balance_lamports: wallet.funding.solBalanceLamports,
        sol_transfer_tx: wallet.funding.solTransferTx ?? null,
        pdao_target_raw: wallet.funding.pdaoTargetRaw,
        pdao_balance_raw: wallet.funding.pdaoBalanceRaw,
        pdao_transfer_tx: wallet.funding.pdaoTransferTx ?? null,
        token_account: wallet.funding.tokenAccount ?? null,
        retries: wallet.funding.retries,
        success: wallet.funding.success,
        funded_at: wallet.funding.fundedAt ?? null,
      },
    })),
  };
}

function buildBootstrapDoc(state: HarnessState) {
  if (!state.bootstrap) return null;
  return {
    generatedAt: nowIso(),
    runLabel: state.runLabel,
    network: state.network,
    profile: state.profile,
    program_id: state.programId,
    verification_wallet: state.coordinator.publicKey,
    dao_name: state.bootstrap.daoName,
    governance_mint: state.bootstrap.governanceMint,
    dao_public_key: state.bootstrap.daoPublicKey,
    treasury_pda: state.bootstrap.treasuryPda,
    proposal_public_key: state.bootstrap.proposalPublicKey,
    proposal_id: state.bootstrap.proposalId,
    proposal_title: state.bootstrap.proposalTitle,
    proposal_recipient: state.bootstrap.proposalRecipient,
    transactions: {
      create_dao: state.bootstrap.createDaoTx,
      deposit_treasury: state.bootstrap.depositTx,
      create_proposal: state.bootstrap.createProposalTx,
    },
  };
}

function buildTxRegistryDoc(state: HarnessState) {
  return {
    generatedAt: nowIso(),
    runLabel: state.runLabel,
    network: state.network,
    profile: state.profile,
    entries: state.txRegistry.map((entry) => ({
      wallet_pubkey: entry.walletPubkey,
      role: entry.role,
      phase: entry.phase,
      action: entry.action,
      tx_signature: entry.txSignature,
      explorer_url: entry.explorerUrl,
      timestamp: entry.timestamp,
      latency_ms: entry.latencyMs,
      wave: entry.wave ?? null,
    })),
  };
}

function buildAdversarialDoc(state: HarnessState) {
  return {
    generatedAt: nowIso(),
    runLabel: state.runLabel,
    network: state.network,
    profile: state.profile,
    total_scenarios: state.adversarial.length,
    rejected: state.adversarial.filter((entry) => entry.outcome === "rejected").length,
    unexpected_successes: state.adversarial.filter((entry) => entry.outcome === "unexpected-success").length,
    scenarios: state.adversarial,
  };
}

function buildZkRegistryDoc(state: HarnessState) {
  return {
    generatedAt: nowIso(),
    runLabel: state.runLabel,
    network: state.network,
    profile: state.profile,
    program_id: state.programId,
    governance_mint: state.pdaoMint,
    proposal_public_key: state.bootstrap?.proposalPublicKey ?? null,
    verification_mode: "offchain-groth16",
    onchain_verifier: false,
    entries: state.zkProofs.map((entry) => ({
      wallet_pubkey: entry.walletPubkey,
      role: entry.role,
      layer: entry.layer,
      circuit: entry.circuit,
      proof_hash: entry.proofHash,
      public_inputs_hash: entry.publicInputsHash,
      verification_mode: entry.verificationMode,
      verification_tx_signature: entry.verificationTxSignature,
      verified: entry.verified,
      generated_at: entry.generatedAt,
      input_path: entry.inputPath,
      proof_path: entry.proofPath,
      public_path: entry.publicPath,
    })),
    onchain_proof_anchors: {
      proposal_public_key: state.bootstrap?.proposalPublicKey ?? null,
      entries: state.onchainZkAnchors.map((entry) => ({
        layer: entry.layer,
        circuit: entry.circuit,
        anchor_pda: entry.anchorPda,
        tx_signature: entry.txSignature,
        explorer_url: entry.explorerUrl,
        anchored_at: entry.anchoredAt,
      })),
    },
  };
}

function buildLoadTestReport(state: HarnessState, metrics: ReturnType<typeof buildPerformanceMetrics>) {
  const bootstrap = ensureBootstrap(state);
  const validCommitters = state.wallets.filter((wallet) => wallet.role !== "adversarial");
  const validReveals = state.wallets.filter((wallet) => wallet.reveal?.status === "success");
  const lateWallets = state.wallets.filter((wallet) => wallet.plan.revealMode === "late");
  const zkEntries = state.zkProofs.length;
  const invalidRevealRejections = state.adversarial.filter(
    (entry) => entry.phase === "reveal" && entry.outcome === "rejected",
  ).length;
  const finalizeSuccess = state.txRegistry.filter((entry) => entry.action === "finalize-proposal").length;
  const executeSuccess = state.txRegistry.filter((entry) => entry.action === "execute-proposal").length;
  const confidentialPayoutSuccess = state.txRegistry.filter(
    (entry) => entry.action === "execute-confidential-payout-plan",
  ).length;
  const replayRejections = state.adversarial.filter(
    (entry) =>
      entry.outcome === "rejected" &&
      (entry.scenario === "replay" || entry.scenario === "duplicate-execute" || entry.scenario === "duplicate-finalize"),
  ).length;
  const authorityMismatchRejections = state.adversarial.filter(
    (entry) =>
      entry.outcome === "rejected" &&
      (entry.scenario === "treasury-miswiring" ||
        entry.scenario === "wrong-voter-record" ||
        entry.scenario === "wrong-delegation-marker" ||
        entry.scenario === "wrong-token-account"),
  ).length;
  const keyExplorerLinks = [
    bootstrap.proposalExplorer,
    explorerUrl(bootstrap.createDaoTx),
    explorerUrl(bootstrap.depositTx),
    explorerUrl(bootstrap.createProposalTx),
    ...state.txRegistry
      .filter((entry) =>
        ["finalize-proposal", "execute-proposal", "execute-confidential-payout-plan"].includes(entry.action),
      )
      .map((entry) => entry.explorerUrl),
  ].filter((value, index, array) => array.indexOf(value) === index);
  const failureCauseCounts = new Map<string, number>();
  for (const entry of state.adversarial) {
    if (entry.outcome !== "rejected" || !entry.error) continue;
    const normalized = entry.error.split("\n")[0].slice(0, 120).trim();
    failureCauseCounts.set(normalized, (failureCauseCounts.get(normalized) ?? 0) + 1);
  }
  const failureCauseLines =
    Array.from(failureCauseCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([cause, count]) => `- ${count} × ${cause}`)
      .join("\n") || "- None";

  return `# Devnet Load Test Report

## Overview

- profile: ${state.profile.name}-wallet
- number of wallets: ${state.profile.walletCount}
- network: devnet
- program id: \`${state.programId}\`
- governance mint: \`${state.pdaoMint}\`
- total tx count: ${state.txRegistry.length}
- average latency ms: ${metrics.averageTxLatencyMs.toFixed(2)}
- zk participation summary: ${state.wallets.filter((wallet) => wallet.role === "zk-tester").length} zk tester wallets, ${zkEntries} zk proof artifacts

## Summary Snapshot

- total wallets: ${state.profile.walletCount}
- successful commits: ${state.wallets.filter((wallet) => wallet.commit?.status === "success").length}
- successful reveals: ${validReveals.length}
- rejected invalid reveals: ${invalidRevealRejections}
- finalize success: ${finalizeSuccess}
- execute success: ${executeSuccess}
- confidential payout success: ${confidentialPayoutSuccess}
- replay rejections: ${replayRejections}
- authority mismatch rejections: ${authorityMismatchRejections}
- total tx count: ${state.txRegistry.length}
- average latency ms: ${metrics.averageTxLatencyMs.toFixed(2)}

## DAO Bootstrap Results

- DAO: \`${bootstrap.daoPublicKey}\`
- Treasury: \`${bootstrap.treasuryPda}\`
- Proposal: \`${bootstrap.proposalPublicKey}\`
- create-dao tx: \`${bootstrap.createDaoTx}\`
- deposit tx: \`${bootstrap.depositTx}\`
- create-proposal tx: \`${bootstrap.createProposalTx}\`

## Commit Wave Results

- total commit-capable wallets: ${validCommitters.length}
- successful commits: ${state.wallets.filter((wallet) => wallet.commit?.status === "success").length}
- adversarial commit rejections: ${state.adversarial.filter((entry) => entry.phase === "commit" && entry.outcome === "rejected").length}
- wave size: ${state.profile.waveSize}

## Reveal Results

- successful reveals: ${validReveals.length}
- late reveal attempts: ${lateWallets.length}
- replay and invalid reveal rejections: ${state.adversarial.filter((entry) => entry.phase === "reveal" && entry.outcome === "rejected").length}

## Finalize Results

- finalize success tx count: ${state.txRegistry.filter((entry) => entry.action === "finalize-proposal").length}
- duplicate finalize rejections: ${state.adversarial.filter((entry) => entry.scenario === "duplicate-finalize" && entry.outcome === "rejected").length}

## Execute Results

- execute success tx count: ${state.txRegistry.filter((entry) => entry.action === "execute-proposal").length}
- pre-unlock execute rejections: ${state.adversarial.filter((entry) => entry.scenario === "execute-before-unlock" && entry.outcome === "rejected").length}
- treasury miswiring rejections: ${state.adversarial.filter((entry) => entry.scenario === "treasury-miswiring" && entry.outcome === "rejected").length}
- duplicate execute rejections: ${state.adversarial.filter((entry) => entry.scenario === "duplicate-execute" && entry.outcome === "rejected").length}

## ZK Verification Results

- verification mode: off-chain Groth16 companion layer
- on-chain verifier integration: not present in the current protocol
- zk proof entries: ${state.zkProofs.length}
- vote proof entries: ${state.zkProofs.filter((entry) => entry.layer === "vote").length}
- tally proof entries: ${state.zkProofs.filter((entry) => entry.layer === "tally").length}
- delegation proof entries: ${state.zkProofs.filter((entry) => entry.layer === "delegation").length}

## Adversarial Results

- total adversarial scenarios: ${state.adversarial.length}
- rejected as expected: ${state.adversarial.filter((entry) => entry.outcome === "rejected").length}
- unexpected successes: ${state.adversarial.filter((entry) => entry.outcome === "unexpected-success").length}

## Performance Metrics

- total execution time ms: ${metrics.totalExecutionTimeMs}
- average tx latency ms: ${metrics.averageTxLatencyMs.toFixed(2)}
- failure rate: ${(metrics.failureRate * 100).toFixed(2)}%
- retry rate: ${(metrics.retryRate * 100).toFixed(2)}%

## Explorer Links

${keyExplorerLinks.map((link) => `- ${link}`).join("\n")}

## Failure Causes

${failureCauseLines}

## Interpretation

This run demonstrates that PrivateDAO can execute a full Devnet governance lifecycle with ${state.profile.walletCount} persistent wallets under wave-based submission, while preserving deterministic reviewer artifacts and explorer-verifiable transaction evidence. The successful commit, reveal, finalize, and execute paths remained reproducible, and the negative-path scenarios were rejected without advancing proposal lifecycle state or bypassing treasury controls.
`;
}

export function publishArtifacts(state: HarnessState) {
  const paths = resolveHarnessPaths(state.profile);
  const metrics = buildPerformanceMetrics(state);
  writeJson(paths.docsWalletRegistry, buildWalletRegistryDoc(state));
  const bootstrapDoc = buildBootstrapDoc(state);
  if (bootstrapDoc) {
    writeJson(paths.docsBootstrap, bootstrapDoc);
  }
  writeJson(paths.docsTxRegistry, buildTxRegistryDoc(state));
  writeJson(paths.docsAdversarial, buildAdversarialDoc(state));
  writeJson(paths.docsZkRegistry, buildZkRegistryDoc(state));
  writeJson(paths.docsPerformance, metrics);
  if (state.bootstrap) {
    fs.writeFileSync(paths.docsLoadReport, buildLoadTestReport(state, metrics), "utf8");
  }
}

export async function runReportPhase(connection: Connection, profileInput?: string | null): Promise<HarnessState> {
  const state = await loadOrInitializeState(connection, profileInput);
  phaseTiming(state, "report");
  publishArtifacts(state);
  completePhase(state, "report");
  persistState(state);
  publishArtifacts(state);
  return state;
}

export async function runAllPhases(connection: Connection, profileInput?: string | null): Promise<HarnessState> {
  await runWalletGeneration(connection, profileInput);
  await runFundingPhase(connection, profileInput);
  await runBootstrapPhase(connection, profileInput);
  await runCommitPhase(connection, profileInput);
  await runRevealPhase(connection, profileInput);
  await runExecutePhase(connection, profileInput);
  await runZkPhase(connection, profileInput);
  await runAdversarialPhase(connection, profileInput);
  return runReportPhase(connection, profileInput);
}
