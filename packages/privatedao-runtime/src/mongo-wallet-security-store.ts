import { Collection, Decimal128, MongoClient, type Db } from "mongodb";
import type { PreparedExecution } from "./index.js";
import type { TenantMembership, TenantMembershipStore } from "./identity/entra.js";
import { assertWalletPolicyConfiguration, type WalletAuditEvent, type WalletExecutionSession, type WalletMode, type WalletOperationalAuditEvent, type WalletPolicy, type WalletSecurityStore, type WalletSignerBoundary } from "./wallet-security.js";

type Reservation = {
  replayKey: string;
  tenantId: string;
  organizationId: string;
  subjectId: string;
  dayKey: string;
  amountAtomic: Decimal128;
  requestFingerprint: string;
  consumed: boolean;
  createdAt: Date;
};

type DailyTotal = {
  tenantId: string;
  organizationId: string;
  subjectId: string;
  dayKey: string;
  totalAtomic: Decimal128;
  updatedAt: Date;
};

type WalletPolicyDocument = {
  tenantId: string;
  organizationId: string;
  mode: WalletMode;
  allowedActions: string[];
  allowedNetworks: string[];
  allowedAssets: string[];
  allowedDestinations?: string[];
  perActionLimitAtomic: string;
  dailyLimitAtomic: string;
  requireApprovalAboveAtomic: string;
  autonomousEnabled: boolean;
  signerBoundary: WalletSignerBoundary;
  recoveryWindowSeconds: number;
  requireHybridAuthorization?: boolean;
  updatedAt: Date;
  revokedAt?: Date;
};

type WalletExecutionSessionDocument = Omit<WalletExecutionSession, "prepared" | "createdAt" | "expiresAt"> & {
  preparedJson: string;
  createdAt: Date;
  expiresAt: Date;
};

export type WalletRecoveryState = "active" | "requested" | "recovered";

const receiptStateRank: Record<WalletReceiptRecord["state"], number> = {
  submitted: 1,
  confirmed: 2,
  finalized: 3,
  reconciled: 4,
  failed: 0,
};

export interface WalletRecoveryRecord {
  walletId: string;
  tenantId: string;
  organizationId: string;
  subjectId: string;
  state: WalletRecoveryState;
  requestedAt?: string;
  availableAt?: string;
  recoveredAt?: string;
  recoveredBy?: string;
}

export interface WalletReceiptRecord {
  receiptId: string;
  tenantId: string;
  organizationId: string;
  requestId: string;
  executionId: string;
  state: "submitted" | "confirmed" | "finalized" | "reconciled" | "failed";
  network: string;
  reference?: string;
  receiptCommitment: string;
  occurredAt: string;
}

export interface MongoWalletSecurityStoreOptions {
  uri: string;
  database: string;
  reservationsCollection?: string;
  dailyTotalsCollection?: string;
  auditCollection?: string;
  sessionsCollection?: string;
  serverSelectionTimeoutMS?: number;
  connectTimeoutMS?: number;
}

export function createMongoWalletSecurityStoreFromEnv(env: NodeJS.ProcessEnv = process.env): MongoWalletSecurityStore {
  const uri = env.PDAO_WALLET_MONGODB_URI || env.MONGODB_URI;
  const database = env.PDAO_WALLET_MONGODB_DATABASE || env.MONGODB_DATABASE || "privatedao_wallet";
  if (!uri) throw new Error("PDAO_WALLET_MONGODB_URI or MONGODB_URI is required for the production wallet store.");
  const timeout = (name: string, fallback: number): number => {
    const value = Number(env[name]);
    return Number.isInteger(value) && value > 0 && value <= 30_000 ? value : fallback;
  };
  return new MongoWalletSecurityStore({
    uri,
    database,
    serverSelectionTimeoutMS: timeout("PDAO_WALLET_MONGODB_SERVER_SELECTION_TIMEOUT_MS", 2_000),
    connectTimeoutMS: timeout("PDAO_WALLET_MONGODB_CONNECT_TIMEOUT_MS", 2_000),
  });
}

