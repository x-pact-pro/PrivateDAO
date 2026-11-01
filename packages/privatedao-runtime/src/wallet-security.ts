import { createHash } from "node:crypto";
import { ml_dsa65 } from "@noble/post-quantum/ml-dsa.js";
import { ml_kem768 } from "@noble/post-quantum/ml-kem.js";
import nacl from "tweetnacl";

export type WalletMode = "b2b" | "b2c" | "autonomous";
export type WalletRole = "owner" | "admin" | "maker" | "approver" | "auditor" | "consumer" | "agent";
export type WalletAction = "quote" | "transfer" | "pay" | "rebalance" | "withdraw" | "sign";
export type WalletSignerBoundary = "external" | "managed";

const walletModes = ["b2b", "b2c", "autonomous"] as const;
const walletActions = ["quote", "transfer", "pay", "rebalance", "withdraw", "sign"] as const;
const ML_DSA_65_PUBLIC_KEY_BYTES = 1952;
const ED25519_PUBLIC_KEY_BYTES = 32;

export interface AuthenticatedTenantPrincipal {
  tenantId: string;
  organizationId: string;
  subjectId: string;
  roles: readonly WalletRole[];
  issuer: string;
  authenticatedAt: string;
}

export interface WalletPolicy {
  mode: WalletMode;
  allowedActions: readonly WalletAction[];
  allowedNetworks: readonly string[];
  allowedAssets: readonly string[];
  allowedDestinations?: readonly string[];
  perActionLimitAtomic: bigint;
  dailyLimitAtomic: bigint;
  requireApprovalAboveAtomic: bigint;
  autonomousEnabled: boolean;
  signerBoundary: WalletSignerBoundary;
  recoveryWindowSeconds: number;
  /** Require a hybrid authorization envelope bound to the request and policy. */
  requireHybridAuthorization?: boolean;
}

export interface HybridAuthorizationEnvelopeInput {
  scheme: "ed25519+ml-dsa-65";
  providerId: string;
  keyId: string;
  message: Uint8Array | readonly number[];
  classicalSignature: Uint8Array | readonly number[];
  pqcSignature: Uint8Array | readonly number[];
}

export interface WalletActionRequest {
  requestId: string;
  idempotencyKey: string;
  tenantId: string;
  organizationId: string;
  subjectId: string;
  actorSubjectId?: string;
  mode: WalletMode;
  action: WalletAction;
  network: string;
  asset: string;
  amountAtomic: bigint;
  destination: string;
  requiresApproval?: boolean;
  approvalConfirmed?: boolean;
  createdAt: string;
  hybridAuthorization?: HybridAuthorizationEnvelope | HybridAuthorizationEnvelopeInput;
}

export interface WalletAuthorizationDecision {
  allowed: boolean;
  reason: string;
  approvalRequired: boolean;
  replayKey: string;
  receiptCommitment: string;
}

export interface WalletAuditEvent {
  eventId: string;
  eventType: "wallet.authorization.checked";
  tenantId: string;
  organizationId: string;
  subjectId: string;
  mode: WalletMode;
  action: WalletAction;
  requestId: string;
  idempotencyKey: string;
  allowed: boolean;
  approvalRequired: boolean;
  receiptCommitment: string;
  occurredAt: string;
}

export interface WalletOperationalAuditEvent {
  eventId: string;
  eventType: "wallet.recovery.requested" | "wallet.recovery.finalized";
  tenantId: string;
  organizationId: string;
  subjectId: string;
  walletId: string;
  occurredAt: string;
  metadata?: Readonly<Record<string, string | number | boolean>>;
}

export interface WalletExecutionSession {
  executionId: string;
  tenantId: string;
  organizationId: string;
  subjectId: string;
  mode: WalletMode;
  requestId: string;
  network: string;
  receiptCommitment: string;
  prepared: unknown;
  createdAt: string;
  expiresAt: string;
}

