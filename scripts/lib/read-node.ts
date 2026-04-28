// SPDX-License-Identifier: AGPL-3.0-or-later
import * as fs from "fs";
import * as path from "path";
import * as anchor from "@coral-xyz/anchor";
import { clusterApiUrl, Commitment, Connection, PublicKey } from "@solana/web3.js";
import {
  getMagicBlockBalance,
  getMagicBlockHealth,
  getMagicBlockMintInitializationStatus,
  getMagicBlockPrivateBalance,
  magicBlockApiBase,
  magicBlockCluster,
} from "./magicblock-payments";

type CachedValue<T> = {
  expiresAt: number;
  value: T;
};

type TreasuryActionView = {
  actionType: string;
  actionTypeLabel: string;
  amountLamports: number;
  recipient: string;
  tokenMint: string | null;
};

export type DaoView = {
  pubkey: string;
  authority: string;
  daoName: string;
  governanceToken: string;
  quorumPercentage: number;
  governanceTokenRequired: number;
  revealWindowSeconds: number;
  executionDelaySeconds: number;
  votingConfig: string;
  proposalCount: number;
  bump: number;
};

export type ZkPolicyView = {
  pubkey: string;
  dao: string;
  proposal: string;
  configuredBy: string;
  mode: string;
  requiredLayersMask: number;
  configuredAt: number;
  bump: number;
};

export type ConfidentialPayoutPlanView = {
  pubkey: string;
  dao: string;
  proposal: string;
  configuredBy: string;
  payoutType: string;
  assetType: string;
  settlementRecipient: string;
  tokenMint: string | null;
  recipientCount: number;
  totalAmount: number;
  encryptedManifestUri: string;
  manifestHash: string;
  ciphertextHash: string;
  status: string;
  configuredAt: number;
  fundedAt: number;
  bump: number;
};

export type RefheEnvelopeView = {
  pubkey: string;
  dao: string;
  proposal: string;
  payoutPlan: string;
  configuredBy: string;
  settledBy: string | null;
  modelUri: string;
  policyHash: string;
  inputCiphertextHash: string;
  evaluationKeyHash: string;
  resultCiphertextHash: string;
  resultCommitmentHash: string;
  proofBundleHash: string;
  verifierProgram: string | null;
  status: string;
  configuredAt: number;
  settledAt: number;
  bump: number;
};

export type MagicBlockPrivatePaymentCorridorView = {
  pubkey: string;
  dao: string;
  proposal: string;
  payoutPlan: string;
  configuredBy: string;
  settledBy: string | null;
  apiBaseUrl: string;
  cluster: string;
  ownerWallet: string;
  settlementWallet: string;
  tokenMint: string;
  validator: string | null;
  transferQueue: string | null;
  routeHash: string;
  depositAmount: number;
  privateTransferAmount: number;
  withdrawalAmount: number;
  depositTxSignature: string;
  transferTxSignature: string;
  withdrawTxSignature: string;
  status: string;
  configuredAt: number;
  settledAt: number;
  bump: number;
};

export type ZkReceiptView = {
  pubkey: string;
  dao: string;
  proposal: string;
  verifiedBy: string;
  layer: string;
  proofSystem: string;
  verificationMode: string;
  verifierProgram: string | null;
  verifiedAt: number;
  bump: number;
};

export type ProposalView = {
  pubkey: string;
  dao: string;
  proposer: string;
  proposalId: number;
  title: string;
  description: string;
  status: string;
  votingEnd: number;
  revealEnd: number;
  executionUnlocksAt: number;
  isExecuted: boolean;
  yesCapital: number;
  noCapital: number;
  yesCommunity: number;
  noCommunity: number;
  commitCount: number;
  revealCount: number;
  treasuryAction: TreasuryActionView | null;
  phase: string;
  zkMode: string;
  zkRequiredLayersMask: number;
  zkPolicyPda: string | null;
  confidentialPayoutPlan: ConfidentialPayoutPlanView | null;
  refheEnvelope: RefheEnvelopeView | null;
  magicblockCorridor: MagicBlockPrivatePaymentCorridorView | null;
  zkReceiptSummary: ZkReceiptView[];
  daoDetails: DaoView | null;
};

export type RuntimeView = {
  generatedAt: string;
  readPath: "backend-indexer";
  rpcEndpoint: string;
  rpcPoolSize: number;
  commitment: Commitment;
  programId: string;
  slot: number;
  solanaCore: string;
  featureSet: string | number;
  latestBlockhash: string;
  lastValidBlockHeight: number;
  programExecutable: boolean;
  programOwner: string;
  cacheTtlMs: number;
};

export type WalletReadinessView = {
  wallet: string;
  dao: string;
  governanceMint: string;
  balanceUi: number;
  readiness: "READY" | "NO TOKEN";
};

export type LoadProfileSummary = {
  name: LoadProfileName;
  walletCount: number;
  waveSize: number;
  fundingWaveSize: number;
  targetPdaoUi: number;
  waveCount: number;
  negativeScenarios: string[];
};

