import assert from "node:assert/strict";
import test from "node:test";
import nacl from "tweetnacl";
import { Keypair } from "@solana/web3.js";
import { MemoryStore } from "../src/storage.mjs";
import { calculatePdaoBenefit, consumePdaoBenefit, createPdaoChallengeMessage, issuePdaoChallenge, pdaoTierForValue, publicPdaoBenefitPolicy, runPdaoHolderBalanceSnapshots, verifyPdaoHolderAccess } from "../src/pdao-entitlement.mjs";

const config = {
  domain: "agents.privatedao.org",
  pdaoMint: "9isGuumtaqvJeJeyLF44fvfskk2cv5mYsopexMBfpump",
  marketDataUrl: "https://market.invalid",
  cluster: "mainnet-beta",
  mainnetGenesisHash: "5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d",
  treasury: "2BJ4ezxqV9YJXc38D9duKBkdn4su4jE1beKUHwH663sL",
  usdcMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  rpcPrimary: "https://rpc.invalid",
  rpcSecondary: "",
  rpcFallback: "",
  pdaoHolderPerMinuteLimit: 10,
  pdaoHolderDailyLimit: 100,
  pdaoHolderMonthlyLimit: 1000,
};

test("PDAO holder access verifies the exact signed challenge, balance and one-time nonce", async () => {
  const previousFetch = global.fetch;
  const wallet = Keypair.generate();
  const input = { network: "solana-mainnet-beta", wallet: "11111111111111111111111111111111" };
  global.fetch = async (url, options = {}) => {
    if (url === config.marketDataUrl + "/tokens/" + config.pdaoMint) {
      return new Response(JSON.stringify({ pairs: [{ chainId: "solana", pairAddress: "pair", baseToken: { address: config.pdaoMint }, quoteToken: { address: config.usdcMint }, priceUsd: "0.00002721", liquidity: { usd: 14000 } }] }), { status: 200 });
    }
    const body = JSON.parse(options.body || "{}");
    if (body.method === "getGenesisHash") return new Response(JSON.stringify({ result: config.mainnetGenesisHash }), { status: 200 });
    if (body.method === "getTokenAccountsByOwner") return new Response(JSON.stringify({ result: { value: [{ account: { data: { parsed: { info: { mint: config.pdaoMint, tokenAmount: { amount: "1000000000000000", decimals: 9 } } } } } }] } }), { status: 200 });
    throw new Error(`unexpected fetch ${url} ${body.method || ""}`);
  };
  try {
    const storage = new MemoryStore();
    const challenge = await issuePdaoChallenge({ config, storage, wallet: wallet.publicKey.toBase58(), serviceId: "wallet.intelligence", input });
    const signature = nacl.sign.detached(new TextEncoder().encode(challenge.message), wallet.secretKey);
    const access = { wallet: challenge.wallet, message: challenge.message, nonce: challenge.nonce, signature: Buffer.from(signature).toString("base64") };
    const verified = await verifyPdaoHolderAccess({ config, storage, access, serviceId: "wallet.intelligence", input });
    assert.equal(verified.type, "pdao_holder_rewards");
    assert.equal(verified.token_mint, config.pdaoMint);
    assert.equal(verified.threshold_usd, 25);
    assert.equal(verified.balance_tokens, 1000000);
    assert.ok(Math.abs(verified.value_usd - 27.21) < 0.000001);
    assert.equal(verified.tier_id, "access");
    assert.equal(verified.monthly_credit_usd, 1);
    assert.equal(verified.discount_percent, 5);
    assert.equal(verified.benefit.charge_usd, 0);
    assert.deepEqual(verified.usage_limits, { per_minute: 10, daily: 100, monthly: 1000, multiplier: 1 });
    await assert.rejects(() => verifyPdaoHolderAccess({ config, storage, access, serviceId: "wallet.intelligence", input }), /already used/);
  } finally {
    global.fetch = previousFetch;
  }
});

test("holder rewards select the highest tier and apply credit before a non-stackable discount", () => {
  assert.equal(pdaoTierForValue(25).id, "access");
  assert.equal(pdaoTierForValue(100).id, "plus");
  assert.equal(pdaoTierForValue(250).id, "pro");
  assert.deepEqual(calculatePdaoBenefit({ tier: pdaoTierForValue(100), servicePrice: 0.1, creditRemainingUsd: 0.05, creditRequestsUsed: 0 }), {
    eligible: true,
    reason: "eligible_first_party_service",
    tier_id: "plus",
    credit_applied_usd: 0.05,
    discount_bps: 1000,
    discount_percent: 10,
    charge_usd: 0.045,
    fully_covered: false,
    priority_weight: 20,
    priority_class: "holder_plus",
    privatepay_fee_discount_bps: 1000,
    seller_listing_discount_bps: 5000,
  });
  assert.equal(calculatePdaoBenefit({ tier: pdaoTierForValue(250), servicePrice: 0.25, creditRemainingUsd: 15, creditRequestsUsed: 0 }).eligible, false);
});

