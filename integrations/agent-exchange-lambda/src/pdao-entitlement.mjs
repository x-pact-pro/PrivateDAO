import { PublicKey } from "@solana/web3.js";
import nacl from "tweetnacl";
import { randomUUID } from "node:crypto";
import { readRpc } from "./solana.mjs";

export const PDAO_HOLDER_PURPOSE = "pdao-token-holder-monthly-access";
export const PDAO_TOKEN_MINT = "9isGuumtaqvJeJeyLF44fvfskk2cv5mYsopexMBfpump";
export const PDAO_DEVELOPER_ALLOCATION = "34,429,079 PDAO";
export const PDAO_DEVELOPER_LOCK_UNTIL = "2026-11-30";
export const PDAO_DEVELOPER_LOCK_CONTRACT = "3s5gg6upQXd4USTUQKdrWPBexEa2sZwzoD4P3HLA4tUK";
export const PDAO_HOLDER_THRESHOLD_USD = 25;
export const PDAO_HOLDER_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;
export const PDAO_PROMOTION_START_AT = "2026-10-20T00:00:00.000Z";
export const PDAO_PROMOTION_END_AT = "2026-11-20T00:00:00.000Z";
export const PDAO_ELIGIBLE_SERVICE_MAX_USD = 0.10;
export const PDAO_HOLDER_TIERS = Object.freeze([
  { id: "access", name: "Access", threshold_usd: 25, monthly_credit_usd: 1, credit_request_limit: 25, discount_bps: 500 },
  { id: "plus", name: "Plus", threshold_usd: 100, monthly_credit_usd: 5, credit_request_limit: 50, discount_bps: 1000 },
  { id: "pro", name: "Pro", threshold_usd: 250, monthly_credit_usd: 15, credit_request_limit: 100, discount_bps: 1500 },
]);
export const PDAO_HOLDER_POLICY_VERSION = "pdao-holder-rewards-v1";
export const PDAO_SNAPSHOT_INTERVAL_MS = 5 * 60 * 1000;
const PDAO_SNAPSHOT_MAX_GAP_MS = 15 * 60 * 1000;
const challengeTtlMs = 5 * 60 * 1000;
const base58Pattern = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

const challengeId = (nonce) => `pdao_access_challenge_${nonce}`;
const entitlementId = (wallet) => `pdao_access_entitlement_${wallet}`;

export function pdaoPromotionStatus(at = new Date()) {
  const observedAt = at instanceof Date ? at.getTime() : Date.parse(at);
  const start = Date.parse(PDAO_PROMOTION_START_AT);
  const end = Date.parse(PDAO_PROMOTION_END_AT);
  return {
    id: "pdao-holder-promotion-2026-10",
    active: Number.isFinite(observedAt) && observedAt >= start && observedAt < end,
    starts_at: PDAO_PROMOTION_START_AT,
    ends_at: PDAO_PROMOTION_END_AT,
    display_ends_on: "2026-11-19",
    qualification_mode: "current_balance_at_each_service_execution",
    qualification_days: 0,
    threshold_usd: PDAO_HOLDER_THRESHOLD_USD,
    eligible_service_max_usd: PDAO_ELIGIBLE_SERVICE_MAX_USD,
    payment_required: false,
    wallet_link_date_does_not_extend_promotion: true,
  };
}

export function pdaoTierForValue(valueUsd) {
  const value = Number(valueUsd);
  return [...PDAO_HOLDER_TIERS].reverse().find((tier) => value >= tier.threshold_usd) || null;
}