export type OpsOverview = {
  generatedAt: string;
  proposals: number;
  uniqueDaos: number;
  zkEnforced: number;
  confidentialPayouts: number;
  magicblockConfigured: number;
  magicblockSettled: number;
  refheConfigured: number;
  refheSettled: number;
  refheWithVerifier: number;
  executableConfidential: number;
};

export type MagicBlockRuntimeView = {
  apiBase: string;
  cluster: string;
  health: string;
};

export type ReadNodeCacheStats = {
  entryCount: number;
  ttlMs: number;
};

type LoadProfileName = "50" | "100" | "350" | "500";

const envPath = path.join(__dirname, "..", "..", ".env");
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, "utf-8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim().replace(/\${([^}]+)}/g, (_, k) => process.env[k] ?? "");
    if (!process.env[key]) process.env[key] = val;
  }
}

function trimValue(value?: string): string {
  return (value || "").trim();
}

function isPlaceholderValue(value?: string): boolean {
  const normalized = trimValue(value);
  return (
    normalized.length === 0 ||
    normalized.includes("${") ||
    normalized === "your_helius_api_key_here" ||
    normalized === "your_alchemy_api_key_here" ||
    normalized === "your_rpc_url_here"
  );
}

function isValidRpcUrl(value?: string): boolean {
  const normalized = trimValue(value);
  return !isPlaceholderValue(normalized) && /^https?:\/\//.test(normalized);
}

function rpcTimeoutMs(): number {
  const parsed = Number(process.env.PRIVATE_DAO_RPC_TIMEOUT_MS || 8000);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 8000;
}

type RuntimeCluster = "devnet" | "testnet";

function resolveRuntimeCluster(): RuntimeCluster {
  const raw = trimValue(process.env.SOLANA_CLUSTER || process.env.NEXT_PUBLIC_SOLANA_NETWORK).toLowerCase();
  return raw === "devnet" ? "devnet" : "testnet";
}

function buildAlchemyDevnetRpc(): string | null {
  if (isValidRpcUrl(process.env.ALCHEMY_DEVNET_RPC_URL)) {
    return trimValue(process.env.ALCHEMY_DEVNET_RPC_URL);
  }
  if (!isPlaceholderValue(process.env.ALCHEMY_API_KEY)) {
    return `https://solana-devnet.g.alchemy.com/v2/${trimValue(process.env.ALCHEMY_API_KEY)}`;
  }
  return null;
}

function buildHeliusDevnetRpc(): string | null {
  if (!isPlaceholderValue(process.env.HELIUS_API_KEY)) {
    return `https://devnet.helius-rpc.com/?api-key=${trimValue(process.env.HELIUS_API_KEY)}`;
  }
  return null;
}

function collectExtraRpcs(cluster: RuntimeCluster) {
  const source = cluster === "devnet" ? process.env.EXTRA_DEVNET_RPCS : process.env.EXTRA_TESTNET_RPCS;
  const raw = trimValue(source);
  if (!raw) return [];
  return raw
    .split(",")
    .map((item) => trimValue(item))
    .filter((item) => item.length > 0);
}

export function resolveClusterRpcEndpoints(cluster: RuntimeCluster = resolveRuntimeCluster()): string[] {
  const endpoints: string[] = [];
  const add = (rpc?: string | null) => {
    const candidate = rpc ?? undefined;
    if (!isValidRpcUrl(candidate)) return;
    const normalized = trimValue(candidate);
    if (!endpoints.includes(normalized)) endpoints.push(normalized);
  };

  add(process.env.SOLANA_RPC_URL);
  if (cluster === "devnet") {
    add(buildAlchemyDevnetRpc());
    add(buildHeliusDevnetRpc());
    add(process.env.QUICKNODE_DEVNET_RPC);
    for (const rpc of collectExtraRpcs("devnet")) add(rpc);
    add(process.env.RPC_FAST_DEVNET_RPC);
    add(clusterApiUrl("devnet"));
    add("https://api.devnet.solana.com");
    return endpoints;
  }

  add(process.env.QUICKNODE_TESTNET_RPC);
  for (const rpc of collectExtraRpcs("testnet")) add(rpc);
  add(process.env.RPC_FAST_TESTNET_RPC);
  add(clusterApiUrl("testnet"));
  add("https://api.testnet.solana.com");
  return endpoints;
}

export function resolveRuntimeRpcEndpoints(): string[] {
  return resolveClusterRpcEndpoints(resolveRuntimeCluster());
}

export function resolveDevnetRpcEndpoints(): string[] {
  return resolveClusterRpcEndpoints("devnet");
}

const IDL_CANDIDATE_PATHS = [
  path.resolve(__dirname, "..", "..", "target", "idl", "private_dao.json"),
  path.resolve(__dirname, "..", "..", "deploy", "primary-host", "target", "idl", "private_dao.json"),
  path.resolve(__dirname, "..", "..", "idl", "private_dao.json"),
];