export interface WalletSecurityStore {
  loadPolicy(input: { tenantId: string; organizationId: string; mode: WalletMode }): Promise<WalletPolicy | undefined>;
  reserve(input: {
    replayKey: string;
    tenantId: string;
    organizationId: string;
    subjectId: string;
    dayKey: string;
    amountAtomic: bigint;
    dailyLimitAtomic: bigint;
    requestFingerprint: string;
    consume: boolean;
  }): Promise<{ accepted: boolean; duplicate: boolean; conflict: boolean; dailyTotalAtomic: bigint }>;
  appendAudit(event: WalletAuditEvent): Promise<void>;
  appendOperationalAudit?(event: WalletOperationalAuditEvent): Promise<void>;
  saveExecutionSession?(session: WalletExecutionSession): Promise<void>;
  loadExecutionSession?(input: { executionId: string; tenantId: string; organizationId: string; subjectId: string }): Promise<WalletExecutionSession | undefined>;
}

export interface HybridAuthorizationVerifier {
  verify(envelope: HybridAuthorizationEnvelope | HybridAuthorizationEnvelopeInput): boolean;
}

/** Public-key-only verification boundary; signing material stays in custody. */
export class ConfiguredHybridAuthorizationVerifier implements HybridAuthorizationVerifier {
  private readonly keys = new Map<string, HybridAuthorizationPublicKeys>();

  constructor(private readonly provider: PqcProvider, publicKeys: readonly HybridAuthorizationPublicKeys[]) {
    if (!provider.isAvailable()) throw new Error("PQC provider is unavailable.");
    if (publicKeys.filter((publicKey) => publicKey.status === "active").length !== 1) {
      throw new Error("Hybrid authorization public-key registry must contain exactly one active key.");
    }
    for (const publicKey of publicKeys) {
      if (!publicKey.keyId.trim() || (publicKey.status !== "active" && publicKey.status !== "retired")) {
        throw new Error("Hybrid authorization public-key records are invalid.");
      }
      if (publicKey.pqcPublicKey.length !== ML_DSA_65_PUBLIC_KEY_BYTES || publicKey.classicalPublicKey.length !== ED25519_PUBLIC_KEY_BYTES) {
        throw new Error("Hybrid authorization public-key lengths do not match ML-DSA-65 and Ed25519.");
      }
      if (this.keys.has(publicKey.keyId)) throw new Error("Hybrid authorization public-key IDs must be unique.");
      this.keys.set(publicKey.keyId, {
        ...publicKey,
        pqcPublicKey: Uint8Array.from(publicKey.pqcPublicKey),
        classicalPublicKey: Uint8Array.from(publicKey.classicalPublicKey),
      });
    }
  }

  verify(input: HybridAuthorizationEnvelope | HybridAuthorizationEnvelopeInput): boolean {
    const envelope = normalizeHybridAuthorizationEnvelope(input);
    const publicKey = this.keys.get(envelope.keyId);
    if (!publicKey) return false;
    return verifyHybridAuthorizationEnvelope(this.provider, envelope, publicKey.pqcPublicKey, publicKey.classicalPublicKey);
  }
}

export function createHybridAuthorizationVerifierFromEnv(
  env: NodeJS.ProcessEnv = process.env,
  provider: PqcProvider = createNoblePqcProvider(),
): HybridAuthorizationVerifier | undefined {
  const raw = env.PDAO_PQC_PUBLIC_KEYS_JSON?.trim();
  if (!raw) return undefined;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("PDAO_PQC_PUBLIC_KEYS_JSON must be valid JSON.");
  }
  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error("PDAO_PQC_PUBLIC_KEYS_JSON must contain at least one public-key record.");
  }
  const publicKeys = parsed.map((record) => {
    if (!record || typeof record !== "object" || Array.isArray(record)) throw new Error("Hybrid authorization public-key records are invalid.");
    const value = record as Record<string, unknown>;
    if (typeof value.keyId !== "string" || typeof value.status !== "string" || typeof value.pqcPublicKey !== "string" || typeof value.classicalPublicKey !== "string") {
      throw new Error("Hybrid authorization public-key records require keyId, status, and base64 public keys.");
    }
    return {
      keyId: value.keyId,
      status: value.status as HybridAuthorizationPublicKeys["status"],
      pqcPublicKey: decodePublicKey(value.pqcPublicKey),
      classicalPublicKey: decodePublicKey(value.classicalPublicKey),
    } satisfies HybridAuthorizationPublicKeys;
  });
  return new ConfiguredHybridAuthorizationVerifier(provider, publicKeys);
}