export function publicPdaoBenefitPolicy(qualificationDays = 0, at = new Date()) {
  const promotion = pdaoPromotionStatus(at);
  return {
    version: PDAO_HOLDER_POLICY_VERSION,
    token_mint: PDAO_TOKEN_MINT,
    utility: ["commercial_payment_activation", "agent_exchange_holder_access", "governance_coordination"],
    payment_gate_url: "https://privatedao.org/payment-gate",
    token_surface_url: "https://privatedao.org/token",
    ordinary_agent_exchange_payment_asset: "USDC",
    developer_allocation: PDAO_DEVELOPER_ALLOCATION,
    developer_lock_until: PDAO_DEVELOPER_LOCK_UNTIL,
    developer_lock_contract: PDAO_DEVELOPER_LOCK_CONTRACT,
    duration_days: 30,
    qualification_days: qualificationDays,
    qualification_mode: qualificationDays > 0 ? "historical_balance_required" : "current_balance_pilot",
    promotion,
    promotion_note: "The fixed platform-wide promotion is separate from the seven-day Holder Rewards qualification window.",
    eligible_service_max_usd: PDAO_ELIGIBLE_SERVICE_MAX_USD,
    credits_apply_before_discounts: true,
    credits_expire_each_cycle: true,
    discounts_stackable: false,
    excluded: ["high-cost services", "premium services", "third-party seller services"],
    tiers: PDAO_HOLDER_TIERS.map((tier) => ({ ...tier, discount_percent: tier.discount_bps / 100 })),
  };
}

export function calculatePdaoBenefit({ tier, servicePrice, creditRemainingUsd, creditRequestsUsed, promotionActive = false }) {
  const price = Number(servicePrice);
  const remaining = Math.max(0, Number(creditRemainingUsd || 0));
  const requestsUsed = Math.max(0, Number(creditRequestsUsed || 0));
  const eligible = Boolean(tier && Number.isFinite(price) && price > 0 && price <= PDAO_ELIGIBLE_SERVICE_MAX_USD);
  if (!eligible) return {
    eligible: false,
    reason: tier ? "service_not_eligible" : "no_qualifying_tier",
    tier_id: tier?.id || null,
    credit_applied_usd: 0,
    discount_bps: 0,
    discount_percent: 0,
    charge_usd: Number.isFinite(price) ? Number(price.toFixed(6)) : 0,
    fully_covered: false,
  };
  if (promotionActive) return {
    eligible: true,
    reason: "eligible_fixed_platform_promotion",
    tier_id: tier.id,
    credit_applied_usd: 0,
    discount_bps: 0,
    discount_percent: 0,
    charge_usd: 0,
    fully_covered: true,
    promotion_id: "pdao-holder-promotion-2026-10",
  };
  const creditAvailable = requestsUsed < tier.credit_request_limit;
  const creditApplied = creditAvailable ? Math.min(price, remaining) : 0;
  const afterCredit = Math.max(0, price - creditApplied);
  const charge = Number((afterCredit * (1 - tier.discount_bps / 10000)).toFixed(6));
  return {
    eligible: true,
    reason: "eligible_first_party_service",
    tier_id: tier.id,
    credit_applied_usd: Number(creditApplied.toFixed(6)),
    discount_bps: tier.discount_bps,
    discount_percent: tier.discount_bps / 100,
    charge_usd: charge,
    fully_covered: charge <= 0,
  };
}

function asWallet(value) {
  const wallet = String(value || "");
  if (!base58Pattern.test(wallet)) throw Object.assign(new Error("valid Solana wallet is required"), { statusCode: 400 });
  try { return new PublicKey(wallet).toBase58(); } catch { throw Object.assign(new Error("valid Solana wallet is required"), { statusCode: 400 }); }
}

function hashInput(input) {
  return JSON.stringify(input ?? {});
}

async function enforceHolderUsageLimits(storage, config, wallet) {
  const buckets = [
    [`pdao-holder-minute:${wallet}`, config.pdaoHolderPerMinuteLimit, 60 * 1000, "per-minute"],
    [`pdao-holder-day:${wallet}`, config.pdaoHolderDailyLimit, 24 * 60 * 60 * 1000, "daily"],
    [`pdao-holder-month:${wallet}`, config.pdaoHolderMonthlyLimit, PDAO_HOLDER_WINDOW_MS, "monthly"],
  ];
  for (const [key, limit, windowMs, label] of buckets) {
    const decision = await storage.consumeRateLimit(key, limit, windowMs);
    if (!decision.allowed) {
      const error = Object.assign(new Error(`PDAO holder ${label} usage limit reached; retry after ${decision.retryAfterSeconds} seconds`), { statusCode: 429 });
      error.retryAfterSeconds = decision.retryAfterSeconds;
      throw error;
    }
  }
  return {
    per_minute: config.pdaoHolderPerMinuteLimit,
    daily: config.pdaoHolderDailyLimit,
    monthly: config.pdaoHolderMonthlyLimit,
  };
}