function resolveIdlPath() {
  const match = IDL_CANDIDATE_PATHS.find((candidate) => fs.existsSync(candidate));
  if (!match) {
    throw new Error(`Unable to resolve private_dao IDL. Checked: ${IDL_CANDIDATE_PATHS.join(", ")}`);
  }
  return match;
}

const IDL_PATH = resolveIdlPath();
const rawIdl = JSON.parse(fs.readFileSync(IDL_PATH, "utf8"));
const coder = new anchor.BorshCoder(rawIdl as anchor.Idl);

const LOAD_PROFILE_SUMMARIES: LoadProfileSummary[] = [
  {
    name: "50",
    walletCount: 50,
    waveSize: 10,
    fundingWaveSize: 5,
    targetPdaoUi: 100,
    waveCount: 5,
    negativeScenarios: ["wrong-voter-record", "wrong-delegation-marker", "wrong-token-account"],
  },
  {
    name: "100",
    walletCount: 100,
    waveSize: 20,
    fundingWaveSize: 10,
    targetPdaoUi: 100,
    waveCount: 5,
    negativeScenarios: ["wrong-voter-record", "wrong-delegation-marker", "wrong-token-account", "late-reveal"],
  },
  {
    name: "350",
    walletCount: 350,
    waveSize: 50,
    fundingWaveSize: 25,
    targetPdaoUi: 100,
    waveCount: 7,
    negativeScenarios: [
      "invalid-reveal",
      "late-reveal",
      "execute-replay",
      "wrong-vault",
      "wrong-authority",
      "payout-replay",
    ],
  },
  {
    name: "500",
    walletCount: 500,
    waveSize: 25,
    fundingWaveSize: 10,
    targetPdaoUi: 100,
    waveCount: 20,
    negativeScenarios: ["invalid-reveal", "late-reveal", "execute-replay", "wrong-authority", "payout-replay"],
  },
];

function asPublicKey(value: PublicKey): string {
  return value.toBase58();
}

function asNumber(value: any): number {
  if (typeof value === "number") return value;
  if (typeof value === "bigint") return Number(value);
  if (value && typeof value.toNumber === "function") return value.toNumber();
  return Number(value || 0);
}

function enumName(value: any, fallback = "Unknown"): string {
  if (!value || typeof value !== "object") return fallback;
  const keys = Object.keys(value);
  return keys.length ? keys[0] : fallback;
}

function votingConfigLabel(value: any): string {
  return enumName(value, "Unknown");
}

function actionTypeLabel(value: any): string {
  const label = enumName(value, "Unknown");
  return label === "SendSol" ? "Send SOL"
    : label === "SendSpl" ? "Send SPL"
    : label === "SendSpl2022" ? "Send SPL-2022"
    : label;
}

function statusLabel(value: any): string {
  return enumName(value, "Unknown");
}

function proofSystemLabel(value: any): string {
  return enumName(value, "Unknown");
}

function computePhase(proposal: ProposalView, nowTs: number): string {
  if (proposal.isExecuted) return "Executed";
  if (["Cancelled", "Vetoed", "Failed"].includes(proposal.status)) return proposal.status;
  if (proposal.status === "Voting" && nowTs < proposal.votingEnd) return "Commit";
  if (proposal.status === "Voting" && nowTs < proposal.revealEnd) return "Reveal";
  if (proposal.status === "Passed" && nowTs < proposal.executionUnlocksAt) return "Timelocked";
  if (proposal.status === "Passed" && nowTs >= proposal.executionUnlocksAt) return "Executable";
  return "Finalized";
}

function deriveProposalZkPolicyPda(proposalPubkey: string, programId: PublicKey): string {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("zk-policy"), new PublicKey(proposalPubkey).toBuffer()],
    programId,
  )[0].toBase58();
}

function deriveConfidentialPayoutPlanPda(proposalPubkey: string, programId: PublicKey): string {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("payout-plan"), new PublicKey(proposalPubkey).toBuffer()],
    programId,
  )[0].toBase58();
}

function deriveRefheEnvelopePda(proposalPubkey: string, programId: PublicKey): string {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("refhe-envelope"), new PublicKey(proposalPubkey).toBuffer()],
    programId,
  )[0].toBase58();
}

function deriveMagicBlockPrivatePaymentCorridorPda(proposalPubkey: string, programId: PublicKey): string {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("magicblock-corridor"), new PublicKey(proposalPubkey).toBuffer()],
    programId,
  )[0].toBase58();
}

function deriveZkReceiptPda(proposalPubkey: string, layerSeedByte: number, programId: PublicKey): string {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("zk-verify"), new PublicKey(proposalPubkey).toBuffer(), Buffer.from([layerSeedByte])],
    programId,
  )[0].toBase58();
}