export function assertWalletActionRequestShape(request: WalletActionRequest): void {
  const requiredStrings: Array<keyof WalletActionRequest> = [
    "requestId",
    "idempotencyKey",
    "tenantId",
    "organizationId",
    "subjectId",
    "network",
    "asset",
    "destination",
    "createdAt",
  ];
  for (const field of requiredStrings) {
    if (typeof request[field] !== "string" || request[field].trim().length === 0) {
      throw new Error(`Wallet request field ${field} is required.`);
    }
  }
  if (!walletModes.includes(request.mode)) throw new Error("Wallet request mode is invalid.");
  if (!walletActions.includes(request.action)) throw new Error("Wallet request action is invalid.");
  if (typeof request.amountAtomic !== "bigint" || request.amountAtomic < 0n) throw new Error("Wallet request amountAtomic must be a non-negative bigint.");
  if (request.actorSubjectId !== undefined && (typeof request.actorSubjectId !== "string" || request.actorSubjectId.trim().length === 0)) throw new Error("Wallet request actorSubjectId is invalid.");
  if (request.requiresApproval !== undefined && typeof request.requiresApproval !== "boolean") throw new Error("Wallet request requiresApproval is invalid.");
  if (request.approvalConfirmed !== undefined && typeof request.approvalConfirmed !== "boolean") throw new Error("Wallet request approvalConfirmed is invalid.");
  if (Number.isNaN(Date.parse(request.createdAt))) throw new Error("Wallet request createdAt must be an ISO timestamp.");
}

export function assertWalletPolicyConfiguration(policy: WalletPolicy): void {
  if (!walletModes.includes(policy.mode)) throw new Error("Wallet policy mode is invalid.");
  if (policy.allowedActions.length === 0 || policy.allowedNetworks.length === 0 || policy.allowedAssets.length === 0) {
    throw new Error("Wallet policy allowlists must not be empty.");
  }
  if (policy.perActionLimitAtomic < 0n || policy.dailyLimitAtomic < 0n || policy.requireApprovalAboveAtomic < 0n) {
    throw new Error("Wallet policy limits must be non-negative.");
  }
  if (policy.perActionLimitAtomic > policy.dailyLimitAtomic) throw new Error("Wallet per-action limit cannot exceed the daily limit.");
  if (!Number.isInteger(policy.recoveryWindowSeconds) || policy.recoveryWindowSeconds < 1 || policy.recoveryWindowSeconds > 31_536_000) {
    throw new Error("Wallet recovery window must be between one second and one year.");
  }
  if (policy.mode === "autonomous" && (!policy.autonomousEnabled || policy.signerBoundary !== "managed" || !policy.allowedDestinations?.length)) {
    throw new Error("Autonomous policy requires enabled managed signing and an explicit destination allowlist.");
  }
}

export interface QuantumSecurityPosture {
  profile: "hybrid-v1";
  classicalAlgorithm: "ed25519";
  pqcKeyEncapsulation: "ml-kem-768";
  pqcSignature: "ml-dsa-65";
  status: "provider-configured";
  providerId?: string;
  claimable: false;
}

export interface HybridAuthorizationEnvelope {
  scheme: "ed25519+ml-dsa-65";
  providerId: string;
  keyId: string;
  message: Uint8Array;
  classicalSignature: Uint8Array;
  pqcSignature: Uint8Array;
}