export function createPdaoChallengeMessage({ domain, wallet, serviceId, inputHash, nonce, expiresAt }) {
  return [
    "PrivateDAO Agent Exchange token-holder access",
    `domain: ${domain}`,
    `purpose: ${PDAO_HOLDER_PURPOSE}`,
    `wallet: ${wallet}`,
    `service_id: ${serviceId}`,
    `input_hash: ${inputHash}`,
    `nonce: ${nonce}`,
    `expires_at: ${expiresAt}`,
    "Sign this message only to prove wallet ownership. No transaction will be sent.",
  ].join("\n");
}

export async function issuePdaoChallenge({ config, storage, wallet, serviceId, input, now = new Date() }) {
  if (config.pdaoMint !== PDAO_TOKEN_MINT) throw Object.assign(new Error("PDAO holder access token configuration mismatch"), { statusCode: 503 });
  const normalizedWallet = asWallet(wallet);
  const inputHash = hashInput(input);
  const currentTime = now instanceof Date ? now : new Date(now);
  const expiresAt = new Date(currentTime.getTime() + challengeTtlMs).toISOString();
  const nonce = randomUUID();
  const message = createPdaoChallengeMessage({
    domain: config.domain,
    wallet: normalizedWallet,
    serviceId,
    inputHash,
    nonce,
    expiresAt,
  });
  await storage.put("Registry", challengeId(nonce), {
    id: challengeId(nonce),
    kind: "pdao_access_challenge",
    wallet: normalizedWallet,
    service_id: serviceId,
    input_hash: inputHash,
    message,
    expires_at: expiresAt,
    created_at: currentTime.toISOString(),
  }, true);
  return {
    purpose: PDAO_HOLDER_PURPOSE,
    wallet: normalizedWallet,
    message,
    nonce,
    expires_at: expiresAt,
    token_mint: config.pdaoMint,
    threshold_usd: PDAO_HOLDER_THRESHOLD_USD,
    duration_days: 30,
    promotion: pdaoPromotionStatus(currentTime),
  };
}

function decodeSignature(value) {
  const raw = String(value || "");
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(raw)) throw new Error("wallet signature must be base64");
  const decoded = Buffer.from(raw, "base64");
  if (decoded.length !== 64) throw new Error("wallet signature must be 64 bytes");
  return new Uint8Array(decoded);
}

function verifySignature(wallet, message, signature) {
  const publicKey = new PublicKey(wallet);
  return nacl.sign.detached.verify(
    new TextEncoder().encode(message),
    decodeSignature(signature),
    publicKey.toBytes(),
  );
}

async function readHolderBalance(config, wallet) {
  const response = await readRpc(config, "getTokenAccountsByOwner", [
    wallet,
    { mint: config.pdaoMint },
    { commitment: "finalized", encoding: "jsonParsed" },
  ]);
  let atomic = 0n;
  let decimals = null;
  for (const item of response.result?.value || []) {
    const info = item.account?.data?.parsed?.info;
    if (!info || info.mint !== config.pdaoMint) continue;
    const amount = info.tokenAmount?.amount;
    if (!/^\d+$/.test(String(amount || ""))) continue;
    atomic += BigInt(amount);
    decimals ??= Number(info.tokenAmount?.decimals);
  }
  if (!Number.isInteger(decimals) || decimals < 0 || decimals > 18) {
    const supply = await readRpc(config, "getTokenSupply", [config.pdaoMint, { commitment: "finalized" }]);
    decimals = Number(supply.result?.value?.decimals);
  }
  if (!Number.isInteger(decimals) || decimals < 0 || decimals > 18) throw new Error("PDAO token decimals unavailable");
  return { atomic, decimals, amount: Number(atomic) / 10 ** decimals };
}