function mapDaoAccount(pubkey: PublicKey, decoded: any): DaoView {
  return {
    pubkey: pubkey.toBase58(),
    authority: asPublicKey(decoded.authority),
    daoName: decoded.dao_name,
    governanceToken: asPublicKey(decoded.governance_token),
    quorumPercentage: decoded.quorum_percentage,
    governanceTokenRequired: asNumber(decoded.governance_token_required),
    revealWindowSeconds: asNumber(decoded.reveal_window_seconds),
    executionDelaySeconds: asNumber(decoded.execution_delay_seconds),
    votingConfig: votingConfigLabel(decoded.voting_config),
    proposalCount: asNumber(decoded.proposal_count),
    bump: decoded.bump,
  };
}

function mapProposalAccount(pubkey: PublicKey, decoded: any): ProposalView {
  const treasuryAction = decoded.treasury_action
    ? {
        actionType: enumName(decoded.treasury_action.action_type),
        actionTypeLabel: actionTypeLabel(decoded.treasury_action.action_type),
        amountLamports: asNumber(decoded.treasury_action.amount_lamports),
        recipient: asPublicKey(decoded.treasury_action.recipient),
        tokenMint: decoded.treasury_action.token_mint ? asPublicKey(decoded.treasury_action.token_mint) : null,
      }
    : null;

  const proposal: ProposalView = {
    pubkey: pubkey.toBase58(),
    dao: asPublicKey(decoded.dao),
    proposer: asPublicKey(decoded.proposer),
    proposalId: asNumber(decoded.proposal_id),
    title: decoded.title,
    description: decoded.description,
    status: statusLabel(decoded.status),
    votingEnd: asNumber(decoded.voting_end),
    revealEnd: asNumber(decoded.reveal_end),
    executionUnlocksAt: asNumber(decoded.execution_unlocks_at),
    isExecuted: Boolean(decoded.is_executed),
    yesCapital: asNumber(decoded.yes_capital),
    noCapital: asNumber(decoded.no_capital),
    yesCommunity: asNumber(decoded.yes_community),
    noCommunity: asNumber(decoded.no_community),
    commitCount: asNumber(decoded.commit_count),
    revealCount: asNumber(decoded.reveal_count),
    treasuryAction,
    phase: "Finalized",
    zkMode: "Companion",
    zkRequiredLayersMask: 0,
    zkPolicyPda: null,
    confidentialPayoutPlan: null,
    refheEnvelope: null,
    magicblockCorridor: null,
    zkReceiptSummary: [],
    daoDetails: null,
  };
  proposal.phase = computePhase(proposal, Math.floor(Date.now() / 1000));
  return proposal;
}

function mapPolicyAccount(pubkey: PublicKey, decoded: any): ZkPolicyView {
  return {
    pubkey: pubkey.toBase58(),
    dao: asPublicKey(decoded.dao),
    proposal: asPublicKey(decoded.proposal),
    configuredBy: asPublicKey(decoded.configured_by),
    mode: enumName(decoded.mode),
    requiredLayersMask: decoded.required_layers_mask,
    configuredAt: asNumber(decoded.configured_at),
    bump: decoded.bump,
  };
}

function mapConfidentialPayoutPlan(pubkey: PublicKey, decoded: any): ConfidentialPayoutPlanView {
  return {
    pubkey: pubkey.toBase58(),
    dao: asPublicKey(decoded.dao),
    proposal: asPublicKey(decoded.proposal),
    configuredBy: asPublicKey(decoded.configured_by),
    payoutType: enumName(decoded.payout_type),
    assetType: enumName(decoded.asset_type),
    settlementRecipient: asPublicKey(decoded.settlement_recipient),
    tokenMint: decoded.token_mint ? asPublicKey(decoded.token_mint) : null,
    recipientCount: decoded.recipient_count,
    totalAmount: asNumber(decoded.total_amount),
    encryptedManifestUri: decoded.encrypted_manifest_uri,
    manifestHash: Buffer.from(decoded.manifest_hash).toString("hex"),
    ciphertextHash: Buffer.from(decoded.ciphertext_hash).toString("hex"),
    status: enumName(decoded.status),
    configuredAt: asNumber(decoded.configured_at),
    fundedAt: asNumber(decoded.funded_at),
    bump: decoded.bump,
  };
}

function mapRefheEnvelope(pubkey: PublicKey, decoded: any): RefheEnvelopeView {
  return {
    pubkey: pubkey.toBase58(),
    dao: asPublicKey(decoded.dao),
    proposal: asPublicKey(decoded.proposal),
    payoutPlan: asPublicKey(decoded.payout_plan),
    configuredBy: asPublicKey(decoded.configured_by),
    settledBy: decoded.settled_by ? asPublicKey(decoded.settled_by) : null,
    modelUri: decoded.model_uri,
    policyHash: Buffer.from(decoded.policy_hash).toString("hex"),
    inputCiphertextHash: Buffer.from(decoded.input_ciphertext_hash).toString("hex"),
    evaluationKeyHash: Buffer.from(decoded.evaluation_key_hash).toString("hex"),
    resultCiphertextHash: Buffer.from(decoded.result_ciphertext_hash).toString("hex"),
    resultCommitmentHash: Buffer.from(decoded.result_commitment_hash).toString("hex"),
    proofBundleHash: Buffer.from(decoded.proof_bundle_hash).toString("hex"),
    verifierProgram: decoded.verifier_program ? asPublicKey(decoded.verifier_program) : null,
    status: enumName(decoded.status),
    configuredAt: asNumber(decoded.configured_at),
    settledAt: asNumber(decoded.settled_at),
    bump: decoded.bump,
  };
}