export interface HybridAuthorizationPublicKeys {
  keyId: string;
  pqcPublicKey: Uint8Array;
  classicalPublicKey: Uint8Array;
  status: "active" | "retired";
}

export interface PqcProvider {
  readonly id: string;
  readonly keyEncapsulation: "ml-kem-768";
  readonly signature: "ml-dsa-65";
  isAvailable(): boolean;
  generateKemKeyPair(): { publicKey: Uint8Array; secretKey: Uint8Array };
  encapsulate(publicKey: Uint8Array): { cipherText: Uint8Array; sharedSecret: Uint8Array };
  decapsulate(cipherText: Uint8Array, secretKey: Uint8Array): Uint8Array;
  generateSignatureKeyPair(): { publicKey: Uint8Array; secretKey: Uint8Array };
  sign(message: Uint8Array, secretKey: Uint8Array): Uint8Array;
  verify(signature: Uint8Array, message: Uint8Array, publicKey: Uint8Array): boolean;
  generateClassicalKeyPair(): { publicKey: Uint8Array; secretKey: Uint8Array };
  signClassical(message: Uint8Array, secretKey: Uint8Array): Uint8Array;
  verifyClassical(signature: Uint8Array, message: Uint8Array, publicKey: Uint8Array): boolean;
}

export class NoblePqcProvider implements PqcProvider {
  readonly id = "noble-post-quantum-0.7.1";
  readonly keyEncapsulation = "ml-kem-768" as const;
  readonly signature = "ml-dsa-65" as const;

  isAvailable(): boolean {
    return typeof ml_kem768.keygen === "function" && typeof ml_dsa65.keygen === "function";
  }

  generateKemKeyPair(): { publicKey: Uint8Array; secretKey: Uint8Array } {
    return ml_kem768.keygen();
  }

  encapsulate(publicKey: Uint8Array): { cipherText: Uint8Array; sharedSecret: Uint8Array } {
    return ml_kem768.encapsulate(publicKey);
  }

  decapsulate(cipherText: Uint8Array, secretKey: Uint8Array): Uint8Array {
    return ml_kem768.decapsulate(cipherText, secretKey);
  }

  generateSignatureKeyPair(): { publicKey: Uint8Array; secretKey: Uint8Array } {
    return ml_dsa65.keygen();
  }

  sign(message: Uint8Array, secretKey: Uint8Array): Uint8Array {
    return ml_dsa65.sign(message, secretKey);
  }

  verify(signature: Uint8Array, message: Uint8Array, publicKey: Uint8Array): boolean {
    return ml_dsa65.verify(signature, message, publicKey);
  }

  generateClassicalKeyPair(): { publicKey: Uint8Array; secretKey: Uint8Array } {
    const pair = nacl.sign.keyPair();
    return { publicKey: Uint8Array.from(pair.publicKey), secretKey: Uint8Array.from(pair.secretKey) };
  }

  signClassical(message: Uint8Array, secretKey: Uint8Array): Uint8Array {
    return Uint8Array.from(nacl.sign.detached(message, secretKey));
  }

  verifyClassical(signature: Uint8Array, message: Uint8Array, publicKey: Uint8Array): boolean {
    return nacl.sign.detached.verify(message, signature, publicKey);
  }
}

export const createNoblePqcProvider = (): PqcProvider => new NoblePqcProvider();

export function createHybridAuthorizationEnvelope(provider: PqcProvider, message: Uint8Array, secretKey: Uint8Array, classicalSecretKey: Uint8Array, keyId = "active-v1"): HybridAuthorizationEnvelope {
  if (!provider.isAvailable()) throw new Error("PQC provider is unavailable.");
  if (!keyId.trim()) throw new Error("Hybrid authorization key ID is required.");
  return {
    scheme: "ed25519+ml-dsa-65",
    providerId: provider.id,
    keyId,
    message: Uint8Array.from(message),
    classicalSignature: provider.signClassical(message, classicalSecretKey),
    pqcSignature: provider.sign(message, secretKey),
  };
}

