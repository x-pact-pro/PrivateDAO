import { PublicKey } from "@solana/web3.js";
import nacl from "tweetnacl";
import { randomUUID } from "node:crypto";
import { readRpc } from "./solana.mjs";

export const PDAO_HOLDER_PURPOSE = "pdao-token-holder-monthly-access";
export const PDAO_TOKEN_MINT = "9isGuumtaqvJeJeyLF44fvfskk2cv5mYsopexMBfpump";
export const PDAO_HOLDER_THRESHOLD_USD = 25;
export const PDAO_HOLDER_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;
const challengeTtlMs = 5 * 60 * 1000;
const base58Pattern = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

const challengeId = (nonce) => `pdao_access_challenge_${nonce}`;
const entitlementId = (wallet) => `pdao_access_entitlement_${wallet}`;

function asWallet(value) {
  const wallet = String(value || "");
  if (!base58Pattern.test(wallet)) throw Object.assign(new Error("valid Solana wallet is required"), { statusCode: 400 });
  try { return new PublicKey(wallet).toBase58(); } catch { throw Object.assign(new Error("valid Solana wallet is required"), { statusCode: 400 }); }
}

function hashInput(input) {
  return JSON.stringify(input ?? {});
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

export async function issuePdaoChallenge({ config, storage, wallet, serviceId, input }) {
  if (config.pdaoMint !== PDAO_TOKEN_MINT) throw Object.assign(new Error("PDAO holder access token configuration mismatch"), { statusCode: 503 });
  const normalizedWallet = asWallet(wallet);
  const inputHash = hashInput(input);
  const expiresAt = new Date(Date.now() + challengeTtlMs).toISOString();
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
    created_at: new Date().toISOString(),
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

export async function verifyPdaoHolderAccess({ config, storage, access, serviceId, input }) {
  if (!access || typeof access !== "object") return null;
  if (config.pdaoMint !== PDAO_TOKEN_MINT) throw Object.assign(new Error("PDAO holder access token configuration mismatch"), { statusCode: 503 });
  const wallet = asWallet(access.wallet);
  const nonce = String(access.nonce || "");
  if (!/^[0-9a-f-]{36}$/i.test(nonce)) throw Object.assign(new Error("token-holder access challenge is invalid"), { statusCode: 401 });
  const challenge = await storage.get("Registry", challengeId(nonce));
  if (!challenge || challenge.kind !== "pdao_access_challenge" || challenge.wallet !== wallet || challenge.service_id !== serviceId || challenge.input_hash !== hashInput(input))
    throw Object.assign(new Error("token-holder access challenge is invalid or expired"), { statusCode: 401 });
  if (Date.parse(challenge.expires_at) <= Date.now()) throw Object.assign(new Error("token-holder access challenge is expired"), { statusCode: 401 });
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
  const activeUntil = existing?.active_until && Date.parse(existing.active_until) > Date.now()
    ? existing.active_until
    : new Date(Date.now() + PDAO_HOLDER_WINDOW_MS).toISOString();
  const entitlement = {
    id: entitlementId(wallet),
    kind: "pdao_holder_entitlement",
    wallet,
    token_mint: config.pdaoMint,
    threshold_usd: PDAO_HOLDER_THRESHOLD_USD,
    activated_at: existing?.activated_at || new Date().toISOString(),
    active_until: activeUntil,
    last_verified_at: new Date().toISOString(),
    last_balance_tokens: balance.amount,
    last_price_usd: price.price_usd,
    last_value_usd: valueUsd,
    price_source: price.source,
    pair_address: price.pair_address,
  };
  await storage.put("Registry", entitlement.id, entitlement);
  return {
    type: "pdao_holder_monthly",
    wallet,
    token_mint: config.pdaoMint,
    threshold_usd: PDAO_HOLDER_THRESHOLD_USD,
    balance_tokens: balance.amount,
    price_usd: price.price_usd,
    value_usd: valueUsd,
    verified_at: entitlement.last_verified_at,
    active_until: activeUntil,
    source: price.source,
  };
}
