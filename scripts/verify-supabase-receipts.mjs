import { createRequire } from "node:module";

const requireFromWebApp = createRequire(new URL("../apps/web/package.json", import.meta.url));
const { createClient } = requireFromWebApp("@supabase/supabase-js");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!url || !publishableKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.");
  process.exit(1);
}

const supabase = createClient(url, publishableKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const runId = `SUPABASE-VERIFY-${new Date().toISOString()}`;

const checks = [
  {
    table: "governance_receipts",
    row: {
      proposal_id: runId,
      operation_type: "verify_supabase_receipt_path",
      asset: "SOL",
      amount: "0",
      recipient: "testnet-receipt-verifier",
      rail: "browser-direct-supabase",
      tx_hash: `supabase-verifier-${Date.now()}`,
      status: "confirmed",
    },
  },
  {
    table: "cloak_delivery_state",
    row: {
      rail: "umbra-devnet-relayer",
      operation_type: "verify_cloak_delivery_state_path",
      asset: "USDC",
      amount: "0",
      recipient: "testnet-recipient-private",
      memo: runId,
      audit_mode: "scoped-viewing-key",
      recipient_visibility: "recipient-private",
      response_status: "prepared",
    },
  },
];

const results = [];
const allowLegacy = process.env.ALLOW_LEGACY_SUPABASE_SCHEMA === "1";

async function insertWithCompatibility(check) {
  const { error } = await supabase.from(check.table).insert(check.row);
  if (!error) return { ok: true, mode: "canonical" };

  if (check.table === "governance_receipts") {
    const { error: legacyError } = await supabase.from("operation_receipts").insert({
      operation_type: check.row.operation_type,
      audit_mode: "governance-receipt",
      recipient_visibility: check.row.recipient,
      rail: check.row.rail,
      asset: check.row.asset,
      amount: check.row.amount,
      recipient: check.row.recipient,
      memo: check.row.tx_hash,
      status: check.row.status,
    });
    return legacyError
      ? { ok: false, mode: "legacy-operation-receipts", error: legacyError.message, canonicalError: error.message }
      : { ok: true, mode: "legacy-operation-receipts", canonicalError: error.message };
  }

  if (check.table === "cloak_delivery_state") {
    const { error: legacyError } = await supabase.from("cloak_delivery_state").insert({
      stealth_address: check.row.recipient,
      cloak_status: "queued",
      relayer_endpoint: check.row.rail,
      relayer_response: {
        operationType: check.row.operation_type,
        asset: check.row.asset,
        amount: check.row.amount,
        auditMode: check.row.audit_mode,
        recipientVisibility: check.row.recipient_visibility,
      },
    });
    return legacyError
      ? { ok: false, mode: "legacy-cloak-delivery-state", error: legacyError.message, canonicalError: error.message }
      : { ok: true, mode: "legacy-cloak-delivery-state", canonicalError: error.message };
  }

  return { ok: false, mode: "canonical", error: error.message };
}

for (const check of checks) {
  const inserted = await insertWithCompatibility(check);
  if (!inserted.ok) {
    results.push({ table: check.table, ok: false, stage: "insert", ...inserted });
    continue;
  }

  const { data, error: selectError } = await supabase
    .from(inserted.mode === "legacy-operation-receipts" ? "operation_receipts" : check.table)
    .select("*")
    .order("created_at", { ascending: false })
    .limit(1);

  if (selectError) {
    results.push({ table: check.table, ok: false, stage: "select", error: selectError.message });
    continue;
  }

  results.push({ table: check.table, ok: true, mode: inserted.mode, latestId: data?.[0]?.id ?? null, canonicalError: inserted.canonicalError });
}

const failed = results.filter((result) => !result.ok);
const compatibilityRows = results.filter((result) => result.ok && result.mode !== "canonical");
const ok = failed.length === 0 && (allowLegacy || compatibilityRows.length === 0);

console.log(JSON.stringify({
  ok,
  url,
  runId,
  schemaMode: compatibilityRows.length === 0 ? "canonical" : "compatibility",
  allowLegacy,
  results,
  nextAction: compatibilityRows.length === 0
    ? null
    : "Run docs/supabase-operation-receipts.sql in the Supabase SQL Editor, then rerun npm run verify:supabase-receipts.",
}, null, 2));

if (!ok) {
  process.exit(1);
}