export function verifyHybridAuthorizationEnvelope(provider: PqcProvider, envelope: HybridAuthorizationEnvelope, publicKey: Uint8Array, classicalPublicKey: Uint8Array): boolean {
  if (envelope.scheme !== "ed25519+ml-dsa-65" || envelope.providerId !== provider.id) return false;
  return provider.verify(envelope.pqcSignature, envelope.message, publicKey)
    && provider.verifyClassical(envelope.classicalSignature, envelope.message, classicalPublicKey);
}

/**
 * In-memory key agility for local verification and rotation drills. Production
 * deployments must keep secret material in an approved KMS/HSM instead.
 */
export class HybridAuthorizationKeyRing {
  private readonly keys = new Map<string, {
    pqcSecretKey: Uint8Array;
    classicalSecretKey: Uint8Array;
    public: HybridAuthorizationPublicKeys;
  }>();
  private activeKeyId?: string;

  constructor(private readonly provider: PqcProvider) {
    if (!provider.isAvailable()) throw new Error("PQC provider is unavailable.");
  }

  rotate(keyId: string): HybridAuthorizationPublicKeys {
    if (!keyId.trim() || this.keys.has(keyId)) throw new Error("Hybrid authorization key ID must be non-empty and unique.");
    const pqc = this.provider.generateSignatureKeyPair();
    const classical = this.provider.generateClassicalKeyPair();
    const publicKeys: HybridAuthorizationPublicKeys = {
      keyId,
      pqcPublicKey: Uint8Array.from(pqc.publicKey),
      classicalPublicKey: Uint8Array.from(classical.publicKey),
      status: "active",
    };
    if (this.activeKeyId) {
      const previous = this.keys.get(this.activeKeyId);
      if (previous) previous.public = { ...previous.public, status: "retired" };
    }
    this.keys.set(keyId, { pqcSecretKey: pqc.secretKey, classicalSecretKey: classical.secretKey, public: publicKeys });
    this.activeKeyId = keyId;
    return publicKeys;
  }

  retire(keyId: string): void {
    const key = this.keys.get(keyId);
    if (!key) throw new Error("Hybrid authorization key was not found.");
    if (this.activeKeyId === keyId) throw new Error("Rotate to a new active key before retiring the active key.");
    key.public = { ...key.public, status: "retired" };
  }

  sign(message: Uint8Array): HybridAuthorizationEnvelope {
    if (!this.activeKeyId) throw new Error("No active hybrid authorization key is configured.");
    const key = this.keys.get(this.activeKeyId);
    if (!key) throw new Error("Active hybrid authorization key is unavailable.");
    return createHybridAuthorizationEnvelope(this.provider, message, key.pqcSecretKey, key.classicalSecretKey, this.activeKeyId);
  }

  verify(envelope: HybridAuthorizationEnvelope | HybridAuthorizationEnvelopeInput): boolean {
    const normalized = normalizeHybridAuthorizationEnvelope(envelope);
    const key = this.keys.get(normalized.keyId);
    return Boolean(key && verifyHybridAuthorizationEnvelope(this.provider, normalized, key.public.pqcPublicKey, key.public.classicalPublicKey));
  }

  publicKeys(): readonly HybridAuthorizationPublicKeys[] {
    return [...this.keys.values()].map(({ public: publicKeys }) => ({
      ...publicKeys,
      pqcPublicKey: Uint8Array.from(publicKeys.pqcPublicKey),
      classicalPublicKey: Uint8Array.from(publicKeys.classicalPublicKey),
    }));
  }
}