export class MongoWalletSecurityStore implements WalletSecurityStore, TenantMembershipStore {
  private readonly client: MongoClient;
  private readonly db: Db;
  private readonly reservations: Collection<Reservation>;
  private readonly dailyTotals: Collection<DailyTotal>;
  private readonly policies: Collection<WalletPolicyDocument>;
  private readonly memberships: Collection<TenantMembership & { _id?: string }>;
  private readonly recoveries: Collection<WalletRecoveryRecord & { _id?: string }>;
  private readonly receipts: Collection<WalletReceiptRecord & { _id?: string }>;
  private readonly audits: Collection<Record<string, unknown>>;
  private readonly sessions: Collection<WalletExecutionSessionDocument>;
  private initialized = false;
  private initialization?: Promise<void>;

  constructor(options: MongoWalletSecurityStoreOptions) {
    if (!options.uri || !options.database) throw new Error("MongoDB wallet security storage requires uri and database.");
    this.client = new MongoClient(options.uri, {
      appName: "privatedao-wallet-security",
      serverSelectionTimeoutMS: options.serverSelectionTimeoutMS ?? 2_000,
      connectTimeoutMS: options.connectTimeoutMS ?? 2_000,
      retryWrites: true,
    });
    this.db = this.client.db(options.database);
    this.reservations = this.db.collection<Reservation>(options.reservationsCollection || "wallet_authorization_reservations");
    this.dailyTotals = this.db.collection<DailyTotal>(options.dailyTotalsCollection || "wallet_daily_totals");
    this.policies = this.db.collection<WalletPolicyDocument>("wallet_policies");
    this.memberships = this.db.collection("tenant_memberships");
    this.recoveries = this.db.collection("wallet_recoveries");
    this.receipts = this.db.collection("wallet_receipts");
    this.audits = this.db.collection(options.auditCollection || "wallet_audit_events");
    this.sessions = this.db.collection(options.sessionsCollection || "wallet_execution_sessions");
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;
    if (this.initialization) return this.initialization;
    this.initialization = this.initializeOnce();
    try {
      await this.initialization;
    } catch (error) {
      this.initialization = undefined;
      throw error;
    }
  }

  private async initializeOnce(): Promise<void> {
    await this.client.connect();
    try {
      // Migrate the pre-isolation index without touching recovery documents.
      await this.recoveries.dropIndex("walletId_1");
    } catch (error) {
      if (!(error instanceof Error && /index not found|ns not found/i.test(error.message))) throw error;
    }
    try {
      await this.recoveries.dropIndex("tenantId_1_walletId_1");
    } catch (error) {
      if (!(error instanceof Error && /index not found|ns not found/i.test(error.message))) throw error;
    }
    try {
      // Replace the pre-organization daily-limit index without deleting totals.
      await this.dailyTotals.dropIndex("tenantId_1_subjectId_1_dayKey_1");
    } catch (error) {
      if (!(error instanceof Error && /index not found|ns not found/i.test(error.message))) throw error;
    }
    try {
      // Scope receipt idempotency to the tenant before creating the compound key.
      await this.receipts.dropIndex("requestId_1");
    } catch (error) {
      if (!(error instanceof Error && /index not found|ns not found/i.test(error.message))) throw error;
    }
    await Promise.all([
      this.reservations.createIndex({ replayKey: 1 }, { unique: true }),
      this.dailyTotals.createIndex({ tenantId: 1, organizationId: 1, subjectId: 1, dayKey: 1 }, { unique: true }),
      this.policies.createIndex({ tenantId: 1, organizationId: 1, mode: 1 }, { unique: true }),
      this.memberships.createIndex({ directoryTenantId: 1, subject: 1 }, { unique: true }),
      this.recoveries.createIndex({ tenantId: 1, organizationId: 1, walletId: 1 }, { unique: true }),
      this.receipts.createIndex({ tenantId: 1, requestId: 1 }, { unique: true }),
      this.audits.createIndex({ tenantId: 1, occurredAt: -1 }),
      this.audits.createIndex({ eventId: 1 }, { unique: true }),
      this.sessions.createIndex({ executionId: 1 }, { unique: true }),
      this.sessions.createIndex({ tenantId: 1, organizationId: 1, subjectId: 1, expiresAt: 1 }),
      this.sessions.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    ]);
    this.initialized = true;
  }

  async health(): Promise<{ ok: boolean; reason?: string }> {
    try {
      await this.initialize();
      await this.db.command({ ping: 1 });
      const hello = await this.db.command({ hello: 1 }) as { setName?: string; msg?: string };
      if (!hello.setName && hello.msg !== "isdbgrid") return { ok: false, reason: "mongodb_transactions_unavailable" };
      return { ok: true };
    } catch (error) {
      void error;
      return { ok: false, reason: "mongodb_unavailable" };
    }
  }

