import { randomUUID } from "node:crypto";
import { PublicKey } from "@solana/web3.js";
import { digest } from "./canonical.mjs";

const USDC_DECIMALS = 6;
const BATCH_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const APPROVABLE_STATUSES = new Set(["payable_pending_scheduled_settlement"]);

function atomicAmount(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("seller settlement amount is invalid");
  return Math.round(amount * 10 ** USDC_DECIMALS);
}

function publicKey(value, field) {
  try { return new PublicKey(String(value)); } catch { throw new Error(`${field} is invalid`); }
}

function payoutSnapshot(item, treasury, usdcMint) {
  const payout = item.payout;
  if (!payout?.address || payout.network !== "solana-mainnet-beta" || payout.asset !== "USDC") throw new Error("seller payout rail is invalid");
  const address = publicKey(payout.address, "seller payout address").toBase58();
  if (address === treasury) throw new Error("seller payout cannot equal the treasury");
  return { address, network: payout.network, asset: payout.asset, mint: usdcMint };
}

function eligibleSettlement(item, treasury, usdcMint) {
  if (!item || item.kind !== "seller_settlement" || !APPROVABLE_STATUSES.has(item.status)) return null;
  if (item.refund_id || item.dispute_id || item.refunded_at || item.disputed_at || item.execution_status === "failed") return null;
  const amountAtomic = atomicAmount(item.seller_net_amount);
  return {
    settlement_id: item.id,
    job_id: item.job_id || null,
    seller_agent_id: item.seller_agent_id || null,
    gross_amount: Number(item.gross_amount || 0),
    platform_fee_amount: Number(item.platform_fee_amount || item.protocol_fee || 0),
    processing_fee_amount: Number(item.processing_fee_amount || 0),
    network_fee_lamports: Number(item.network_fee_lamports || 0),
    seller_net_amount: Number(item.seller_net_amount || 0),
    amount_atomic: String(amountAtomic),
    asset: item.asset || "USDC",
    payout: payoutSnapshot(item, treasury, usdcMint),
    source_status: item.status,
    source_created_at: item.created_at || null,
  };
}

export function buildSettlementBatch({ settlements, treasury, usdcMint, periodStart, periodEnd, createdAt = new Date().toISOString(), batchId }) {
  const entries = [];
  const warnings = [];
  for (const item of settlements || []) {
    try {
      const entry = eligibleSettlement(item, treasury, usdcMint);
      if (entry) entries.push(entry);
    } catch (error) {
      warnings.push({ settlement_id: item?.id || null, reason: error.message });
    }
  }
  const sorted = entries.sort((a, b) => a.settlement_id.localeCompare(b.settlement_id));
  const canonical = { periodStart, periodEnd, entries: sorted, treasury, usdcMint };
  const id = batchId || `settlement_batch_${digest(canonical).slice(0, 24)}`;
  const totals = sorted.reduce((total, entry) => ({
    gross_amount: total.gross_amount + entry.gross_amount,
    platform_fee_amount: total.platform_fee_amount + entry.platform_fee_amount,
    processing_fee_amount: total.processing_fee_amount + entry.processing_fee_amount,
    network_fee_lamports: total.network_fee_lamports + entry.network_fee_lamports,
    seller_net_amount: total.seller_net_amount + entry.seller_net_amount,
    amount_atomic: total.amount_atomic + BigInt(entry.amount_atomic),
  }), { gross_amount: 0, platform_fee_amount: 0, processing_fee_amount: 0, network_fee_lamports: 0, seller_net_amount: 0, amount_atomic: 0n });
  return {
    id,
    kind: "settlement_batch",
    version: 1,
    status: sorted.length ? "pending_owner_approval" : "empty",
    immutable: true,
    created_at: createdAt,
    period_start: periodStart,
    period_end: periodEnd,
    expires_at: new Date(Date.parse(createdAt) + BATCH_TTL_MS).toISOString(),
    treasury,
    usdc_mint: usdcMint,
    entry_count: sorted.length,
    settlement_ids: sorted.map((entry) => entry.settlement_id),
    entries: sorted,
    warnings,
    totals,
  };
}

function publicBatch(batch) {
  if (!batch) return null;
  return { ...batch, totals: { ...batch.totals, amount_atomic: String(batch.totals?.amount_atomic ?? 0) }, entries: batch.entries || [] };
}

export async function runScheduledSettlementReport(config, storage, { now = new Date() } = {}) {
  const end = new Date(now).toISOString();
  const start = new Date(new Date(now).getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const [registry, existing] = await Promise.all([storage.list("Registry"), storage.list("SettlementBatches")]);
  const reserved = new Set(existing.filter((batch) => !["rejected", "expired", "empty"].includes(batch.status)).flatMap((batch) => batch.settlement_ids || []));
  const candidates = registry.filter((item) => {
    const created = Date.parse(item.created_at || "");
    return !reserved.has(item.id) && Number.isFinite(created) && created >= Date.parse(start) && created <= Date.parse(end);
  });
  const batch = buildSettlementBatch({ settlements: candidates, treasury: config.treasury, usdcMint: config.usdcMint, periodStart: start, periodEnd: end });
  if (batch.status === "empty") return { status: "empty", batch: publicBatch(batch), scanned: candidates.length };
  const already = await storage.get("SettlementBatches", batch.id);
  if (already) return { status: "existing", batch: publicBatch(already), scanned: candidates.length };
  await storage.put("SettlementBatches", batch.id, batch, true);
  await storage.put("AuditLog", `settlement_alert_${batch.id}`, {
    id: `settlement_alert_${batch.id}`,
    kind: "settlement_alert",
    action: "batch_ready",
    batch_id: batch.id,
    entry_count: batch.entry_count,
    seller_net_amount: batch.totals.seller_net_amount,
    created_at: new Date().toISOString(),
    sensitive_data_included: false,
  }, true);
  return { status: "created", batch: publicBatch(batch), scanned: candidates.length, alert: { kind: "settlement_batch_ready", batch_id: batch.id, entry_count: batch.entry_count, sensitive_data_included: false } };
}

export function settlementBatchForResponse(batch) {
  return publicBatch(batch);
}

export function assertBatchOpen(batch) {
  if (!batch || batch.kind !== "settlement_batch") throw Object.assign(new Error("settlement batch not found"), { statusCode: 404 });
  if (Date.parse(batch.expires_at) <= Date.now()) throw Object.assign(new Error("settlement batch has expired"), { statusCode: 409 });
  return batch;
}

export function settlementBatchId() {
  return `settlement_batch_${randomUUID()}`;
}