export function quantumSecurityPosture(provider: PqcProvider): QuantumSecurityPosture {
  if (provider.keyEncapsulation !== "ml-kem-768" || provider.signature !== "ml-dsa-65" || !provider.isAvailable()) {
    throw new Error("Configured PQC provider is unavailable or does not match the approved hybrid profile.");
  }
  return {
    profile: "hybrid-v1",
    classicalAlgorithm: "ed25519",
    pqcKeyEncapsulation: "ml-kem-768",
    pqcSignature: "ml-dsa-65",
    status: "provider-configured",
    providerId: provider.id,
    claimable: false,
  };
}

export function assertTenantPrincipal(principal: AuthenticatedTenantPrincipal, request: WalletActionRequest): void {
  if (!principal.tenantId || !principal.organizationId || !principal.subjectId || !principal.issuer) throw new Error("Authenticated tenant principal is incomplete.");
  const actorSubjectId = request.actorSubjectId || request.subjectId;
  if (principal.tenantId !== request.tenantId || principal.organizationId !== request.organizationId || principal.subjectId !== actorSubjectId) {
    throw new Error("Caller identity does not match the server-authoritative tenant binding.");
  }
  if (!request.approvalConfirmed && request.subjectId !== actorSubjectId) throw new Error("A non-approval wallet action must be submitted by the wallet subject.");
}

export function assertWalletPolicy(
  policy: WalletPolicy,
  request: WalletActionRequest,
  principal: AuthenticatedTenantPrincipal,
  hybridVerifier?: HybridAuthorizationVerifier,
): void {
  assertWalletPolicyConfiguration(policy);
  assertWalletActionRequestShape(request);
  assertTenantPrincipal(principal, request);
  if (policy.mode !== request.mode) throw new Error("Wallet mode does not match the policy.");
  if (!policy.allowedActions.includes(request.action)) throw new Error("Wallet action is outside the policy allowlist.");
  if (!policy.allowedNetworks.includes(request.network)) throw new Error("Wallet network is outside the policy allowlist.");
  if (!policy.allowedAssets.includes(request.asset)) throw new Error("Wallet asset is outside the policy allowlist.");
  if (policy.allowedDestinations?.length && !policy.allowedDestinations.includes(request.destination)) {
    throw new Error("Wallet destination is outside the policy allowlist.");
  }
  if (request.amountAtomic < 0n || request.amountAtomic > policy.perActionLimitAtomic) throw new Error("Wallet action exceeds the per-action limit.");
  if (request.mode === "autonomous" && !policy.autonomousEnabled) throw new Error("Autonomous wallet actions are disabled by policy.");
  if (request.mode === "autonomous" && !principal.roles.includes("agent")) throw new Error("Autonomous wallet actions require an agent principal.");
  if (request.mode === "autonomous" && policy.signerBoundary !== "managed") throw new Error("Autonomous wallet actions require a managed signer boundary.");
  if (request.mode === "autonomous" && !policy.allowedDestinations?.length) throw new Error("Autonomous wallet actions require an explicit destination allowlist.");
  if (request.mode === "b2b" && request.approvalConfirmed) {
    if (!principal.roles.some((role) => ["owner", "admin", "approver"].includes(role))) throw new Error("B2B approval requires an approver role.");
    if (principal.subjectId === request.subjectId) throw new Error("B2B approval requires a distinct principal from the wallet subject.");
  } else if (request.mode === "b2b" && !principal.roles.some((role) => ["owner", "admin", "maker"].includes(role))) throw new Error("B2B wallet action requires an organization role.");
  if (request.mode === "b2c" && !principal.roles.some((role) => ["owner", "consumer"].includes(role))) throw new Error("B2C wallet action requires a consumer role.");
  if (policy.requireHybridAuthorization) {
    if (!hybridVerifier || !request.hybridAuthorization) throw new Error("Hybrid wallet authorization is required by policy.");
    const envelope = normalizeHybridAuthorizationEnvelope(request.hybridAuthorization);
    if (!hybridVerifier.verify(envelope)) throw new Error("Hybrid wallet authorization could not be verified.");
    if (!bytesEqual(envelope.message, createWalletAuthorizationMessage(policy, request))) {
      throw new Error("Hybrid wallet authorization is not bound to this request and policy.");
    }
  }
}