  async loadPolicy(input: { tenantId: string; organizationId: string; mode: WalletMode }): Promise<WalletPolicy | undefined> {
    await this.initialize();
    const record = await this.policies.findOne(input);
    if (!record || record.revokedAt) return undefined;
    return {
      mode: record.mode,
      allowedActions: record.allowedActions as WalletPolicy["allowedActions"],
      allowedNetworks: record.allowedNetworks,
      allowedAssets: record.allowedAssets,
      allowedDestinations: record.allowedDestinations,
      perActionLimitAtomic: BigInt(record.perActionLimitAtomic),
      dailyLimitAtomic: BigInt(record.dailyLimitAtomic),
      requireApprovalAboveAtomic: BigInt(record.requireApprovalAboveAtomic),
      autonomousEnabled: record.autonomousEnabled,
      signerBoundary: record.signerBoundary,
      recoveryWindowSeconds: record.recoveryWindowSeconds,
      ...(record.requireHybridAuthorization ? { requireHybridAuthorization: true } : {}),
    };
  }

  async findMembership(input: { directoryTenantId: string; subject: string }): Promise<TenantMembership | undefined> {
    await this.initialize();
    const membership = await this.memberships.findOne(input, { projection: { _id: 0 } });
    return membership || undefined;
  }

  async saveMembership(membership: TenantMembership): Promise<void> {
    await this.initialize();
    await this.memberships.updateOne(
      { directoryTenantId: membership.directoryTenantId, subject: membership.subject },
      { $set: membership },
      { upsert: true },
    );
  }

  async savePolicy(input: { tenantId: string; organizationId: string; policy: WalletPolicy }): Promise<void> {
    assertWalletPolicyConfiguration(input.policy);
    await this.initialize();
    await this.policies.updateOne(
      { tenantId: input.tenantId, organizationId: input.organizationId, mode: input.policy.mode },
      {
        $set: {
          tenantId: input.tenantId,
          organizationId: input.organizationId,
          mode: input.policy.mode,
          allowedActions: [...input.policy.allowedActions],
          allowedNetworks: [...input.policy.allowedNetworks],
          allowedAssets: [...input.policy.allowedAssets],
          allowedDestinations: input.policy.allowedDestinations ? [...input.policy.allowedDestinations] : [],
          perActionLimitAtomic: input.policy.perActionLimitAtomic.toString(),
          dailyLimitAtomic: input.policy.dailyLimitAtomic.toString(),
          requireApprovalAboveAtomic: input.policy.requireApprovalAboveAtomic.toString(),
          autonomousEnabled: input.policy.autonomousEnabled,
          signerBoundary: input.policy.signerBoundary,
          recoveryWindowSeconds: input.policy.recoveryWindowSeconds,
          requireHybridAuthorization: input.policy.requireHybridAuthorization === true,
          updatedAt: new Date(),
        },
        $unset: { revokedAt: "" },
      },
      { upsert: true },
    );
  }

  async revokePolicy(input: { tenantId: string; organizationId: string; mode: WalletMode; revokedAt?: string }): Promise<void> {
    await this.initialize();
    const result = await this.policies.updateOne(
      { tenantId: input.tenantId, organizationId: input.organizationId, mode: input.mode },
      { $set: { revokedAt: new Date(input.revokedAt || new Date().toISOString()), updatedAt: new Date() } },
    );
    if (result.matchedCount !== 1) throw new Error("Wallet policy was not found for revocation.");
  }

  async requestRecovery(input: { walletId: string; tenantId: string; organizationId: string; subjectId: string; requestedAt: string; recoveryWindowSeconds: number }): Promise<WalletRecoveryRecord> {
    await this.initialize();
    const recoveryKey = { walletId: input.walletId, tenantId: input.tenantId, organizationId: input.organizationId };
    const existing = await this.recoveries.findOne(recoveryKey);
    if (existing?.state === "requested") return existing;
    if (existing?.state === "recovered") throw new Error("Wallet recovery has already been finalized.");
    const availableAt = new Date(new Date(input.requestedAt).getTime() + input.recoveryWindowSeconds * 1000).toISOString();
    const record: WalletRecoveryRecord = { walletId: input.walletId, tenantId: input.tenantId, organizationId: input.organizationId, subjectId: input.subjectId, state: "requested", requestedAt: input.requestedAt, availableAt };
    try {
      await this.recoveries.insertOne(record);
    } catch (error) {
      if (error instanceof Error && error.message.includes("E11000")) {
        const concurrent = await this.recoveries.findOne(recoveryKey);
        if (concurrent) return concurrent;
      }
      throw error;
    }
    return record;
  }

