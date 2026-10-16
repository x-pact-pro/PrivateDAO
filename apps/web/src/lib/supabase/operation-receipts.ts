import { createOptionalSupabaseBrowserClient } from "@/lib/supabase/client";

const LOCAL_RECEIPTS_MAX = 60;
let localReceiptRows: OperationReceiptTimelineRow[] = [];
const REVIEWER_SEED_RECEIPTS: OperationReceiptTimelineRow[] = [
  {
    id: "seed-anchor-1-governance",
    created_at: "2026-04-30T12:00:00.000Z",
    operation_type: "anchor-1-governance-upgrade",
    proposal_id: "ANCHOR-1.0.1",
    approval_state: "evidence-recorded",
    execution_reference: "5Et7K7KP2y4K5SufGex1A8VQbqTSWWz8esetT7Lzo7hAamD3MBMVS7PXin1CdFgDxzMtjL2RyZuHUCuzavHc8vLw",
    private_settlement_rail: "testnet-governance",
    stablecoin_symbol: "SOL",
    audit_mode: "reviewer-visible",
    recipient_visibility: "not-applicable",
    metadata: {
      route: "/documents/anchor-1-migration-evidence-2026-04-30",
      note: "Anchor 1.0.1 Testnet upgrade evidence seed for reviewer timeline continuity.",
    },
  },
  {
    id: "seed-umbra-relayer-readiness",
    created_at: "2026-05-06T00:00:00.000Z",
    operation_type: "umbra-relayer-readiness",
    proposal_id: "UMBRA-DEVNET-RELAYER",
    approval_state: "relayer-health-check",
    execution_reference: "https://api.privatedao.org/api/v1/umbra/relayer/health",
    private_settlement_rail: "umbra",
    stablecoin_symbol: "USDC",
    audit_mode: "confidential-payout",
    recipient_visibility: "recipient-private",
    metadata: {
      relayer: "https://relayer.api-devnet.umbraprivacy.com",
      note: "Live relayer readiness endpoint. Full claim submission still requires SDK-generated proof_account_data.",
    },
  },
  {
    id: "seed-qvac-local-ai",
    created_at: "2026-05-06T00:05:00.000Z",
    operation_type: "qvac-local-ai-brief",
    proposal_id: "QVAC-FABRIC-LOCAL",
    approval_state: "browser-local-inference-ready",
    execution_reference: "qvac/fabric-llm-finetune",
    private_settlement_rail: "qvac",
    stablecoin_symbol: "N/A",
    audit_mode: "zero-cloud-ai",
    recipient_visibility: "device-local",
    metadata: {
      route: "/services/qvac-sovereign-ai",
      note: "QVAC model route uses Transformers.js in-browser execution after first model load.",
    },
  },
];

export type OperationReceiptInsert = {
  operationType: string;
  proposalId: string;
  daoAddress?: string;
  approvalState: string;
  executionReference: string;
  privateSettlementRail: string;
  stablecoinSymbol: string;
  auditMode: string;
  recipientVisibility: string;
  metadata?: Record<string, unknown>;
};

export type GovernanceReceiptInsert = {
  proposalId: string;
  operationType: string;
  asset: string;
  amount: string;
  recipient: string;
  rail: string;
  txHash: string;
  status: string;
};

export type CloakDeliveryStateInsert = {
  rail: string;
  operationType: string;
  asset: string;
  amount: string;
  recipient: string;
  memo: string;
  auditMode: string;
  recipientVisibility: string;
  responseStatus: string;
};

export async function persistOperationReceipt(input: OperationReceiptInsert) {
  persistLocalReceiptRow(input);

  const supabase = createOptionalSupabaseBrowserClient();
  if (!supabase) {
    await persistGovernanceReceipt(toGovernanceReceipt(input));
    return;
  }

  const { error } = await supabase.from("operation_receipts").insert({
    operation_type: input.operationType,
    proposal_id: input.proposalId,
    dao_address: input.daoAddress ?? null,
    approval_state: input.approvalState,
    execution_reference: input.executionReference,
    private_settlement_rail: input.privateSettlementRail,
    stablecoin_symbol: input.stablecoinSymbol,
    audit_mode: input.auditMode,
    recipient_visibility: input.recipientVisibility,
    metadata: input.metadata ?? {},
  });

  if (error) {
    const legacyError = await persistLegacyOperationReceipt(input);
    if (legacyError) {
      // Keep on-chain flow non-blocking even when DB schema is not ready.
      console.warn("[operation_receipts] persist failed:", legacyError);
    }
  }

  await persistGovernanceReceipt(toGovernanceReceipt(input));
}