function mapMagicBlockCorridor(pubkey: PublicKey, decoded: any): MagicBlockPrivatePaymentCorridorView {
  return {
    pubkey: pubkey.toBase58(),
    dao: asPublicKey(decoded.dao),
    proposal: asPublicKey(decoded.proposal),
    payoutPlan: asPublicKey(decoded.payout_plan),
    configuredBy: asPublicKey(decoded.configured_by),
    settledBy: decoded.settled_by ? asPublicKey(decoded.settled_by) : null,
    apiBaseUrl: decoded.api_base_url,
    cluster: decoded.cluster,
    ownerWallet: asPublicKey(decoded.owner_wallet),
    settlementWallet: asPublicKey(decoded.settlement_wallet),
    tokenMint: asPublicKey(decoded.token_mint),
    validator: decoded.validator ? asPublicKey(decoded.validator) : null,
    transferQueue: decoded.transfer_queue ? asPublicKey(decoded.transfer_queue) : null,
    routeHash: Buffer.from(decoded.route_hash).toString("hex"),
    depositAmount: asNumber(decoded.deposit_amount),
    privateTransferAmount: asNumber(decoded.private_transfer_amount),
    withdrawalAmount: asNumber(decoded.withdrawal_amount),
    depositTxSignature: decoded.deposit_tx_signature,
    transferTxSignature: decoded.transfer_tx_signature,
    withdrawTxSignature: decoded.withdraw_tx_signature,
    status: enumName(decoded.status),
    configuredAt: asNumber(decoded.configured_at),
    settledAt: asNumber(decoded.settled_at),
    bump: decoded.bump,
  };
}

function mapReceipt(pubkey: PublicKey, decoded: any): ZkReceiptView {
  return {
    pubkey: pubkey.toBase58(),
    dao: asPublicKey(decoded.dao),
    proposal: asPublicKey(decoded.proposal),
    verifiedBy: asPublicKey(decoded.verified_by),
    layer: enumName(decoded.layer),
    proofSystem: proofSystemLabel(decoded.proof_system),
    verificationMode: enumName(decoded.verification_mode),
    verifierProgram: decoded.verifier_program ? asPublicKey(decoded.verifier_program) : null,
    verifiedAt: asNumber(decoded.verified_at),
    bump: decoded.bump,
  };
}

async function fetchMany(
  connection: Connection,
  keys: PublicKey[],
  commitment: Commitment,
): Promise<(import("@solana/web3.js").AccountInfo<Buffer> | null)[]> {
  const chunkSize = 100;
  const results: (import("@solana/web3.js").AccountInfo<Buffer> | null)[] = [];
  for (let i = 0; i < keys.length; i += chunkSize) {
    const chunk = keys.slice(i, i + chunkSize);
    const infos = await connection.getMultipleAccountsInfo(chunk, commitment);
    results.push(...infos);
  }
  return results;
}

export class PrivateDaoReadNode {
  readonly commitment: Commitment;
  readonly cacheTtlMs: number;
  readonly programId: PublicKey;
  readonly rpcEndpoints: string[];
  private readonly caches = new Map<string, CachedValue<any>>();
  private currentRpcIndex = 0;
  private connection: Connection;

  constructor({
    commitment = "confirmed",
    cacheTtlMs = Number(process.env.PRIVATE_DAO_READ_CACHE_TTL_MS || 15000),
    programId = new PublicKey(process.env.PRIVATE_DAO_PROGRAM_ID || rawIdl.address),
    rpcEndpoints = resolveRuntimeRpcEndpoints(),
  }: {
    commitment?: Commitment;
    cacheTtlMs?: number;
    programId?: PublicKey;
    rpcEndpoints?: string[];
  } = {}) {
    this.commitment = commitment;
    this.cacheTtlMs = cacheTtlMs;
    this.programId = programId;
    this.rpcEndpoints = rpcEndpoints;
    this.connection = new Connection(this.rpcEndpoints[this.currentRpcIndex], this.commitment);
  }

  private cacheKey(key: string, value: string) {
    return `${key}:${value}`;
  }

  private getCached<T>(key: string): T | null {
    const hit = this.caches.get(key);
    if (!hit || hit.expiresAt < Date.now()) {
      this.caches.delete(key);
      return null;
    }
    return hit.value as T;
  }

  private setCached<T>(key: string, value: T) {
    this.caches.set(key, { value, expiresAt: Date.now() + this.cacheTtlMs });
  }