export function createWalletAuthorizationMessage(policy: WalletPolicy, request: WalletActionRequest): Uint8Array {
  return new TextEncoder().encode(digest({ policy: publicPolicy(policy), request: publicRequest(request) }));
}

export class WalletSecurityGuard {
  private readonly usedKeys = new Set<string>();
  private readonly dailyTotals = new Map<string, bigint>();

  constructor(
    private readonly now: () => string = () => new Date().toISOString(),
    private readonly hybridVerifier?: HybridAuthorizationVerifier,
  ) {}

  authorize(principal: AuthenticatedTenantPrincipal, policy: WalletPolicy, request: WalletActionRequest): { decision: WalletAuthorizationDecision; audit: WalletAuditEvent } {
    const replayKey = `${request.tenantId}:${request.organizationId}:${request.idempotencyKey}`;
    const receiptCommitment = digest({ principal, policy: publicPolicy(policy), request: publicRequest(request), replayKey });
    let allowed = true;
    let reason = "authorized";
    let approvalRequired = request.requiresApproval === true || request.amountAtomic > policy.requireApprovalAboveAtomic;
    try {
      assertWalletPolicy(policy, request, principal, this.hybridVerifier);
      if (this.usedKeys.has(replayKey)) throw new Error("Wallet request was already consumed.");
      const dayKey = request.createdAt.slice(0, 10);
      const dailyKey = `${request.tenantId}:${request.organizationId}:${request.subjectId}:${dayKey}`;
      const nextTotal = (this.dailyTotals.get(dailyKey) || 0n) + request.amountAtomic;
      if (nextTotal > policy.dailyLimitAtomic) throw new Error("Wallet action exceeds the daily limit.");
      if (approvalRequired && !request.approvalConfirmed) {
        reason = "approval_required";
      } else {
        this.usedKeys.add(replayKey);
        this.dailyTotals.set(dailyKey, nextTotal);
      }
    } catch (error) {
      allowed = false;
      reason = error instanceof Error ? error.message : "wallet authorization failed";
      approvalRequired = false;
    }
    const decision = { allowed, reason, approvalRequired, replayKey, receiptCommitment };
    const audit: WalletAuditEvent = {
      eventId: `wallet_audit_${receiptCommitment.slice(0, 24)}`,
      eventType: "wallet.authorization.checked",
      tenantId: principal.tenantId,
      organizationId: principal.organizationId,
      subjectId: principal.subjectId,
      mode: request.mode,
      action: request.action,
      requestId: request.requestId,
      idempotencyKey: request.idempotencyKey,
      allowed,
      approvalRequired,
      receiptCommitment,
      occurredAt: this.now(),
    };
    return { decision, audit };
  }
}

export class PersistentWalletSecurityGuard {
  constructor(
    private readonly store: WalletSecurityStore,
    private readonly now: () => string = () => new Date().toISOString(),
    private readonly hybridVerifier?: HybridAuthorizationVerifier,
  ) {}