export async function persistCloakDeliveryState(input: CloakDeliveryStateInsert) {
  const supabase = createOptionalSupabaseBrowserClient();
  if (!supabase) return;

  const { error } = await supabase.from("cloak_delivery_state").insert({
    rail: input.rail,
    operation_type: input.operationType,
    asset: input.asset,
    amount: input.amount,
    recipient: input.recipient,
    memo: input.memo,
    audit_mode: input.auditMode,
    recipient_visibility: input.recipientVisibility,
    response_status: input.responseStatus,
  });

  if (error) {
    const legacyError = await persistLegacyCloakDeliveryState(input);
    if (legacyError) {
      console.warn("[cloak_delivery_state] persist failed:", legacyError);
    }
  }
}

export async function persistGovernanceReceipt(input: GovernanceReceiptInsert | null) {
  if (!input) return;

  const supabase = createOptionalSupabaseBrowserClient();
  if (!supabase) return;

  const { error } = await supabase.from("governance_receipts").insert({
    proposal_id: input.proposalId,
    operation_type: input.operationType,
    asset: input.asset,
    amount: input.amount,
    recipient: input.recipient,
    rail: input.rail,
    tx_hash: input.txHash,
    status: input.status,
    created_at: new Date().toISOString(),
  });

  if (error) {
    const legacyError = await persistLegacyOperationReceipt({
      operationType: input.operationType,
      proposalId: input.proposalId,
      approvalState: input.status,
      executionReference: input.txHash,
      privateSettlementRail: input.rail,
      stablecoinSymbol: input.asset,
      auditMode: "governance-receipt",
      recipientVisibility: input.recipient,
      metadata: {
        amount: input.amount,
        recipient: input.recipient,
        source: "governance_receipts_legacy_fallback",
      },
    });
    if (legacyError) {
      console.warn("[governance_receipts] persist failed:", legacyError);
    }
  }
}

export type OperationReceiptTimelineRow = {
  id: string;
  created_at: string;
  operation_type: string;
  proposal_id: string;
  approval_state: string;
  execution_reference: string;
  private_settlement_rail: string;
  stablecoin_symbol: string;
  audit_mode: string;
  recipient_visibility: string;
  metadata?: Record<string, unknown>;
};

type GovernanceReceiptTimelineRow = {
  id: string;
  created_at: string;
  proposal_id: string;
  operation_type: string;
  asset: string;
  amount: string;
  recipient: string;
  rail: string;
  tx_hash: string;
  status: string;
};

type LegacyOperationReceiptTimelineRow = {
  id: string;
  created_at: string;
  operation_type: string;
  audit_mode: string;
  recipient_visibility: string;
  rail: string;
  asset: string;
  amount: string;
  recipient: string;
  memo: string;
  status: string;
};

export type OperationReceiptTimelineResult = {
  rows: OperationReceiptTimelineRow[];
  error: string | null;
  source: "supabase" | "local";
};

export type OperationReceiptRealtimeHandler = (rows: OperationReceiptTimelineRow[]) => void;

const GOVERNANCE_OPERATION_TYPES = new Set([
  "create_dao",
  "create_proposal",
  "commit_vote",
  "reveal_vote",
  "finalize_proposal",
  "execute_proposal",
]);

function isLikelySolanaSignature(value: string) {
  return /^[1-9A-HJ-NP-Za-km-z]{64,90}$/.test(value);
}