async function readPdaoUsdPrice(config) {
  const response = await fetch(`${config.marketDataUrl.replace(/\/$/, "")}/tokens/${encodeURIComponent(config.pdaoMint)}`, {
    headers: { accept: "application/json" },
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new Error(`PDAO market data HTTP ${response.status}`);
  const body = await response.json();
  const pairs = (Array.isArray(body.pairs) ? body.pairs : [])
    .filter((pair) => pair.chainId === "solana")
    .map((pair) => {
      const direct = pair.baseToken?.address === config.pdaoMint;
      const inverse = pair.quoteToken?.address === config.pdaoMint;
      const quoted = Number(pair.priceUsd);
      const priceUsd = direct ? quoted : inverse && quoted > 0 ? 1 / quoted : NaN;
      return { pair, priceUsd };
    })
    .filter(({ priceUsd }) => Number.isFinite(priceUsd) && priceUsd > 0)
    .sort((a, b) => Number(b.pair.liquidity?.usd || 0) - Number(a.pair.liquidity?.usd || 0));
  const selected = pairs[0];
  if (!selected) throw new Error("PDAO token has no usable Solana USD market price");
  return {
    price_usd: selected.priceUsd,
    source: "dexscreener",
    pair_address: selected.pair.pairAddress || null,
    observed_at: new Date().toISOString(),
  };
}

async function recordPdaoBalanceSnapshot({ config, storage, wallet, balance, price, observedAt = new Date() }) {
  const observed = observedAt instanceof Date ? observedAt : new Date(observedAt);
  const bucket = Math.floor(observed.getTime() / PDAO_SNAPSHOT_INTERVAL_MS);
  const snapshot = {
    id: `pdao_holder_snapshot_${wallet}_${bucket}`,
    kind: "pdao_holder_balance_snapshot",
    wallet,
    token_mint: config.pdaoMint,
    observed_at: observed.toISOString(),
    balance_tokens: balance.amount,
    price_usd: price.price_usd,
    value_usd: Number((balance.amount * price.price_usd).toFixed(6)),
    price_source: price.source,
    pair_address: price.pair_address,
  };
  try {
    await storage.put("Registry", snapshot.id, snapshot, true);
  } catch {
    // The scheduled sweep and a live verification may target the same bucket.
  }
  return snapshot;
}

async function pdaoHistoricalQualification({ config, storage, wallet, now = new Date() }) {
  const requiredDays = Number(config.pdaoHolderQualificationDays || 0);
  if (requiredDays <= 0) return { qualified: true, mode: "current_balance_pilot", snapshot_count: 0 };
  const cutoffMs = now.getTime() - requiredDays * 24 * 60 * 60 * 1000;
  const snapshots = (await storage.list("Registry"))
    .filter((item) => item.kind === "pdao_holder_balance_snapshot" && item.wallet === wallet)
    .filter((item) => {
      const time = Date.parse(item.observed_at);
      return Number.isFinite(time) && time >= cutoffMs && time <= now.getTime();
    })
    .sort((a, b) => Date.parse(a.observed_at) - Date.parse(b.observed_at));
  const first = snapshots[0] ? Date.parse(snapshots[0].observed_at) : NaN;
  const last = snapshots.at(-1) ? Date.parse(snapshots.at(-1).observed_at) : NaN;
  const coveredStart = Number.isFinite(first) && first <= cutoffMs + PDAO_SNAPSHOT_MAX_GAP_MS;
  const coveredEnd = Number.isFinite(last) && last >= now.getTime() - PDAO_SNAPSHOT_MAX_GAP_MS;
  const continuouslyQualified = snapshots.length > 1
    && snapshots.every((item) => Number(item.value_usd) >= PDAO_HOLDER_THRESHOLD_USD)
    && snapshots.slice(1).every((item, index) => Date.parse(item.observed_at) - Date.parse(snapshots[index].observed_at) <= PDAO_SNAPSHOT_MAX_GAP_MS);
  return {
    qualified: coveredStart && coveredEnd && continuouslyQualified,
    mode: "historical_balance_required",
    required_days: requiredDays,
    snapshot_count: snapshots.length,
    first_snapshot_at: Number.isFinite(first) ? snapshots[0].observed_at : null,
    last_snapshot_at: Number.isFinite(last) ? snapshots.at(-1).observed_at : null,
  };
}

export async function runPdaoHolderBalanceSnapshots({ config, storage, limit = 100 } = {}) {
  const candidates = (await storage.list("Registry"))
    .filter((item) => item.kind === "pdao_holder_entitlement" && item.wallet)
    .slice(0, limit);
  if (!candidates.length) return { status: "completed", scanned: 0, recorded: 0, failed: 0, failures: [] };
  let price;
  try {
    price = await readPdaoUsdPrice(config);
  } catch (error) {
    return { status: "degraded", scanned: candidates.length, recorded: 0, failed: candidates.length, failures: [{ reason: String(error.message || error).slice(0, 160) }] };
  }
  const result = { status: "completed", scanned: candidates.length, recorded: 0, failed: 0, failures: [] };
  for (const candidate of candidates) {
    try {
      const balance = await readHolderBalance(config, candidate.wallet);
      await recordPdaoBalanceSnapshot({ config, storage, wallet: candidate.wallet, balance, price });
      result.recorded += 1;
    } catch (error) {
      result.failed += 1;
      result.failures.push({ wallet: candidate.wallet, reason: String(error.message || error).slice(0, 160) });
    }
  }
  return result;
}

export async function verifyPdaoHolderAccess({ config, storage, access, serviceId, input, servicePrice = null, now = new Date() }) {
  if (!access || typeof access !== "object") return null;
  if (config.pdaoMint !== PDAO_TOKEN_MINT) throw Object.assign(new Error("PDAO holder access token configuration mismatch"), { statusCode: 503 });
  const wallet = asWallet(access.wallet);
  const nonce = String(access.nonce || "");
  if (!/^[0-9a-f-]{36}$/i.test(nonce)) throw Object.assign(new Error("token-holder access challenge is invalid"), { statusCode: 401 });
  const challenge = await storage.get("Registry", challengeId(nonce));
  if (!challenge || challenge.kind !== "pdao_access_challenge" || challenge.wallet !== wallet || challenge.service_id !== serviceId || challenge.input_hash !== hashInput(input))
    throw Object.assign(new Error("token-holder access challenge is invalid or expired"), { statusCode: 401 });
  const currentTime = now instanceof Date ? now : new Date(now);
  if (Date.parse(challenge.expires_at) <= currentTime.getTime()) throw Object.assign(new Error("token-holder access challenge is expired"), { statusCode: 401 });
  if (String(access.message || "") !== challenge.message) throw Object.assign(new Error("signed access message does not match the challenge"), { statusCode: 401 });
  try {
    if (!verifySignature(wallet, challenge.message, access.signature)) throw new Error("signature verification failed");
  } catch {
    throw Object.assign(new Error("wallet signature verification failed"), { statusCode: 401 });
  }
  const balance = await readHolderBalance(config, wallet);
  const price = await readPdaoUsdPrice(config);
  const valueUsd = balance.amount * price.price_usd;
  if (!Number.isFinite(valueUsd) || valueUsd < PDAO_HOLDER_THRESHOLD_USD)
    throw Object.assign(new Error("wallet does not currently hold the required PDAO token value"), { statusCode: 403 });
  await recordPdaoBalanceSnapshot({ config, storage, wallet, balance, price, observedAt: currentTime });
  const promotion = pdaoPromotionStatus(currentTime);
  const historical = promotion.active
    ? { qualified: true, mode: "current_balance_at_each_service_execution", snapshot_count: 0, required_days: 0 }
    : await pdaoHistoricalQualification({ config, storage, wallet, now: currentTime });
  if (!historical.qualified) {
    const error = Object.assign(new Error(`PDAO holder access requires ${historical.required_days} consecutive days of qualifying balance; ${historical.snapshot_count} verified snapshots are currently available`), { statusCode: 403 });
    error.pdaoQualification = historical;
    throw error;
  }
  const usageLimits = await enforceHolderUsageLimits(storage, config, wallet);
  try {
    await storage.claim("Registry", challenge.id, {
      claim_started_at: new Date().toISOString(),
      // The challenge itself expires in five minutes. Keep the claim lease
      // until that same expiry so a signed message cannot be replayed after a
      // short conditional-write lease has elapsed.
      claim_expires_at: challenge.expires_at,
      claim_wallet: wallet,
    });
  } catch {
    throw Object.assign(new Error("token-holder access challenge was already used"), { statusCode: 409 });
  }
  const existing = await storage.get("Registry", entitlementId(wallet));
  const nowIso = currentTime.toISOString();
  const active = promotion.active || (existing?.active_until && Date.parse(existing.active_until) > currentTime.getTime());
  const cycleStartedAt = active ? (existing?.cycle_started_at || promotion.starts_at || nowIso) : nowIso;
  const activeUntil = promotion.active
    ? PDAO_PROMOTION_END_AT
    : active ? existing.active_until : new Date(currentTime.getTime() + PDAO_HOLDER_WINDOW_MS).toISOString();
  const tier = pdaoTierForValue(valueUsd);
  const creditRemainingUsd = active && existing?.tier_id === tier?.id
    ? Number(existing.credit_remaining_usd || 0)
    : Number(tier?.monthly_credit_usd || 0);
  const creditRequestsUsed = active && existing?.tier_id === tier?.id
    ? Number(existing.credit_requests_used || 0)
    : 0;
  const benefit = calculatePdaoBenefit({ tier, servicePrice, creditRemainingUsd, creditRequestsUsed, promotionActive: promotion.active });
  const entitlement = {
    id: entitlementId(wallet),
    kind: "pdao_holder_entitlement",
    wallet,
    token_mint: config.pdaoMint,
    threshold_usd: PDAO_HOLDER_THRESHOLD_USD,
    policy_version: PDAO_HOLDER_POLICY_VERSION,
    activated_at: existing?.activated_at || nowIso,
    active_until: activeUntil,
    cycle_started_at: cycleStartedAt,
    tier_id: tier?.id || null,
    tier_name: tier?.name || null,
    monthly_credit_usd: tier?.monthly_credit_usd || 0,
    credit_remaining_usd: creditRemainingUsd,
    credit_requests_used: creditRequestsUsed,
    credit_request_limit: tier?.credit_request_limit || 0,
    discount_bps: tier?.discount_bps || 0,
    qualification_days: promotion.active ? 0 : config.pdaoHolderQualificationDays,
    qualification_mode: historical.mode,
    promotion_id: promotion.active ? promotion.id : null,
    qualification_snapshot_count: historical.snapshot_count,
    qualification_first_snapshot_at: historical.first_snapshot_at || null,
    qualification_last_snapshot_at: historical.last_snapshot_at || null,
    last_verified_at: nowIso,
    last_balance_tokens: balance.amount,
    last_price_usd: price.price_usd,
    last_value_usd: valueUsd,
    price_source: price.source,
    pair_address: price.pair_address,
  };
  await storage.put("Registry", entitlement.id, entitlement);
  return {
    type: "pdao_holder_rewards",
    wallet,
    token_mint: config.pdaoMint,
    threshold_usd: PDAO_HOLDER_THRESHOLD_USD,
    tier_id: tier?.id || null,
    tier_name: tier?.name || null,
    monthly_credit_usd: tier?.monthly_credit_usd || 0,
    credit_remaining_usd: creditRemainingUsd,
    credit_requests_used: creditRequestsUsed,
    credit_request_limit: tier?.credit_request_limit || 0,
    discount_bps: tier?.discount_bps || 0,
    discount_percent: tier ? tier.discount_bps / 100 : 0,
    balance_tokens: balance.amount,
    price_usd: price.price_usd,
    value_usd: valueUsd,
    verified_at: entitlement.last_verified_at,
    active_until: activeUntil,
    source: price.source,
    usage_limits: usageLimits,
    service_id: serviceId,
    benefit,
  };
}

export async function consumePdaoBenefit({ storage, wallet, entitlement, servicePrice }) {
  if (!entitlement?.benefit?.eligible || Number(entitlement.benefit.credit_applied_usd || 0) <= 0) {
    return { consumed: false, reason: "no_credit_to_consume" };
  }
  const creditApplied = Number(entitlement.benefit.credit_applied_usd || 0);
  if (typeof storage.consumePdaoCredit !== "function") throw new Error("PDAO credit settlement is unavailable");
  return storage.consumePdaoCredit({
    entitlementId: entitlementId(wallet),
    claimId: entitlement.benefit_claim_id,
    creditAppliedUsd: creditApplied,
    requestLimit: entitlement.credit_request_limit,
    serviceId: entitlement.service_id,
    servicePrice,
  });
}