  currentRpcEndpoint() {
    return this.rpcEndpoints[this.currentRpcIndex];
  }

  cacheStats(): ReadNodeCacheStats {
    for (const [key, value] of this.caches.entries()) {
      if (value.expiresAt < Date.now()) {
        this.caches.delete(key);
      }
    }
    return {
      entryCount: this.caches.size,
      ttlMs: this.cacheTtlMs,
    };
  }

  rotateRpcEndpoint() {
    this.currentRpcIndex = (this.currentRpcIndex + 1) % this.rpcEndpoints.length;
    this.connection = new Connection(this.currentRpcEndpoint(), this.commitment);
    return this.currentRpcEndpoint();
  }

  private isRecoverableRpcError(error: unknown): boolean {
    const message = String((error as any)?.message || error || "").toLowerCase();
    return (
      message.includes("429") ||
      message.includes("400") ||
      message.includes("fetch failed") ||
      message.includes("network") ||
      message.includes("timed out") ||
      message.includes("node is behind") ||
      message.includes("blockhash not found")
    );
  }

  async withRpcFallback<T>(operation: (connection: Connection) => Promise<T>, attempts = this.rpcEndpoints.length): Promise<T> {
    let lastError: unknown = null;
    for (let attempt = 0; attempt < attempts; attempt += 1) {
      try {
        return await Promise.race<T>([
          operation(this.connection),
          new Promise<T>((_, reject) =>
            setTimeout(() => reject(new Error(`RPC request timed out after ${rpcTimeoutMs()}ms`)), rpcTimeoutMs()),
          ),
        ]);
      } catch (error) {
        lastError = error;
        if (!this.isRecoverableRpcError(error) || attempt === attempts - 1) {
          throw error;
        }
        this.rotateRpcEndpoint();
      }
    }
    throw lastError;
  }

  async getRuntimeSnapshot(force = false): Promise<RuntimeView> {
    const key = this.cacheKey("runtime", "global");
    if (!force) {
      const cached = this.getCached<RuntimeView>(key);
      if (cached) return cached;
    }

    const [version, latest, slot, programInfo] = await Promise.all([
      this.withRpcFallback((connection) => connection.getVersion()),
      this.withRpcFallback((connection) => connection.getLatestBlockhash(this.commitment)),
      this.withRpcFallback((connection) => connection.getSlot(this.commitment)),
      this.withRpcFallback((connection) => connection.getAccountInfo(this.programId, this.commitment)),
    ]);

    const snapshot: RuntimeView = {
      generatedAt: new Date().toISOString(),
      readPath: "backend-indexer",
      rpcEndpoint: this.currentRpcEndpoint(),
      rpcPoolSize: this.rpcEndpoints.length,
      commitment: this.commitment,
      programId: this.programId.toBase58(),
      slot,
      solanaCore: version["solana-core"] || "unknown",
      featureSet: version["feature-set"] || "unknown",
      latestBlockhash: latest.blockhash,
      lastValidBlockHeight: latest.lastValidBlockHeight,
      programExecutable: Boolean(programInfo?.executable),
      programOwner: programInfo?.owner?.toBase58() || "unavailable",
      cacheTtlMs: this.cacheTtlMs,
    };
    this.setCached(key, snapshot);
    return snapshot;
  }

  async fetchDao(daoPubkey: string): Promise<DaoView> {
    const key = this.cacheKey("dao", daoPubkey);
    const cached = this.getCached<DaoView>(key);
    if (cached) return cached;

    const pubkey = new PublicKey(daoPubkey);
    const info = await this.withRpcFallback((connection) => connection.getAccountInfo(pubkey, this.commitment));
    if (!info) throw new Error(`DAO account not found: ${daoPubkey}`);
    const decoded = coder.accounts.decode("Dao", info.data);
    const dao = mapDaoAccount(pubkey, decoded);
    this.setCached(key, dao);
    return dao;
  }

  async fetchWalletReadiness(daoPubkey: string, walletPubkey: string): Promise<WalletReadinessView> {
    const dao = await this.fetchDao(daoPubkey);
    const owner = new PublicKey(walletPubkey);
    const mint = new PublicKey(dao.governanceToken);
    const parsed = await this.withRpcFallback((connection) =>
      connection.getParsedTokenAccountsByOwner(owner, { mint }, this.commitment),
    );
    const balanceUi = parsed.value.reduce((sum, accountInfo) => {
      const uiAmount = Number(accountInfo.account.data?.parsed?.info?.tokenAmount?.uiAmount || 0);
      return sum + (Number.isFinite(uiAmount) ? uiAmount : 0);
    }, 0);

    return {
      wallet: walletPubkey,
      dao: daoPubkey,
      governanceMint: dao.governanceToken,
      balanceUi,
      readiness: balanceUi > 0 ? "READY" : "NO TOKEN",
    };
  }

  getLoadProfiles(): LoadProfileSummary[] {
    return LOAD_PROFILE_SUMMARIES.map((profile) => ({ ...profile, negativeScenarios: [...profile.negativeScenarios] }));
  }