  async finalizeRecovery(input: { walletId: string; tenantId: string; organizationId: string; recoveredBy: string; now: string }): Promise<WalletRecoveryRecord> {
    await this.initialize();
    const recoveryKey = { walletId: input.walletId, tenantId: input.tenantId, organizationId: input.organizationId };
    const current = await this.recoveries.findOne(recoveryKey);
    if (!current || current.state !== "requested" || !current.availableAt) throw new Error("Wallet recovery is not pending.");
    if (new Date(input.now).getTime() < new Date(current.availableAt).getTime()) throw new Error("Wallet recovery window has not elapsed.");
    const recoveredAt = input.now;
    const updated = await this.recoveries.updateOne(
      {
        ...recoveryKey,
        state: "requested",
        availableAt: { $lte: input.now },
      },
      { $set: { state: "recovered", recoveredAt, recoveredBy: input.recoveredBy } },
    );
    if (updated.modifiedCount !== 1) throw new Error("Wallet recovery is no longer pending.");
    return { ...current, state: "recovered", recoveredAt, recoveredBy: input.recoveredBy };
  }

  async recordReceipt(record: WalletReceiptRecord): Promise<void> {
    await this.initialize();
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const receiptKey = { tenantId: record.tenantId, requestId: record.requestId };
      const existing = await this.receipts.findOne(receiptKey);
      if (existing) {
        const currentRank = receiptStateRank[existing.state];
        const nextRank = receiptStateRank[record.state];
        const terminal = existing.state === "reconciled" || existing.state === "failed";
        if (terminal || (record.state !== "failed" && nextRank <= currentRank)) return;
        const updated = await this.receipts.updateOne(
          { ...receiptKey, state: existing.state },
          { $set: record },
        );
        if (updated.modifiedCount === 1) return;
        continue;
      }
      try {
        await this.receipts.insertOne(record);
        return;
      } catch (error) {
        if (!(error instanceof Error && error.message.includes("E11000"))) throw error;
      }
    }
    throw new Error("Concurrent wallet receipt updates could not be reconciled.");
  }

  async reserve(input: {
    replayKey: string;
    tenantId: string;
    organizationId: string;
    subjectId: string;
    dayKey: string;
    amountAtomic: bigint;
    dailyLimitAtomic: bigint;
    consume: boolean;
    requestFingerprint: string;
  }): Promise<{ accepted: boolean; duplicate: boolean; conflict: boolean; dailyTotalAtomic: bigint }> {
    await this.initialize();
    const session = this.client.startSession();
    try {
      let result: { accepted: boolean; duplicate: boolean; conflict: boolean; dailyTotalAtomic: bigint } | undefined;
      await session.withTransaction(async () => {
        const existing = await this.reservations.findOne({ replayKey: input.replayKey }, { session });
        if (existing?.consumed) {
          result = { accepted: false, duplicate: true, conflict: false, dailyTotalAtomic: 0n };
          return;
        }
        if (existing && existing.requestFingerprint !== input.requestFingerprint) {
          result = { accepted: false, duplicate: false, conflict: true, dailyTotalAtomic: 0n };
          return;
        }
        if (!existing) {
          await this.reservations.insertOne({
            replayKey: input.replayKey,
            tenantId: input.tenantId,
            organizationId: input.organizationId,
            subjectId: input.subjectId,
            dayKey: input.dayKey,
            amountAtomic: Decimal128.fromString(input.amountAtomic.toString()),
            requestFingerprint: input.requestFingerprint,
            consumed: false,
            createdAt: new Date(),
          }, { session });
        }
        const key = { tenantId: input.tenantId, organizationId: input.organizationId, subjectId: input.subjectId, dayKey: input.dayKey };
        const daily = await this.dailyTotals.findOne(key, { session });
        const current = daily ? BigInt(daily.totalAtomic.toString()) : 0n;
        const next = current + input.amountAtomic;
        if (input.consume && next > input.dailyLimitAtomic) {
          result = { accepted: false, duplicate: false, conflict: false, dailyTotalAtomic: current };
          return;
        }
        if (input.consume) {
          await this.dailyTotals.updateOne(key, {
            $set: { updatedAt: new Date() },
            $inc: { totalAtomic: Decimal128.fromString(input.amountAtomic.toString()) },
          }, { upsert: true, session });
          await this.reservations.updateOne({ replayKey: input.replayKey }, { $set: { consumed: true } }, { session });
        }
        result = { accepted: true, duplicate: false, conflict: false, dailyTotalAtomic: next };
      }, { readConcern: { level: "snapshot" }, writeConcern: { w: "majority" } });
      if (!result) throw new Error("MongoDB wallet reservation did not return a result.");
      return result;
    } finally {
      await session.endSession();
    }
  }

  async appendAudit(event: WalletAuditEvent): Promise<void> {
    await this.initialize();
    await this.audits.updateOne(
      { eventId: event.eventId },
      { $setOnInsert: { ...event, createdAt: new Date(event.occurredAt) } },
      { upsert: true },
    );
  }

  async appendOperationalAudit(event: WalletOperationalAuditEvent): Promise<void> {
    await this.initialize();
    await this.audits.updateOne(
      { eventId: event.eventId },
      { $setOnInsert: { ...event, createdAt: new Date(event.occurredAt) } },
      { upsert: true },
    );
  }

  async saveExecutionSession(session: WalletExecutionSession): Promise<void> {
    await this.initialize();
    const createdAt = new Date(session.createdAt);
    const expiresAt = new Date(session.expiresAt);
    if (Number.isNaN(createdAt.getTime()) || Number.isNaN(expiresAt.getTime()) || expiresAt <= createdAt) {
      throw new Error("Wallet execution session timestamps are invalid.");
    }
    await this.sessions.updateOne(
      {
        executionId: session.executionId,
        tenantId: session.tenantId,
        organizationId: session.organizationId,
        subjectId: session.subjectId,
      },
      {
        $setOnInsert: {
          executionId: session.executionId,
          tenantId: session.tenantId,
          organizationId: session.organizationId,
          subjectId: session.subjectId,
          mode: session.mode,
          requestId: session.requestId,
          network: session.network,
          receiptCommitment: session.receiptCommitment,
          preparedJson: serializePreparedExecution(session.prepared as PreparedExecution<unknown>),
          createdAt,
          expiresAt,
        },
      },
      { upsert: true },
    );
  }

  async loadExecutionSession(input: { executionId: string; tenantId: string; organizationId: string; subjectId: string }): Promise<WalletExecutionSession | undefined> {
    await this.initialize();
    const record = await this.sessions.findOne({ ...input, expiresAt: { $gt: new Date() } });
    if (!record) return undefined;
    return {
      executionId: record.executionId,
      tenantId: record.tenantId,
      organizationId: record.organizationId,
      subjectId: record.subjectId,
      mode: record.mode,
      requestId: record.requestId,
      network: record.network,
      receiptCommitment: record.receiptCommitment,
      prepared: deserializePreparedExecution(record.preparedJson),
      createdAt: record.createdAt.toISOString(),
      expiresAt: record.expiresAt.toISOString(),
    };
  }

  async close(): Promise<void> {
    await this.client.close();
    this.initialized = false;
    this.initialization = undefined;
  }
}

function serializePreparedExecution(prepared: PreparedExecution<unknown>): string {
  return JSON.stringify(prepared, (_key, value: unknown) => {
    if (typeof value === "bigint") return { __pdaoType: "bigint", value: value.toString() };
    if (value instanceof Uint8Array) return { __pdaoType: "uint8array", value: [...value] };
    return value;
  });
}

function deserializePreparedExecution(value: string): PreparedExecution<unknown> {
  return JSON.parse(value, (_key, item: unknown) => {
    if (item && typeof item === "object" && "__pdaoType" in item) {
      const encoded = item as { __pdaoType?: string; value?: unknown };
      if (encoded.__pdaoType === "bigint" && typeof encoded.value === "string") return BigInt(encoded.value);
      if (encoded.__pdaoType === "uint8array" && Array.isArray(encoded.value)) return Uint8Array.from(encoded.value as number[]);
    }
    return item;
  }) as PreparedExecution<unknown>;
}