test("holder policy is explicit and credit settlement is idempotent", async () => {
  const policy = publicPdaoBenefitPolicy(0);
  assert.equal(policy.qualification_mode, "current_balance_at_each_service_execution");
  assert.deepEqual(policy.tiers.map((tier) => tier.id), ["access", "plus", "pro"]);
  assert.equal(policy.tiers.at(-1).seller_listing_discount_percent, 100);
  const storage = new MemoryStore();
  await storage.put("Registry", "pdao_access_entitlement_wallet", {
    id: "pdao_access_entitlement_wallet",
    credit_remaining_usd: 1,
    credit_requests_used: 0,
  });
  const entitlement = {
    wallet: "wallet",
    service_id: "verify.deep",
    credit_request_limit: 25,
    benefit_claim_id: "job_1",
    benefit: { eligible: true, credit_applied_usd: 0.1 },
    credit_remaining_usd: 1,
    credit_requests_used: 0,
  };
  const first = await consumePdaoBenefit({ storage, wallet: "wallet", entitlement, servicePrice: 0.1 });
  const second = await consumePdaoBenefit({ storage, wallet: "wallet", entitlement, servicePrice: 0.1 });
  assert.equal(first.consumed, true);
  assert.equal(second.reason, "already_consumed");
  assert.equal((await storage.get("Registry", "pdao_access_entitlement_wallet")).credit_remaining_usd, 0.9);
});

test("historical holder qualification fails closed before seven days of snapshots", async () => {
  const previousFetch = global.fetch;
  const wallet = Keypair.generate();
  const historicalConfig = { ...config, pdaoHolderQualificationDays: 7 };
  global.fetch = async (url, options = {}) => {
    if (url === config.marketDataUrl + "/tokens/" + config.pdaoMint) {
      return new Response(JSON.stringify({ pairs: [{ chainId: "solana", pairAddress: "pair", baseToken: { address: config.pdaoMint }, quoteToken: { address: config.usdcMint }, priceUsd: "0.00002721", liquidity: { usd: 14000 } }] }), { status: 200 });
    }
    const body = JSON.parse(options.body || "{}");
    if (body.method === "getGenesisHash") return new Response(JSON.stringify({ result: config.mainnetGenesisHash }), { status: 200 });
    if (body.method === "getTokenAccountsByOwner") return new Response(JSON.stringify({ result: { value: [{ account: { data: { parsed: { info: { mint: config.pdaoMint, tokenAmount: { amount: "1000000000000000", decimals: 9 } } } } } }] } }), { status: 200 });
    throw new Error(`unexpected fetch ${url} ${body.method || ""}`);
  };
  try {
    const storage = new MemoryStore();
    const input = { network: "solana-mainnet-beta" };
    const afterPromotion = new Date("2026-11-21T00:00:00.000Z");
    const challenge = await issuePdaoChallenge({ config: historicalConfig, storage, wallet: wallet.publicKey.toBase58(), serviceId: "wallet.intelligence", input, now: afterPromotion });
    const signature = nacl.sign.detached(new TextEncoder().encode(challenge.message), wallet.secretKey);
    await assert.rejects(
      () => verifyPdaoHolderAccess({ config: historicalConfig, storage, serviceId: "wallet.intelligence", input, now: afterPromotion, access: { wallet: challenge.wallet, message: challenge.message, nonce: challenge.nonce, signature: Buffer.from(signature).toString("base64") } }),
      /requires 7 consecutive days/,
    );
    assert.equal((await storage.list("Registry")).filter((item) => item.kind === "pdao_holder_balance_snapshot").length, 1);
    await storage.put("Registry", "pdao_access_entitlement_" + wallet.publicKey.toBase58(), { id: "pdao_access_entitlement_" + wallet.publicKey.toBase58(), kind: "pdao_holder_entitlement", wallet: wallet.publicKey.toBase58() });
    const sweep = await runPdaoHolderBalanceSnapshots({ config: historicalConfig, storage });
    assert.deepEqual({ status: sweep.status, scanned: sweep.scanned, failed: sweep.failed }, { status: "completed", scanned: 1, failed: 0 });
  } finally {
    global.fetch = previousFetch;
  }
});

test("holder challenge message binds service and input hash", () => {
  const message = createPdaoChallengeMessage({ domain: "agents.privatedao.org", wallet: "11111111111111111111111111111111", serviceId: "wallet.intelligence", inputHash: "hash", nonce: "nonce", expiresAt: "2026-10-11T00:00:00.000Z" });
  assert.match(message, /purpose: pdao-token-holder-monthly-access/);
  assert.match(message, /service_id: wallet\.intelligence/);
  assert.match(message, /input_hash: hash/);
});