  async fetchProposals({ dao, force = false }: { dao?: string; force?: boolean } = {}): Promise<ProposalView[]> {
    const key = this.cacheKey("proposals", dao || "all");
    if (!force) {
      const cached = this.getCached<ProposalView[]>(key);
      if (cached) return cached;
    }

    const accounts = await this.withRpcFallback((connection) => connection.getProgramAccounts(this.programId));
    const proposals = accounts.flatMap((account) => {
      try {
        const decoded = coder.accounts.decode("Proposal", account.account.data);
        return [mapProposalAccount(account.pubkey, decoded)];
      } catch {
        return [];
      }
    });

    const filtered = dao ? proposals.filter((proposal) => proposal.dao === dao) : proposals;
    const daoKeys = [...new Set(filtered.map((proposal) => proposal.dao))].map((item) => new PublicKey(item));
    const policyKeys = filtered.map((proposal) => new PublicKey(deriveProposalZkPolicyPda(proposal.pubkey, this.programId)));
    const payoutKeys = filtered.map((proposal) => new PublicKey(deriveConfidentialPayoutPlanPda(proposal.pubkey, this.programId)));
    const refheKeys = filtered.map((proposal) => new PublicKey(deriveRefheEnvelopePda(proposal.pubkey, this.programId)));
    const magicBlockKeys = filtered.map((proposal) => new PublicKey(deriveMagicBlockPrivatePaymentCorridorPda(proposal.pubkey, this.programId)));
    const receiptKeys = filtered.flatMap((proposal) => [1, 2, 3].map((seed) => new PublicKey(deriveZkReceiptPda(proposal.pubkey, seed, this.programId))));

    const [daoInfos, policyInfos, payoutInfos, refheInfos, magicBlockInfos, receiptInfos] = await Promise.all([
      daoKeys.length ? this.withRpcFallback((connection) => fetchMany(connection, daoKeys, this.commitment)) : Promise.resolve([]),
      policyKeys.length ? this.withRpcFallback((connection) => fetchMany(connection, policyKeys, this.commitment)) : Promise.resolve([]),
      payoutKeys.length ? this.withRpcFallback((connection) => fetchMany(connection, payoutKeys, this.commitment)) : Promise.resolve([]),
      refheKeys.length ? this.withRpcFallback((connection) => fetchMany(connection, refheKeys, this.commitment)) : Promise.resolve([]),
      magicBlockKeys.length ? this.withRpcFallback((connection) => fetchMany(connection, magicBlockKeys, this.commitment)) : Promise.resolve([]),
      receiptKeys.length ? this.withRpcFallback((connection) => fetchMany(connection, receiptKeys, this.commitment)) : Promise.resolve([]),
    ]);

    const daoMap = new Map<string, DaoView>();
    daoInfos.forEach((info, index) => {
      if (!info) return;
      const pubkey = daoKeys[index];
      const decoded = coder.accounts.decode("Dao", info.data);
      daoMap.set(pubkey.toBase58(), mapDaoAccount(pubkey, decoded));
    });

    filtered.forEach((proposal, index) => {
      proposal.daoDetails = daoMap.get(proposal.dao) || null;

      const policyInfo = policyInfos[index];
      if (policyInfo) {
        const decoded = coder.accounts.decode("ProposalZkPolicy", policyInfo.data);
        const mapped = mapPolicyAccount(policyKeys[index], decoded);
        proposal.zkMode = mapped.mode;
        proposal.zkRequiredLayersMask = mapped.requiredLayersMask;
        proposal.zkPolicyPda = mapped.pubkey;
      }

      const payoutInfo = payoutInfos[index];
      if (payoutInfo) {
        const decoded = coder.accounts.decode("ConfidentialPayoutPlan", payoutInfo.data);
        proposal.confidentialPayoutPlan = mapConfidentialPayoutPlan(payoutKeys[index], decoded);
      }

      const refheInfo = refheInfos[index];
      if (refheInfo) {
        const decoded = coder.accounts.decode("RefheEnvelope", refheInfo.data);
        proposal.refheEnvelope = mapRefheEnvelope(refheKeys[index], decoded);
      }

      const magicBlockInfo = magicBlockInfos[index];
      if (magicBlockInfo) {
        const decoded = coder.accounts.decode("MagicBlockPrivatePaymentCorridor", magicBlockInfo.data);
        proposal.magicblockCorridor = mapMagicBlockCorridor(magicBlockKeys[index], decoded);
      }

      const offset = index * 3;
      proposal.zkReceiptSummary = [0, 1, 2].map((receiptIndex) => {
        const info = receiptInfos[offset + receiptIndex];
        if (!info) {
          return {
            pubkey: deriveZkReceiptPda(proposal.pubkey, receiptIndex + 1, this.programId),
            dao: proposal.dao,
            proposal: proposal.pubkey,
            verifiedBy: "",
            layer: ["Vote", "Delegation", "Tally"][receiptIndex],
            proofSystem: "Groth16",
            verificationMode: "Missing",
            verifierProgram: null,
            verifiedAt: 0,
            bump: 0,
          };
        }
        const decoded = coder.accounts.decode("ZkVerificationReceipt", info.data);
        return mapReceipt(receiptKeys[offset + receiptIndex], decoded);
      });

      proposal.phase = computePhase(proposal, Math.floor(Date.now() / 1000));
    });

    filtered.sort((a, b) => b.proposalId - a.proposalId);
    this.setCached(key, filtered);
    return filtered;
  }