  async authorize(principal: AuthenticatedTenantPrincipal, policy: WalletPolicy, request: WalletActionRequest): Promise<{ decision: WalletAuthorizationDecision; audit: WalletAuditEvent }> {
    const replayKey = `${request.tenantId}:${request.organizationId}:${request.idempotencyKey}`;
    const receiptCommitment = digest({ principal, policy: publicPolicy(policy), request: publicRequest(request), replayKey });
    let allowed = true;
    let reason = "authorized";
    let approvalRequired = request.requiresApproval === true;
    try {
      assertWalletPolicy(policy, request, principal, this.hybridVerifier);
      const storedPolicy = await this.store.loadPolicy({ tenantId: request.tenantId, organizationId: request.organizationId, mode: request.mode });
      if (!storedPolicy) throw new Error("No server-side wallet policy is configured for this tenant and mode.");
      assertWalletPolicy(storedPolicy, request, principal, this.hybridVerifier);
      approvalRequired = request.requiresApproval === true || request.amountAtomic > storedPolicy.requireApprovalAboveAtomic;
      const dayKey = request.createdAt.slice(0, 10);
      const reservation = await this.store.reserve({
        replayKey,
        tenantId: request.tenantId,
        organizationId: request.organizationId,
        subjectId: request.subjectId,
        dayKey,
        amountAtomic: request.amountAtomic,
        dailyLimitAtomic: storedPolicy.dailyLimitAtomic,
        requestFingerprint: requestFingerprint(request),
        consume: !(approvalRequired && !request.approvalConfirmed),
      });
      if (reservation.duplicate) throw new Error("Wallet request was already consumed.");
      if (reservation.conflict) throw new Error("Wallet approval does not match the original request.");
      if (!reservation.accepted) throw new Error("Wallet action exceeds the daily limit.");
      if (approvalRequired && !request.approvalConfirmed) reason = "approval_required";
    } catch (error) {
      allowed = false;
      reason = error instanceof Error ? error.message : "wallet authorization failed";
      approvalRequired = false;
    }
    const decision = { allowed, reason, approvalRequired, replayKey, receiptCommitment };
    const audit: WalletAuditEvent = {
      eventId: `wallet_audit_${receiptCommitment.slice(0, 24)}`,
      eventType: "wallet.authorization.checked",
      tenantId: principal.tenantId,
      organizationId: principal.organizationId,
      subjectId: principal.subjectId,
      mode: request.mode,
      action: request.action,
      requestId: request.requestId,
      idempotencyKey: request.idempotencyKey,
      allowed,
      approvalRequired,
      receiptCommitment,
      occurredAt: this.now(),
    };
    await this.store.appendAudit(audit);
    return { decision, audit };
  }
}

function publicPolicy(policy: WalletPolicy): Record<string, unknown> {
  return { ...policy, perActionLimitAtomic: policy.perActionLimitAtomic.toString(), dailyLimitAtomic: policy.dailyLimitAtomic.toString(), requireApprovalAboveAtomic: policy.requireApprovalAboveAtomic.toString() };
}

function publicRequest(request: WalletActionRequest): Record<string, unknown> {
  const { hybridAuthorization: _hybridAuthorization, ...publicFields } = request;
  return { ...publicFields, amountAtomic: request.amountAtomic.toString() };
}

function normalizeHybridAuthorizationEnvelope(input: HybridAuthorizationEnvelope | HybridAuthorizationEnvelopeInput): HybridAuthorizationEnvelope {
  const bytes = (value: Uint8Array | readonly number[]): Uint8Array => value instanceof Uint8Array ? Uint8Array.from(value) : Uint8Array.from(value);
  return {
    scheme: input.scheme,
    providerId: input.providerId,
    keyId: input.keyId,
    message: bytes(input.message),
    classicalSignature: bytes(input.classicalSignature),
    pqcSignature: bytes(input.pqcSignature),
  };
}

function decodePublicKey(value: string): Uint8Array {
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(value) || value.length % 4 !== 0) {
    throw new Error("Hybrid authorization public keys must be canonical base64.");
  }
  const decoded = Buffer.from(value, "base64");
  if (decoded.length === 0) throw new Error("Hybrid authorization public keys must not be empty.");
  return Uint8Array.from(decoded);
}

function bytesEqual(left: Uint8Array, right: Uint8Array): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function requestFingerprint(request: WalletActionRequest): string {
  const { actorSubjectId: _actorSubjectId, approvalConfirmed: _approvalConfirmed, requiresApproval: _requiresApproval, ...stableRequest } = request;
  return digest({ ...stableRequest, amountAtomic: request.amountAtomic.toString() });
}

function digest(value: unknown): string {
  return createHash("sha256").update(stableStringify(value)).digest("hex");
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  return `{${Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${stableStringify(item)}`).join(",")}}`;
}