function metadataString(metadata: Record<string, unknown> | undefined, key: string) {
  const value = metadata?.[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function toGovernanceReceipt(input: OperationReceiptInsert): GovernanceReceiptInsert | null {
  if (!GOVERNANCE_OPERATION_TYPES.has(input.operationType)) return null;
  if (!isLikelySolanaSignature(input.executionReference)) return null;

  const treasuryAction = input.metadata?.treasuryAction;
  const treasuryActionObject =
    treasuryAction && typeof treasuryAction === "object" && !Array.isArray(treasuryAction)
      ? (treasuryAction as Record<string, unknown>)
      : null;
  const recipient =
    metadataString(input.metadata, "treasuryRecipient") ||
    (typeof treasuryActionObject?.recipient === "string" ? treasuryActionObject.recipient : null) ||
    input.daoAddress ||
    input.proposalId;
  const amount =
    typeof treasuryActionObject?.amountSol === "string"
      ? treasuryActionObject.amountSol
      : typeof treasuryActionObject?.amountLamports === "string"
        ? treasuryActionObject.amountLamports
        : "0";

  return {
    proposalId: input.proposalId,
    operationType: input.operationType,
    asset: input.stablecoinSymbol,
    amount,
    recipient,
    rail: input.privateSettlementRail,
    txHash: input.executionReference,
    status: "confirmed",
  };
}

function createLocalReceiptRow(input: OperationReceiptInsert): OperationReceiptTimelineRow {
  const createId = () => {
    const browserCrypto = globalThis.crypto;
    if (typeof browserCrypto?.randomUUID === "function") {
      return browserCrypto.randomUUID();
    }
    if (typeof browserCrypto?.getRandomValues !== "function") {
      throw new Error("Web Crypto is required to create a local receipt identifier.");
    }

    const bytes = browserCrypto.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  };

  return {
    id: createId(),
    created_at: new Date().toISOString(),
    operation_type: input.operationType,
    proposal_id: input.proposalId,
    approval_state: input.approvalState,
    execution_reference: input.executionReference,
    private_settlement_rail: input.privateSettlementRail,
    stablecoin_symbol: input.stablecoinSymbol,
    audit_mode: input.auditMode,
    recipient_visibility: input.recipientVisibility,
    metadata: input.metadata ?? {},
  };
}

function readLocalReceiptRows(): OperationReceiptTimelineRow[] {
  return localReceiptRows;
}

function getReviewerSeedReceipts(limit: number): OperationReceiptTimelineRow[] {
  return REVIEWER_SEED_RECEIPTS.slice(0, limit);
}

function persistLocalReceiptRow(input: OperationReceiptInsert) {
  if (typeof window === "undefined") return;
  const nextRow = createLocalReceiptRow(input);
  localReceiptRows = [nextRow, ...readLocalReceiptRows()].slice(0, LOCAL_RECEIPTS_MAX);
}

export async function fetchOperationReceiptTimeline(limit = 20): Promise<OperationReceiptTimelineResult> {
  const localRows = readLocalReceiptRows().slice(0, limit);
  const fallbackRows = localRows.length > 0 ? localRows : getReviewerSeedReceipts(limit);
  const supabase = createOptionalSupabaseBrowserClient();
  if (!supabase) {
    return {
      rows: fallbackRows,
      error:
        localRows.length > 0
          ? "Receipt source: local browser store."
          : "Receipt source: reviewer seed timeline. Cloud timeline sync activates when Supabase env is present.",
      source: "local",
    };
  }

  const { data, error } = await supabase
    .from("operation_receipts")
    .select(
      "id, created_at, operation_type, proposal_id, approval_state, execution_reference, private_settlement_rail, stablecoin_symbol, audit_mode, recipient_visibility, metadata",
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  const { data: governanceData, error: governanceError } = await supabase
    .from("governance_receipts")
    .select("id, created_at, operation_type, proposal_id, asset, amount, recipient, rail, tx_hash, status")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error && governanceError) {
    return {
      rows: fallbackRows,
      error:
        localRows.length > 0
          ? `Receipt source switched to local browser store.`
          : `Cloud timeline note: ${error.message}. Showing reviewer seed receipts until the first live Supabase receipt lands.`,
      source: "local",
    };
  }

  const operationRows = error ? await fetchLegacyOperationReceiptRows(limit) : ((data ?? []) as OperationReceiptTimelineRow[]);
  const governanceRows = governanceError
    ? []
    : ((governanceData ?? []) as GovernanceReceiptTimelineRow[]).map(mapGovernanceReceiptToTimelineRow);
  const remoteRows = mergeTimelineRows([...operationRows, ...governanceRows]).slice(0, limit);
  if (remoteRows.length === 0) {
    return {
      rows: fallbackRows,
      error:
        localRows.length > 0
          ? "Cloud timeline is ready. Showing local operation history for this browser."
          : "Cloud timeline is ready. Showing reviewer seed receipts until the first signed operation lands.",
      source: "local",
    };
  }

  return {
    rows: remoteRows,
    error: null as string | null,
    source: "supabase",
  };
}

async function persistLegacyOperationReceipt(input: OperationReceiptInsert) {
  const supabase = createOptionalSupabaseBrowserClient();
  if (!supabase) return null;

  const { error } = await supabase.from("operation_receipts").insert({
    operation_type: input.operationType,
    audit_mode: input.auditMode,
    recipient_visibility: input.recipientVisibility,
    rail: input.privateSettlementRail,
    asset: input.stablecoinSymbol,
    amount: metadataString(input.metadata, "amount") ?? metadataString(input.metadata, "amountSol") ?? "0",
    recipient: metadataString(input.metadata, "recipient") ?? input.daoAddress ?? input.proposalId,
    memo: input.executionReference,
    status: input.approvalState,
  });

  return error?.message ?? null;
}

async function persistLegacyCloakDeliveryState(input: CloakDeliveryStateInsert) {
  const supabase = createOptionalSupabaseBrowserClient();
  if (!supabase) return null;

  const { error } = await supabase.from("cloak_delivery_state").insert({
    stealth_address: input.recipient,
    cloak_status: "queued",
    relayer_endpoint: input.rail,
    relayer_response: {
      operationType: input.operationType,
      asset: input.asset,
      amount: input.amount,
      auditMode: input.auditMode,
      recipientVisibility: input.recipientVisibility,
    },
  });

  return error?.message ?? null;
}

async function fetchLegacyOperationReceiptRows(limit: number): Promise<OperationReceiptTimelineRow[]> {
  const supabase = createOptionalSupabaseBrowserClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("operation_receipts")
    .select("id, created_at, operation_type, audit_mode, recipient_visibility, rail, asset, amount, recipient, memo, status")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) return [];

  return ((data ?? []) as LegacyOperationReceiptTimelineRow[]).map((row) => ({
    id: `legacy-operation-${row.id}`,
    created_at: row.created_at,
    operation_type: row.operation_type,
    proposal_id: row.memo || row.id,
    approval_state: row.status,
    execution_reference: row.memo,
    private_settlement_rail: row.rail,
    stablecoin_symbol: row.asset,
    audit_mode: row.audit_mode,
    recipient_visibility: row.recipient_visibility,
    metadata: {
      amount: row.amount,
      recipient: row.recipient,
      source: "operation_receipts_legacy",
    },
  }));
}

export function subscribeOperationReceiptTimeline(
  limit: number,
  onRows: OperationReceiptRealtimeHandler,
  onError?: (message: string) => void,
) {
  const supabase = createOptionalSupabaseBrowserClient();
  if (!supabase) return () => {};

  const reload = async () => {
    const result = await fetchOperationReceiptTimeline(limit);
    if (result.error) {
      onError?.(result.error);
      return;
    }
    onRows(result.rows);
  };

  const channel = supabase
    .channel("privatedao-receipt-timeline")
    .on("postgres_changes", { event: "*", schema: "public", table: "operation_receipts" }, () => {
      void reload();
    })
    .on("postgres_changes", { event: "*", schema: "public", table: "governance_receipts" }, () => {
      void reload();
    })
    .subscribe((status) => {
      if (status === "SUBSCRIBED") void reload();
    });

  return () => {
    void supabase.removeChannel(channel);
  };
}

export function getLocalOperationReceiptCount() {
  return readLocalReceiptRows().length;
}

function mapGovernanceReceiptToTimelineRow(row: GovernanceReceiptTimelineRow): OperationReceiptTimelineRow {
  return {
    id: `governance-${row.id}`,
    created_at: row.created_at,
    operation_type: row.operation_type,
    proposal_id: row.proposal_id,
    approval_state: row.status,
    execution_reference: row.tx_hash,
    private_settlement_rail: row.rail,
    stablecoin_symbol: row.asset,
    audit_mode: "governance-receipt",
    recipient_visibility: row.recipient,
    metadata: {
      amount: row.amount,
      recipient: row.recipient,
      source: "governance_receipts",
    },
  };
}

function mergeTimelineRows(rows: OperationReceiptTimelineRow[]) {
  const seen = new Set<string>();
  return rows
    .filter((row) => {
      const key = `${row.operation_type}:${row.proposal_id}:${row.execution_reference}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
}