  async fetchProposal(proposalPubkey: string): Promise<ProposalView> {
    const existing = (await this.fetchProposals()).find((proposal) => proposal.pubkey === proposalPubkey);
    if (!existing) throw new Error(`Proposal not found: ${proposalPubkey}`);
    return existing;
  }

  async getOpsOverview(force = false): Promise<OpsOverview> {
    const key = this.cacheKey("ops-overview", "global");
    if (!force) {
      const cached = this.getCached<OpsOverview>(key);
      if (cached) return cached;
    }

    const proposals = await this.fetchProposals({ force });
    const overview: OpsOverview = {
      generatedAt: new Date().toISOString(),
      proposals: proposals.length,
      uniqueDaos: new Set(proposals.map((proposal) => proposal.dao)).size,
      zkEnforced: proposals.filter((proposal) => proposal.zkMode === "ZkEnforced").length,
      confidentialPayouts: proposals.filter((proposal) => Boolean(proposal.confidentialPayoutPlan)).length,
      magicblockConfigured: proposals.filter((proposal) => Boolean(proposal.magicblockCorridor)).length,
      magicblockSettled: proposals.filter((proposal) => proposal.magicblockCorridor?.status === "Settled").length,
      refheConfigured: proposals.filter((proposal) => Boolean(proposal.refheEnvelope)).length,
      refheSettled: proposals.filter((proposal) => proposal.refheEnvelope?.status === "Settled").length,
      refheWithVerifier: proposals.filter((proposal) => Boolean(proposal.refheEnvelope?.verifierProgram)).length,
      executableConfidential: proposals.filter(
        (proposal) => Boolean(proposal.confidentialPayoutPlan) && proposal.phase === "Executable",
      ).length,
    };
    this.setCached(key, overview);
    return overview;
  }

  async getMagicBlockRuntime(force = false): Promise<MagicBlockRuntimeView> {
    const key = this.cacheKey("magicblock-runtime", "global");
    if (!force) {
      const cached = this.getCached<MagicBlockRuntimeView>(key);
      if (cached) return cached;
    }
    let health = "unavailable";
    try {
      health = (await getMagicBlockHealth(magicBlockApiBase())).status;
    } catch {
      health = "unavailable";
    }
    const runtime: MagicBlockRuntimeView = {
      apiBase: magicBlockApiBase(),
      cluster: magicBlockCluster(),
      health,
    };
    this.setCached(key, runtime);
    return runtime;
  }

  async getMagicBlockMintStatus(mint: string, validator?: string, force = false) {
    const key = this.cacheKey("magicblock-mint", `${mint}:${validator || "default"}`);
    if (!force) {
      const cached = this.getCached<any>(key);
      if (cached) return cached;
    }
    const status = await getMagicBlockMintInitializationStatus({
      mint,
      cluster: magicBlockCluster(),
      validator,
    }, magicBlockApiBase());
    this.setCached(key, status);
    return status;
  }

  async getMagicBlockBalances(address: string, mint: string, force = false) {
    const key = this.cacheKey("magicblock-balances", `${address}:${mint}`);
    if (!force) {
      const cached = this.getCached<any>(key);
      if (cached) return cached;
    }
    const [baseBalance, privateBalance] = await Promise.all([
      getMagicBlockBalance({ address, mint, cluster: magicBlockCluster() }, magicBlockApiBase()),
      getMagicBlockPrivateBalance({ address, mint, cluster: magicBlockCluster() }, magicBlockApiBase()),
    ]);
    const balances = { baseBalance, privateBalance };
    this.setCached(key, balances);
    return balances;
  }
}

export const __testables = {
  trimValue,
  isPlaceholderValue,
  isValidRpcUrl,
  rpcTimeoutMs,
  buildAlchemyDevnetRpc,
  buildHeliusDevnetRpc,
  actionTypeLabel,
  statusLabel,
  proofSystemLabel,
  computePhase,
  deriveProposalZkPolicyPda,
  deriveConfidentialPayoutPlanPda,
  deriveRefheEnvelopePda,
  deriveMagicBlockPrivatePaymentCorridorPda,
  deriveZkReceiptPda,
  mapDaoAccount,
  mapProposalAccount,
  mapPolicyAccount,
  mapConfidentialPayoutPlan,
  mapRefheEnvelope,
  mapMagicBlockCorridor,
  mapReceipt,
};
