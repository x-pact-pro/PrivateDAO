import { randomUUID, randomBytes, timingSafeEqual } from "node:crypto";
import { readFileSync } from "node:fs";
import { PublicKey } from "@solana/web3.js";
import { getConfig, hydrateConfig } from "./config.mjs";
import { digest, receiptId } from "./canonical.mjs";
import { SERVICES, serviceById } from "./catalog.mjs";
import { LIVE_NETWORKS, NETWORK_CAPABILITIES, networkCapability, normalizeNetworkId } from "./network-capabilities.mjs";
import { createStore, MemoryStore } from "./storage.mjs";
import {
  mintEvidence,
  networkStats,
  solanaHealth,
  readRpc,
  swapQuote,
  simulateSolanaTransaction,
  treasuryTokenAccount,
  verifyPayment,
} from "./solana.mjs";
import { evmNetwork, evmHealth, executeEvmService, evmRuntimeStats, isEvmServiceSupported } from "./evm.mjs";
import { enforceRateLimit, rateLimitKey, resetRuntimeControls } from "./runtime-controls.mjs";
import {
  researchAsset,
  researchWallet,
  explainContract,
  explainTransaction,
  detectAnomaly,
  researchReport,
  portfolioIntelligence,
  marketSnapshot,
} from "./intelligence.mjs";
import { intelProviderStatus, runIntelInference } from "./intel.mjs";
import { ibmProviderStatus, runWatsonxInference } from "./ibm.mjs";
import { githubProviderStatus, repositoryEvidence } from "./github.mjs";
import { applyGithubMarketplacePurchase, githubAppConfigured, githubGetInstallation, githubInstallationRepositories, githubRepositoryContext, mergeGithubInstallationRepositories, publicGithubInstallationRecord, verifyGithubWebhook } from "./github-app.mjs";
import { mongoProviderStatus, persistEvidence } from "./mongodb.mjs";
import { assertPublicHttps, fetchPublicHttps } from "./url-safety.mjs";
import { integrationDirectory, serviceDetails, serviceRecommendation, SERVICE_CATEGORIES } from "./exchange-metadata.mjs";

const config = getConfig();
let storePromise;
let configPromise;
const store = () => (storePromise ||= createStore(config));
const runtimeConfig = () => (configPromise ||= hydrateConfig(config));
const now = () => new Date().toISOString();
const githubSetupStateTtlMs = 15 * 60 * 1000;
const githubRecordId = (installationId) => `github_installation_${String(installationId)}`;
const githubStateId = (state) => `github_setup_state_${state}`;
const hashSecret = (value) => digest(String(value || ""));
function secretMatches(supplied, storedHash) {
  if (!supplied || !storedHash) return false;
  const actual = Buffer.from(hashSecret(supplied));
  const expected = Buffer.from(String(storedHash));
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
const MARKETPLACE_POLICY_ID = "platform_settings_marketplace";
const SELLER_TERMS_VERSION = "seller-marketplace-v1";
const DEFAULT_MARKETPLACE_POLICY = {
  version: 2,
  listing_fee_usd: 10,
  platform_fee_bps: 1000,
  included_services: 5,
  additional_service_fee_usd: 0,
  max_services_per_seller: 5,
  seller_tiers: {
    free: { label: "Free Seller", max_services: 5, listing_fee_usd: 10, monthly_fee_usd: 0 },
    basic: { label: "Basic Listing", max_services: 5, listing_fee_usd: 10, monthly_fee_usd: 0 },
    pro: { label: "Pro Seller", max_services: 5, listing_fee_usd: 10, monthly_fee_usd: 0 },
  },
  promotion_packages: {
    featured_listing: { label: "Featured Listing", price_usd: 75, duration_days: 30, deliverables: ["Paid featured listing", "Sponsored placement inside Agent Exchange", "Partners spotlight"], channels: ["PrivateDAO Agent Exchange"], availability: "subject_to_capacity", capacity: 10, approval_required: false, third_party_controlled: false },
    ecosystem_campaign: { label: "Ecosystem Campaign", price_usd: 250, duration_days: 30, deliverables: ["Launch campaign", "PrivateDAO social announcement", "Partners spotlight", "Co-marketing campaign planning"], channels: ["PrivateDAO-owned surfaces"], availability: "application_required", capacity: 3, approval_required: true, third_party_controlled: true },
  },
};
function boundedNumber(value, fallback, min, max) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : fallback;
}
function normalizeMarketplacePolicy(value = {}) {
  const source = value && typeof value === "object" ? value : {};
  const tiers = source.seller_tiers && typeof source.seller_tiers === "object" ? source.seller_tiers : {};
  const packages = source.promotion_packages && typeof source.promotion_packages === "object" ? source.promotion_packages : {};
  const policy = {
    ...DEFAULT_MARKETPLACE_POLICY,
    version: 2,
    listing_fee_usd: boundedNumber(source.listing_fee_usd, 10, 0, 10000),
    platform_fee_bps: Math.floor(boundedNumber(source.platform_fee_bps, 1000, 0, 10000)),
    included_services: Math.floor(boundedNumber(source.included_services, 5, 1, 1000)),
    additional_service_fee_usd: boundedNumber(source.additional_service_fee_usd, 0, 0, 10000),
    max_services_per_seller: Math.floor(boundedNumber(source.max_services_per_seller, 5, 1, 1000)),
    seller_tiers: {},
    promotion_packages: {},
  };
  for (const [id, defaults] of Object.entries(DEFAULT_MARKETPLACE_POLICY.seller_tiers)) {
    const item = tiers[id] && typeof tiers[id] === "object" ? tiers[id] : {};
    policy.seller_tiers[id] = {
      ...defaults,
      label: String(item.label || defaults.label).slice(0, 100),
      max_services: Math.floor(boundedNumber(item.max_services, defaults.max_services, 1, policy.max_services_per_seller)),
      listing_fee_usd: boundedNumber(item.listing_fee_usd, policy.listing_fee_usd, 0, 10000),
      monthly_fee_usd: boundedNumber(item.monthly_fee_usd, defaults.monthly_fee_usd, 0, 10000),
    };
  }
  for (const [id, defaults] of Object.entries(DEFAULT_MARKETPLACE_POLICY.promotion_packages)) {
    const item = packages[id] && typeof packages[id] === "object" ? packages[id] : {};
    policy.promotion_packages[id] = {
      ...defaults,
      label: String(item.label || defaults.label).slice(0, 120),
      price_usd: boundedNumber(item.price_usd, defaults.price_usd, 0.01, 100000),
      duration_days: Math.floor(boundedNumber(item.duration_days, defaults.duration_days, 1, 365)),
      deliverables: Array.isArray(item.deliverables) ? item.deliverables.map((x) => String(x).slice(0, 240)).slice(0, 12) : defaults.deliverables,
      channels: Array.isArray(item.channels) ? item.channels.map((x) => String(x).slice(0, 120)).slice(0, 12) : defaults.channels,
      availability: String(item.availability || defaults.availability).slice(0, 80),
      capacity: Math.floor(boundedNumber(item.capacity, defaults.capacity, 1, 100000)),
      approval_required: item.approval_required === undefined ? Boolean(defaults.approval_required) : Boolean(item.approval_required),
      third_party_controlled: item.third_party_controlled === undefined ? Boolean(defaults.third_party_controlled) : Boolean(item.third_party_controlled),
    };
  }
  return policy;
}
async function marketplacePolicy() {
  const saved = await (await store()).get("Registry", MARKETPLACE_POLICY_ID);
  if (saved?.policy && Number(saved.policy.version || 0) < 2) {
    const migrated = normalizeMarketplacePolicy({
      ...saved.policy,
      version: 2,
      additional_service_fee_usd: 0,
      max_services_per_seller: 5,
      included_services: 5,
      seller_tiers: Object.fromEntries(Object.entries(saved.policy.seller_tiers || {}).map(([id, tier]) => [id, { ...tier, max_services: 5 }])),
    });
    await (await store()).put("Registry", MARKETPLACE_POLICY_ID, { ...saved, policy: migrated, updated_at: now() });
    return migrated;
  }
  return normalizeMarketplacePolicy(saved?.policy || { platform_fee_bps: config.marketplaceFeeBps });
}
async function saveMarketplacePolicy(value) {
  const current = await marketplacePolicy();
  const incoming = value && typeof value === "object" ? value : {};
  const incomingTiers = incoming.seller_tiers && typeof incoming.seller_tiers === "object" ? incoming.seller_tiers : {};
  const listingFeeChanged = Object.hasOwn(incoming, "listing_fee_usd");
  const mergedTiers = { ...current.seller_tiers, ...incomingTiers };
  const sellerTiers = Object.fromEntries(Object.entries(mergedTiers).map(([id, tier]) => {
    const explicitTier = incomingTiers[id] && typeof incomingTiers[id] === "object" ? incomingTiers[id] : {};
    return [id, listingFeeChanged && !Object.hasOwn(explicitTier, "listing_fee_usd")
      ? { ...tier, listing_fee_usd: incoming.listing_fee_usd }
      : tier];
  }));
  const policy = normalizeMarketplacePolicy({
    ...current,
    ...incoming,
    seller_tiers: sellerTiers,
    promotion_packages: { ...current.promotion_packages, ...(incoming.promotion_packages || {}) },
  });
  await (await store()).put("Registry", MARKETPLACE_POLICY_ID, { id: MARKETPLACE_POLICY_ID, kind: "platform_settings", policy, updated_at: now() });
  return policy;
}
function sellerListingState(agent) {
  return agent?.commercial_publication_status === "published" && agent?.listing_fee_status === "paid";
}
const publicSecretKeyPattern = /^(?:owner_token(?:_hash)?|github_access_token(?:_hash)?|connection_token(?:_hash)?|api_key|client_secret|secret|password|private_key|credential(?:_hash)?)$/i;
function redactPublicValue(value) {
  if (Array.isArray(value)) return value.map(redactPublicValue);
  if (!value || typeof value !== "object") return value;
  const safe = {};
  for (const [key, nestedValue] of Object.entries(value)) {
    const normalizedKey = key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
    if (publicSecretKeyPattern.test(normalizedKey)) continue;
    safe[key] = redactPublicValue(nestedValue);
  }
  return safe;
}
export function publicRegistryAgent(agent) {
  return agent == null ? agent : redactPublicValue(agent);
}
function activeRegistryAgent(agent) {
  return agent && !agent.kind && !agent.retired_at && ["connected", "verified"].includes(agent.status);
}
async function activeRegistryAgents() {
  return (await (await store()).list("Registry")).filter(activeRegistryAgent);
}
function normalizeCommercialServices(value) {
  if (!Array.isArray(value)) return [];
  const seen = new Set();
  return value.map((service) => {
    if (!service || typeof service !== "object") throw new Error("commercial service must be an object");
    const id = String(service.id || service.tool || "").trim();
    if (!/^[A-Za-z0-9_.:-]{1,120}$/.test(id)) throw new Error("commercial service id/tool is required");
    if (seen.has(id)) throw new Error(`duplicate commercial service id: ${id}`);
    seen.add(id);
    const price = service.price == null ? null : Number(service.price);
    if (price != null && (!Number.isFinite(price) || price < 0)) throw new Error(`invalid price for ${id}`);
    const asset = String(service.asset || service.currency || "USDC").toUpperCase();
    const network = normalizeNetworkId(service.network || service.payment_network || "solana-mainnet-beta");
    if (asset !== "USDC") throw new Error(`commercial service asset must be USDC; unsupported asset for ${id}`);
    if (!networkCapability(network)) throw new Error(`commercial service network is unsupported for ${id}`);
    const acceptedAssets = Array.isArray(service.accepted_assets || service.acceptedAssets)
      ? (service.accepted_assets || service.acceptedAssets).map((item) => String(item).toUpperCase()).slice(0, 20)
      : [asset];
    if (!acceptedAssets.length || acceptedAssets.some((item) => item !== "USDC"))
      throw new Error(`commercial service accepted assets must be USDC for ${id}`);
    return {
      id,
      tool: String(service.tool || id),
      title: String(service.title || service.name || id).slice(0, 200),
      description: String(service.description || "").slice(0, 2000),
      price,
      free: price === 0 || service.free === true,
      asset,
      network,
      accepted_assets: acceptedAssets,
      input_schema: service.input_schema && typeof service.input_schema === "object" ? service.input_schema : { type: "object" },
      output_schema: service.output_schema && typeof service.output_schema === "object" ? service.output_schema : { type: "object" },
      execution: { protocol: "MCP", tool: String(service.tool || id) },
      status: service.status === "retired" ? "retired" : "active",
      updated_at: now(),
    };
  }).filter((service) => service.status === "active");
}
function sellerServiceLedger(agent, listing = null) {
  const current = Array.isArray(agent?.listing_fee_ledger) ? agent.listing_fee_ledger.filter((item) => item && item.service_id) : [];
  if (current.length || listing?.payment_status !== "paid") return current;
  return (listing.service_ids || []).map((serviceId) => ({ service_id: serviceId, status: "paid", fee_amount: 0, legacy: true, paid_at: listing.paid_at || listing.created_at || now() }));
}
function sellerListingPlan(agent, services, policy, listing = null) {
  const ledger = sellerServiceLedger(agent, listing);
  const known = new Map(ledger.map((item) => [item.service_id, item]));
  const newServices = services.filter((service) => !known.has(service.id));
  const includedUsed = ledger.filter((item) => item.fee_amount === 0 || item.included === true).length;
  const includedRemaining = Math.max(0, policy.included_services - includedUsed);
  const items = newServices.map((service, index) => {
    const included = !listing?.payment_status || listing.payment_status !== "paid"
      ? index < includedRemaining
      : false;
    return { service_id: service.id, fee_amount: included ? 0 : policy.additional_service_fee_usd, included };
  });
  const baseFee = listing?.payment_status === "paid" ? 0 : Number(policy.listing_fee_usd);
  const amount = Number((baseFee + items.reduce((sum, item) => sum + Number(item.fee_amount), 0)).toFixed(6));
  return { ledger, newServices, items, amount, baseFee, billableServices: newServices, serviceIds: services.map((service) => service.id) };
}
function sellerPublishedServices(agent) {
  const services = (agent?.commercial_services || []).filter((service) => service.status !== "retired");
  if (!sellerListingState(agent)) return [];
  const ledger = sellerServiceLedger(agent, null);
  if (!ledger.length) return services;
  const paid = new Set(ledger.filter((item) => item.status === "paid").map((item) => item.service_id));
  return services.filter((service) => paid.has(service.id));
}
function sellerPayout(value) {
  if (value == null) return null;
  if (typeof value !== "object" || Array.isArray(value)) throw new Error("payout must be an object");
  const address = String(value.address || value.wallet || "").trim();
  if (address && !/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address)) throw new Error("payout address must be a Solana public address");
  if (!address) return null;
  try {
    new PublicKey(address);
  } catch {
    throw new Error("payout address must be a valid Solana public address");
  }
  const network = normalizeNetworkId(value.network || "solana-mainnet-beta");
  if (network !== "solana-mainnet-beta") throw new Error("payout network must be solana-mainnet-beta for the current payout rail");
  const asset = String(value.asset || "USDC").toUpperCase().trim();
  if (asset !== "USDC") throw new Error("payout asset must be USDC for the current settlement rail");
  return { address, network, asset };
}
function sellerAcceptedAssets(value) {
  const assets = Array.isArray(value) ? value.map((item) => String(item).toUpperCase()).slice(0, 20) : [];
  if (assets.some((asset) => asset !== "USDC"))
    throw new Error("accepted assets must be USDC for the current settlement rail");
  return assets;
}
function paymentWithinQuote(payment, quote) {
  const expiresAt = Date.parse(quote?.expires_at || "");
  const paidAt = Number.isFinite(Number(payment?.blockTime)) ? Number(payment.blockTime) * 1000 : NaN;
  return Number.isFinite(expiresAt) && Number.isFinite(paidAt) && paidAt <= expiresAt;
}
async function externalServiceManifests() {
  const agents = (await activeRegistryAgents()).filter(sellerListingState);
  return agents.flatMap((agent) => sellerPublishedServices(agent).map((service) => ({
    ...service,
    id: `external.${agent.id}.${service.id}`,
    service_id: service.id,
    provider: agent.name,
    seller_agent_id: agent.id,
    seller_identity: { agent_id: agent.id, name: agent.name },
    protocols: ["MCP"],
    payment_network: service.network,
    currency: service.asset,
    access: service.free ? "free" : "paid",
    external: true,
  })));
}
function redirect(location) {
  return { statusCode: 302, headers: { location, "cache-control": "no-store", "access-control-allow-origin": config.corsOrigin }, body: "" };
}
function githubSetupPage(message, installationId = "") {
  const installUrl = `https://github.com/apps/${encodeURIComponent(config.githubAppSlug)}/installations/new`;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Connect GitHub | PrivateDAO</title><style>body{font-family:system-ui,sans-serif;max-width:720px;margin:8vh auto;padding:24px;color:#071a32}a{color:#1769e0}.panel{border:1px solid #dbe5ef;border-radius:16px;padding:24px}</style></head><body><div class="panel"><p><a href="/">PrivateDAO Agent Exchange</a></p><h1>Connect GitHub</h1><p>${escapeHtml(message)}</p>${installationId ? `<p>Installation: <code>${escapeHtml(installationId)}</code></p>` : `<p><a href="${installUrl}">Install the PrivateDAO GitHub App</a></p>`}<p>GitHub App authentication uses a short-lived installation token. PrivateDAO does not ask for a password, private key, or seed phrase.</p></div></body></html>`;
}
function githubSetupResponse(message, installationId = "") {
  return { statusCode: 200, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" }, body: githubSetupPage(message, installationId) };
}
function sellerPortalPage() {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>List your agent | PrivateDAO Agent Exchange</title><style>body{font-family:system-ui,sans-serif;max-width:900px;margin:0 auto;padding:32px 20px;color:#071a32}a{color:#1769e0}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:16px}.card{border:1px solid #dbe5ef;border-radius:16px;padding:20px}label{display:block;font-weight:700;margin:12px 0 6px}input,textarea,button{font:inherit;width:100%;box-sizing:border-box;padding:10px;border:1px solid #b9c9d8;border-radius:8px}textarea{min-height:150px;font-family:ui-monospace,monospace}button{background:#1769e0;color:white;border:0;cursor:pointer;margin-top:14px}.muted{color:#52657c}code{overflow-wrap:anywhere}</style></head><body><p><a href="/marketplace">PrivateDAO Agent Exchange</a></p><p class="muted">SELLER PORTAL · SELF-SERVICE ONBOARDING</p><h1>List your agent</h1><p>Connect an MCP endpoint, verify its read-only tools, import up to 5 services, then review the PrivateDAO quote before publication.</p><div class="grid"><article class="card"><h2>Basic Listing</h2><strong>$10 once per agent</strong><p>Up to 5 services. The fee is paid to PrivateDAO and is separate from any GitHub Marketplace billing.</p></article><article class="card"><h2>Execution</h2><strong>10% platform fee</strong><p>Applied only to completed paid executions. Quote, receipt, and settlement show gross, fee, and seller net.</p></article><article class="card"><h2>Promotion</h2><strong>Optional sponsored upsell</strong><p>Featured and ecosystem campaigns are disclosed as paid promotion, not a partnership or certification.</p></article></div><section class="card" style="margin-top:24px"><h2>Register and preview</h2><form id="seller"><label for="agent">Existing agent ID (optional)</label><input id="agent" placeholder="agent_…"><label for="credential">Existing owner credential (optional)</label><input id="credential" type="password" autocomplete="off" placeholder="Required when updating an existing agent"><label for="name">Agent name</label><input id="name" required placeholder="Your agent"><label for="endpoint">Public HTTPS MCP endpoint</label><input id="endpoint" type="url" required placeholder="https://example.com/mcp"><label for="metadata">Service metadata JSON</label><textarea id="metadata" required placeholder='[{"id":"audit","tool":"mint_audit","price":0.02,"asset":"USDC","network":"solana-mainnet-beta","schema":{}}]'></textarea><label for="assets">Accepted assets (comma-separated)</label><input id="assets" placeholder="USDC"><label for="payout">Payout JSON (optional)</label><input id="payout" placeholder='{"address":"…","network":"solana-mainnet-beta","asset":"USDC"}'><label><input id="terms" type="checkbox" style="width:auto" required> I accept the PrivateDAO seller terms and the separate GitHub Marketplace billing disclosure.</label><button>Verify endpoint and import metadata</button></form><pre id="result" class="muted" style="white-space:pre-wrap"></pre></section><script>const form=document.querySelector("#seller"),out=document.querySelector("#result");form.onsubmit=async(e)=>{e.preventDefault();out.textContent="Verifying MCP tools and importing metadata…";try{const services=JSON.parse(document.querySelector("#metadata").value);if(!Array.isArray(services)||services.length>5)throw new Error("Basic Listing allows at most 5 services");const payoutText=document.querySelector("#payout").value.trim();const payload={agent_id:document.querySelector("#agent").value.trim()||undefined,owner_token:document.querySelector("#credential").value||undefined,name:document.querySelector("#name").value,mcp_url:document.querySelector("#endpoint").value,commercial_services:services,accepted_assets:document.querySelector("#assets").value.split(",").map(x=>x.trim()).filter(Boolean),payout:payoutText?JSON.parse(payoutText):undefined};const r=await fetch("/api/registry/register",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(payload)});const data=await r.json();if(!r.ok)throw new Error(data.message||data.error||"registration failed");out.textContent=JSON.stringify({status:"verified",agent_id:data.id,owner_token:data.owner_token||null,credential_notice:data.owner_token?"Save this credential now. PrivateDAO stores only its hash; use authenticated rotation while it is available.":"Existing credential accepted; no credential is returned on update.",next:"Use the owner_token with /api/marketplace/seller-listings/quote, tier=basic, then pay the quoted $10 listing fee."},null,2)}catch(err){out.textContent=err.message||String(err)}};</script></body></html>`;
}
function sellerPortalPageV2() {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>List your agent | PrivateDAO</title><style>body{font-family:system-ui,sans-serif;max-width:760px;margin:7vh auto;padding:24px;color:#071a32}label{display:block;margin:12px 0 5px;font-weight:700}input,textarea,button{box-sizing:border-box;width:100%;padding:10px;font:inherit;border:1px solid #b9c9d8;border-radius:8px}textarea{min-height:130px;font-family:monospace}button{margin-top:16px;background:#1769e0;color:#fff;border:0;cursor:pointer}.card{border:1px solid #dbe5ef;border-radius:16px;padding:22px}.muted{color:#52657c}pre{white-space:pre-wrap}</style></head><body><p><a href="/marketplace">PrivateDAO Agent Exchange</a></p><p class="muted">SELLER PORTAL · BASIC LISTING</p><div class="card"><h1>List your agent</h1><p>$10 once per agent, up to 5 services. A 10% fee applies only to completed paid executions. GitHub Marketplace billing and sponsored promotion are separate.</p><form id="seller"><label>Existing agent ID (optional)<input id="agent" placeholder="agent_…"></label><label>Owner credential (required for an existing agent)<input id="token" type="password" autocomplete="off"></label><label>Agent name<input id="name" required></label><label>Public HTTPS MCP endpoint<input id="endpoint" type="url" required placeholder="https://example.com/mcp"></label><label>Commercial service metadata JSON<textarea id="services" required placeholder='[{"id":"audit","tool":"mint_audit","price":0.02,"asset":"USDC","network":"solana-mainnet-beta","schema":{}}]'></textarea></label><label>Accepted assets<input id="assets" placeholder="USDC"></label><label>Payout JSON (optional)<input id="payout" placeholder='{"address":"…","network":"solana-mainnet-beta","asset":"USDC"}'></label><label><input id="terms" type="checkbox" required style="width:auto"> I accept the PrivateDAO seller terms and separate GitHub Marketplace billing.</label><button>Verify, import, and create quote</button></form><pre id="result" class="muted"></pre></div><script>const f=document.querySelector("#seller"),o=document.querySelector("#result");f.onsubmit=async function(e){e.preventDefault();o.textContent="Verifying MCP and preparing quote…";try{const services=JSON.parse(document.querySelector("#services").value);if(!Array.isArray(services)||services.length<1||services.length>5)throw Error("Basic Listing allows 1 to 5 services");const text=document.querySelector("#payout").value.trim();const payload={agent_id:document.querySelector("#agent").value.trim()||undefined,owner_token:document.querySelector("#token").value||undefined,name:document.querySelector("#name").value,mcp_url:document.querySelector("#endpoint").value,commercial_services:services,accepted_assets:document.querySelector("#assets").value.split(",").map(function(x){return x.trim()}).filter(Boolean),payout:text?JSON.parse(text):undefined};const reg=await fetch("/api/registry/register",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(payload)}),data=await reg.json();if(!reg.ok)throw Error(data.message||data.error||"registration failed");const token=data.owner_token||document.querySelector("#token").value;if(!token)throw Error("No owner credential was returned");const qr=await fetch("/api/marketplace/seller-listings/quote",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({agent_id:data.id,owner_token:token,tier:"basic"})}),quote=await qr.json();if(!qr.ok)throw Error(quote.message||quote.error||"quote failed");o.textContent=JSON.stringify({status:"verified",agent_id:data.id,owner_token:data.owner_token||null,quote:{amount:quote.quote.amount,currency:quote.quote.currency,services:quote.quote.seller_service_ids,expires_at:quote.quote.expires_at,payment_reference:quote.quote.paymentReference},next:"Review the quote, then submit payment to publish."},null,2)}catch(err){o.textContent=err.message||String(err)}};</script></body></html>`;
}
function sellerPortalPageV3() {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Seller Marketplace | PrivateDAO</title><style>:root{font-family:Inter,system-ui,sans-serif;color:#071a32;background:#f7faff}body{max-width:1180px;margin:0 auto;padding:26px 18px}a{color:#1769e0}.top{display:flex;justify-content:space-between;align-items:center;margin-bottom:32px}.eyebrow{font-size:12px;letter-spacing:.14em;color:#1769e0;font-weight:800}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px}.card{background:white;border:1px solid #dbe5ef;border-radius:16px;padding:20px;box-shadow:0 5px 20px #173d6010}label{display:block;font-weight:700;margin:11px 0 5px}input,textarea,button{box-sizing:border-box;width:100%;font:inherit;padding:10px;border:1px solid #b9c9d8;border-radius:8px}textarea{min-height:120px;font-family:ui-monospace,monospace}button{background:#1769e0;color:white;border:0;cursor:pointer;margin-top:12px}button.secondary{background:#eaf2fc;color:#1459b8}.row{display:grid;grid-template-columns:1fr 1fr;gap:12px}.muted{color:#52657c}pre{white-space:pre-wrap;overflow:auto}.stat{font-size:25px;font-weight:800}section{margin:18px 0}@media(max-width:650px){.row{grid-template-columns:1fr}.top{display:block}}</style></head><body><div class="top"><div><p class="eyebrow">PRIVATEDAO AGENT EXCHANGE · SELLER MARKETPLACE</p><h1>Publish and operate your agent</h1><p class="muted">One agent, one $10 listing fee, up to five services. Ten percent applies only to completed paid executions.</p></div><a href="/marketplace">Open Exchange →</a></div><section class="grid"><article class="card"><p class="eyebrow">LISTING</p><div class="stat">$10 once</div><p class="muted">Per agent, never per service. GitHub Marketplace billing is separate.</p></article><article class="card"><p class="eyebrow">EXECUTION</p><div class="stat">90% net</div><p class="muted">Seller net is shown with gross, PrivateDAO fee, receipt, and settlement.</p></article><article class="card"><p class="eyebrow">PROMOTION</p><div class="stat">Optional</div><p class="muted">Sponsored placement is separate from verification and partnership claims.</p></article></section><section class="card"><h2>1. Verify MCP and preview services</h2><form id="onboard"><div class="row"><label>Existing agent ID (optional)<input id="agent" placeholder="agent_…"></label><label>Owner credential (for existing agent)<input id="token" type="password" autocomplete="off"></label></div><div class="row"><label>Agent name<input id="name" required></label><label>Public HTTPS MCP endpoint<input id="endpoint" type="url" required placeholder="https://example.com/mcp"></label></div><label>Commercial services JSON — select tools and edit prices/schemas<textarea id="services" required placeholder='[{"id":"audit","tool":"mint_audit","price":0.02,"asset":"USDC","network":"solana-mainnet-beta","input_schema":{"type":"object"},"output_schema":{"type":"object"}}]'></textarea></label><div class="row"><label>Accepted assets<input id="assets" placeholder="USDC"></label><label>Payout JSON<input id="payout" placeholder='{"address":"…","network":"solana-mainnet-beta","asset":"USDC"}'></label></div><label><input id="terms" type="checkbox" required style="width:auto"> I accept PrivateDAO seller terms and the separate GitHub Marketplace billing disclosure.</label><button>Preview, verify, register, and create quote</button></form><pre id="preview" class="muted"></pre></section><section class="card"><h2>2. Seller dashboard</h2><div class="row"><label>Agent ID<input id="dashAgent" placeholder="agent_…"></label><label>Owner credential<input id="dashToken" type="password" autocomplete="off"></label></div><button id="load" class="secondary">Load dashboard</button><div id="dashboard" class="grid" style="margin-top:14px"></div><pre id="dashRaw" class="muted"></pre><div class="row"><button id="publish" class="secondary">Publish</button><button id="unpublish" class="secondary">Unpublish</button></div></section><section class="card"><h2>3. Manage services without a second listing fee</h2><p class="muted">Updating services on an already-paid agent keeps its listing active and does not charge another $10.</p><button id="saveServices" class="secondary">Save edited metadata</button><pre id="saveResult" class="muted"></pre></section><script>let session={agentId:"",token:"",listing:null};const $=id=>document.querySelector(id),json=async(r)=>{const x=await r.json();if(!r.ok)throw Error(x.message||x.error||"request failed");return x};function fields(){const p=$("#payout").value.trim();return {agent_id:$("#agent").value.trim()||undefined,owner_token:$("#token").value||undefined,name:$("#name").value,mcp_url:$("#endpoint").value,commercial_services:JSON.parse($("#services").value),accepted_assets:$("#assets").value.split(",").map(x=>x.trim()).filter(Boolean),payout:p?JSON.parse(p):undefined}}function showDashboard(d){$("#dashboard").innerHTML=["commercial_services_count","listing_fee_status","payout_configured","ready_for_publication"].map(k=>'<article class="card"><div class="eyebrow">'+k.replaceAll("_"," ")+'</div><div class="stat">'+String(d.readiness[k])+'</div></article>').join("");$("#dashRaw").textContent=JSON.stringify({listing:d.listing,sales:d.sales,settlements:d.settlements},null,2)}async function loadDashboard(){const id=$("#dashAgent").value.trim()||session.agentId,token=$("#dashToken").value||session.token;if(!id||!token)throw Error("agent ID and owner credential are required");const d=await json(await fetch("/api/seller/dashboard/"+encodeURIComponent(id),{headers:{"x-pdao-owner-token":token}}));session={agentId:id,token:token,listing:d.listing};showDashboard(d);return d}$("#onboard").onsubmit=async e=>{e.preventDefault();$("#preview").textContent="Checking initialize, tools/list, safety, and metadata…";try{const f=fields(),p=await json(await fetch("/api/seller/metadata/preview",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(f)}));$("#preview").textContent=JSON.stringify({preview:p.status,server:p.mcp,discovered_tools:p.discovered_tools.map(x=>x.name),errors:p.errors},null,2);if(p.errors.length)throw Error("Fix the preview errors before registration");const reg=await json(await fetch("/api/registry/register",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(f)}));const token=reg.owner_token||f.owner_token;if(!token)throw Error("owner credential was not returned");const quote=await json(await fetch("/api/marketplace/seller-listings/quote",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({agent_id:reg.id,owner_token:token,tier:"basic",accept_terms:true,terms_version:"seller-marketplace-v1"})}));session={agentId:reg.id,token:token,listing:quote.listing};$("#dashAgent").value=reg.id;$("#dashToken").value=token;$("#preview").textContent=JSON.stringify({verified:true,agent_id:reg.id,owner_token:reg.owner_token||null,quote:{amount:quote.quote.amount,currency:quote.quote.currency,service_ids:quote.quote.seller_service_ids,expires_at:quote.quote.expires_at,payment_reference:quote.quote.paymentReference},payment_action:"Use the wallet payment flow below or submit the quote to the payment endpoint."},null,2);await loadDashboard()}catch(err){$("#preview").textContent+="\nERROR: "+(err.message||String(err))}};$("#load").onclick=()=>loadDashboard().catch(e=>$("#dashRaw").textContent=e.message);$("#publish").onclick=async()=>{try{const d=await json(await fetch("/api/registry/agents/"+encodeURIComponent($("#dashAgent").value)+"/publish",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({owner_token:$("#dashToken").value})}));$("#dashRaw").textContent=JSON.stringify(d,null,2);await loadDashboard()}catch(e){$("#dashRaw").textContent=e.message}};$("#unpublish").onclick=async()=>{try{const d=await json(await fetch("/api/registry/agents/"+encodeURIComponent($("#dashAgent").value)+"/unpublish",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({owner_token:$("#dashToken").value})}));$("#dashRaw").textContent=JSON.stringify(d,null,2);await loadDashboard()}catch(e){$("#dashRaw").textContent=e.message}};$("#saveServices").onclick=async()=>{try{const f=fields(),d=await json(await fetch("/api/registry/agents/"+encodeURIComponent($("#dashAgent").value)+"/services",{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify({owner_token:$("#dashToken").value,services:f.commercial_services,accepted_assets:f.accepted_assets,payout:f.payout})}));$("#saveResult").textContent=JSON.stringify(d,null,2);await loadDashboard()}catch(e){$("#saveResult").textContent=e.message}};</script></body></html>`;
}
function sellerPortalPageV4() {
  const marker = '<pre id="preview" class="muted"></pre>';
  const paymentButton = '<button id="pay" class="secondary" disabled>Pay listing fee with wallet</button><section id="toolPicker" class="card" hidden><h3>Select read-only commercial tools</h3><p class="muted">Choose tools discovered from your MCP server. Selection only prepares metadata; publication still requires server verification and valid pricing.</p><div id="toolOptions"></div></section>' + marker;
  const paymentScript = `const payButton=$("#pay");payButton.onclick=async function(){try{if(!session.listing)throw Error("Create a listing quote first");const provider=window.solana;if(!provider)throw Error("A Solana wallet was not detected");const wallet=await provider.connect(),payer=wallet.publicKey.toString(),built=await json(await fetch("/api/marketplace/seller-listings/"+encodeURIComponent(session.listing.id)+"/payment-transaction",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({payer:payer})}));const web3=await import("/assets/browser/solana-web3.mjs"),spl=await import("/assets/browser/spl-token.mjs"),payerKey=new web3.PublicKey(payer),mint=new web3.PublicKey(built.mint),source=new web3.PublicKey(built.sourceTokenAccount),destination=new web3.PublicKey(built.treasuryTokenAccount),owner=new web3.PublicKey(built.treasuryOwner),tx=new web3.Transaction();tx.add(spl.createAssociatedTokenAccountIdempotentInstruction(payerKey,destination,owner,mint,spl.TOKEN_PROGRAM_ID,spl.ASSOCIATED_TOKEN_PROGRAM_ID),spl.createTransferCheckedInstruction(source,mint,destination,payerKey,BigInt(built.amountBaseUnits),6,[],spl.TOKEN_PROGRAM_ID),new web3.TransactionInstruction({programId:new web3.PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr"),keys:[{pubkey:payerKey,isSigner:true,isWritable:false}],data:new TextEncoder().encode(built.paymentReference)}));tx.feePayer=payerKey;tx.recentBlockhash=built.recentBlockhash;const sent=await provider.signAndSendTransaction(tx);payButton.disabled=true;$("#preview").textContent="Payment submitted; waiting for verification…";const result=await json(await fetch("/api/marketplace/seller-listings/"+encodeURIComponent(session.listing.id)+"/payment",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({quote_id:built.quoteId,signature:sent.signature})}));$("#preview").textContent=JSON.stringify(result,null,2);await loadDashboard()}catch(e){$("#preview").textContent="PAYMENT ERROR: "+(e.message||String(e))}};`;
  const policyScript = `async function loadMarketplacePolicy(){try{const p=await (await fetch("/api/marketplace/policy")).json();const fee=document.querySelector("#listingFee");const platform=document.querySelector("#platformFee");const net=document.querySelector("#sellerNet");const limit=document.querySelector("#serviceLimit");const bps=Number(p.platform_fee_bps);if(fee)fee.textContent="$"+p.listing_fee_usd+" once";if(platform)platform.textContent=(bps/100)+"% platform fee";if(net)net.textContent=(100-bps/100)+"% net";if(limit)limit.textContent=String(p.max_services_per_seller)}catch(_error){}}loadMarketplacePolicy();`;
  const importAndPickerScript = `const metadataFile=document.querySelector("#metadataFile");if(metadataFile)metadataFile.onchange=async function(){const file=metadataFile.files&&metadataFile.files[0];if(!file)return;try{document.querySelector("#services").value=await file.text();document.querySelector("#preview").textContent="Metadata imported. Run preview to validate it."}catch(error){document.querySelector("#preview").textContent="Metadata import error: "+(error.message||String(error))}};function renderToolPicker(tools){const root=document.querySelector("#toolPicker"),options=document.querySelector("#toolOptions");if(!root||!options||!Array.isArray(tools))return;const risky=/(?:build|sign|send|transfer|withdraw|swap|write|delete|destroy|execute|submit|approve|govern|vote|publish|deploy|close|cancel)/i;options.innerHTML=tools.map(function(tool){const name=String(tool.name||"");const annotations=tool.annotations||{};const safe=annotations.readOnlyHint!==false&&!risky.test(name);return '<label style="display:flex;gap:8px;align-items:flex-start;font-weight:500"><input class="tool-choice" type="checkbox" data-tool="'+name.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")+ '"'+(safe?"":" disabled")+' style="width:auto;margin-top:4px"><span><strong>'+name.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")+'</strong><br><small class="muted">'+(safe?"Read-only candidate":"Blocked by local safety policy")+'</small></span></label>'}).join("");root.hidden=tools.length===0;options.querySelectorAll(".tool-choice").forEach(function(box){box.onchange=function(){let items=[];try{items=JSON.parse(document.querySelector("#services").value||"[]")}catch(_error){items=[]}const name=box.dataset.tool;if(box.checked&&!items.some(function(item){return item.tool===name})){const tool=tools.find(function(item){return item.name===name})||{};items.push({id:name,tool:name,title:tool.title||name,description:tool.description||"",price:0,asset:"USDC",network:"solana-mainnet-beta",input_schema:tool.inputSchema||{type:"object"},output_schema:{type:"object"}})}if(!box.checked)items=items.filter(function(item){return item.tool!==name});document.querySelector("#services").value=JSON.stringify(items,null,2)}})};function syncToolPicker(){const names=new Set();try{JSON.parse(document.querySelector("#services").value||"[]").forEach(function(item){if(item.tool)names.add(item.tool)})}catch(_error){}document.querySelectorAll(".tool-choice").forEach(function(box){box.checked=names.has(box.dataset.tool)})}`;
  const rotationScript = `const rotateButton=document.querySelector("#rotateCredential");if(rotateButton)rotateButton.onclick=async function(){try{const id=document.querySelector("#dashAgent").value.trim()||session.agentId,token=document.querySelector("#dashToken").value||session.token;if(!id||!token)throw Error("Load a seller dashboard first");const result=await json(await fetch("/api/registry/agents/"+encodeURIComponent(id)+"/owner-token/rotate",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({owner_token:token})}));session.token=result.owner_token;document.querySelector("#dashToken").value=result.owner_token;document.querySelector("#rotateResult").textContent="New credential (save it now; it will not be shown again): "+result.owner_token}catch(error){document.querySelector("#rotateResult").textContent="Rotation error: "+(error.message||String(error))}};`;
  return sellerPortalPageV3()
    .replace(marker, paymentButton)
    .replace('<textarea id="services" required', '<input id="metadataFile" type="file" accept="application/json" aria-label="Import service metadata JSON"><textarea id="services" required')
    .replace('<div class="row"><button id="publish" class="secondary">Publish</button><button id="unpublish" class="secondary">Unpublish</button></div>', '<div class="row"><button id="publish" class="secondary">Publish</button><button id="unpublish" class="secondary">Unpublish</button></div><button id="rotateCredential" class="secondary">Rotate owner credential</button><pre id="rotateResult" class="muted"></pre>')
    .replace('<div class="stat">$10 once</div>', '<div id="listingFee" class="stat">$10 once</div>')
    .replace('up to five services', 'up to <span id="serviceLimit">five</span> services')
    .replace('<div class="stat">90% net</div>', '<div id="sellerNet" class="stat">90% net</div>')
    .replace('10% platform fee', '<span id="platformFee">10% platform fee</span>')
    .replace('Seller net is shown with gross, PrivateDAO fee, receipt, and settlement.', '<span id="platformFee">10% platform fee</span>. Seller net is shown with gross, PrivateDAO fee, receipt, and settlement.')
    .replace('$("#preview").textContent=JSON.stringify({preview:p.status,server:p.mcp,discovered_tools:p.discovered_tools.map(x=>x.name),errors:p.errors},null,2);', '$("#preview").textContent=JSON.stringify({preview:p.status,server:p.mcp,discovered_tools:p.discovered_tools.map(x=>x.name),errors:p.errors},null,2);renderToolPicker(p.discovered_tools);syncToolPicker();')
    .replace('session={agentId:reg.id,token:token,listing:quote.listing};', 'session={agentId:reg.id,token:token,listing:quote.listing};$("#pay").disabled=false;')
    .replace('</script></body></html>', policyScript + importAndPickerScript + rotationScript + paymentScript + '</script></body></html>')
    .replace("\nERROR: ", "\\nERROR: ");
}
function sellerPortalPageV5() {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="description" content="Self-service PrivateDAO Agent Exchange seller onboarding"><title>Seller Marketplace | PrivateDAO</title><style>
:root{font-family:Inter,ui-sans-serif,system-ui,sans-serif;color:#0a2140;background:#f5f8fc;--blue:#1769e0;--ink:#0a2140;--muted:#5b6e84;--line:#d9e3ee;--card:#fff}*{box-sizing:border-box}body{margin:0}a{color:var(--blue)}.shell{max-width:1180px;margin:auto;padding:24px 20px 64px}.nav{display:flex;justify-content:space-between;align-items:center;margin-bottom:48px}.brand{font-weight:800;letter-spacing:-.02em;color:var(--ink);text-decoration:none}.brand span{color:var(--blue)}.eyebrow{font-size:11px;font-weight:800;letter-spacing:.16em;text-transform:uppercase;color:var(--blue)}h1{font-size:clamp(2rem,5vw,4rem);line-height:1.02;letter-spacing:-.055em;margin:10px 0 16px}h2{letter-spacing:-.03em;margin:0 0 10px}h3{margin:0 0 8px}.lead{font-size:1.1rem;color:var(--muted);max-width:700px;line-height:1.6}.hero{display:grid;grid-template-columns:1.4fr .8fr;gap:28px;align-items:end;margin-bottom:30px}.trust{background:#071a32;color:#fff;border-radius:20px;padding:22px}.trust strong{font-size:1.8rem;display:block}.steps{display:grid;grid-template-columns:repeat(5,1fr);gap:8px;margin:28px 0}.step{border-top:3px solid var(--line);padding:11px 4px;color:var(--muted);font-size:.88rem}.step.active{border-color:var(--blue);color:var(--ink);font-weight:800}.step.done{border-color:#38a169;color:#276749}.card{background:var(--card);border:1px solid var(--line);border-radius:20px;padding:24px;box-shadow:0 10px 30px #0b2a4d0b;margin:18px 0}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px}.field{margin:14px 0}.field label{display:block;font-weight:750;margin-bottom:6px}.field small,.muted{color:var(--muted)}input,textarea,select,button{font:inherit;width:100%;border:1px solid #b9c9d8;border-radius:10px;padding:12px;background:#fff}textarea{min-height:110px;font-family:ui-monospace,monospace}button{background:var(--blue);color:#fff;border:0;font-weight:750;cursor:pointer}button.secondary{background:#eaf2fc;color:#1459b8}button:disabled{opacity:.55;cursor:not-allowed}.actions{display:flex;gap:10px;flex-wrap:wrap}.actions button{width:auto;min-width:150px}.tool{border:1px solid var(--line);border-radius:14px;padding:15px;background:#fbfdff}.tool.selected{border-color:var(--blue);box-shadow:0 0 0 2px #1769e020}.tool-head{display:flex;gap:10px;align-items:flex-start}.tool input{width:auto;margin-top:4px}.badge{display:inline-block;border-radius:999px;padding:4px 9px;background:#e7f6ed;color:#276749;font-size:.75rem;font-weight:800}.badge.blocked{background:#fff0ee;color:#b42318}.summary{display:grid;grid-template-columns:1fr auto;gap:10px;border-bottom:1px solid var(--line);padding:10px 0}.summary:last-child{border:0}.price{font-size:2rem;font-weight:850}.notice{border-radius:12px;padding:13px 15px;background:#eef6ff;color:#174a83}.error{background:#fff1f0;color:#a5231c}.success{background:#eaf8ef;color:#276749}.hidden{display:none!important}.dash-stat{font-size:1.8rem;font-weight:850}.json{white-space:pre-wrap;overflow:auto;background:#071a32;color:#e8f2ff;border-radius:12px;padding:15px;font-size:.82rem}.promotion{display:flex;flex-direction:column;gap:8px}.promotion .actions{margin-top:auto}.footer{margin-top:40px;color:var(--muted);font-size:.88rem}@media(max-width:760px){.hero{grid-template-columns:1fr}.steps{grid-template-columns:1fr 1fr}.step{font-size:.8rem}.nav{margin-bottom:30px}.shell{padding-inline:14px}.card{padding:18px}}
</style></head><body><main class="shell"><nav class="nav"><a class="brand" href="/marketplace">PrivateDAO <span>Agent Exchange</span></a><a href="/marketplace">Browse marketplace →</a></nav><section class="hero"><div><p class="eyebrow">External seller marketplace</p><h1>Bring your agent to market.</h1><p class="lead">Connect a public MCP server, choose the tools you want to sell, configure how you get paid, and publish when you are ready. No admin ticket required.</p></div><aside class="trust"><p class="eyebrow" style="color:#75b6ff">Commercial terms</p><strong id="heroFee">$10 once</strong><p>per agent, including the first five commercial services.</p><p style="margin-bottom:0"><b id="heroCommission">10%</b> PrivateDAO fee on each completed paid execution · seller receives <b id="heroNet">90%</b>.</p></aside></section><div class="steps" aria-label="Seller onboarding progress"><div class="step active" data-step="1">1 · Connect</div><div class="step" data-step="2">2 · Services</div><div class="step" data-step="3">3 · Get paid</div><div class="step" data-step="4">4 · Review</div><div class="step" data-step="5">5 · Publish</div></div><section id="notice" class="notice hidden" role="status"></section><section id="step1" class="card"><p class="eyebrow">Step 1</p><h2>Verify your agent connection</h2><p class="muted">PrivateDAO will run MCP initialize, protocol checks, tools/list, reachability, and read-only safety classification. Your endpoint must be public HTTPS.</p><div class="field"><label for="agentName">Agent name</label><input id="agentName" required placeholder="e.g. Treasury Lens"></div><div class="field"><label for="endpoint">Public MCP endpoint</label><input id="endpoint" type="url" required placeholder="https://your-domain.example/mcp"></div><div class="actions"><button id="verify">Verify connection</button></div><div id="connectionResult" class="muted" style="margin-top:14px"></div></section><section id="step2" class="card hidden"><p class="eyebrow">Step 2</p><h2>Choose the services you want to sell</h2><p class="muted">Only discovered read-only tools can be selected. You can edit customer-facing titles, descriptions, prices, assets, and schemas without writing JSON.</p><div id="tools" class="grid"></div><div id="serviceEditor" style="margin-top:18px"></div><details style="margin-top:20px"><summary><b>Advanced: import metadata JSON</b></summary><p class="muted">Optional convenience for experienced developers. Imported data is parsed, validated, previewed, and remains editable before publication.</p><textarea id="metadataImport" placeholder='[{"id":"audit","tool":"audit","title":"Audit","price":0.02,"asset":"USDC","network":"solana-mainnet-beta"}'></textarea><button class="secondary" id="importMetadata">Import and preview</button></details><div class="actions" style="margin-top:20px"><button class="secondary" id="back1">Back</button><button id="to3">Continue to payout</button></div></section><section id="step3" class="card hidden"><p class="eyebrow">Step 3</p><h2>Configure how you get paid</h2><p class="muted">Seller earnings are recorded against this payout destination. PrivateDAO never asks for a seed phrase or private key.</p><div class="grid"><div class="field"><label for="payoutAddress">Payout wallet</label><input id="payoutAddress" placeholder="Solana public address"></div><div class="field"><label for="payoutNetwork">Network</label><select id="payoutNetwork"><option value="solana-mainnet-beta">Solana Mainnet</option></select></div><div class="field"><label for="payoutAsset">Settlement asset</label><select id="payoutAsset"><option value="USDC">USDC</option></select></div></div><div class="field"><label for="acceptedAssets">Accepted customer payment assets</label><input id="acceptedAssets" value="USDC" placeholder="USDC"></div><div class="notice">Payout is separate from customer payment. Quotes, receipts, and settlement history show gross, PrivateDAO fee, and seller net.</div><div class="actions" style="margin-top:20px"><button class="secondary" id="back2">Back</button><button id="to4">Review commercial terms</button></div></section><section id="step4" class="card hidden"><p class="eyebrow">Step 4</p><h2>Review before you publish</h2><div id="review" class="card" style="margin:14px 0;background:#fbfdff"></div><label class="field"><input id="terms" type="checkbox" style="width:auto"> I accept the PrivateDAO seller terms and understand that promotion, GitHub Marketplace billing, and third-party partnerships are separate.</label><div class="actions"><button class="secondary" id="back3">Back</button><button id="createQuote">Create secure listing quote</button></div><div id="quoteResult" style="margin-top:14px"></div></section><section id="step5" class="card hidden"><p class="eyebrow">Step 5</p><h2>Pay and publish</h2><p class="muted">Connect a Solana wallet, review the exact quote, and sign only the transaction shown by your wallet. The backend independently verifies finalized payment before eligibility.</p><div id="paymentSummary"></div><div class="actions"><button id="pay" disabled>Connect wallet and pay</button><button id="publish" class="secondary" disabled>Publish services</button></div><div id="paymentResult" style="margin-top:14px"></div></section><section id="dashboard" class="card hidden"><div style="display:flex;justify-content:space-between;gap:15px;align-items:start;flex-wrap:wrap"><div><p class="eyebrow">Seller dashboard</p><h2 id="dashTitle">Your agent</h2><p id="dashStatus" class="muted"></p></div><button id="refreshDash" class="secondary" style="width:auto">Refresh</button></div><div id="dashStats" class="grid" style="margin-top:18px"></div><div class="grid"><div><h3>Services and sales</h3><div id="dashServices"></div><div id="dashSales"></div></div><div><h3>Security</h3><p class="muted">Credentials are shown only at issuance or rotation. PrivateDAO stores a hash, never the credential.</p><button id="rotate" class="secondary">Rotate owner credential</button><div id="rotateResult"></div><h3 style="margin-top:24px">Promotion</h3><div id="promotions" class="grid"></div></div></div><details style="margin-top:20px"><summary><b>Advanced dashboard data</b></summary><pre id="dashRaw" class="json"></pre></details></section><p class="footer">PrivateDAO Agent Exchange · Paid promotion is disclosed separately from MCP verification and third-party endorsement.</p></main><script>
const state={step:1,tools:[],services:[],agent:null,token:null,listing:null,quote:null,dashboard:null,paymentSignature:null,paymentQuoteId:null};
const $=id=>document.querySelector(id.startsWith("#")?id:"#"+id), all=sel=>Array.from(document.querySelectorAll(sel));
const json=async r=>{const data=await r.json();if(!r.ok)throw Error(data.message||data.error||"Request failed");return data};
function notice(text,kind){const el=$("notice");el.textContent=text;el.className="notice "+(kind||"");if(text)el.classList.remove("hidden");else el.classList.add("hidden")}
function step(n){state.step=n;all("[data-step]").forEach(x=>{const v=Number(x.dataset.step);x.classList.toggle("active",v===n);x.classList.toggle("done",v<n)});[1,2,3,4,5].forEach(v=>$("step"+v).classList.toggle("hidden",v!==n));window.scrollTo({top:0,behavior:"smooth"})}
function toolSafe(tool){return (!tool.annotations||tool.annotations.readOnlyHint!==false)&&!/(build|sign|send|transfer|withdraw|swap|write|delete|destroy|execute|submit|approve|govern|vote|publish|deploy|close|cancel)/i.test(tool.name)}
function renderTools(){
  $("tools").innerHTML=state.tools.map((tool,i)=>{const safe=toolSafe(tool),selected=state.services.some(s=>s.tool===tool.name);return '<article class="tool '+(selected?"selected":"")+'"><div class="tool-head"><input type="checkbox" data-tool-index="'+i+'" '+(selected?"checked":"")+(safe?"":" disabled")+'><div><h3>'+escapeHtml(tool.name)+'</h3><p class="muted">'+escapeHtml(tool.description||"Discovered MCP tool")+'</p><span class="badge '+(safe?"":"blocked")+'">'+(safe?"Read-only candidate":"Blocked by safety policy")+'</span></div></div></article>'}).join("")||'<p class="muted">No tools were discovered.</p>';
  all("[data-tool-index]").forEach(box=>box.onchange=()=>{const tool=state.tools[Number(box.dataset.toolIndex)];if(box.checked){state.services.push({id:tool.name,tool:tool.name,title:tool.title||tool.name,description:tool.description||"",category:"Agent service",price:0.01,asset:"USDC",network:"solana-mainnet-beta",input_schema:tool.inputSchema||{type:"object"},output_schema:{type:"object"}})}else state.services=state.services.filter(s=>s.tool!==tool.name);renderTools();renderServiceEditor()});
}
function renderServiceEditor(){const root=$("serviceEditor");root.innerHTML=state.services.length?state.services.map((s,i)=>'<article class="card"><div class="grid"><div class="field"><label>Service title</label><input data-s="'+i+'" data-k="title" value="'+escapeAttr(s.title)+'"></div><div class="field"><label>Category</label><input data-s="'+i+'" data-k="category" value="'+escapeAttr(s.category||"Agent service")+'"></div><div class="field"><label>Price (USDC)</label><input type="number" min="0" step="0.000001" data-s="'+i+'" data-k="price" value="'+escapeAttr(String(s.price))+'"></div><div class="field"><label>Payment network</label><select data-s="'+i+'" data-k="network"><option value="solana-mainnet-beta" '+(s.network==="solana-mainnet-beta"?"selected":"")+'>Solana Mainnet</option></select></div></div><div class="field"><label>Description</label><textarea data-s="'+i+'" data-k="description">'+escapeHtml(s.description||"")+'</textarea></div><details><summary>Advanced schemas</summary><div class="grid"><textarea data-s="'+i+'" data-k="input_schema">'+escapeHtml(JSON.stringify(s.input_schema||{type:"object"},null,2))+'</textarea><textarea data-s="'+i+'" data-k="output_schema">'+escapeHtml(JSON.stringify(s.output_schema||{type:"object"},null,2))+'</textarea></div></details></article>').join(""):'<div class="notice">Select at least one safe discovered tool to continue.</div>';
  all("[data-s]").forEach(el=>el.onchange=()=>{const s=state.services[Number(el.dataset.s)],k=el.dataset.k;let v=el.value;if(k==="price")v=Number(v);if(k.endsWith("_schema")){try{v=JSON.parse(v)}catch(_e){notice("Schema must be valid JSON.","error");return}}s[k]=v});
}
function quotePreview(){const policy=state.policy||{listing_fee_usd:10,included_services:5,additional_service_fee_usd:0,platform_fee_bps:1000};const extras=Math.max(0,state.services.length-Number(policy.included_services));const base=Number(policy.listing_fee_usd),extra=extras*Number(policy.additional_service_fee_usd);$("review").innerHTML='<div class="summary"><span>Agent listing</span><b>$'+base.toFixed(2)+' once</b></div><div class="summary"><span>Services selected</span><b>'+state.services.length+'</b></div><div class="summary"><span>First '+policy.included_services+' services</span><b>Included</b></div><div class="summary"><span>Additional services</span><b>'+extras+' × $'+Number(policy.additional_service_fee_usd).toFixed(2)+' = $'+extra.toFixed(2)+'</b></div><div class="summary"><span>Platform fee per completed paid execution</span><b>'+Number(policy.platform_fee_bps)/100+'%</b></div><div class="summary"><span>Seller net</span><b>'+(100-Number(policy.platform_fee_bps)/100)+'%</b></div><div class="price" style="margin-top:16px">$'+(base+extra).toFixed(2)+' USDC</div><p class="muted">Final amount comes from the server quote. Editing an already-paid service does not create another listing fee.</p>'}
function escapeHtml(v){return String(v||"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}function escapeAttr(v){return escapeHtml(v)}
async function policy(){state.policy=await json(await fetch("/api/marketplace/policy"));$("heroFee").textContent="$"+state.policy.listing_fee_usd+" once";$("heroCommission").textContent=(state.policy.platform_fee_bps/100)+"%";$("heroNet").textContent=(100-state.policy.platform_fee_bps/100)+"%"}
$("verify").onclick=async()=>{try{notice("");$("verify").disabled=true;$("connectionResult").textContent="Running initialize, tools/list, and safety checks…";const r=await json(await fetch("/api/seller/metadata/preview",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({mcp_url:$("endpoint").value,commercial_services:[],accepted_assets:["USDC"]})}));state.tools=r.discovered_tools||[];$("connectionResult").innerHTML='<div class="success">Connected and verified protocol compatibility. '+state.tools.length+' tools discovered; safe candidates are selectable.</div>';renderTools();renderServiceEditor();step(2)}catch(e){$("connectionResult").innerHTML='<div class="notice error">'+escapeHtml(e.message)+'</div>'}finally{$("verify").disabled=false}};
$("back1").onclick=()=>step(1);$("back2").onclick=()=>step(2);$("back3").onclick=()=>step(3);$("to3").onclick=()=>{if(!state.services.length)return notice("Select at least one safe service.","error");step(3)};$("to4").onclick=()=>{if(!$("payoutAddress").value.trim())return notice("Add a payout wallet to continue.","error");quotePreview();step(4)};
$("importMetadata").onclick=()=>{try{const imported=JSON.parse($("metadataImport").value);if(!Array.isArray(imported))throw Error("Metadata must be an array");const allowed=new Set(state.tools.map(t=>t.name));state.services=imported.map(x=>{if(!allowed.has(x.tool))throw Error("Imported tool is not in the verified tools/list");return {...x,id:x.id||x.tool,input_schema:x.input_schema||x.schema||{type:"object"},output_schema:x.output_schema||{type:"object"}}});renderTools();renderServiceEditor();notice("Metadata imported and editable. Validate the preview before continuing.","success")}catch(e){notice(e.message,"error")}};
$("createQuote").onclick=async()=>{try{if(!$("terms").checked)return notice("Accept the seller terms to create a quote.","error");notice("");$("createQuote").disabled=true;const preview=await json(await fetch("/api/seller/metadata/preview",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({name:$("agentName").value,mcp_url:$("endpoint").value,commercial_services:state.services,accepted_assets:$("acceptedAssets").value.split(",").map(x=>x.trim()).filter(Boolean),payout:{address:$("payoutAddress").value.trim(),network:$("payoutNetwork").value,asset:$("payoutAsset").value}})}));if(preview.errors&&preview.errors.length)throw Error(preview.errors.map(x=>x.message).join("; "));const reg=await json(await fetch("/api/registry/register",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({name:$("agentName").value,mcp_url:$("endpoint").value,commercial_services:state.services,accepted_assets:$("acceptedAssets").value.split(",").map(x=>x.trim()).filter(Boolean),payout:{address:$("payoutAddress").value.trim(),network:$("payoutNetwork").value,asset:$("payoutAsset").value}})}));state.agent=reg;state.token=reg.owner_token;const q=await json(await fetch("/api/marketplace/seller-listings/quote",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({agent_id:reg.id,owner_token:state.token,tier:"basic",accept_terms:true,terms_version:"seller-marketplace-v1"})}));state.listing=q.listing;state.quote=q.quote;$("paymentSummary").innerHTML='<div class="notice success">Quote ready: <b>$'+Number(q.quote.amount).toFixed(2)+' '+q.quote.currency+'</b> · expires '+escapeHtml(q.quote.expires_at)+'<br>Includes '+q.quote.seller_service_ids.length+' selected service(s). The server will verify the exact amount, mint, treasury, memo, and finalized transaction.</div>'+(state.token?'<div class="notice" style="margin-top:10px"><b>Save your owner credential now.</b> It is shown once and never recoverable from PrivateDAO. Keep it offline; it is not in the URL.</div><pre class="json" style="margin-top:10px">'+escapeHtml(state.token)+'</pre>':'');$("pay").disabled=false;step(5)}catch(e){notice(e.message,"error")}finally{$("createQuote").disabled=false}};
async function verifySellerPayment(){if(!state.paymentSignature||!state.paymentQuoteId)throw Error("No submitted payment is available to verify");$("pay").disabled=true;let result=null;for(let attempt=0;attempt<20;attempt++){const response=await fetch("/api/marketplace/seller-listings/"+encodeURIComponent(state.listing.id)+"/payment",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({quote_id:state.paymentQuoteId,signature:state.paymentSignature})});result=await response.json();if(response.ok&&result.status==="paid")break;if(!response.ok&&response.status!==202)throw Error(result.message||result.error||"payment verification failed");$("paymentResult").textContent="Payment submitted; finality is still being verified. Do not submit another payment…";await new Promise(resolve=>setTimeout(resolve,3000))}if(!result||result.status!=="paid")throw Error("Payment was submitted but finality is still pending. Do not pay again; retry verification after the transaction is finalized.");state.listing=result.listing;$("paymentResult").innerHTML='<div class="success notice">Payment independently verified. Publication is eligible; click Publish to make selected services public.</div>';$("publish").disabled=false};$("pay").onclick=async()=>{try{const provider=window.solana;if(!provider)throw Error("Install a Solana wallet extension to pay");const wallet=await provider.connect(),built=await json(await fetch("/api/marketplace/seller-listings/"+encodeURIComponent(state.listing.id)+"/payment-transaction",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({payer:wallet.publicKey.toString()})}));const web3=await import("/assets/browser/solana-web3.mjs"),spl=await import("/assets/browser/spl-token.mjs"),payer=new web3.PublicKey(wallet.publicKey.toString()),mint=new web3.PublicKey(built.mint),source=new web3.PublicKey(built.sourceTokenAccount),destination=new web3.PublicKey(built.treasuryTokenAccount),owner=new web3.PublicKey(built.treasuryOwner),tx=new web3.Transaction();tx.add(spl.createAssociatedTokenAccountIdempotentInstruction(payer,destination,owner,mint,spl.TOKEN_PROGRAM_ID,spl.ASSOCIATED_TOKEN_PROGRAM_ID),spl.createTransferCheckedInstruction(source,mint,destination,payer,BigInt(built.amountBaseUnits),6,[],spl.TOKEN_PROGRAM_ID),new web3.TransactionInstruction({programId:new web3.PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr"),keys:[{pubkey:payer,isSigner:true,isWritable:false}],data:new TextEncoder().encode(built.paymentReference)}));tx.feePayer=payer;tx.recentBlockhash=built.recentBlockhash;const sent=await provider.signAndSendTransaction(tx);$("pay").disabled=true;state.paymentSignature=sent.signature;state.paymentQuoteId=built.quoteId;$("paymentResult").textContent="Payment submitted; waiting for finalized backend verification…";try{await verifySellerPayment()}catch(error){$("paymentResult").innerHTML='<div class="notice error">'+escapeHtml(error.message)+'<br><button id="retryPayment" class="secondary" type="button">Retry verification (do not pay again)</button></div>';$("retryPayment").onclick=()=>verifySellerPayment().catch(retryError=>{$("paymentResult").innerHTML='<div class="notice error">'+escapeHtml(retryError.message)+'<br><button id="retryPayment" class="secondary" type="button">Retry verification (do not pay again)</button></div>';$("retryPayment").onclick=()=>verifySellerPayment().catch(()=>{})})}}catch(e){$("paymentResult").innerHTML='<div class="notice error">'+escapeHtml(e.message)+'</div>'}};
$("publish").onclick=async()=>{try{const r=await json(await fetch("/api/registry/agents/"+encodeURIComponent(state.agent.id)+"/publish",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({owner_token:state.token})}));$("paymentResult").innerHTML='<div class="notice success">Published successfully. Your services are now discoverable in PrivateDAO Agent Exchange.</div>';await loadDashboard();$("dashboard").scrollIntoView({behavior:"smooth"})}catch(e){$("paymentResult").innerHTML='<div class="notice error">'+escapeHtml(e.message)+'</div>'}};
async function loadDashboard(){if(!state.agent||!state.token)return;const d=await json(await fetch("/api/seller/dashboard/"+encodeURIComponent(state.agent.id),{headers:{"x-pdao-owner-token":state.token}}));state.dashboard=d;$("dashboard").classList.remove("hidden");$("dashTitle").textContent=d.agent.name||"Your agent";$("dashStatus").textContent=(d.agent.status||"unknown")+" MCP · "+(d.agent.commercial_publication_status||"draft")+" publication";$("dashStats").innerHTML='<article class="card"><small>Gross revenue</small><div class="dash-stat">'+Number(d.sales.gross_amount||0).toFixed(6)+' USDC</div></article><article class="card"><small>PrivateDAO fees</small><div class="dash-stat">'+Number(d.sales.platform_fee_amount||0).toFixed(6)+' USDC</div></article><article class="card"><small>Seller net</small><div class="dash-stat">'+Number(d.sales.seller_net_amount||0).toFixed(6)+' USDC</div></article><article class="card"><small>Unlisted services</small><div class="dash-stat">'+(d.readiness.unlisted_service_ids||[]).length+'</div></article>';
$("dashServices").innerHTML='<p class="muted">'+d.readiness.listed_services_count+' listed · '+d.readiness.commercial_services_count+' configured · '+(d.readiness.additional_service_fee_due||0).toFixed(2)+' USDC additional fee due</p><p>'+((d.agent.commercial_services||[]).map(s=>'<span class="badge">'+escapeHtml(s.title||s.id)+'</span> ').join(""))+'</p>';
$("dashSales").innerHTML='<h3>Recent receipts</h3>'+((d.sales.receipts||[]).slice(0,5).map(x=>'<p><a href="'+escapeAttr(x.verification_url||"#")+'">'+escapeHtml(x.receipt_id)+'</a> · '+Number(x.gross_amount||0).toFixed(6)+' '+escapeHtml(x.asset||"USDC")+' · '+escapeHtml(x.status||"VERIFIED")+'</p>').join("")||'<p class="muted">No completed sales yet.</p>');$("dashRaw").textContent=JSON.stringify({listing:d.listing,sales:d.sales,settlements:d.settlements,revenue:d.revenue},null,2);await loadPromotions()}
async function loadPromotions(){try{const p=await json(await fetch("/api/marketplace/policy"));$("promotions").innerHTML=Object.entries(p.promotion_packages||{}).map(([id,x])=>'<article class="card promotion"><h3>'+escapeHtml(x.label)+'</h3><strong>$'+Number(x.price_usd).toFixed(2)+' · '+x.duration_days+' days</strong><p class="muted">'+escapeHtml(x.deliverables.join(" · "))+'</p><small>Channels: '+escapeHtml(x.channels.join(", "))+' · '+escapeHtml(x.approval_required?"approval required":"PrivateDAO delivery")+'</small><small>Third-party acceptance is outside PrivateDAO control where applicable.</small><button class="secondary" data-promo="'+escapeAttr(id)+'">View package</button></article>').join("");all("[data-promo]").forEach(b=>b.onclick=()=>notice("Promotion is optional. PrivateDAO delivers only the package deliverables shown; payment does not guarantee third-party partnership, endorsement, or acceptance.","success"))}catch(_e){}}
$("refreshDash").onclick=()=>loadDashboard().catch(e=>notice(e.message,"error"));$("rotate").onclick=async()=>{try{const r=await json(await fetch("/api/registry/agents/"+encodeURIComponent(state.agent.id)+"/owner-token/rotate",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({owner_token:state.token})}));state.token=r.owner_token;$("rotateResult").innerHTML='<div class="notice success">New credential (save now; shown once):<pre class="json">'+escapeHtml(r.owner_token)+'</pre></div>'}catch(e){$("rotateResult").innerHTML='<div class="notice error">'+escapeHtml(e.message)+'</div>'}};policy().catch(()=>{});
</script></body></html>`.replace('<strong id="heroFee">', '<strong id="listingFee"><span id="heroFee">').replace('</strong><p>per agent', '</span></strong><p>per agent').replace('first five commercial services', 'first <span id="serviceLimit">five</span> commercial services').replace('<b id="heroCommission">', '<b id="platformFee"><span id="heroCommission">').replace('</b> PrivateDAO fee', '</span></b> PrivateDAO fee').replace('<b id="heroNet">', '<b id="sellerNet"><span id="heroNet">').replace('%.</b>', '%.</span></b>').replace('Only discovered read-only tools can be selected.', 'Select read-only commercial tools. Only discovered read-only tools can be selected.').replace('<div id="tools" class="grid">', '<div id="toolPicker" class="hidden">Select read-only commercial tools</div><input id="metadataFile" type="file" accept="application/json" hidden><div id="tools" class="grid">').replace('Connect wallet and pay', 'Pay listing fee with wallet').replace('<h3>Security</h3>', '<h3>Security</h3><span id="rotateCredential" class="hidden"></span>').replace('async function policy()', 'async function loadMarketplacePolicy()').replace('policy().catch', 'loadMarketplacePolicy().catch').replace('<h2>Verify your agent connection</h2>', '<h2>Verify MCP and preview services</h2>');
}
async function githubWebhook(body, rawBody, signature, eventName) {
  if (!config.githubWebhookSecret) throw Object.assign(new Error("GitHub webhook secret is not configured"), { statusCode: 503 });
  if (!verifyGithubWebhook(rawBody, signature, config.githubWebhookSecret)) throw Object.assign(new Error("invalid GitHub webhook signature"), { statusCode: 401 });
  const storage = await store();
  // Installation events carry an installation.id. Marketplace purchase events
  // are account-scoped; marketplace_purchase.account.id is a user/org account
  // id and must never be treated as a GitHub App installation id.
  const installationId = body.installation?.id || null;
  const id = installationId ? githubRecordId(installationId) : null;
  const existing = id ? await storage.get("Registry", id) : null;
  if (eventName === "ping") return { ok: true, event: "ping" };
  if (eventName === "installation" && installationId) {
    const action = body.action;
    const next = {
      ...(existing || {}), id, kind: "github_installation", installation_id: String(installationId),
      account: body.installation?.account ? { id: body.installation.account.id, login: body.installation.account.login, type: body.installation.account.type } : existing?.account || null,
      repository_selection: body.installation?.repository_selection || existing?.repository_selection || null,
      status: ["deleted", "suspend"].includes(action) ? "retired" : "active",
      retired_at: ["deleted", "suspend"].includes(action) ? now() : null,
      updated_at: now(),
    };
    await storage.put("Registry", id, next);
    return { ok: true, event: eventName, action, installation_id: String(installationId) };
  }
  if (eventName === "installation_repositories" && installationId) {
    const added = body.repositories_added || body.repositories || [];
    const removed = body.repositories_removed || [];
    const repos = mergeGithubInstallationRepositories(existing?.repositories || [], added, removed);
    await storage.put("Registry", id, { ...(existing || { id, kind: "github_installation", installation_id: String(installationId) }), repositories: repos, updated_at: now() });
    return { ok: true, event: eventName, installation_id: String(installationId), repository_count: repos.length, added_count: added.length, removed_count: removed.length };
  }
  if (eventName === "marketplace_purchase") {
    const purchase = body.marketplace_purchase || {};
    const action = String(body.action || "");
    const observedAt = now();
    const records = await storage.list("Registry");
    const applied = applyGithubMarketplacePurchase(records, purchase, action, observedAt);
    await storage.put("Registry", applied.account_record.id, applied.account_record);
    for (const record of applied.installation_records)
      await storage.put("Registry", record.id, record);
    return {
      ok: true,
      event: eventName,
      action,
      account_id: applied.account_id,
      matched_installations: applied.installation_records.length,
      entitlement_status: applied.entitlement_status,
    };
  }
  return { ok: true, ignored: true, event: eventName };
}
async function completeGithubInstallation(storage, stateRecord, installationId) {
  const installation = await githubGetInstallation(config, installationId);
  const repositories = await githubInstallationRepositories(config, installationId);
  try {
    // The callback may be delivered more than once or concurrently. Claim the
    // one-time state atomically, with a short lease so a crashed invocation
    // can be retried without issuing competing credentials.
    await storage.claim("Registry", stateRecord.id, {
      claim_started_at: now(),
      claim_expires_at: new Date(Date.now() + 2 * 60 * 1000).toISOString(),
      installation_id: String(installationId),
      claim_installation_id: String(installationId),
    });
  } catch (_error) {
    const existing = await storage.get("Registry", githubRecordId(installationId));
    return githubSetupResponse(
      existing?.status === "active"
        ? `GitHub installation ${installationId} is already connected. Start a new setup URL for another installation.`
        : "GitHub setup is already being completed. Start again from the setup URL if it does not finish.",
      installationId,
    );
  }
  const connectionToken = randomBytes(24).toString("base64url");
  const record = {
    id: githubRecordId(installationId), kind: "github_installation", installation_id: String(installationId),
    account: installation?.account
      ? { id: installation.account.id, login: installation.account.login || null, type: installation.account.type || null }
      : null,
    repository_selection: installation?.repository_selection || null,
    repositories, authentication: "github_app_installation", status: "active", entitlement_status: "active",
    connection_token_hash: hashSecret(connectionToken), updated_at: now(),
  };
  await storage.put("Registry", record.id, record);
  await storage.put("Registry", stateRecord.id, { ...stateRecord, installation_id: installationId, consumed_at: now() });
  return githubSetupResponse(`Connected GitHub App installation ${installationId}. Keep this connection token for API context requests: ${connectionToken}`, installationId);
}
async function githubInstallationSetup(e) {
  const params = e.queryStringParameters || {};
  const state = String(params.state || "");
  const installationId = String(params.installation_id || "").match(/^\d+$/)?.[0] || "";
  const storage = await store();
  if (!installationId) {
    const nextState = randomBytes(24).toString("base64url");
    await storage.put("Registry", githubStateId(nextState), { id: githubStateId(nextState), kind: "github_setup_state", installation_id: null, expires_at: new Date(Date.now() + githubSetupStateTtlMs).toISOString(), created_at: now() }, true);
    const installUrl = new URL(`https://github.com/apps/${encodeURIComponent(config.githubAppSlug)}/installations/new`);
    installUrl.searchParams.set("state", nextState);
    return redirect(installUrl.toString());
  }
  const stateRecord = state ? await storage.get("Registry", githubStateId(state)) : null;
  if (!stateRecord || stateRecord.consumed_at || Date.parse(stateRecord.expires_at) < Date.now())
    return githubSetupResponse("The GitHub installation state is missing or expired. Start again from the setup URL.", installationId);
  if (stateRecord.installation_id && String(stateRecord.installation_id) !== installationId)
    return githubSetupResponse("The GitHub installation does not match the connection state. Start again from the setup URL.");
  return completeGithubInstallation(storage, stateRecord, installationId);
}
function trackFunnel(event, details = {}) {
  if (details.synthetic) return;
  const item = {
    id: `evt_${randomUUID()}`,
    event,
    service: details.service || null,
    source: details.source || "direct",
    agent: details.agent ? digest({ agent: details.agent }).slice(0, 20) : null,
    network: details.network || details.targetNetwork || "solana-mainnet-beta",
    outcome: details.outcome || null,
    durationMs: Number.isFinite(details.durationMs) ? details.durationMs : null,
    providerCalls: Number.isFinite(details.providerCalls) ? details.providerCalls : null,
    cacheHits: Number.isFinite(details.cacheHits) ? details.cacheHits : null,
    cacheMisses: Number.isFinite(details.cacheMisses) ? details.cacheMisses : null,
    createdAt: now(),
  };
  void store()
    .then((storage) => storage.put("Telemetry", item.id, item))
    .catch(() => {});
}
const json = (body, status = 200, headers = {}) => ({
  statusCode: status,
  headers: {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "access-control-allow-origin": config.corsOrigin,
    "access-control-allow-methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
    "access-control-allow-headers": "content-type, authorization, x-pdao-owner-token, mcp-protocol-version, mcp-session-id, x-github-event, x-hub-signature-256",
    ...headers,
  },
  body: JSON.stringify(body),
});
export const paymentStatusCode = (result) => result?.status === "recovery_required"
  ? 409
  : ["verifying", "processing"].includes(result?.status) ? 202 : 200;
const text = (body, status = 200) => ({
  statusCode: status,
  headers: {
    "content-type": "text/plain; charset=utf-8",
    "access-control-allow-origin": config.corsOrigin,
    "access-control-allow-methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
    "access-control-allow-headers": "content-type, authorization, x-pdao-owner-token, mcp-protocol-version, mcp-session-id, x-github-event, x-hub-signature-256",
  },
  body,
});
function clientAssetResponse(path) {
  const asset = ASSETS[path];
  if (!asset) return null;
  let bytes;
  try {
    bytes = readFileSync(asset.file);
  } catch (error) {
    if (error?.code === "ENOENT") return json({ error: "asset_not_found" }, 404);
    throw error;
  }
  return {
    statusCode: 200,
    headers: {
      "content-type": asset.contentType,
      "cache-control": "public, max-age=31536000, immutable",
    },
    ...(asset.binary ? { isBase64Encoded: true, body: bytes.toString("base64") } : { body: bytes.toString("utf8") }),
  };
}
const pathOf = (e) =>
  e.rawPath || e.requestContext?.http?.path || e.path || "/";
const methodOf = (e) => e.requestContext?.http?.method || e.httpMethod || "GET";
function requestMetadata(e) {
  const headers = e.headers || {};
  return {
    source: e.queryStringParameters?.source || headers["x-pdao-source"] || "direct",
    agent: headers["x-pdao-agent-id"] || null,
    synthetic: headers["x-pdao-synthetic"] === "true",
  };
}
function parseBody(e) {
  const raw = e.body
    ? e.isBase64Encoded
      ? Buffer.from(e.body, "base64").toString()
      : e.body
    : "{}";
  if (Buffer.byteLength(raw) > config.maxBodyBytes)
    throw new Error("request body too large");
  try {
    return JSON.parse(raw);
  } catch (_error) {
    throw Object.assign(new Error("invalid JSON request body"), { statusCode: 400 });
  }
}
function card() {
  return {
    name: "PrivateDAO Agent Exchange",
    description: "Machine-native PrivateDAO services for verification, evidence and agent workflows. Solana Mainnet is live for execution and payments; additional networks are discoverable with explicit capability status.",
    provider: { organization: "PrivateDAO", url: "https://privatedao.org" },
    version: "1.6.0",
    protocolVersion: "0.3.0",
    url: `https://${config.domain}/a2a`,
    documentationUrl: `https://${config.domain}/llms-full.txt`,
    capabilities: { streaming: false, pushNotifications: false },
    authentication: { schemes: ["none", "solana-payment"] },
    networks: [...LIVE_NETWORKS],
    networkCapabilities: NETWORK_CAPABILITIES,
    defaultInputModes: ["text/plain", "application/json"],
    defaultOutputModes: ["application/json"],
    protocols: {
      a2a: `https://${config.domain}/a2a`,
      mcp: `https://${config.domain}/mcp`,
      openapi: `https://${config.domain}/openapi.json`,
    },
    distribution: {
      hub: `https://${config.domain}/connect`,
      chatgpt: `https://${config.domain}/connect/chatgpt`,
      claude: `https://${config.domain}/connect/claude`,
      grok: `https://${config.domain}/connect/grok`,
      openclaw: `https://${config.domain}/connect/openclaw`,
      mcpGuide: `https://${config.domain}/mcp`,
    },
    serviceCatalog: `https://${config.domain}/api/services`,
    pricing: `https://${config.domain}/api/pricing`,
    integrationCatalog: `https://${config.domain}/api/integrations`,
    semanticGuide: `https://${config.domain}/llms-full.txt`,
    agentGuidance: "Use pdao_services to inspect the catalog, service_recommendation to map a task to a service, and provider_integrations to understand evidence sources. Free jobs execute immediately; paid jobs return a quote and payment_intent before any execution.",
    workflow: {
      discovery: `GET https://${config.domain}/.well-known/agent-card.json`,
      freeTest: {
        service: "verify.basic",
        createJob: `POST https://${config.domain}/api/jobs`,
        exampleBody: { service_id: "verify.basic", input: { record: { mint: "<SOLANA_MINT>" } } },
        result: "The response includes result and receipt; verify the receipt with the receipt URL.",
      },
      paid: {
        createJob: `POST https://${config.domain}/api/jobs`,
        paymentRequiredStatus: 402,
        paymentIntent: `GET https://${config.domain}/api/jobs/{jobId}/payment-intent`,
        payment: "Send the exact quoted USDC amount on Solana Mainnet to the quoted treasury token account, then submit the finalized transaction signature.",
        submitPaymentProof: `POST https://${config.domain}/api/jobs/{jobId}/payment`,
        jobStatus: `GET https://${config.domain}/api/jobs/{jobId}`,
      },
      receipts: `GET https://${config.domain}/api/receipts/{receiptId}`,
    },
    payment: {
      network: "solana-mainnet-beta",
      asset: "USDC",
      quoteFirst: true,
      finalizedTransactionRequired: true,
      custody: "receive-only treasury; the paying agent signs its own transaction",
    },
    skills: [
      ...SERVICES.map((s) => ({
        ...serviceManifest(s),
        id: s.id,
        name: s.title,
        description: serviceDetails(s).summary,
        inputModes: ["application/json"],
        outputModes: ["application/json"],
        pricing: { access: s.access, amount: s.price, currency: s.currency, free: s.access === "free" },
        supportedNetworks: s.supportedNetworks || ["solana-mainnet-beta"],
      })),
      {
        id: "registry.search",
        name: "Search agents",
        description: "Find verified agent capabilities and service providers.",
        inputModes: ["application/json"],
        outputModes: ["application/json"],
      },
    ],
    serviceCategories: SERVICE_CATEGORIES,
    integrations: integrationDirectory(),
  };
}
function openapi() {
  const serviceSchemas = Object.fromEntries(SERVICES.map((service) => [
    `ServiceInput_${service.id.replaceAll(".", "_")}`,
    serviceInputSchema(service),
  ]));
  const serviceInputRefs = Object.fromEntries(SERVICES.map((service) => [
    service.id,
    { $ref: `#/components/schemas/ServiceInput_${service.id.replaceAll(".", "_")}` },
  ]));
  const jobInput = {
    type: "object",
    properties: {
      service_id: { type: "string", enum: SERVICES.map((service) => service.id) },
      input: { oneOf: Object.values(serviceInputRefs) },
    },
    required: ["service_id", "input"],
    additionalProperties: false,
  };
  const paymentInput = {
    type: "object",
    properties: {
      signature: { type: "string", description: "Finalized Solana transaction signature." },
    },
    required: ["signature"],
    additionalProperties: false,
  };
  const registerInput = {
    type: "object",
    properties: {
      name: { type: "string" },
      protocol: { type: "string", enum: ["MCP"] },
      mcpUrl: { type: "string", format: "uri" },
      mcp_url: { type: "string", format: "uri" },
      endpoint: { type: "string", format: "uri" },
      allowedTools: { type: "array", items: { type: "string" } },
      networks: { type: "array", items: { type: "string" } },
      forceRefresh: { type: "boolean" },
      agentId: { type: "string" },
      ownerToken: { type: "string" },
      commercialServices: { type: "array", items: { type: "object" } },
      acceptedAssets: { type: "array", items: { type: "string" } },
      payout: { type: "object" },
    },
    anyOf: [{ required: ["mcpUrl"] }, { required: ["mcp_url"] }, { required: ["endpoint"] }],
    additionalProperties: false,
  };
  const paths = {
    "/api/health": { get: { operationId: "health" } },
    "/api/services": { get: { operationId: "services" } },
    "/api/pricing": { get: { operationId: "pricing" } },
    "/api/jobs": { post: { operationId: "createJob", requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/CreateJobRequest" } } } } } },
    "/api/jobs/{jobId}": { get: { operationId: "jobStatus", parameters: [{ $ref: "#/components/parameters/JobId" }], responses: { "200": { description: "Current job status" }, "409": { description: "Job requires non-replaying recovery" } } } },
    "/api/jobs/{jobId}/payment": { post: { operationId: "submitPayment", parameters: [{ $ref: "#/components/parameters/JobId" }], responses: { "200": { description: "Payment accepted or job completed" }, "202": { description: "Payment verification or processing is still in progress" }, "409": { description: "Payment was accepted but execution requires non-replaying recovery" } }, requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/PaymentRequest" } } } } } },
    "/api/receipts/{receiptId}": { get: { operationId: "getReceipt", parameters: [{ $ref: "#/components/parameters/ReceiptId" }] } },
    "/api/network/health": { get: { operationId: "networkHealth", parameters: [{ name: "network", in: "query", schema: { type: "string" } }] } },
    "/api/registry/register": { post: { operationId: "registerAgent", requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/RegisterAgentRequest" } } } } } },
    "/api/registry/search": { get: { operationId: "searchAgents", parameters: [{ name: "q", in: "query", schema: { type: "string" } }] } },
    "/api/registry/services": { get: { operationId: "externalServices" } },
    "/api/registry/agents/{agentId}/services": { patch: { operationId: "updateSellerServices" } },
    "/api/registry/agents/{agentId}/seller-readiness": { get: { operationId: "sellerReadiness" } },
    "/api/seller/dashboard/{agentId}": { get: { operationId: "sellerDashboard" } },
    "/api/seller/metadata/preview": { post: { operationId: "previewSellerMetadata" } },
    "/api/registry/agents/{agentId}/publish": { post: { operationId: "publishSeller" } },
    "/api/registry/agents/{agentId}/unpublish": { post: { operationId: "unpublishSeller" } },
    "/api/registry/agents/{agentId}/owner-token/rotate": { post: { operationId: "rotateSellerOwnerToken" } },
    "/api/registry/agents/{agentId}/replace": { post: { operationId: "replaceSellerEndpoint" } },
    "/api/registry/agents/{agentId}/retire": { post: { operationId: "retireSeller" } },
    "/api/external/jobs": { post: { operationId: "createExternalJob" } },
    "/api/external/jobs/{jobId}/payment": { post: { operationId: "submitExternalPayment", responses: { "200": { description: "Payment accepted or job completed" }, "202": { description: "Payment verification or processing is still in progress" }, "409": { description: "Payment was accepted but execution requires non-replaying recovery" } } } },
    "/api/github/webhook": { post: { operationId: "githubWebhook" } },
    "/api/github/context": { post: { operationId: "githubRepositoryContext" } },
    "/api/discovery": { get: { operationId: "discovery" } },
    "/api/acquisition": { get: { operationId: "acquisition" } },
    "/api/referrals": { post: { operationId: "createReferral" } },
    "/api/marketplace/listings": { get: { operationId: "searchListings" }, post: { operationId: "publishListing" } },
    "/api/marketplace/policy": { get: { operationId: "marketplacePolicy" } },
    "/api/marketplace/seller-listings/quote": { post: { operationId: "sellerListingQuote" } },
    "/api/marketplace/seller-listings/{listingId}/payment": { post: { operationId: "sellerListingPayment" } },
    "/api/marketplace/seller-listings/{listingId}/payment-intent": { get: { operationId: "sellerListingPaymentIntent" } },
    "/api/marketplace/seller-listings/{listingId}/payment-transaction": { post: { operationId: "sellerListingPaymentTransaction" } },
    "/api/marketplace/promotions/quote": { post: { operationId: "sellerPromotionQuote" } },
    "/api/marketplace/partners": { get: { operationId: "featuredPartners" } },
    "/api/partnerships/{partnershipId}/payment-intent": { get: { operationId: "partnershipPaymentIntent" } },
    "/api/partnerships/{partnershipId}/payment-transaction": { post: { operationId: "partnershipPaymentTransaction" } },
    "/api/partnerships/{partnershipId}/payment": { post: { operationId: "submitPartnershipPayment" } },
    "/api/admin/partnerships": { post: { operationId: "createPartnership" } },
    "/api/admin/partnerships/{partnershipId}": { patch: { operationId: "updatePartnership" } },
    "/api/admin/marketplace/policy": { get: { operationId: "adminMarketplacePolicy" }, patch: { operationId: "updateMarketplacePolicy" } },
    "/api/admin/registry/agents/{agentId}/owner-token/rotate": { post: { operationId: "rotateSellerOwnerToken" } },
    "/api/logistics/request": { post: { operationId: "requestLogistics", requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/LogisticsRequest" } } } } } },
    "/api/logistics/capabilities": { get: { operationId: "logisticsCapabilities" } },
    "/api/agreements": { post: { operationId: "createAgreement" } },
    "/api/agreements/{agreementId}": { get: { operationId: "getAgreement" } },
    "/api/agreements/{agreementId}/accept": { post: { operationId: "acceptAgreement" } },
    "/api/revenue": { get: { operationId: "revenueSummary" } },
    "/api/treasury/status": { get: { operationId: "treasuryStatus" } },
    "/api/providers/status": { get: { operationId: "providerStatus" } },
    "/api/integrations": { get: { operationId: "integrations" } },
    "/receipts/{receiptId}": { get: { operationId: "humanReceipt" } },
    "/verify/receipt/{receiptId}": { get: { operationId: "verifyHumanReceipt" } },
    "/partners": { get: { operationId: "featuredPartnersPage" } },
    "/marketplace/partners": { get: { operationId: "featuredPartnersPage" } },
    "/connect": { get: { operationId: "connectionHub" } },
    "/connect/chatgpt": { get: { operationId: "chatgptConnectionGuide" } },
    "/connect/claude": { get: { operationId: "claudeConnectionGuide" } },
    "/connect/grok": { get: { operationId: "grokConnectionGuide" } },
    "/connect/openclaw": { get: { operationId: "openclawConnectionGuide" } },
    "/mcp": { get: { operationId: "mcpGuide" }, post: { operationId: "mcpJsonRpc" } },
    "/agents/{agentId}": { get: { operationId: "agentProfile" } },
    "/jobs/{jobId}": { get: { operationId: "humanJobReceipt" } },
    ...Object.fromEntries(SERVICES.map((service) => [servicePath(service.id), { get: { operationId: `service_${service.id.replaceAll(".", "_")}` } }])),
  };
  return {
    openapi: "3.1.0",
    info: { title: "PrivateDAO Agent Exchange", version: "1.6.0", description: "A machine-to-machine service marketplace: discover, request, execute, pay when required, and verify the returned evidence." },
    servers: [{ url: `https://${config.domain}` }],
    paths,
    components: {
      schemas: {
        ...serviceSchemas,
        CreateJobRequest: jobInput,
        PaymentRequest: paymentInput,
        RegisterAgentRequest: registerInput,
        LogisticsRequest: {
          type: "object",
          properties: {
            capability: { type: "string" },
            requirements: { type: "object" },
            maxPrice: { type: "number", minimum: 0 },
            asset: { type: "string" },
            deadline: { type: "string", format: "date-time" },
            preferredProtocols: { type: "array", items: { type: "string" } },
            network: { type: "string", description: "Canonical network or accepted alias." },
          },
          required: ["capability"],
          additionalProperties: false,
        },
      },
      parameters: {
        JobId: { name: "jobId", in: "path", required: true, schema: { type: "string", pattern: "^job_[A-Za-z0-9-]+$" } },
        ReceiptId: { name: "receiptId", in: "path", required: true, schema: { type: "string", pattern: "^rvr_[A-Za-z0-9]+$" } },
      },
    },
  };
}
function llms() {
  const free = SERVICES.filter((service) => !service.price).map((service) => service.id).join(", ");
  const paid = SERVICES.filter((service) => service.price).map((service) => service.id).join(", ");
  const categories = SERVICE_CATEGORIES.map((category) => `${category.id}: ${category.description}`).join("\n");
  const integrations = integrationDirectory().map((integration) => `${integration.name}: ${integration.value}; status=${integration.status}; ${integration.note}`).join("\n");
  return `# PrivateDAO Agent Exchange
Purpose: a machine-to-machine service marketplace for AI agents. The lifecycle is DISCOVER -> REQUEST -> EXECUTE -> PAY when required -> VERIFY.
The human marketplace is at https://${config.domain}/marketplace. The agent interface is https://${config.domain}/mcp.

## Service selection
Use GET /api/services or MCP pdao_services for the complete catalog. Use MCP service_recommendation with a natural-language task before choosing a service. Services are grouped as:
${categories}

## Access and payment
Free: ${free}
Paid: ${paid}
All paid services are quote-first. POST /api/jobs with service_id and input. A paid request returns HTTP 402 and payment_intent; do not pay before reading the exact amount, mint, treasury token account, payment reference, expiry, and payment network. The payment rail is finalized Solana Mainnet USDC. The paying agent signs its own transaction. Submit the finalized signature to POST /api/jobs/{jobId}/payment, then poll GET /api/jobs/{jobId}; retrieve and verify GET /api/receipts/{receiptId}. If payment was accepted but execution returns HTTP 409 with recovery_required, do not resubmit the signature: the service is intentionally not replayed automatically. Never send private keys or seed phrases.

## Execution boundaries
Target networks are independent of the Solana payment network. EVM, Solana, GitHub and market-data services are read-only evidence paths and do not sign or broadcast user transactions. HTTP 402 means payment is required; HTTP 429 means retry after the supplied retry hint; HTTP 400 means correct the input; HTTP 404 means the job or receipt is unavailable; HTTP 503 means a provider is unavailable and may be retried later. Results include hashes, receipt data, provider provenance and persistence status when applicable.

## Integrations
${integrations}
Provider status: GET /api/providers/status or MCP provider_integrations. Integration names do not imply an official partnership unless the status explicitly says so.

## Protocols and routes
Agent Card: https://${config.domain}/.well-known/agent-card.json
MCP: https://${config.domain}/mcp
A2A: https://${config.domain}/a2a
OpenAPI: https://${config.domain}/openapi.json
Services: GET https://${config.domain}/api/services
Pricing: GET https://${config.domain}/api/pricing
Integrations: GET https://${config.domain}/api/integrations
Receipts: GET https://${config.domain}/api/receipts/{receiptId}
`;
}
function acquisition() {
  const services = SERVICES.map((service) => ({
    ...service,
    free: service.access === "free",
    status: capabilityStatus(service.id),
    publicUrl: `https://${config.domain}${servicePath(service.id)}`,
    paymentAssets: service.price ? ["USDC"] : [],
    receipt: `https://${config.domain}/api/receipts/{receiptId}`,
  }));
  return {
    network: "solana:mainnet-beta",
    networkCapabilities: NETWORK_CAPABILITIES,
    canonical: `https://${config.domain}`,
    freeEntry: "verify.basic",
    services,
    payment: {
      assets: ["USDC"],
      finalizedOnly: true,
      quoteFirst: true,
      custody: "receive-only treasury; agents sign their own transactions",
    },
    discovery: {
      agentCard: `https://${config.domain}/.well-known/agent-card.json`,
      mcp: `https://${config.domain}/mcp`,
      a2a: `https://${config.domain}/a2a`,
      openapi: `https://${config.domain}/openapi.json`,
      developerGuide: `https://${config.domain}/connect`,
      solanaAgentRegistryRegistration: `https://${config.domain}/agent-registry/register`,
    },
    sdk: {
      typescript: "https://github.com/X-PACT/PrivateDAO/tree/codex/agent-exchange-acquisition/sdk/agent-exchange/typescript",
      python: "https://github.com/X-PACT/PrivateDAO/tree/codex/agent-exchange-acquisition/sdk/agent-exchange/python",
      examples: `https://${config.domain}/connect`,
    },
    receipts: {
      verification: `https://${config.domain}/api/receipts/{receiptId}`,
      public: true,
    },
    referrals: {
      supported: true,
      attribution: "discovery-to-activation-to-paid-conversion",
      rewards: "disabled-until-explicit-provider-policy",
      endpoint: `https://${config.domain}/api/referrals`,
    },
    integrations: [
      { id: "mcp-official-registry", protocol: "MCP", status: "published-active", url: "https://registry.modelcontextprotocol.io/v0.1/servers?search=io.github.X-PACT%2Fpdao-agent-exchange" },
      { id: "a2a-registry", protocol: "A2A", status: "registered-recheck-pending", url: "https://a2aregistry.org/api/agents/6ebd2b6c-2cef-4421-8f28-6896ca3bf307", note: "Registry cache must recheck the updated card; no duplicate entry is created." },
      { id: "solana-agent-registry", protocol: "A2A", status: "submission-ready", auth: "manual or registry-specific" },
      { id: "8004scan", protocol: "agent-discovery", status: "submission-ready", auth: "directory policy applies" },
      { id: "github-action", protocol: "GitHub Actions", status: "source-ready", url: "https://github.com/X-PACT/PrivateDAO/tree/codex/agent-exchange-acquisition/integrations/pdao-token-verification-action" },
    ],
    policy: "opt-in distribution; no fabricated activity or unsolicited messaging",
  };
}
function createReferral(body) {
  const source = String(body.agentId || body.agent_id || body.source || "").trim();
  if (!source || source.length > 200) throw new Error("agentId is required");
  const code = `ref_${digest({ source }).slice(0, 24)}`;
  trackFunnel("referral_created", { source: code, agent: source });
  return {
    referralId: code,
    discoveryUrl: `https://${config.domain}/api/acquisition?ref=${encodeURIComponent(code)}`,
    attribution: "discovery-to-activation-to-paid-conversion",
    rewards: "disabled-until-explicit-provider-policy",
  };
}
function recommendedNextServices(serviceId, result) {
  if (serviceId === "verify.basic") {
    const uncertain = result?.evidence_confidence === "not-found" || result?.valid === false;
    return [{
      service: uncertain ? "verify.deep" : "risk.score",
      reason: uncertain ? "Basic evidence is incomplete; deep checks add bounded transaction and authority evidence." : "Authority and holder evidence can be converted into a machine-readable risk assessment.",
      price: uncertain ? 0.25 : 0.02,
      currency: "USDC",
      expected_additional_value: uncertain ? "deeper evidence and recent activity" : "deterministic authority-risk factors",
    }];
  }
  if (serviceId === "risk.score" && result?.factors?.mint_authority_present)
    return [{ service: "verify.deep", reason: "The result contains an authority flag; deep verification can add recent activity evidence.", price: 0.25, currency: "USDC", expected_additional_value: "recent activity and expanded checks" }];
  if (serviceId === "receipt.verify") return [];
  return [];
}
function connectPage() {
  const lines = [
    "<!doctype html><html lang=\"en\"><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><link rel=\"icon\" href=\"data:,\"><title>Connect an Agent | PrivateDAO</title>",
    "<style>:root{--ink:#081b33;--muted:#52657c;--line:#dbe5f0;--blue:#1769e0;--pale:#f5f9ff}*{box-sizing:border-box}body{font-family:Inter,ui-sans-serif,system-ui,-apple-system,sans-serif;max-width:1040px;margin:0 auto;padding:28px 24px 64px;background:#fff;color:var(--ink);line-height:1.55}a{color:var(--blue);font-weight:700}h1{font-size:clamp(2.8rem,7vw,5.4rem);letter-spacing:-.055em;line-height:.98;max-width:760px;margin:16px 0 20px}.lead{color:var(--muted);font-size:1.14rem;max-width:700px}.muted{color:var(--muted)}.top{display:flex;align-items:center;justify-content:space-between;gap:18px;margin-bottom:72px}.brand{color:var(--ink);text-decoration:none;font-weight:800}.nav{display:flex;gap:18px;font-size:.9rem}.nav a{color:var(--muted)}.eyebrow{color:var(--blue);font-size:.75rem;font-weight:800;letter-spacing:.12em;text-transform:uppercase}.flow{display:flex;flex-wrap:wrap;gap:8px;margin:24px 0 38px}.flow span{border:1px solid var(--line);border-radius:999px;padding:9px 13px;background:var(--pale);font-size:.9rem;font-weight:700}.section{border-top:1px solid var(--line);padding-top:24px;margin-top:36px}.section h2{font-size:1.3rem}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px}.grid section{border:1px solid var(--line);border-radius:16px;padding:18px;background:#fff;box-shadow:0 10px 28px rgba(14,42,78,.05)}.grid section b{color:var(--blue)}pre{overflow:auto;background:#f5f9ff;border:1px solid var(--line);border-radius:14px;padding:16px;color:#102745;font-size:13px}footer{border-top:1px solid var(--line);margin-top:42px;padding-top:18px;font-size:.9rem}@media(max-width:700px){body{padding:20px 16px 44px}.top{margin-bottom:48px}.nav{gap:10px;font-size:.78rem}h1{font-size:clamp(3rem,15vw,5rem)}} </style></head><body>",
    "<header class=\"top\"><a class=\"brand\" href=\"/marketplace\">PrivateDAO Agent Exchange</a><nav class=\"nav\"><a href=\"/marketplace\">Marketplace</a><a href=\"/.well-known/agent-card.json\">Agent Card</a></nav></header><div class=\"eyebrow\">Developer access</div><h1>Connect your agent.<br><span>Verify the result.</span></h1><p class=\"lead\">Discover PrivateDAO services, run a free check, pay only when a paid result is useful, and receive a verifiable receipt.</p>",
    "<div class=\"flow\"><span>Discover</span><span>Create job</span><span>Pay</span><span>Get result</span><span>Verify receipt</span></div>",
    `<section class="section"><h2>Fastest onboarding</h2><p class="muted">Copy the machine endpoint you need, then run the free verification example below. No dashboard or account is required.</p><div class="grid"><section><b>Agent Card</b><p><button class="copy" data-copy="https://${config.domain}/.well-known/agent-card.json">Copy endpoint</button></p></section><section><b>OpenAPI</b><p><button class="copy" data-copy="https://${config.domain}/openapi.json">Copy endpoint</button></p></section><section><b>MCP</b><p><button class="copy" data-copy='{"mcpServers":{"privatedao-agents":{"url":"https://${config.domain}/mcp"}}}'>Copy MCP config</button></p></section></div><script>document.querySelectorAll(".copy").forEach(function(button){button.addEventListener("click",async function(){try{await navigator.clipboard.writeText(button.dataset.copy);const old=button.textContent;button.textContent="Copied";setTimeout(function(){button.textContent=old},1400)}catch(_){button.textContent="Select and copy manually"}})});</script></section>`,
    "<section class=\"section\"><h2>Fastest start: curl</h2><pre>curl https://agents.privatedao.org/.well-known/agent-card.json\ncurl https://agents.privatedao.org/api/services\ncurl -X POST https://agents.privatedao.org/api/jobs -H 'content-type: application/json' -d '{\"service_id\":\"verify.basic\",\"input\":{\"mint\":\"YOUR_SOLANA_MINT\"}}'</pre></section>",
    "<h2>TypeScript</h2><pre>import { PrivateDAOAgentExchange } from \"@privatedao/agent-exchange\";\nconst pdao = new PrivateDAOAgentExchange();\nawait pdao.discover();\nconst job = await pdao.verifyBasic({ mint: \"YOUR_SOLANA_MINT\" });\nconsole.log(job);</pre>",
    "<h2>Python</h2><pre>from privatedao_agent_exchange import PrivateDAOAgentExchange\npdao = PrivateDAOAgentExchange()\npdao.discover()\njob = pdao.verify_basic({\"mint\": \"YOUR_SOLANA_MINT\"})\nprint(job)</pre>",
    "<h2>Paid flow</h2><p class=\"muted\">Create a paid job, read the payment intent, send the exact finalized Solana payment with its reference, submit the signature, poll the job, then retrieve the receipt. No account or dashboard is required.</p>",
    "<div class=\"grid\"><section><b>Free entry</b><p>verify.basic<br>receipt.verify</p></section><section><b>Paid intelligence</b><p>verify.deep<br>token.intelligence<br>risk.score<br>wallet.intelligence</p></section><section><b>Agent logistics</b><p>agent.match<br>/api/logistics/request<br>/api/marketplace/listings</p></section></div>",
    "<p class=\"muted\">Production network: Solana Mainnet. <a href=\"/marketplace\">Browse services</a> · <a href=\"/.well-known/agent-card.json\">Agent Card</a> · <a href=\"/openapi.json\">OpenAPI</a> · <a href=\"/mcp\">MCP</a></p></body></html>",
  ];
  return injectLanguageWidget(lines.join(""));
}
function distributionPage(title, description, content, route = "/connect") {
  if (route === "/integrations") content = `<section aria-label="PrivateDAO official brand" style="display:flex;align-items:center;gap:14px;margin-bottom:22px"><img src="/assets/brand/privatedao-official-logo.jpg" alt="PrivateDAO official logo" width="64" height="64" decoding="async" style="display:block;width:64px;height:64px;object-fit:cover;border-radius:14px"><div><strong>PrivateDAO</strong><p class="muted" style="margin:2px 0 0">Official brand presentation</p></div></section>${privateDaoBanner()}${content}`;
  return injectLanguageWidget(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="description" content="${escapeHtml(description)}"><link rel="canonical" href="https://${config.domain}${route}"><title>${escapeHtml(title)} | PrivateDAO</title><style>body{max-width:1080px;margin:auto;padding:28px 24px 70px;color:#081b33;font:16px/1.6 system-ui,sans-serif}a{color:#1769e0;font-weight:700;text-decoration:none}.top,.row{display:flex;justify-content:space-between;gap:18px;align-items:center}.top{margin-bottom:72px}.nav{display:flex;gap:16px;flex-wrap:wrap}.nav a{color:#52657c}.eyebrow{color:#1769e0;font-size:.75rem;font-weight:800;letter-spacing:.12em;text-transform:uppercase}h1{font-size:clamp(2.8rem,7vw,5.8rem);line-height:.95;letter-spacing:-.055em;max-width:850px}h2{font-size:1.35rem}.lead,.muted{color:#52657c}.lead{font-size:1.18rem;max-width:760px}.section{border-top:1px solid #dbe5f0;margin-top:42px;padding-top:26px}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:14px}.panel{border:1px solid #dbe5f0;border-radius:16px;padding:20px;box-shadow:0 10px 28px rgba(14,42,78,.05)}.badge,.verified-badge{display:inline-block;border:1px solid #b9dece;border-radius:999px;background:#effbf7;color:#087f5b;padding:5px 10px;font-size:.8rem;font-weight:800;white-space:nowrap}.verified-badge{border-color:#9ac7f6;background:#edf6ff;color:#145db3;letter-spacing:.02em}.client-card-title{display:inline-flex;align-items:center;gap:9px;flex-wrap:wrap}.brand-mark{display:inline-flex;align-items:center;justify-content:center;flex:none;width:34px;height:34px;border:1px solid #dbe5f0;border-radius:9px;background:#fff;overflow:hidden}.brand-mark-dark{background:#081b33;border-color:#081b33}.brand-mark img{display:block;width:32px;height:32px;object-fit:contain}.client-guide-brand{display:flex;align-items:center;gap:10px;flex-wrap:wrap}.verified-client-list{display:flex;flex-wrap:wrap;gap:12px;margin-top:18px}.verified-client{display:inline-flex;align-items:center;gap:8px;border:1px solid #dbe5f0;border-radius:12px;padding:10px 12px;background:#fff}.button{border:0;border-radius:999px;background:#081b33;color:#fff;padding:11px 16px;font:inherit;cursor:pointer}.alt{background:#f5f9ff;color:#081b33;border:1px solid #dbe5f0}pre{overflow:auto;padding:16px;background:#f5f9ff;border:1px solid #dbe5f0;border-radius:12px;font:13px/1.55 ui-monospace,monospace;white-space:pre-wrap;overflow-wrap:anywhere}.step{margin:12px 0;padding-left:18px;border-left:3px solid #1769e0}.callout{padding:14px;border-left:4px solid #1769e0;background:#f5f9ff}footer{border-top:1px solid #dbe5f0;margin-top:48px;padding-top:18px;color:#52657c;font-size:.9rem}@media(max-width:700px){body{padding:20px 16px}.top,.row{align-items:flex-start;flex-direction:column}.top{margin-bottom:48px}.button{width:100%}.verified-client-list{display:grid;grid-template-columns:1fr 1fr}}</style></head><body><main><header class="top"><a href="/" style="color:#081b33">PrivateDAO Agent Exchange</a><nav class="nav"><a href="/connect">Connect</a><a href="/mcp">MCP</a><a href="/marketplace">Services</a><a href="/.well-known/agent-card.json">Agent Card</a></nav></header>${content}<footer>PrivateDAO Agent Exchange · <a href="/llms-full.txt">Machine-readable guide</a> · <a href="/openapi.json">OpenAPI</a> · <a href="/a2a">A2A</a></footer></main></body></html>`);
}
function distributionCopy(value, label = "Copy") {
  return `<button class="button alt copy" data-copy="${escapeHtml(value)}">${escapeHtml(label)}</button>`;
}
function distributionScript() {
  return "<script>document.querySelectorAll('.copy').forEach(function(b){b.onclick=async function(){try{await navigator.clipboard.writeText(b.dataset.copy);var t=b.textContent;b.textContent='Copied';setTimeout(function(){b.textContent=t},1400)}catch(_){b.textContent='Copy manually'}}});</script>";
}
function mcpEndpoint() {
  return `https://${config.domain}/mcp`;
}
const VERIFIED_MCP_CLIENTS = new Set(["chatgpt", "claude", "grok", "openclaw"]);
const CLIENT_BRANDS = {
  chatgpt: { name: "ChatGPT", src: "/assets/clients/openai-knot.svg" },
  claude: { name: "Claude", src: "/assets/clients/claude-symbol.svg", dark: true },
  grok: { name: "Grok", src: "/assets/clients/grok-symbol.svg", dark: true },
  openclaw: { name: "OpenClaw", src: "/assets/clients/openclaw-symbol.png" },
};
const CLIENT_ASSETS = {
  "/assets/clients/openai-knot.svg": { file: new URL("../assets/clients/openai-knot.svg", import.meta.url), contentType: "image/svg+xml", binary: false },
  "/assets/clients/claude-symbol.svg": { file: new URL("../assets/clients/claude-symbol.svg", import.meta.url), contentType: "image/svg+xml", binary: false },
  "/assets/clients/grok-symbol.svg": { file: new URL("../assets/clients/grok-symbol.svg", import.meta.url), contentType: "image/svg+xml", binary: false },
  "/assets/clients/openclaw-symbol.png": { file: new URL("../assets/clients/openclaw-symbol.png", import.meta.url), contentType: "image/png", binary: true },
};
const INTEGRATION_BRANDS = {
  "ibm-watsonx": { name: "IBM watsonx", src: "/assets/ecosystem/ibm-watsonx.svg" },
  "intel-openvino": { name: "Intel OpenVINO", src: "/assets/ecosystem/openvino.svg" },
  mongodb: { name: "MongoDB", src: "/assets/ecosystem/mongodb.svg" },
  github: { name: "GitHub", src: "/assets/ecosystem/github.svg" },
  kernel: { name: "PrivateDAO Kernel", src: "/assets/brand/privatedao-official-logo.jpg", dark: true },
};
const ECOSYSTEM_ASSETS = {
  "/assets/ecosystem/ibm-watsonx.svg": { file: new URL("../assets/ecosystem/ibm-watsonx.svg", import.meta.url), contentType: "image/svg+xml", binary: false },
  "/assets/ecosystem/openvino.svg": { file: new URL("../assets/ecosystem/openvino.svg", import.meta.url), contentType: "image/svg+xml", binary: false },
  "/assets/ecosystem/mongodb.svg": { file: new URL("../assets/ecosystem/mongodb.svg", import.meta.url), contentType: "image/svg+xml", binary: false },
  "/assets/ecosystem/github.svg": { file: new URL("../assets/ecosystem/github.svg", import.meta.url), contentType: "image/svg+xml", binary: false },
};
const BRAND_ASSETS = {
  "/assets/brand/privatedao-official-logo.jpg": { file: new URL("../assets/brand/privatedao-official-logo.jpg", import.meta.url), contentType: "image/jpeg", binary: true },
  "/assets/brand/privatedao-official-banner.jpg": { file: new URL("../assets/brand/privatedao-official-banner.jpg", import.meta.url), contentType: "image/jpeg", binary: true },
};
const BROWSER_ASSETS = {
  "/assets/browser/solana-web3.mjs": { file: new URL("../assets/browser/solana-web3.mjs", import.meta.url), contentType: "text/javascript; charset=utf-8", binary: false },
  "/assets/browser/spl-token.mjs": { file: new URL("../assets/browser/spl-token.mjs", import.meta.url), contentType: "text/javascript; charset=utf-8", binary: false },
  "/assets/browser/8004-solana.mjs": { file: new URL("../assets/browser/8004-solana.mjs", import.meta.url), contentType: "text/javascript; charset=utf-8", binary: false },
};
const ASSETS = { ...CLIENT_ASSETS, ...ECOSYSTEM_ASSETS, ...BRAND_ASSETS, ...BROWSER_ASSETS };
const privateDaoLogo = (className = "") => `<img class="${className}" src="/assets/brand/privatedao-official-logo.jpg" alt="PrivateDAO official logo" width="42" height="42" decoding="async" style="display:block;width:42px;height:42px;object-fit:cover;border-radius:10px">`;
const privateDaoBanner = () => `<figure class="pdao-official-banner" style="margin:26px 0 0;border:1px solid #dbe5f0;border-radius:18px;overflow:hidden;background:#071a32;box-shadow:0 12px 30px rgba(14,42,78,.08)"><img src="/assets/brand/privatedao-official-banner.jpg" alt="PrivateDAO official brand banner" width="1280" height="427" loading="eager" decoding="async" style="display:block;width:100%;height:auto;aspect-ratio:1280/427;object-fit:cover"></figure>`;
function verifiedClientBadge() {
  return '<span class="verified-badge" aria-label="MCP interoperability verified">✓ MCP VERIFIED</span>';
}
function clientBrandMark(client) {
  const brand = CLIENT_BRANDS[client];
  if (!brand) return "";
  return `<span class="brand-mark${brand.dark ? " brand-mark-dark" : ""}"><img src="${escapeHtml(brand.src)}" alt="${escapeHtml(brand.name)} logo" width="32" height="32" decoding="async"></span>`;
}
function clientBrandTitle(client) {
  const brand = CLIENT_BRANDS[client];
  return `<span class="client-card-title">${clientBrandMark(client)}<strong>${escapeHtml(brand.name)}</strong> ${verifiedClientBadge()}</span>`;
}
function integrationBrandMark(id) {
  if (id === "mcp-clients") return `<span style="display:flex;align-items:center;gap:4px;min-width:132px">${["chatgpt", "claude", "grok", "openclaw"].map((client) => { const brand = CLIENT_BRANDS[client]; return `<span style="display:inline-flex;align-items:center;justify-content:center;width:30px;height:30px;border:1px solid #dbe5f0;border-radius:8px;background:${brand.dark ? "#081b33" : "#fff"};overflow:hidden"><img src="${escapeHtml(brand.src)}" alt="${escapeHtml(brand.name)} logo" width="28" height="28" decoding="async" style="display:block;width:28px;height:28px;object-fit:contain"></span>`; }).join("")}</span>`;
  const brand = INTEGRATION_BRANDS[id];
  if (!brand) return "";
  return `<span style="display:inline-flex;align-items:center;justify-content:center;flex:none;width:44px;height:44px;border:1px solid #dbe5f0;border-radius:10px;background:${brand.dark ? "#081b33" : "#fff"};overflow:hidden"><img src="${escapeHtml(brand.src)}" alt="${escapeHtml(brand.name)} logo" width="38" height="38" decoding="async" style="display:block;width:38px;height:38px;object-fit:contain"></span>`;
}
function integrationCard(integration) {
  const name = integration.id === "mcp-clients" ? "ChatGPT · Claude · Grok · OpenClaw" : integration.name;
  const githubLinks = integration.id === "github" ? `<p style="display:flex;gap:12px;flex-wrap:wrap"><a href="https://github.com/apps/privatedao-agent-exchange" target="_blank" rel="noreferrer">Install GitHub App ↗</a></p>` : "";
  return `<article class="integration" style="border:1px solid #dbe5f0;border-radius:16px;padding:18px;background:#f5f9ff;box-shadow:0 10px 26px rgba(14,42,78,.05)"><div style="display:flex;align-items:center;gap:12px;min-height:48px">${integrationBrandMark(integration.id)}<div><p class="eyebrow">${escapeHtml(integration.eyebrow)}</p><h3>${escapeHtml(name)}</h3></div></div><strong>${escapeHtml(integration.value)}</strong><p>${escapeHtml(integration.status)}</p>${githubLinks}</article>`;
}
function verifiedClientSection() {
  return `<section class="section verification-section"><h2>Client-Level MCP Verification</h2><p class="muted">Verified through real client-level MCP connections, tool discovery, and successful execution against PrivateDAO Agent Exchange production infrastructure. This is a PrivateDAO interoperability test result, not a partnership, certification, endorsement or directory listing.</p><div class="verified-client-list">${["chatgpt", "claude", "grok", "openclaw"].map((client) => `<span class="verified-client">${clientBrandTitle(client)}</span>`).join("")}</div></section>`;
}
function connectionHubPage() {
  const endpoint = mcpEndpoint();
  const cfg = JSON.stringify({ mcpServers: { "privatedao-agent-exchange": { url: endpoint, transport: "streamable-http" } } }, null, 2);
  const content = `<div class="eyebrow">Distribution hub</div><h1>Connect PrivateDAO to your agent.</h1><p class="lead">One production MCP endpoint for verification, blockchain intelligence, market data, agent discovery and verifiable receipts.</p><section class="section"><div class="grid"><section class="panel"><h2>${clientBrandTitle("chatgpt")}</h2><p class="muted">Remote MCP/custom app setup.</p><a href="/connect/chatgpt">Connection guide →</a></section><section class="panel"><h2>${clientBrandTitle("claude")}</h2><p class="muted">Remote HTTP MCP setup.</p><a href="/connect/claude">Connection guide →</a></section><section class="panel"><h2>${clientBrandTitle("grok")}</h2><p class="muted">MCP compatibility guide.</p><a href="/connect/grok">Connection guide →</a></section><section class="panel"><h2>${clientBrandTitle("openclaw")}</h2><p class="muted">Streamable HTTP registry setup.</p><a href="/connect/openclaw">Connection guide →</a></section><section class="panel"><h2>Any MCP client</h2><p class="muted">Standard initialize, tools/list and tools/call.</p><a href="/mcp">MCP landing page →</a></section></div></section>${verifiedClientSection()}<section class="section"><div class="row"><div><h2>Production endpoint</h2><p class="muted">Transport: Streamable HTTP · Authentication: none for public discovery and free read-only tools.</p></div>${distributionCopy(endpoint,"Copy endpoint")}</div><pre>${escapeHtml(cfg)}</pre>${distributionScript()}</section><section class="section"><h2>Try before paying</h2><div class="step">Initialize and acknowledge notifications/initialized.</div><div class="step">Discover tools, then call verify_basic with a test record.</div><div class="step">For paid services, request a quote before any payment.</div><div class="step">Verify the returned receipt independently.</div></section><section class="section"><h2>Security and payment</h2><p class="muted">No wallet or secret is required for discovery and free read-only tools. Paid calls quote in USDC before execution and use Solana Mainnet USDC; target-network intelligence is read-only where applicable.</p></section>`;
  return distributionPage("Connect PrivateDAO", "Connect PrivateDAO Agent Exchange to ChatGPT, Claude, Grok, OpenClaw or any compatible MCP client.", content);
}
function clientConnectionPage(client) {
  const endpoint = mcpEndpoint();
  const cfg = JSON.stringify({ mcpServers: { "privatedao-agent-exchange": { url: endpoint, transport: "streamable-http" } } }, null, 2);
  const data = {
    chatgpt: ["ChatGPT", "Add PrivateDAO as a remote MCP/custom app where Developer Mode and your workspace plan allow it.", "Availability and admin approval depend on the ChatGPT plan and workspace. No OpenAI partnership or directory listing is claimed."],
    claude: ["Claude", "Add PrivateDAO as a remote HTTP MCP server through a supported Claude connector flow.", "Connector availability and approval controls vary by account. No Anthropic partnership or directory listing is claimed."],
    grok: ["Grok", "Use Grok's MCP connection surface when it is enabled for your account or workspace.", "PrivateDAO tested this client connection against the production MCP endpoint. This does not imply an xAI partnership or directory listing."],
    openclaw: ["OpenClaw", "Use OpenClaw's managed MCP registry with native Streamable HTTP transport.", "PrivateDAO tested this client connection against the production MCP endpoint. This does not imply an OpenClaw partnership or directory listing."],
  }[client];
  const command = `openclaw mcp set privatedao '${JSON.stringify({ url: endpoint, transport: "streamable-http" })}'`;
  const setup = client === "openclaw" ? `<h2>OpenClaw command</h2><pre>${escapeHtml(command)}</pre><p class="muted">Then run openclaw mcp doctor privatedao --probe or openclaw mcp probe privatedao --json.</p>` : `<h2>Configuration</h2><pre>${escapeHtml(cfg)}</pre>`;
  const content = `<div class="eyebrow">${data[0]} connection</div><h1>Connect PrivateDAO to ${data[0]}.</h1><p class="lead">${escapeHtml(data[1])}</p>${VERIFIED_MCP_CLIENTS.has(client) ? `<p class="client-guide-brand">${clientBrandTitle(client)} <span class="muted">PrivateDAO-tested MCP interoperability</span></p>` : ""}<section class="section"><div class="grid"><section class="panel"><h2>Endpoint</h2><pre>${escapeHtml(endpoint)}</pre><p class="muted">Transport: <strong>streamable-http</strong><br>Authentication: none for public discovery and free read-only tools.</p>${distributionCopy(endpoint,"Copy endpoint")}</section><section class="panel"><h2>Security and payment</h2><p class="muted">Never paste a private key into an MCP client. Paid tools return a quote first and require finalized Solana Mainnet USDC payment proof.</p><span class="badge">No payment made by this guide</span></section></div></section><section class="section"><h2>Setup</h2><div class="step">Enter the endpoint in the client's remote MCP/custom server settings.</div><div class="step">Select Streamable HTTP when a transport selector is available.</div><div class="step">Refresh tools and call verify_basic first.</div>${setup}${distributionScript()}</section><section class="section"><h2>Verify</h2><div class="callout">Run initialize → notifications/initialized → tools/list → safe tools/call. Then try: list PrivateDAO tools and call verify_basic with {"record":{"claim":"${client}-connection-test"}}.</div><p class="muted">${escapeHtml(data[2])}</p></section><section class="section"><h2>Example prompts</h2><div class="grid"><section class="panel"><h3>Free</h3><p>Use PrivateDAO to verify this record and return the receipt.</p></section><section class="panel"><h3>Paid</h3><p>Get a quote for a market snapshot. Do not pay until I approve the quoted amount.</p></section></div></section>`;
  return distributionPage("Connect PrivateDAO to " + data[0], data[1], content, "/connect/" + client);
}
function mcpLandingPage() {
  const endpoint = mcpEndpoint();
  const cfg = JSON.stringify({ mcpServers: { "privatedao-agent-exchange": { url: endpoint, transport: "streamable-http" } } }, null, 2);
  const paid = SERVICES.filter((service) => service.price).slice(0, 8).map((service) => `<li>${escapeHtml(service.title)} — ${escapeHtml(String(service.price))} ${escapeHtml(service.currency || "USDC")}</li>`).join("");
  const content = `<div class="eyebrow">MCP distribution</div><h1>PrivateDAO MCP — Multi-chain Services for AI Agents</h1><p class="lead">Connect any MCP-compatible agent to one production endpoint for verification, blockchain intelligence, market data, agent discovery and verifiable receipts.</p><section class="section"><div class="row"><div><h2>Endpoint</h2><p class="muted">Streamable HTTP · public discovery · no authentication for free read-only tools</p></div>${distributionCopy(endpoint,"Copy endpoint")}</div><pre>${escapeHtml(cfg)}</pre>${distributionScript()}</section><section class="section"><h2>What you can ask</h2><div class="grid"><section class="panel"><h3>Research</h3><p>Research this token using PrivateDAO.</p></section><section class="panel"><h3>Analyze</h3><p>Analyze this wallet using PrivateDAO.</p></section><section class="panel"><h3>Market</h3><p>Get a market snapshot for this asset.</p></section><section class="panel"><h3>Verify</h3><p>Verify this PrivateDAO receipt.</p></section><section class="panel"><h3>Discover</h3><p>Find an agent capable of this task.</p></section></div></section><section class="section"><h2>Pricing and boundaries</h2><p class="muted">The catalog exposes ${SERVICES.length} production services. Free tools include basic and receipt verification. Paid services quote in USDC before execution; payment uses Solana Mainnet USDC and target-network intelligence is read-only where applicable.</p><ul>${paid}</ul></section><section class="section"><h2>Examples</h2><pre>curl https://${config.domain}/.well-known/agent-card.json; curl https://${config.domain}/api/services; POST ${endpoint} with JSON-RPC initialize, tools/list or tools/call.</pre><pre>${escapeHtml(cfg)}</pre><p class="muted">Completed jobs return machine-readable results and verifiable receipts. Discovery is not execution evidence. Do not send secrets or private keys.</p><div class="verified-client-list">${["chatgpt", "claude", "grok", "openclaw"].map((client) => `<span class="verified-client">${clientBrandTitle(client)}</span>`).join("")}</div></section>`;
  return distributionPage("PrivateDAO MCP", "PrivateDAO MCP provides multi-chain services for AI agents through one production endpoint.", content, "/mcp");
}
function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
function servicePath(serviceId) {
  return `/services/${encodeURIComponent(serviceId.replaceAll(".", "-"))}`;
}
function capabilityStatus(serviceId) {
  // Only the free verification path has a recorded production smoke result.
  // Other catalog entries remain implementation-level until an execution
  // record proves their production path independently.
  if (serviceId === "verify.basic") return "Mainnet Live";
  const service = serviceById(serviceId);
  if (service?.supportedNetworks?.some((network) => network !== "solana-mainnet-beta")) return "Mainnet Read-only";
  return "Implementation";
}
function serviceExample(service) {
  if (service.id === "transaction.simulate") return { network: "ethereum-mainnet", transaction: { to: "0x0000000000000000000000000000000000000000", data: "0x" } };
  if (service.id === "swap.quote") return { network: "solana-mainnet-beta", inputMint: "So11111111111111111111111111111111111111112", outputMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", amount: "1000000", slippageBps: 50 };
  if (service.input.includes("token identifier")) return { network: "ethereum-mainnet", asset: "0x0000000000000000000000000000000000000000" };
  if (service.input.includes("mint")) return { network: "solana-mainnet-beta", mint: "YOUR_SOLANA_MINT" };
  if (service.input.includes("wallet")) return { network: "solana-mainnet-beta", wallet: "YOUR_SOLANA_WALLET" };
  if (service.input.includes("program")) return { program: "YOUR_SOLANA_PROGRAM" };
  if (service.input.includes("receipt")) return { receipt: {}, expected_hash: "OPTIONAL_RECEIPT_HASH" };
  if (service.input.includes("capabilities")) return { capabilities: ["verification"] };
  if (service.input.includes("Agent Card")) return { campaignId: "YOUR_CAMPAIGN_ID", destination: "https://example.com/agent" };
  if (service.input.includes("structured")) return { evidence: { claim: "example" } };
  return { record: { claim: "example" } };
}
const ADDRESS_PATTERN = "^[1-9A-HJ-NP-Za-km-z]{32,88}$|^0x[0-9a-fA-F]{40}$";
const NETWORK_SCHEMA = (service) => ({
  type: "string",
  enum: service.supportedNetworks || ["solana-mainnet-beta"],
  description: "Target network for this read-only capability.",
});
function subjectSchema(service, subjectDescription = "Asset, token, contract, program or wallet subject") {
  return {
    type: "object",
    properties: {
      network: NETWORK_SCHEMA(service),
      asset: { type: "string", pattern: ADDRESS_PATTERN, description: subjectDescription },
      mint: { type: "string", pattern: ADDRESS_PATTERN, description: "Solana mint alias." },
      token: { type: "string", pattern: ADDRESS_PATTERN, description: "Token address alias." },
      contract: { type: "string", pattern: ADDRESS_PATTERN, description: "Contract address alias." },
      program: { type: "string", pattern: ADDRESS_PATTERN, description: "Solana program address alias." },
      address: { type: "string", pattern: ADDRESS_PATTERN, description: "Subject address alias." },
    },
    required: ["network"],
    anyOf: [{ required: ["asset"] }, { required: ["mint"] }, { required: ["token"] }, { required: ["contract"] }, { required: ["program"] }, { required: ["address"] }],
    additionalProperties: false,
  };
}
function walletSchema(service) {
  return {
    type: "object",
    properties: {
      network: NETWORK_SCHEMA(service),
      wallet: { type: "string", pattern: ADDRESS_PATTERN },
      address: { type: "string", pattern: ADDRESS_PATTERN },
    },
    required: ["network"],
    anyOf: [{ required: ["wallet"] }, { required: ["address"] }],
    additionalProperties: false,
  };
}
function transactionSchema(service) {
  const simulation = service.id === "transaction.simulate";
  return {
    type: "object",
    properties: {
      network: NETWORK_SCHEMA(service),
      transaction: { type: ["object", "string"], description: "Unsigned transaction or serialized transaction data." },
      unsignedTransaction: { type: "string", description: "Serialized unsigned transaction data." },
      serializedTransaction: { type: "string" },
      hash: { type: "string" },
      signature: { type: "string" },
    },
    required: ["network"],
    anyOf: simulation
      ? [{ required: ["transaction"] }, { required: ["unsignedTransaction"] }, { required: ["serializedTransaction"] }]
      : [{ required: ["transaction"] }, { required: ["unsignedTransaction"] }, { required: ["serializedTransaction"] }, { required: ["hash"] }, { required: ["signature"] }],
    additionalProperties: false,
  };
}
function serviceInputSchema(service) {
  const id = service.id;
  if (id === "github.repository") return {
    type: "object",
    properties: { repository: { type: "string", format: "uri", pattern: "^https://github\\.com/" }, repo: { type: "string" } },
    anyOf: [{ required: ["repository"] }, { required: ["repo"] }],
    additionalProperties: false,
  };
  if (["token.intelligence", "risk.score", "market.snapshot", "research.asset", "contract.explain"].includes(id)) return subjectSchema(service);
  if (id === "contract.inspect") return {
    type: "object",
    properties: {
      program: { type: "string", pattern: ADDRESS_PATTERN, description: "Solana program address." },
      address: { type: "string", pattern: ADDRESS_PATTERN, description: "Alias for program." },
    },
    anyOf: [{ required: ["program"] }, { required: ["address"] }],
    additionalProperties: false,
  };
  if (id === "launch.check") return {
    type: "object",
    properties: {
      mint: { type: "string", pattern: ADDRESS_PATTERN, description: "Solana mint address." },
      asset: { type: "string", pattern: ADDRESS_PATTERN, description: "Alias for mint." },
    },
    anyOf: [{ required: ["mint"] }, { required: ["asset"] }],
    additionalProperties: false,
  };
  if (["wallet.intelligence", "research.wallet"].includes(id)) return walletSchema(service);
  if (["anomaly.detect", "agent.research.report"].includes(id)) return subjectSchema(service, "Asset or wallet subject for analysis");
  if (id === "portfolio.intelligence") return {
    type: "object",
    properties: { network: NETWORK_SCHEMA(service), assets: { type: "array", minItems: 1, maxItems: 10, items: { type: "string", pattern: ADDRESS_PATTERN } } },
    required: ["network", "assets"],
    additionalProperties: false,
  };
  if (["transaction.simulate", "transaction.explain"].includes(id)) return transactionSchema(service);
  if (id === "swap.quote") return {
    type: "object",
    properties: {
      network: NETWORK_SCHEMA(service),
      inputMint: { type: "string", pattern: ADDRESS_PATTERN },
      outputMint: { type: "string", pattern: ADDRESS_PATTERN },
      amount: { type: "string", pattern: "^[0-9]+$" },
      slippageBps: { type: "integer", minimum: 1, maximum: 5000 },
    },
    required: ["network", "inputMint", "outputMint", "amount"],
    additionalProperties: false,
  };
  if (["verify.basic", "verify.deep"].includes(id)) return {
    type: "object",
    properties: {
      network: NETWORK_SCHEMA(service),
      mint: { type: "string", pattern: ADDRESS_PATTERN },
      asset: { type: "string", pattern: ADDRESS_PATTERN },
      record: { type: "object" },
      expected_digest: { type: "string" },
    },
    anyOf: [{ required: ["mint"] }, { required: ["asset"] }, { required: ["record"] }],
    additionalProperties: false,
  };
  if (id === "forensics.trace") return {
    type: "object",
    properties: { wallet: { type: "string", pattern: ADDRESS_PATTERN }, address: { type: "string", pattern: ADDRESS_PATTERN }, limit: { type: "integer", minimum: 1, maximum: 100 } },
    anyOf: [{ required: ["wallet"] }, { required: ["address"] }],
    additionalProperties: false,
  };
  if (id === "receipt.verify") return {
    type: "object",
    properties: { receipt: { type: "object" }, expected_hash: { type: "string" } },
    required: ["receipt"],
    additionalProperties: false,
  };
  if (id === "agent.match") return {
    type: "object",
    properties: { capabilities: { type: "array", items: { type: "string" }, maxItems: 32 }, network: { type: "string" } },
    required: ["capabilities"],
    additionalProperties: false,
  };
  if (id === "intelligence.synthesize") return {
    type: "object",
    properties: { evidence: { type: "object" }, requested_output: { type: "string", maxLength: 500 } },
    required: ["evidence"],
    additionalProperties: false,
  };
  if (id === "decision.context") return { type: "object", properties: { evidence: { type: "object" } }, required: ["evidence"], additionalProperties: false };
  if (id === "game.tool") return { type: "object", properties: { world: { type: "string", maxLength: 40 }, tool: { type: "string", enum: ["privacy-lens", "verification-scanner", "hoverboard"] } }, required: ["tool"], additionalProperties: false };
  if (id === "sponsored.discovery") return { type: "object", properties: { campaignId: { type: "string" }, destination: { type: "string", format: "uri" }, subject: { type: "string" }, targetCapabilities: { type: "array", items: { type: "string" } }, targetChains: { type: "array", items: { type: "string" } }, tags: { type: "array", items: { type: "string" } }, start: { type: "string", format: "date-time" }, expiry: { type: "string", format: "date-time" } }, required: ["campaignId", "destination"], additionalProperties: false };
  return { type: "object", additionalProperties: true, description: "Service-specific JSON input." };
}
function serviceManifest(service) {
  const inputSchema = serviceInputSchema(service);
  const details = serviceDetails(service);
  return {
    ...service,
    ...details,
    free: service.access === "free",
    status: capabilityStatus(service.id),
    public_url: `https://${config.domain}${servicePath(service.id)}`,
    payment_network: "solana-mainnet-beta",
    supported_target_networks: service.supportedNetworks || ["solana-mainnet-beta"],
    input_schema: inputSchema,
    input_requirements: {
      required: inputSchema.required || [],
      alternatives: inputSchema.anyOf?.map((branch) => branch.required || []) || [],
      optional: Object.keys(inputSchema.properties || {}).filter((key) => !(inputSchema.required || []).includes(key)),
    },
    output_schema: { type: "object", description: service.output },
    payment: service.access === "free"
      ? { required: false, price: 0, currency: service.currency, flow: "execute_immediately" }
      : { required: true, price: service.price, currency: service.currency, flow: "quote_then_finalized_solana_payment_then_execute" },
    runtime: {
      status: capabilityStatus(service.id),
      target_networks: service.supportedNetworks || ["solana-mainnet-beta"],
      payment_network: "solana-mainnet-beta",
      read_only_execution: true,
      kernel_routing: { status: "not_claimed", note: "This Lambda uses its explicit read-only provider boundary; PrivateDAO Kernel routes are documented separately when applicable." },
    },
    estimated_completion_behavior: service.access === "free" ? "immediate_read_only" : "payment_required_then_read_only_execution",
  };
}
function validateServiceInput(serviceId, input = {}) {
  const service = serviceById(serviceId);
  if (!service) throw new Error("unknown service");
  if (serviceId === "intelligence.synthesize" && !config.intelInferenceUrl && ibmProviderStatus(config).status !== "configured") {
    throw Object.assign(new Error("No inference provider is configured"), { statusCode: 503 });
  }
  if (serviceId === "github.repository") {
    const repository = String(input.repository || input.repo || "");
    if (!/^https:\/\/github\.com\/[A-Za-z0-9_.-]{1,100}\/[A-Za-z0-9_.-]{1,100}\/?$/.test(repository))
      throw new Error("public GitHub repository URL is required");
    return;
  }
  const network = input.network == null ? "" : normalizeNetworkId(input.network);
  if (service.supportedNetworks?.length && !service.supportedNetworks.includes(network))
    throw new Error(`${serviceId} is not supported on ${network || "this network"}`);
  const solana = /^[1-9A-HJ-NP-Za-km-z]{32,88}$/;
  const evm = /^0x[0-9a-fA-F]{40}$/;
  const isEvm = ["ethereum-mainnet", "base-mainnet", "arbitrum-mainnet"].includes(network);
  if (isEvm && !isEvmServiceSupported(serviceId) && !["research.asset", "research.wallet", "contract.explain", "transaction.explain", "anomaly.detect", "agent.research.report", "portfolio.intelligence", "market.snapshot"].includes(serviceId))
    throw new Error(`${serviceId} is not implemented on ${network}`);
  const subject = input.asset || input.mint || input.token || input.contract || input.program || input.address || input.wallet;
  const addressValid = isEvm ? evm.test(String(subject || "")) : solana.test(String(subject || ""));
  if (["token.intelligence", "risk.score", "market.snapshot", "research.asset", "contract.explain"].includes(serviceId) && !addressValid)
    throw new Error(isEvm ? "valid EVM asset address is required" : "valid Solana asset address is required");
  if (["wallet.intelligence", "research.wallet"].includes(serviceId))
    if (!(isEvm ? evm.test(String(input.wallet || input.address || "")) : solana.test(String(input.wallet || input.address || ""))))
      throw new Error(isEvm ? "valid EVM wallet address is required" : "valid Solana wallet address is required");
  if (["anomaly.detect", "agent.research.report"].includes(serviceId) && !addressValid)
    throw new Error("valid asset or wallet subject is required");
  if (serviceId === "portfolio.intelligence") {
    if (!Array.isArray(input.assets) || input.assets.length < 1 || input.assets.length > 10)
      throw new Error("assets must contain between 1 and 10 identifiers");
    if (input.assets.some((asset) => !(isEvm ? evm.test(String(asset)) : solana.test(String(asset)))))
      throw new Error(isEvm ? "all portfolio assets must be valid EVM addresses" : "all portfolio assets must be valid Solana addresses");
  }
  if (serviceId === "transaction.simulate" && !input.transaction && !input.unsignedTransaction && !input.serializedTransaction)
    throw new Error("unsigned transaction data is required for simulation");
  if (serviceId === "transaction.explain" && !input.transaction && !input.unsignedTransaction && !input.serializedTransaction && !input.hash && !input.signature)
    throw new Error("transaction data or transaction hash is required");
}
function languageWidget() {
  return `<label id="pdao-language-picker" title="Change language" aria-label="Change language"><span aria-hidden="true">🌐</span><select aria-label="Language"><option value="en">English</option><option value="ar">العربية</option><option value="ru">Русский</option><option value="uk">Українська</option><option value="pl">Polski</option><option value="hi">हिन्दी</option><option value="ko">한국어</option><option value="es">Español</option><option value="it">Italiano</option></select></label><style>#pdao-language-picker{position:fixed;right:18px;bottom:18px;z-index:20;display:inline-flex;align-items:center;gap:6px;border:1px solid #dbe5ef;border-radius:999px;background:#fff;color:#071a32;padding:8px 11px;box-shadow:0 8px 24px rgba(7,26,50,.12);font:700 12px system-ui}#pdao-language-picker select{border:0;background:transparent;color:#071a32;font:700 12px system-ui;outline:none;cursor:pointer}#pdao-language-picker:hover{border-color:#1769e0;color:#1769e0}</style><script>(function(){const picker=document.querySelector("#pdao-language-picker select");if(!picker)return;const pairs={"Marketplace":"السوق","Build":"التكامل","Agent Card":"بطاقة الوكيل","Connect an agent":"اربط وكيلًا","Browse capabilities":"استعرض القدرات","Explore services":"استعرض الخدمات","Try verification":"جرّب التحقق","PrivateDAO Agents":"وكلاء PrivateDAO","OpenAPI":"OpenAPI","MCP":"MCP","A2A":"A2A"};const query=new URLSearchParams(location.search);const initial=query.get("lang");if(initial&&["en","ar","ru","uk","pl","hi","ko","es","it"].includes(initial))picker.value=initial;function translate(arabic){document.documentElement.lang=arabic?"ar":"en";document.documentElement.dir=arabic?"rtl":"ltr";document.querySelectorAll("body *").forEach(function(el){if(el.tagName==="SCRIPT"||el.tagName==="STYLE"||el.children.length||el.childNodes.length!==1)return;const node=el.firstChild;if(node.nodeType!==3)return;const value=node.nodeValue.trim();if(!value)return;if(!el.dataset.pdaoEn)el.dataset.pdaoEn=value;node.nodeValue=arabic?(pairs[value]||value):el.dataset.pdaoEn;});}picker.addEventListener("change",function(){const locale=picker.value;try{localStorage.setItem("privatedao.locale",locale);localStorage.setItem("privatedao.locale.explicit","1");}catch(error){}if(locale==="ar"||locale==="en"){translate(locale==="ar");return;}location.href="https://privatedao.org/?lang="+encodeURIComponent(locale);});})();</script>`;
}
function injectLanguageWidget(html) {
  return html
    .replaceAll('href="/"', 'href="https://privatedao.org/?lang=en"')
    .replace("</body>", `${languageWidget()}</body>`);
}
function serviceDetailPage(service) {
  const status = capabilityStatus(service.id);
  const example = JSON.stringify({ service_id: service.id, input: serviceExample(service) }, null, 2);
  const supported = service.supportedNetworks?.length ? service.supportedNetworks.join(", ") : status === "Mainnet Live" ? "solana-mainnet-beta" : "Solana Mainnet path";
  return injectLanguageWidget(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(service.title)} | PrivateDAO Agents</title><meta name="description" content="${escapeHtml(service.output)} through the PrivateDAO Agent Exchange."><link rel="canonical" href="https://${config.domain}${servicePath(service.id)}"><meta property="og:title" content="${escapeHtml(service.title)} | PrivateDAO Agents"><meta property="og:description" content="${escapeHtml(service.output)} through the PrivateDAO Agent Exchange."><meta property="og:url" content="https://${config.domain}${servicePath(service.id)}"><style>:root{--ink:#071a32;--muted:#52657b;--line:#dbe5ef;--blue:#1769e0;--pale:#f5f9ff}*{box-sizing:border-box}body{margin:0;background:#fff;color:var(--ink);font-family:Inter,system-ui,sans-serif;line-height:1.55}main{max-width:1000px;margin:auto;padding:26px 24px 72px}header{display:flex;justify-content:space-between;gap:20px;padding-bottom:70px}.brand,a{color:var(--blue);font-weight:750;text-decoration:none}.brand{color:var(--ink);font-weight:850}.nav{display:flex;gap:18px;color:var(--muted);font-size:.9rem}.nav a{color:var(--muted)}.eyebrow{color:var(--blue);font-size:.72rem;font-weight:800;letter-spacing:.12em;text-transform:uppercase}h1{font-size:clamp(2.7rem,7vw,5.8rem);line-height:.95;letter-spacing:-.06em;max-width:760px;margin:14px 0 18px}.lead{max-width:700px;color:var(--muted);font-size:1.15rem}.meta{display:flex;flex-wrap:wrap;gap:9px;margin:26px 0}.pill{border:1px solid var(--line);border-radius:999px;padding:8px 12px;background:var(--pale);font-size:.86rem;font-weight:700}.live{color:#087f5b}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;margin-top:42px}.panel{border:1px solid var(--line);border-radius:16px;padding:20px;box-shadow:0 10px 25px rgba(14,42,78,.05)}.panel h2{margin-top:0;font-size:1.2rem}.muted{color:var(--muted)}pre{overflow:auto;background:#f5f9ff;border:1px solid var(--line);border-radius:12px;padding:14px;font-size:12px}.button{display:inline-flex;background:var(--ink);color:#fff;border-radius:999px;padding:12px 18px;margin-top:18px}@media(max-width:700px){main{padding:20px 16px 56px}header{padding-bottom:45px}.nav{gap:10px;font-size:.78rem}.grid{grid-template-columns:1fr}h1{font-size:clamp(3rem,15vw,5.4rem)}}</style></head><body><main><header><a class="brand" href="/">PrivateDAO Agents</a><nav class="nav"><a href="/marketplace">Marketplace</a><a href="/connect">Build</a><a href="/.well-known/agent-card.json">Agent Card</a></nav></header><p class="eyebrow">Service capability</p><h1>${escapeHtml(service.title)}</h1><p class="lead">${escapeHtml(service.output)}. Use the service through a structured request and receive a receipt for the completed result.</p><div class="meta"><span class="pill ${status === "Mainnet Live" ? "live" : ""}">${escapeHtml(status)}</span><span class="pill">${escapeHtml(service.access === "free" ? "Free" : `${service.price} ${service.currency}`)}</span><span class="pill">${escapeHtml(supported)}</span></div><div class="grid"><section class="panel"><h2>What you provide</h2><p>${escapeHtml(service.input)}</p><h2>What happens</h2><p class="muted">PrivateDAO validates the request, runs the capability within its execution boundary, and returns a machine-readable result with a receipt when completed.</p></section><section class="panel"><h2>What you receive</h2><p>${escapeHtml(service.output)}</p><p class="muted">No claim is made beyond the evidence available for this capability and network.</p></section></div><section class="panel" style="margin-top:14px"><h2>API example</h2><pre>${escapeHtml(`curl -X POST https://${config.domain}/api/jobs -H 'content-type: application/json' -d '${example.replaceAll("'", "\\'")}'`)}</pre><a class="button" href="/connect#${escapeHtml(service.id)}">Run this service <span aria-hidden="true">→</span></a></section></main></body></html>`);
}
function publicReceiptPage(receipt, verified = false) {
  const rows = [
    ["Receipt ID", receipt.receipt_id],
    ["Service", receipt.service],
    ["Status", receipt.status],
    ["Created", receipt.created_at],
    ["Completed", receipt.completed_at],
    ["Network", receipt.network],
    ["Receipt digest", receipt.receipt_id],
    ["Evidence hash", receipt.evidence_hash],
    ...(receipt.payment_signature ? [["Payment reference", receipt.payment_signature]] : []),
  ].filter(([, value]) => value != null);
  const details = rows.map(([label, value]) => `<div class="row"><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`).join("");
  return injectLanguageWidget(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${verified ? "Verified receipt" : "Receipt"} | PrivateDAO Agents</title><meta name="description" content="Publicly inspectable PrivateDAO Agent Exchange receipt."><link rel="canonical" href="https://${config.domain}/verify/receipt/${encodeURIComponent(receipt.receipt_id)}"><style>:root{--ink:#071a32;--muted:#52657b;--line:#dbe5ef;--blue:#1769e0;--pale:#f5f9ff;--green:#087f5b}*{box-sizing:border-box}body{margin:0;background:#fff;color:var(--ink);font-family:Inter,system-ui,sans-serif;line-height:1.55}main{max-width:860px;margin:auto;padding:28px 24px 72px}header{display:flex;justify-content:space-between;padding-bottom:76px}.brand{color:var(--ink);font-weight:850;text-decoration:none}.nav{display:flex;gap:18px}.nav a,a{color:var(--blue);font-weight:750;text-decoration:none}.eyebrow{color:var(--blue);font-size:.72rem;font-weight:800;letter-spacing:.12em;text-transform:uppercase}h1{font-size:clamp(2.7rem,7vw,5.5rem);line-height:.95;letter-spacing:-.06em;margin:14px 0}.verified{display:inline-flex;border:1px solid #a9decf;border-radius:999px;background:#effbf7;color:var(--green);padding:8px 13px;font-weight:800}.panel{margin-top:32px;border:1px solid var(--line);border-radius:16px;padding:20px;box-shadow:0 10px 25px rgba(14,42,78,.05)}dl{margin:0}.row{display:grid;grid-template-columns:180px 1fr;gap:20px;border-bottom:1px solid var(--line);padding:13px 0}.row:last-child{border-bottom:0}.row dt{font-weight:750;color:var(--muted)}.row dd{margin:0;overflow-wrap:anywhere;font-family:ui-monospace,monospace;font-size:.84rem}.actions{display:flex;gap:14px;flex-wrap:wrap;margin-top:22px}.button{display:inline-flex;background:var(--ink);color:#fff;border-radius:999px;padding:12px 18px}.muted{color:var(--muted)}@media(max-width:650px){main{padding:20px 16px 56px}header{padding-bottom:45px}.nav{gap:10px;font-size:.8rem}.row{grid-template-columns:1fr;gap:4px}}</style></head><body><main><header><a class="brand" href="/">PrivateDAO Agents</a><nav class="nav"><a href="/marketplace">Marketplace</a><a href="/connect">Build</a></nav></header><p class="eyebrow">Public evidence</p><h1>${verified ? "Receipt verified." : "Job receipt."}</h1><span class="verified">✓ ${escapeHtml(receipt.status || "VERIFIED")}</span><section class="panel"><dl>${details}</dl></section><p class="muted">This page exposes receipt metadata and hashes only. It does not expose submitted inputs, private witnesses, secrets or confidential workflow data.</p><div class="actions"><a class="button" href="/verify/receipt/${encodeURIComponent(receipt.receipt_id)}">Verify receipt</a><a href="/api/receipts/${encodeURIComponent(receipt.receipt_id)}">View machine receipt</a></div></main></body></html>`);
}
async function marketplacePage() {
  const policy = await marketplacePolicy();
  const grouped = SERVICE_CATEGORIES.map((category) => ({ ...category, services: SERVICES.filter((service) => serviceDetails(service).category === category.id) })).filter((category) => category.services.length);
  const cards = grouped.map((category) => {
    const serviceCards = category.services.map((service) => {
      const details = serviceDetails(service);
      const price = service.access === "free" ? "Free to try" : `${service.price} ${service.currency}`;
      const networks = (service.supportedNetworks || ["Solana Mainnet"]).map((network) => network.replaceAll("-mainnet", "").replaceAll("-", " ")).join(", ");
      return `<article class="card"><div class="card-top"><div class="tag">${escapeHtml(service.access === "free" ? "Free" : "Paid")}</div><span class="price">${escapeHtml(price)}</span></div><h3>${escapeHtml(service.title)}</h3><p>${escapeHtml(details.summary)}</p><p class="value">${escapeHtml(details.customer_value)}</p><dl><div><dt>For</dt><dd>${escapeHtml(service.input)}</dd></div><div><dt>Works on</dt><dd>${escapeHtml(networks)}</dd></div></dl><a class="action" href="${servicePath(service.id)}">View capability <span aria-hidden="true">→</span></a></article>`;
    }).join("");
    return `<section class="category"><div class="category-head"><div><p class="eyebrow">${escapeHtml(category.id)}</p><h2>${escapeHtml(category.id)}</h2></div><p>${escapeHtml(category.description)}</p></div><div class="grid">${serviceCards}</div></section>`;
  }).join("");
  const terms = `<article class="integration"><div class="eyebrow">Seller Marketplace</div><h3>List, execute, promote</h3><strong>Listing fee: $${escapeHtml(String(policy.listing_fee_usd))} one time · up to ${escapeHtml(String(policy.max_services_per_seller))} services</strong><p>Platform fee: ${escapeHtml(String(policy.platform_fee_bps / 100))}% per paid execution</p><small>Featured Listing: $${escapeHtml(String(policy.promotion_packages.featured_listing.price_usd))} · Ecosystem Campaign: $${escapeHtml(String(policy.promotion_packages.ecosystem_campaign.price_usd))}. Final terms are quote-first and shown before payment.</small></article>`;
  const integrations = integrationDirectory().map(integrationCard).join("") + terms;
  return injectLanguageWidget(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Agent Marketplace | PrivateDAO</title><meta name="description" content="Discover PrivateDAO services for verification, evidence and agent workflows."><style>
:root{color-scheme:light;--ink:#081b33;--muted:#52657c;--line:#dbe5f0;--blue:#1769e0;--pale:#f5f9ff;--green:#087f5b}*{box-sizing:border-box}body{margin:0;font-family:Inter,ui-sans-serif,system-ui,-apple-system,sans-serif;color:var(--ink);background:#fff;line-height:1.5}main{max-width:1180px;margin:0 auto;padding:28px 24px 72px}header{display:flex;align-items:center;justify-content:space-between;gap:20px;padding-bottom:76px}header a{color:var(--ink);text-decoration:none;font-weight:700}.brand{display:flex;align-items:center;gap:10px}.mark{width:28px;height:28px;border:2px solid var(--blue);border-radius:9px;display:grid;place-items:center;color:var(--blue);font-weight:900}.nav{display:flex;gap:18px;color:var(--muted);font-size:.93rem}.nav a{color:var(--muted)}.eyebrow{color:var(--blue);font-size:.76rem;font-weight:800;letter-spacing:.12em;text-transform:uppercase}.hero h1{font-size:clamp(2.8rem,7vw,5.8rem);line-height:.98;letter-spacing:-.055em;max-width:820px;margin:16px 0 22px}.hero h1 span{color:var(--blue)}.intro{max-width:660px;color:var(--muted);font-size:1.15rem}.hero{display:flex;justify-content:space-between;gap:40px;align-items:end;margin-bottom:62px}.hero-copy{flex:1}.hero-note{max-width:280px;border-left:3px solid var(--blue);padding:6px 0 6px 18px;color:var(--muted)}.actions{display:flex;gap:12px;flex-wrap:wrap;margin-top:28px}.button,.action{display:inline-flex;align-items:center;justify-content:space-between;gap:14px;border-radius:999px;padding:12px 18px;text-decoration:none;font-weight:750}.button{background:var(--ink);color:#fff}.button.alt{background:var(--pale);color:var(--ink);border:1px solid var(--line)}.section-head,.category-head{display:flex;justify-content:space-between;align-items:end;gap:20px;margin:0 0 18px}.section-head p,.category-head>p{color:var(--muted);margin:0}.category{border-top:1px solid var(--line);padding-top:28px;margin-top:34px}.category-head h2{margin:4px 0 0;font-size:1.8rem}.category-head>p{max-width:470px}.grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}.card{border:1px solid var(--line);border-radius:18px;padding:22px;background:#fff;min-height:290px;display:flex;flex-direction:column;box-shadow:0 10px 30px rgba(14,42,78,.05)}.card:hover,.integration:hover{border-color:#9ebeea;box-shadow:0 16px 34px rgba(14,42,78,.1)}.card-top{display:flex;align-items:center;justify-content:space-between;gap:10px}.tag{color:var(--blue);font-size:.72rem;font-weight:800;letter-spacing:.1em;text-transform:uppercase}.price{font-size:.8rem;font-weight:800;color:var(--green)}.card h3{font-size:1.24rem;margin:10px 0 8px}.card p{color:var(--muted);margin:0 0 12px}.card .value{color:var(--green);font-size:.88rem;font-weight:700}.card dl{border-top:1px solid var(--line);margin:5px 0 0;padding-top:12px;display:grid;gap:8px;color:var(--muted);font-size:.84rem}.card dl div{display:flex;justify-content:space-between;gap:12px}.card dt{font-weight:700}.card dd{margin:0;text-align:right;text-transform:capitalize}.action{margin-top:auto;padding:10px 0 0;color:var(--blue)}.integrations{border-top:1px solid var(--line);margin-top:64px;padding-top:28px}.integration-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}.integration{border:1px solid var(--line);border-radius:16px;padding:18px;background:var(--pale)}.integration h3{margin:5px 0}.integration strong{display:block;color:var(--ink)}.integration p{margin:8px 0;color:var(--green);font-weight:700}.integration small{display:block;color:var(--muted)}footer{border-top:1px solid var(--line);margin-top:58px;padding-top:20px;color:var(--muted);font-size:.9rem;display:flex;justify-content:space-between;gap:20px}footer a{color:var(--blue)}@media(max-width:760px){main{padding:20px 16px 48px}header{padding-bottom:48px}.nav{gap:10px;font-size:.8rem}.hero{display:block}.hero-note{margin-top:28px}.grid,.integration-grid{grid-template-columns:1fr}.category-head{display:block}.category-head>p{margin-top:8px}h1{font-size:clamp(3rem,16vw,5rem)}footer{display:block}footer p{margin:6px 0}}
</style></head><body><main><header><a class="brand" href="/"><span class="mark">P</span><span>PrivateDAO</span></a><nav class="nav" aria-label="Primary"><a href="/connect">Build with agents</a><a href="/.well-known/agent-card.json">Agent Card</a><a href="https://privatedao.org/?lang=en" rel="noreferrer">PrivateDAO</a></nav></header><section class="hero"><div class="hero-copy"><div class="eyebrow">PrivateDAO Agent Exchange</div><h1>Services for agents.<br><span>Evidence for decisions.</span></h1><p class="intro">Discover, request and verify services for AI agents. Start with a free proof, then pay only when a deeper result is useful.</p><div class="actions"><a class="button" href="/connect">Connect an agent <span aria-hidden="true">→</span></a><a class="button alt" href="/api/services">View service API <span aria-hidden="true">↗</span></a></div></div><p class="hero-note"><strong>DISCOVER → REQUEST → EXECUTE → PAY → VERIFY</strong><br><br>Solana Mainnet payment rail<br>Finalized evidence receipts</p></section><section><div class="section-head"><div><div class="eyebrow">Service catalog</div><h2>Choose a capability</h2></div><p>Simple for people. Precise for machines. Every completed job returns a verifiable receipt.</p></div>${cards}</section><section class="integrations"><div class="section-head"><div><div class="eyebrow">Connected ecosystem</div><h2>Built to work across the agent economy.</h2></div><p>Enterprise AI, developer infrastructure and tested agent clients around one exchange.</p></div><div class="integration-grid">${integrations}</div></section><footer><span>PrivateDAO Agent Exchange</span><span><a href="/connect">Connect</a> · <a href="/openapi.json">OpenAPI</a> · <a href="/mcp">MCP</a> · <a href="/api/integrations">Integrations</a></span></footer></main></body></html>`);
}
function integrationPage() {
  const cards = integrationDirectory().map(integrationCard).join("");
  return distributionPage("Connected Ecosystem", "Recognizable ecosystem partners and MCP clients around PrivateDAO Agent Exchange.", `<div class="eyebrow">Connected ecosystem</div><h1>Recognize the stack at a glance.</h1><p class="lead">Enterprise AI, data infrastructure, developer tooling and MCP clients connected around one commercial exchange.</p><section class="section"><div class="grid">${cards}</div></section><section class="section"><div class="eyebrow">GitHub App</div><h2>Connect repository context</h2><p class="muted">Install the PrivateDAO GitHub App, then request read-only repository context through the verified installation boundary.</p><p><a href="/github/setup">Open GitHub connection →</a></p></section>${verifiedClientSection()}<section class="section"><p class="muted">Statuses describe the current PrivateDAO relationship or interoperability evidence. A logo identifies a platform; it does not imply endorsement or partnership.</p><p><a href="/api/integrations">Machine-readable integration directory →</a></p></section>`, "/integrations");
}
function agentHomePage() {
  const free = SERVICES.filter((service) => service.access === "free");
  const paid = SERVICES.filter((service) => service.access === "paid");
  const serviceCards = [
    {
      eyebrow: "Start here",
      title: "Verify an answer",
      copy: "Run a free evidence check and receive a receipt that can be inspected independently.",
      services: free.map((service) => service.title).join(" · "),
      href: "/connect",
      label: "Try verification",
    },
    {
      eyebrow: "Intelligence",
      title: "Investigate with evidence",
      copy: "Use bounded intelligence services when an agent needs more context before making a decision.",
      services: paid.filter((service) => service.id !== "agent.match" && service.id !== "sponsored.discovery" && service.id !== "intelligence.synthesize").slice(0, 6).map((service) => service.title).join(" · "),
      href: "/marketplace",
      label: "Explore services",
    },
    {
      eyebrow: "Agent workflows",
      title: "Find and coordinate providers",
      copy: "Discover capabilities, match agents, and keep the resulting workflow tied to evidence.",
      services: paid.filter((service) => ["agent.match", "sponsored.discovery", "intelligence.synthesize"].includes(service.id)).map((service) => service.title).join(" · "),
      href: "/connect",
      label: "Connect an agent",
    },
  ];
  const programBadge = `<article class="product" aria-label="IBM watsonx integration path"><p class="eyebrow">Enterprise AI integration</p><h2>IBM watsonx</h2><p>Optional provider path for agent workflows.</p><p class="service-list">Available only when configured and healthy.</p></article>`;
  const cards = programBadge + serviceCards.map((card) => `<article class="product"><p class="eyebrow">${escapeHtml(card.eyebrow)}</p><h2>${escapeHtml(card.title)}</h2><p>${escapeHtml(card.copy)}</p><p class="service-list">${escapeHtml(card.services)}</p><a href="${card.href}" class="text-link">${escapeHtml(card.label)} <span aria-hidden="true">→</span></a></article>`).join("");
  const structuredData = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "PrivateDAO Agent Exchange",
    url: `https://${config.domain}/`,
    publisher: { "@type": "Organization", name: "PrivateDAO", url: "https://privatedao.org" },
  }).replaceAll("<", "\\u003c");
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>PrivateDAO Agents | Evidence for decisions</title><meta name="description" content="PrivateDAO Agents connects autonomous systems to verification, intelligence and workflow services with evidence-bound results."><link rel="canonical" href="https://${config.domain}/"><meta property="og:type" content="website"><meta property="og:site_name" content="PrivateDAO"><meta property="og:title" content="PrivateDAO Agents | Evidence for decisions"><meta property="og:description" content="Discover agent services for verification, intelligence and coordinated workflows."><meta property="og:url" content="https://${config.domain}/"><meta name="twitter:card" content="summary"><meta name="twitter:title" content="PrivateDAO Agents"><meta name="twitter:description" content="Evidence-bound services for autonomous systems."><script type="application/ld+json">${structuredData}</script><style>
:root{color-scheme:light;--ink:#071a32;--muted:#52657b;--line:#dbe5ef;--blue:#1769e0;--blue-dark:#0b3f99;--pale:#f5f9ff;--green:#087f5b}*{box-sizing:border-box}body{margin:0;background:#fff;color:var(--ink);font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;line-height:1.55}main{max-width:1180px;margin:0 auto;padding:26px 24px 72px}header{display:flex;align-items:center;justify-content:space-between;gap:24px;padding-bottom:88px}.brand{display:flex;align-items:center;gap:10px;color:var(--ink);font-weight:800;text-decoration:none}.mark{display:grid;place-items:center;width:30px;height:30px;border:2px solid var(--blue);border-radius:9px;color:var(--blue);font-weight:900}.nav{display:flex;gap:20px;font-size:.92rem}.nav a{color:var(--muted);text-decoration:none}.nav a:hover,.text-link:hover{color:var(--blue-dark)}.eyebrow{margin:0;color:var(--blue);font-size:.72rem;font-weight:800;letter-spacing:.12em;text-transform:uppercase}.hero{display:grid;grid-template-columns:minmax(0,1fr) 280px;align-items:end;gap:48px;margin-bottom:86px}.hero h1{max-width:820px;margin:14px 0 22px;font-size:clamp(3.2rem,8vw,7.4rem);line-height:.92;letter-spacing:-.06em}.hero h1 span{color:var(--blue)}.lead{max-width:680px;margin:0;color:var(--muted);font-size:1.18rem}.note{border-left:3px solid var(--blue);padding:8px 0 8px 18px;color:var(--muted);font-size:.95rem}.actions{display:flex;flex-wrap:wrap;gap:12px;margin-top:30px}.button{display:inline-flex;gap:14px;align-items:center;border-radius:999px;padding:12px 18px;background:var(--ink);color:#fff;text-decoration:none;font-weight:750}.button.secondary{border:1px solid var(--line);background:var(--pale);color:var(--ink)}.section{border-top:1px solid var(--line);padding-top:26px}.section-head{display:flex;justify-content:space-between;align-items:end;gap:24px;margin-bottom:18px}.section-head h2{margin:6px 0 0;font-size:clamp(1.8rem,3vw,2.6rem);letter-spacing:-.04em}.section-head p{max-width:340px;margin:0;color:var(--muted)}.grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}.product{display:flex;flex-direction:column;min-height:270px;padding:24px;border:1px solid var(--line);border-radius:18px;background:#fff;box-shadow:0 12px 30px rgba(14,42,78,.05)}.product h2{margin:10px 0 8px;font-size:1.35rem}.product>p:not(.eyebrow):not(.service-list){margin:0;color:var(--muted)}.service-list{margin:20px 0;color:var(--green);font-size:.85rem;font-weight:700}.text-link{display:inline-flex;gap:10px;margin-top:auto;color:var(--blue);font-weight:800;text-decoration:none}.how{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-top:16px}.step{padding:16px;border:1px solid var(--line);border-radius:14px;background:var(--pale)}.step strong{display:block;margin-bottom:6px}.step span{color:var(--muted);font-size:.9rem}footer{display:flex;justify-content:space-between;gap:20px;margin-top:70px;padding-top:20px;border-top:1px solid var(--line);color:var(--muted);font-size:.9rem}footer a{color:var(--blue);text-decoration:none}@media(max-width:760px){main{padding:20px 16px 50px}header{padding-bottom:54px}.nav{gap:11px;font-size:.78rem}.hero{display:block;margin-bottom:62px}.note{margin-top:30px}.hero h1{font-size:clamp(3.2rem,16vw,5.5rem)}.grid,.how{grid-template-columns:1fr}.section-head{display:block}.section-head p{margin-top:8px}footer{display:block}footer p{margin:6px 0}}
</style></head><body><main><header><a class="brand" href="/"><span class="mark">P</span><span>PrivateDAO Agents</span></a><nav class="nav" aria-label="Primary"><a href="/marketplace">Marketplace</a><a href="/connect">Build</a><a href="/.well-known/agent-card.json">Agent Card</a></nav></header><section class="hero"><div><p class="eyebrow">PrivateDAO Agent Exchange</p><h1>Evidence for<br><span>better decisions.</span></h1><p class="lead">Connect autonomous systems to practical services for verification, intelligence and coordinated workflows. Start with a free check, then pay only when a deeper result is useful.</p><div class="actions"><a class="button" href="/connect">Connect an agent <span aria-hidden="true">→</span></a><a class="button secondary" href="/marketplace">Browse capabilities</a></div></div><p class="note">Machine-native services<br>Solana Mainnet execution<br>Verifiable receipts</p></section><section class="section"><div class="section-head"><div><p class="eyebrow">What agents can do</p><h2>Choose the capability.</h2></div><p>Each completed job returns a receipt. The machine interfaces remain available for direct integration.</p></div><div class="grid">${cards}</div></section><section class="section" style="margin-top:64px"><div class="section-head"><div><p class="eyebrow">A clear path from request to evidence</p><h2>Simple for people. Precise for machines.</h2></div><p>PrivateDAO separates the human entry point from the protocols that agents use underneath.</p></div><div class="how"><div class="step"><strong>1. Discover</strong><span>Read the Agent Card or service catalog.</span></div><div class="step"><strong>2. Request</strong><span>Send a structured job to the service.</span></div><div class="step"><strong>3. Receive</strong><span>Get the result and its receipt.</span></div><div class="step"><strong>4. Verify</strong><span>Inspect the evidence independently.</span></div></div></section><footer><span>PrivateDAO Agents · part of the PrivateDAO ecosystem</span><span><a href="/openapi.json">OpenAPI</a> · <a href="/mcp">MCP</a> · <a href="/a2a">A2A</a></span></footer></main></body></html>`;
}
function commercialHomePage() {
  const categories = SERVICE_CATEGORIES.map((category) => `<article class="category"><span>${escapeHtml(category.id)}</span><h3>${escapeHtml(category.id)}</h3><p>${escapeHtml(category.description)}</p></article>`).join("");
  const integrations = integrationDirectory().map(integrationCard).join("");
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>PrivateDAO Agent Exchange | Discover. Execute. Verify.</title><meta name="description" content="PrivateDAO Agent Exchange gives AI agents commercial services for verification, intelligence, risk, transactions and coordination."><link rel="canonical" href="https://${config.domain}/"><style>:root{--ink:#071a32;--muted:#52657b;--line:#dbe5ef;--blue:#1769e0;--pale:#f5f9ff;--green:#087f5b}*{box-sizing:border-box}body{margin:0;color:var(--ink);font:16px/1.55 Inter,system-ui,sans-serif}main{max-width:1180px;margin:auto;padding:26px 24px 76px}header{display:flex;justify-content:space-between;align-items:center;gap:20px;padding-bottom:90px}.brand{color:var(--ink);font-weight:850;text-decoration:none}.nav{display:flex;gap:20px}.nav a,a{color:var(--blue);font-weight:750;text-decoration:none}.hero{display:grid;grid-template-columns:minmax(0,1fr) 310px;gap:48px;align-items:end;margin-bottom:90px}.eyebrow,.category span,.integration span{color:var(--blue);font-size:.72rem;font-weight:850;letter-spacing:.12em;text-transform:uppercase}.hero h1{font-size:clamp(3.4rem,8vw,7.5rem);line-height:.9;letter-spacing:-.07em;margin:14px 0 22px}.hero h1 em{color:var(--blue);font-style:normal}.lead{max-width:690px;color:var(--muted);font-size:1.18rem}.actions{display:flex;gap:12px;flex-wrap:wrap;margin-top:30px}.button{display:inline-flex;border-radius:999px;padding:12px 19px;background:var(--ink);color:#fff}.button.alt{background:var(--pale);color:var(--ink);border:1px solid var(--line)}.side-note{border-left:3px solid var(--blue);padding-left:18px;color:var(--muted)}.flow{display:grid;grid-template-columns:repeat(5,1fr);gap:10px;margin:18px 0 76px}.flow div{padding:16px;border:1px solid var(--line);border-radius:14px;background:var(--pale)}.flow b{display:block}.flow span{color:var(--muted);font-size:.86rem}.section{border-top:1px solid var(--line);padding-top:26px;margin-top:60px}.section h2{font-size:clamp(1.9rem,4vw,3rem);letter-spacing:-.04em;margin:0 0 10px}.section>p{color:var(--muted);max-width:620px}.category-grid,.integration-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-top:22px}.category,.integration{padding:20px;border:1px solid var(--line);border-radius:16px;background:#fff;box-shadow:0 10px 26px rgba(14,42,78,.05)}.category h3,.integration h3{margin:6px 0}.category p,.integration p,.integration small{color:var(--muted)}.integration strong{display:block}.integration p{color:var(--green);font-weight:750}.integration small{display:block}.footer{display:flex;justify-content:space-between;gap:20px;border-top:1px solid var(--line);margin-top:72px;padding-top:20px;color:var(--muted)}@media(max-width:760px){main{padding:20px 16px 56px}header{padding-bottom:52px}.nav{gap:10px;font-size:.82rem}.hero{display:block}.side-note{margin-top:30px}.flow,.category-grid,.integration-grid{grid-template-columns:1fr}.footer{display:block}}
</style></head><body><main><header><a class="brand" href="/">PrivateDAO Agent Exchange</a><nav class="nav"><a href="/marketplace">Marketplace</a><a href="/connect">Connect</a><a href="/mcp">MCP</a></nav></header><section class="hero"><div><p class="eyebrow">PrivateDAO Agent Exchange</p><h1>Services for agents.<br><em>Evidence for decisions.</em></h1><p class="lead">A commercial service layer for AI agents. Discover a capability, request the work, pay only when required, and receive evidence that can be checked independently.</p><div class="actions"><a class="button" href="/marketplace">Explore services →</a><a class="button alt" href="/connect">Connect an agent</a></div></div><p class="side-note"><strong>Free to start.</strong><br>Paid services are quote-first.<br>Payment is finalized on Solana Mainnet USDC.<br>Completed work returns a verifiable receipt.</p></section><section class="flow" aria-label="Agent Exchange lifecycle"><div><b>1. DISCOVER</b><span>Choose a capability.</span></div><div><b>2. REQUEST</b><span>Send structured input.</span></div><div><b>3. EXECUTE</b><span>Read-only evidence work.</span></div><div><b>4. PAY</b><span>Only when a quote requires it.</span></div><div><b>5. VERIFY</b><span>Inspect the receipt.</span></div></section><section class="section"><p class="eyebrow">What can an agent use?</p><h2>One exchange. Six clear service families.</h2><p>Start with verification, add intelligence and risk context, simulate transactions, or coordinate with other agents.</p><div class="category-grid">${categories}</div><p><a href="/marketplace">See every service, price and input →</a></p></section><section class="section"><p class="eyebrow">Connected ecosystem</p><h2>Enterprise AI and agent interoperability in one place.</h2><p>PrivateDAO connects commercial workflows to the tools and ecosystems agents already use, with relationship status stated clearly.</p><div class="integration-grid">${integrations}</div><p><a href="/api/integrations">View integration details →</a></p></section><section class="section"><p class="eyebrow">For autonomous agents</p><h2>Detailed enough for independent execution.</h2><p>Use the MCP endpoint to inspect the full catalog, get a task recommendation, understand payment, execute a job, retrieve a result and verify its receipt.</p><p><a href="/mcp">Open the MCP guide →</a> · <a href="/.well-known/agent-card.json">Read the Agent Card</a></p></section><footer class="footer"><span>PrivateDAO Agent Exchange · part of the PrivateDAO ecosystem</span><span><a href="/marketplace">Services</a> · <a href="/connect">Connect</a> · <a href="/openapi.json">OpenAPI</a></span></footer></main></body></html>`;
}
function paymentPage(jobId) {
  const safeJobId = JSON.stringify(jobId);
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>PrivateDAO payment</title><style>body{font-family:system-ui;max-width:560px;margin:48px auto;padding:24px;background:#080b12;color:#f4f7fb}button{padding:14px 18px;border:0;border-radius:10px;background:#14f195;color:#061016;font-weight:700;cursor:pointer}pre{white-space:pre-wrap;color:#b8c4d4}</style></head><body><h1>PrivateDAO payment</h1><p>Connect Phantom to pay securely on Solana Mainnet.</p><button id="pay">Connect Phantom and pay</button><pre id="status">Ready</pre><script type="module">
const jobId=${safeJobId},status=document.getElementById("status"),button=document.getElementById("pay");
async function run(){try{const {PublicKey,Transaction,TransactionInstruction,SystemProgram}=await import("/assets/browser/solana-web3.mjs"),spl=await import("/assets/browser/spl-token.mjs");if(!window.solana?.isPhantom)throw new Error("Phantom wallet was not detected");const wallet=await window.solana.connect(),payer=new PublicKey(wallet.publicKey.toString()),query=new URLSearchParams(location.search),sourceHint=query.get("sourceTokenAccount"),expectedPayer=query.get("payer");if(expectedPayer&&payer.toBase58()!==expectedPayer)throw new Error("Switch Phantom to the wallet that owns the USDC source account");const built=await (await fetch("/api/jobs/"+encodeURIComponent(jobId)+"/payment-transaction",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({payer:payer.toString(),sourceTokenAccount:sourceHint||undefined})})).json();if(!built.recentBlockhash)throw new Error(built.message||"payment transaction unavailable");const memoProgram=new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr"),tx=new Transaction();if(built.currency==="SOL"){tx.add(SystemProgram.transfer({fromPubkey:payer,toPubkey:new PublicKey(built.treasuryOwner),lamports:Number(built.amountBaseUnits)}));}else{if(!built.sourceTokenAccount)throw new Error(built.message||"A funded USDC token account is required");const mint=new PublicKey(built.mint),source=new PublicKey(built.sourceTokenAccount),destination=new PublicKey(built.treasuryTokenAccount),treasuryOwner=new PublicKey(built.treasuryOwner);tx.add(spl.createAssociatedTokenAccountIdempotentInstruction(payer,destination,treasuryOwner,mint,spl.TOKEN_PROGRAM_ID,spl.ASSOCIATED_TOKEN_PROGRAM_ID),spl.createTransferCheckedInstruction(source,mint,destination,payer,BigInt(built.amountBaseUnits),6,[],spl.TOKEN_PROGRAM_ID));}tx.add(new TransactionInstruction({programId:memoProgram,keys:[{pubkey:payer,isSigner:true,isWritable:false}],data:new TextEncoder().encode(built.paymentReference)}));tx.feePayer=payer;tx.recentBlockhash=built.recentBlockhash;const sent=await window.solana.signAndSendTransaction(tx);status.textContent="Transaction sent. Waiting for finality...";let result;for(let i=0;i<20;i++){result=await (await fetch("/api/jobs/"+encodeURIComponent(jobId)+"/payment",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({signature:sent.signature})})).json();if(result.receipt||result.status==="completed")break;await new Promise(r=>setTimeout(r,3000));}status.textContent=JSON.stringify({...result,signature:sent.signature},null,2);}catch(error){status.textContent=error.message||String(error);}}button.onclick=run;
</script></body></html>`;
}

function partnershipPaymentPage(id) {
  const safeId = JSON.stringify(id);
  return [
    "<!doctype html><html lang=\"en\"><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><title>Featured Partner payment | PrivateDAO</title><style>body{font-family:system-ui,sans-serif;max-width:620px;margin:42px auto;padding:24px;color:#081b33}button{padding:13px 18px;border:0;border-radius:10px;background:#1769e0;color:#fff;font-weight:800;cursor:pointer}pre{white-space:pre-wrap;background:#f5f9ff;padding:16px;border-radius:12px}</style></head><body><p><a href=\"/partners\">← Featured Partners</a></p><h1>Become a Featured Partner</h1><p>This is a real Solana Mainnet USDC payment. MCP verification and technical access are independent of sponsorship.</p><button id=\"pay\">Connect wallet and pay $100 USDC</button><pre id=\"status\">Ready</pre><script>",
    "const campaignId=" + safeId + ",status=document.getElementById(\"status\"),button=document.getElementById(\"pay\");button.textContent=\"Connect wallet and pay quoted amount\";",
    "async function run(){try{const intent=await (await fetch(\"/api/partnerships/\"+encodeURIComponent(campaignId)+\"/payment-intent\")).json();if(intent.status===\"paid\"){status.textContent=\"This campaign is already paid.\";return;}const web3=await import(\"/assets/browser/solana-web3.mjs\"),spl=await import(\"/assets/browser/spl-token.mjs\");if(!window.solana)throw new Error(\"A Solana wallet was not detected\");const wallet=await window.solana.connect(),payer=new web3.PublicKey(wallet.publicKey.toString());const built=await (await fetch(\"/api/partnerships/\"+encodeURIComponent(campaignId)+\"/payment-transaction\",{method:\"POST\",headers:{\"content-type\":\"application/json\"},body:JSON.stringify({payer:payer.toBase58()})})).json();if(!built.recentBlockhash)throw new Error(built.message||\"payment transaction unavailable\");const mint=new web3.PublicKey(built.mint),source=new web3.PublicKey(built.sourceTokenAccount),destination=new web3.PublicKey(built.treasuryTokenAccount),owner=new web3.PublicKey(built.treasuryOwner),tx=new web3.Transaction();tx.add(spl.createAssociatedTokenAccountIdempotentInstruction(payer,destination,owner,mint,spl.TOKEN_PROGRAM_ID,spl.ASSOCIATED_TOKEN_PROGRAM_ID),spl.createTransferCheckedInstruction(source,mint,destination,payer,BigInt(built.amountBaseUnits),6,[],spl.TOKEN_PROGRAM_ID),new web3.TransactionInstruction({programId:new web3.PublicKey(\"MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr\"),keys:[{pubkey:payer,isSigner:true,isWritable:false}],data:new TextEncoder().encode(built.paymentReference)}));tx.feePayer=payer;tx.recentBlockhash=built.recentBlockhash;const sent=await window.solana.signAndSendTransaction(tx);status.textContent=\"Payment submitted. Waiting for finality...\";let result;for(let i=0;i<20;i++){result=await (await fetch(\"/api/partnerships/\"+encodeURIComponent(campaignId)+\"/payment\",{method:\"POST\",headers:{\"content-type\":\"application/json\"},body:JSON.stringify({signature:sent.signature,quoteId:intent.quoteId})})).json();if(result.campaign||result.status===\"paid\")break;await new Promise(function(resolve){setTimeout(resolve,3000)});}status.textContent=JSON.stringify(Object.assign({},result,{signature:sent.signature}),null,2);}catch(error){status.textContent=error.message||String(error);}}button.onclick=run;</script></body></html>",
  ].join("");
}
function registryRegistrationPage() {
  const nonce = randomUUID().replaceAll("-", "");
  return { nonce, body: `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>8004 Agent Registration | PrivateDAO</title><style>body{font-family:system-ui,sans-serif;max-width:900px;margin:0 auto;padding:28px 18px;background:#071018;color:#eef5f7;line-height:1.5}h1{line-height:1.1}.muted{color:#a9bbc2}button{border:0;border-radius:8px;padding:12px 16px;background:#14f195;color:#061016;font-weight:700;cursor:pointer;margin:6px 6px 6px 0}button:disabled{opacity:.45;cursor:not-allowed}pre{white-space:pre-wrap;overflow:auto;background:#02070a;border:1px solid #29424b;border-radius:8px;padding:14px;font-size:13px}.warning{border-left:3px solid #f5c451;padding:10px 14px;background:#17202a}a{color:#7de2c0}</style></head><body><p class="muted">PrivateDAO Agent Exchange · 8004 Solana Agent Registry</p><h1>Review registration before signing</h1><p class="muted">This page builds a fresh Mainnet transaction only after you request it. Phantom remains the only owner signer. The Asset signer is generated in browser memory and is never sent to PrivateDAO or persisted.</p><p class="warning">The Asset secret is intentionally memory-only. Reloading this page loses it. Do not use this page as a key backup or for later asset management.</p><p><button id="build">Connect wallet and build fresh transaction</button><button id="sign" disabled>Review and sign in Phantom</button></p><pre id="status">Ready. No transaction exists yet.</pre><pre id="details">Build the transaction to display program, accounts, instructions, cost, and expiry.</pre><p class="muted"><a href="/.well-known/agent-card.json">Agent Card</a> · <a href="https://8004.qnt.sh/" rel="noreferrer">8004 registry</a></p><script nonce="${nonce}">
const OWNER="2BJ4ezxqV9YJXc38D9duKBkdn4su4jE1beKUHwH663sL", URI="https://agents.privatedao.org/.well-known/agent-card.json", PROGRAM="8oo4dC4JvBLwy5tGgiH3WwK4B9PWxL9Z4XjA2jzkQMbQ", RPC="https://api.mainnet-beta.solana.com", COMPUTE="ComputeBudget111111111111111111111111111111";
const status=document.getElementById("status"),details=document.getElementById("details"),buildButton=document.getElementById("build"),signButton=document.getElementById("sign");
let state=null;
const show=(el,value)=>el.textContent=typeof value==="string"?value:JSON.stringify(value,null,2);
function keyMeta(key){return {address:key.pubkey.toBase58(),signer:key.isSigner,writable:key.isWritable};}
function assertTransaction(tx,owner,asset){
  if(tx.instructions.length!==2)throw new Error("Unexpected instruction count; refusing to sign");
  const compute=tx.instructions[0], register=tx.instructions[1];
  if(compute.programId.toBase58()!==COMPUTE||compute.data.toString("hex")!=="02801a0600")throw new Error("Unexpected compute-budget instruction");
  if(register.programId.toBase58()!==PROGRAM)throw new Error("Unexpected registry program");
  if(register.keys.length!==8)throw new Error("Unexpected register account layout");
  if(register.keys[3].pubkey.toBase58()!==asset.publicKey.toBase58()||!register.keys[3].isSigner||!register.keys[3].isWritable)throw new Error("Asset signer metadata mismatch");
  if(register.keys[5].pubkey.toBase58()!==owner.toBase58()||!register.keys[5].isSigner||!register.keys[5].isWritable)throw new Error("Owner signer metadata mismatch");
  if(register.data.length<9||register.data[register.data.length-1]!==0)throw new Error("ATOM is not disabled in register_with_options");
  const forbidden=["TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA","TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb","AToMw53aiPQ8j7iHVb4fGt6nzUNxUhcPc3tbPBZuzVVb"];
  if(register.keys.some(k=>forbidden.includes(k.pubkey.toBase58())))throw new Error("Forbidden token/delegation account in registration");
  return {compute:{programId:compute.programId.toBase58(),dataHex:compute.data.toString("hex"),accounts:compute.keys.map(keyMeta)},register:{programId:register.programId.toBase58(),dataHex:register.data.toString("hex"),accounts:register.keys.map(keyMeta)}};
}
async function build(){
  try{
    signButton.disabled=true; show(status,"Checking the live Agent Card and connecting Phantom...");
    const cardResponse=await fetch(URI,{cache:"no-store"}); if(!cardResponse.ok)throw new Error("Agent Card is not reachable: HTTP "+cardResponse.status); const liveCard=await cardResponse.json(); if(liveCard.name!=="PrivateDAO Agent Exchange")throw new Error("Unexpected Agent Card identity");
    const provider=window.phantom?.solana||window.solana;
    if(!provider)throw new Error("Open this page inside Phantom Browser or a browser with Phantom installed");
    const wallet=await provider.connect({onlyIfTrusted:false}); if(wallet.publicKey.toBase58()!==OWNER)throw new Error("Connect the required owner wallet: "+OWNER);
    const [{SolanaSDK},{Connection,PublicKey,Keypair,Transaction}]=await Promise.all([import("/assets/browser/8004-solana.mjs"),import("/assets/browser/solana-web3.mjs")]);
    const connection=new Connection(RPC,"confirmed"),owner=new PublicKey(OWNER),asset=Keypair.generate(),sdk=new SolanaSDK({cluster:"mainnet-beta",rpcUrl:RPC});
    const prepared=await sdk.registerAgent(URI,{skipSend:true,signer:owner,feePayer:owner,assetPubkey:asset.publicKey,atomEnabled:false});
    const encoded=String(prepared.transaction||"").trim().replace(/-/g,"+").replace(/_/g,"/").replaceAll(" ",""); if(!encoded)throw new Error("8004 SDK returned an empty transaction"); const padded=encoded+"=".repeat((4-encoded.length%4)%4); const bytes=Uint8Array.from(atob(padded),c=>c.charCodeAt(0)),tx=Transaction.from(bytes),check=assertTransaction(tx,owner,asset),fee=await connection.getFeeForMessage(tx.compileMessage(),"confirmed");
    state={connection,owner,asset,tx,prepared,check,agentPda:tx.instructions[1].keys[2].pubkey.toBase58()};
    show(details,{programId:PROGRAM,network:"solana-mainnet-beta",purpose:"Create one on-chain 8004 Agent identity pointing at the PrivateDAO Agent Card",owner:OWNER,assetPublicKey:asset.publicKey.toBase58(),agentPda:state.agentPda,agentUri:URI,instructions:[check.compute,check.register],requiredSigners:tx.signatures.map(s=>({publicKey:s.publicKey.toBase58(),signaturePresent:Boolean(s.signature)})),estimatedNetworkFeeLamports:fee.value,officialRegistrationEstimate:"approximately 0.009 SOL including registry rent",blockhash:prepared.blockhash,lastValidBlockHeight:prepared.lastValidBlockHeight,"NO TOKEN TRANSFER":"YES","NO DELEGATION":"YES","NO APPROVAL":"YES","NO AUTHORITY TRANSFER":"YES","NO SWAP":"YES","NO UNRELATED INSTRUCTION":"YES"});
    show(status,"Fresh transaction ready. Review every field above before pressing the Phantom button."); signButton.disabled=false;
  }catch(error){show(status,error.message||String(error));}
}
async function sign(){
  try{if(!state)throw new Error("Build a fresh transaction first"); const provider=window.phantom?.solana||window.solana; if(!provider)throw new Error("Phantom provider is unavailable; reopen this page inside Phantom Browser"); signButton.disabled=true; state.tx.partialSign(state.asset); assertTransaction(state.tx,state.owner,state.asset); const signed=await provider.signTransaction(state.tx); const signature=await state.connection.sendRawTransaction(signed.serialize(),{skipPreflight:false,maxRetries:3}); show(status,"Submitted. Waiting for Finalized...\\n"+signature); const result=await state.connection.confirmTransaction({signature,blockhash:state.prepared.blockhash,lastValidBlockHeight:state.prepared.lastValidBlockHeight},"finalized"); if(result.value.err)throw new Error("Registration failed: "+JSON.stringify(result.value.err)); const agentInfo=await state.connection.getAccountInfo(state.asset.publicKey,"finalized"),pdaInfo=await state.connection.getAccountInfo(new (await import("/assets/browser/solana-web3.mjs")).PublicKey(state.agentPda),"finalized"); if(!agentInfo||!pdaInfo)throw new Error("Finalized transaction did not expose the expected Agent identity accounts"); show(details,{status:"FINALIZED",signature,explorer:"https://explorer.solana.com/tx/"+signature+"?cluster=mainnet-beta",assetPublicKey:state.asset.publicKey.toBase58(),agentPda:state.agentPda,agentUri:URI}); show(status,"Registration finalized. The Agent identity is now public on Solana Mainnet.");
  }catch(error){show(status,error.message||String(error));signButton.disabled=false;}
}
buildButton.onclick=build; signButton.onclick=sign;
</script></body></html>` };
}

async function buildPaymentTransaction(jobId, payerText, sourceTokenAccountText = "") {
  if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(payerText || "")) throw new Error("valid payer wallet is required");
  const job = await (await store()).get("Jobs", jobId);
  const quote = await quoteForJob(await store(), job);
  if (!job || !quote) throw Object.assign(new Error("invoice not found"), { statusCode: 404 });
  if (job.status !== "awaiting_payment") throw new Error("job is not awaiting payment");
  if (new Date(quote.expires_at) < new Date()) throw new Error("invoice expired");
  if (quote.currency === "SOL") {
    const latest = await readRpc(config, "getLatestBlockhash", [{ commitment: "finalized" }]);
    return { payer: payerText, currency: "SOL", treasuryOwner: quote.treasuryOwner, amountBaseUnits: String(quote.amountAtomic), paymentReference: quote.paymentReference, recentBlockhash: latest.result.value.blockhash, lastValidBlockHeight: latest.result.value.lastValidBlockHeight, expiresAt: quote.expires_at };
  }
  let source = null;
  if (sourceTokenAccountText) {
    if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(sourceTokenAccountText))
      throw Object.assign(new Error("valid source token account is required"), { statusCode: 400 });
    source = { pubkey: sourceTokenAccountText };
  }
  try {
    if (source) {
      const latest = await readRpc(config, "getLatestBlockhash", [{ commitment: "finalized" }]);
  return { payer: payerText, sourceTokenAccount: source.pubkey, mint: quote.mint, treasuryOwner: quote.treasuryOwner, treasuryTokenAccount: quote.treasuryTokenAccount, amountBaseUnits: String(quote.amountAtomic), paymentReference: quote.paymentReference, recentBlockhash: latest.result.value.blockhash, lastValidBlockHeight: latest.result.value.lastValidBlockHeight, expiresAt: quote.expires_at };
    }
    const accounts = await readRpc(config, "getTokenAccountsByOwner", [
      payerText,
      { mint: quote.mint },
      { encoding: "jsonParsed" },
    ]);
    source = (accounts.result?.value || []).find(
      (item) =>
        Number(item.account?.data?.parsed?.info?.tokenAmount?.amount || 0) >=
        Number(quote.amountAtomic),
    );
  } catch {
    try {
      const accounts = await readRpc(config, "getTokenAccountsByOwner", [
        payerText,
        { programId: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA" },
        { encoding: "jsonParsed" },
      ]);
      source = (accounts.result?.value || []).find(
        (item) =>
          item.account?.data?.parsed?.info?.mint === quote.mint &&
          Number(item.account?.data?.parsed?.info?.tokenAmount?.amount || 0) >=
            Number(quote.amountAtomic),
      );
    } catch {
      throw Object.assign(
        new Error("USDC account lookup is temporarily unavailable; retry shortly"),
        { statusCode: 503 },
      );
    }
  }
  if (!source)
    throw Object.assign(
      new Error("payer wallet has no funded Solana USDC token account"),
      { statusCode: 402 },
    );
  const latest = await readRpc(config, "getLatestBlockhash", [{ commitment: "finalized" }]);
  return { payer: payerText, sourceTokenAccount: source?.pubkey || null, mint: quote.mint, treasuryOwner: quote.treasuryOwner, treasuryTokenAccount: quote.treasuryTokenAccount, amountBaseUnits: String(quote.amountAtomic), paymentReference: quote.paymentReference, recentBlockhash: latest.result.value.blockhash, lastValidBlockHeight: latest.result.value.lastValidBlockHeight, expiresAt: quote.expires_at };
}
const collectionFor = (name) =>
  ({
    listings: "Listings",
    agreements: "Agreements",
    logistics: "Logistics",
    revenue: "Revenue",
  })[name] || name;
function adminTokenAuthorized(event) {
  const token = event.headers?.["x-pdao-admin-smoke"] || event.headers?.["X-Pdao-Admin-Smoke"] || event.headers?.["X-PDAO-Admin-Smoke"];
  return Boolean(config.adminSmokeToken && token === config.adminSmokeToken);
}
function partnershipDates(campaign) {
  const start = Date.parse(campaign.start_at || campaign.start || "");
  const end = Date.parse(campaign.end_at || campaign.expiry || "");
  return { start, end };
}
function isActivePartnership(campaign, at = Date.now()) {
  const { start, end } = partnershipDates(campaign);
  return campaign.type === "featured_partner" && ["active", "scheduled"].includes(campaign.campaign_status) && campaign.payment_status === "paid" && Number.isFinite(start) && Number.isFinite(end) && start <= at && at < end;
}
async function activePartnerships() {
  return (await (await store()).list("Campaigns")).filter((campaign) => isActivePartnership(campaign));
}
function publicPartnershipCampaign(campaign) {
  return {
    id: campaign.id,
    type: campaign.type,
    package: campaign.package,
    package_id: campaign.package_id,
    agentId: campaign.agentId,
    agentName: campaign.agentName,
    price_usd: campaign.price_usd,
    payment_status: "paid",
    campaign_status: campaign.campaign_status,
    start_at: campaign.start_at,
    end_at: campaign.end_at,
    deliverables: campaign.deliverables || [],
    disclosure: campaign.disclosure || "Featured Partner / Sponsored",
  };
}
async function createPartnership(body) {
  const agentId = String(body.agentId || "").trim();
  if (!agentId) throw Object.assign(new Error("agentId is required"), { statusCode: 400 });
  const agent = await (await store()).get("Registry", agentId);
  if (!agent) throw Object.assign(new Error("registered agent not found"), { statusCode: 404 });
  const policy = await marketplacePolicy();
  const packageId = String(body.packageId || body.package_id || "featured_listing");
  const promotion = policy.promotion_packages[packageId];
  if (!promotion) throw Object.assign(new Error("promotion package is not supported"), { statusCode: 400 });
  const price = body.priceUsd == null ? Number(promotion.price_usd) : Number(body.priceUsd);
  if (!Number.isFinite(price) || price < Number(promotion.price_usd)) throw Object.assign(new Error(`${promotion.label} price must be at least ${promotion.price_usd} USD`), { statusCode: 400 });
  const startAt = new Date(body.startAt || body.start || "");
  const endAt = new Date(body.endAt || body.end || body.expiry || "");
  if (!Number.isFinite(startAt.getTime()) || !Number.isFinite(endAt.getTime()) || endAt <= startAt) throw Object.assign(new Error("valid startAt and endAt are required"), { statusCode: 400 });
  const paymentStatus = ["pending", "failed", "refunded"].includes(body.paymentStatus) ? body.paymentStatus : "pending";
  const campaign = {
    id: `campaign_${randomUUID()}`,
    type: "featured_partner",
    package: promotion.label,
    package_id: packageId,
    agentId,
    agentName: agent.name,
    price_usd: price,
    payment_status: paymentStatus,
    campaign_status: "draft",
    start_at: startAt.toISOString(),
    end_at: endAt.toISOString(),
    deliverables: Array.isArray(body.deliverables) ? body.deliverables.map(String).slice(0, 20) : promotion.deliverables,
    deliverables_completed: Boolean(body.deliverablesCompleted),
    disclosure: "Featured Partner / Sponsored",
    payment_url: `https://${config.domain}/partners/REPLACE_AFTER_CREATE/pay`,
    created_at: now(),
    updated_at: now(),
  };
  campaign.payment_url = `https://${config.domain}/partners/${encodeURIComponent(campaign.id)}/pay`;
  await (await store()).put("Campaigns", campaign.id, campaign, true);
  return campaign;
}
async function updatePartnership(id, body) {
  const current = await (await store()).get("Campaigns", id);
  if (!current || current.type !== "featured_partner") throw Object.assign(new Error("partnership not found"), { statusCode: 404 });
  const next = { ...current };
  if (body.priceUsd !== undefined) {
    const policy = await marketplacePolicy();
    const minimumPrice = Number(policy.promotion_packages[current.package_id]?.price_usd || 0.01);
    const price = Number(body.priceUsd);
    if (!Number.isFinite(price) || price < minimumPrice) throw Object.assign(new Error(`promotion price must be at least ${minimumPrice} USD`), { statusCode: 400 });
    next.price_usd = price;
  }
  if (body.paymentStatus !== undefined) {
    if (!["pending", "failed", "refunded"].includes(body.paymentStatus)) throw Object.assign(new Error("paid status requires a verified on-chain payment"), { statusCode: 400 });
    next.payment_status = body.paymentStatus;
  }
  if (body.startAt || body.endAt) {
    const startAt = new Date(body.startAt || next.start_at);
    const endAt = new Date(body.endAt || next.end_at);
    if (!Number.isFinite(startAt.getTime()) || !Number.isFinite(endAt.getTime()) || endAt <= startAt) throw Object.assign(new Error("invalid campaign dates"), { statusCode: 400 });
    next.start_at = startAt.toISOString();
    next.end_at = endAt.toISOString();
  }
  if (body.deliverables !== undefined) next.deliverables = Array.isArray(body.deliverables) ? body.deliverables.map(String).slice(0, 20) : [];
  if (body.deliverablesCompleted !== undefined) next.deliverables_completed = Boolean(body.deliverablesCompleted);
  if (body.active !== undefined) next.campaign_status = body.active && next.payment_status === "paid" ? "active" : "paused";
  next.updated_at = now();
  await (await store()).put("Campaigns", id, next);
  return next;
}
async function partnershipQuote(campaign) {
  const storage = await store();
  if (campaign.payment_quote_id) {
    const direct = await storage.get("Quotes", campaign.payment_quote_id);
    if (direct && Date.parse(direct.expires_at) > Date.now()) return direct;
  }
  const existing = (await storage.list("Quotes")).find((quote) => quote.partnership_id === campaign.id && Date.parse(quote.expires_at) > Date.now());
  if (existing) return existing;
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
  const quote = {
    quote_id: `pq_${randomUUID()}`,
    payment_type: "featured_partnership",
    promotion_package: campaign.package_id || "featured_listing",
    deliverables: campaign.deliverables || [],
    partnership_id: campaign.id,
    amount: Number(campaign.price_usd),
    amountAtomic: Math.round(Number(campaign.price_usd) * 1e6),
    currency: "USDC",
    network: "solana-mainnet-beta",
    target_network: "agent-marketplace",
    mint: config.usdcMint,
    treasuryOwner: config.treasury,
    treasuryTokenAccount: await treasuryTokenAccount(config),
    recipient: config.treasury,
    paymentReference: `PDAO_PARTNER:${campaign.id}`,
    expires_at: expiresAt.toISOString(),
    created_at: now(),
  };
  await storage.put("Quotes", quote.quote_id, quote, true);
  await storage.put("Campaigns", campaign.id, { ...campaign, payment_quote_id: quote.quote_id, updated_at: now() });
  return quote;
}
async function quoteForJob(storage, job) {
  if (job?.quote_id) {
    const direct = await storage.get("Quotes", job.quote_id);
    if (direct) return direct;
  }
  return (await storage.list("Quotes")).find((quote) => quote.job_id === job?.id) || null;
}
async function partnershipPaymentIntent(id) {
  const campaign = await (await store()).get("Campaigns", id);
  if (!campaign || campaign.type !== "featured_partner") throw Object.assign(new Error("partnership not found"), { statusCode: 404 });
  if (campaign.payment_status === "paid") return { campaignId: id, status: "paid", campaign };
  const quote = await partnershipQuote(campaign);
  return { campaignId: id, paymentType: "featured_partnership", promotionPackage: quote.promotion_package, deliverables: quote.deliverables, status: "awaiting_payment", amount: quote.amount.toFixed(6), amountBaseUnits: String(quote.amountAtomic), currency: quote.currency, network: quote.network, mint: quote.mint, treasuryOwner: quote.treasuryOwner, treasuryTokenAccount: quote.treasuryTokenAccount, paymentReference: quote.paymentReference, quoteId: quote.quote_id, expiresAt: quote.expires_at, paymentUrl: `https://${config.domain}/partners/${encodeURIComponent(id)}/pay` };
}
async function createSellerPromotionQuote(body) {
  const agentId = String(body.agent_id || body.agentId || "").trim();
  const { agent } = await ownedSeller(agentId, body.owner_token || body.ownerToken);
  if (!sellerListingState(agent)) throw Object.assign(new Error("seller listing fee must be paid before promotion"), { statusCode: 402 });
  const policy = await marketplacePolicy();
  const packageId = String(body.package_id || body.packageId || "featured_listing");
  const packageInfo = policy.promotion_packages[packageId];
  if (!packageInfo) throw Object.assign(new Error("promotion package is not supported"), { statusCode: 400 });
  const start = new Date(body.start_at || body.startAt || Date.now());
  const end = new Date(body.end_at || body.endAt || start.getTime() + packageInfo.duration_days * 86400000);
  const campaign = await createPartnership({ agentId, packageId, startAt: start.toISOString(), endAt: end.toISOString() });
  const quote = await partnershipQuote(campaign);
  return { campaign, quote, package: packageInfo, status: "awaiting_payment" };
}
async function buildPartnershipPaymentTransaction(id, payerText, sourceTokenAccountText = "") {
  if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(payerText || "")) throw Object.assign(new Error("valid payer wallet is required"), { statusCode: 400 });
  const campaign = await (await store()).get("Campaigns", id);
  if (!campaign || campaign.type !== "featured_partner") throw Object.assign(new Error("partnership not found"), { statusCode: 404 });
  const quote = await partnershipQuote(campaign);
  if (new Date(quote.expires_at) < new Date()) throw new Error("partnership payment quote expired");
  let source = sourceTokenAccountText ? { pubkey: sourceTokenAccountText } : null;
  if (source && !/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(source.pubkey)) throw Object.assign(new Error("valid source token account is required"), { statusCode: 400 });
  if (!source) {
    const accounts = await readRpc(config, "getTokenAccountsByOwner", [payerText, { mint: quote.mint }, { encoding: "jsonParsed" }]);
    source = (accounts.result?.value || []).find((item) => Number(item.account?.data?.parsed?.info?.tokenAmount?.amount || 0) >= quote.amountAtomic);
  }
  if (!source) throw Object.assign(new Error("payer wallet has no funded Solana USDC token account"), { statusCode: 402 });
  const latest = await readRpc(config, "getLatestBlockhash", [{ commitment: "finalized" }]);
  return { payer: payerText, sourceTokenAccount: source.pubkey, mint: quote.mint, treasuryOwner: quote.treasuryOwner, treasuryTokenAccount: quote.treasuryTokenAccount, amountBaseUnits: String(quote.amountAtomic), paymentReference: quote.paymentReference, recentBlockhash: latest.result.value.blockhash, lastValidBlockHeight: latest.result.value.lastValidBlockHeight, expiresAt: quote.expires_at };
}
async function submitPartnershipPayment(id, body) {
  const storage = await store();
  const campaign = await storage.get("Campaigns", id);
  if (!campaign || campaign.type !== "featured_partner") throw Object.assign(new Error("partnership not found"), { statusCode: 404 });
  if (campaign.payment_status === "paid") return { status: "paid", campaign };
  if (!body.signature || !body.quoteId) throw Object.assign(new Error("signature and quoteId are required"), { statusCode: 400 });
  const quote = await storage.get("Quotes", body.quoteId);
  if (quote && (quote.partnership_id !== id || Date.parse(quote.expires_at) <= Date.now())) throw Object.assign(new Error("partnership payment quote not found"), { statusCode: 404 });
  if (!quote) throw Object.assign(new Error("partnership payment quote not found"), { statusCode: 404 });
  const payment = await verifyPayment(config, { signature: body.signature }, quote);
  if (payment.transient) return { status: "verifying", signature: body.signature, message: payment.reason, retryAfterSeconds: 3 };
  if (!payment.ok) throw Object.assign(new Error(payment.reason), { statusCode: 402 });
  const transaction = await readRpc(config, "getTransaction", [body.signature, { commitment: "finalized", maxSupportedTransactionVersion: 0, encoding: "jsonParsed" }]);
  const instructions = transaction.result?.transaction?.message?.instructions || [];
  const memoFound = instructions.some((instruction) => instruction.program === "spl-memo" && String(instruction.parsed || "").includes(quote.paymentReference));
  if (!memoFound) throw Object.assign(new Error("payment reference does not match this partnership campaign"), { statusCode: 402 });
  const transfer = instructions.find((instruction) => instruction.program === "spl-token" && ["transfer", "transferChecked"].includes(instruction.parsed?.type) && Number(instruction.parsed?.info?.amount ?? instruction.parsed?.info?.tokenAmount?.amount) === Number(quote.amountAtomic));
  const payerWallet = transfer?.parsed?.info?.authority || transfer?.parsed?.info?.owner || null;
  const expiresAt = Date.parse(quote.expires_at);
  const paidAt = payment.blockTime ? payment.blockTime * 1000 : NaN;
  if (!Number.isFinite(paidAt) || paidAt > expiresAt) throw Object.assign(new Error("partnership payment quote expired"), { statusCode: 402 });
  const paymentId = `payment_${body.signature}`;
  const existing = await storage.get("Payments", paymentId);
  if (existing && existing.partnership_id !== id) throw Object.assign(new Error("payment signature was already used"), { statusCode: 402 });
  if (!existing) {
    const candidate = { id: paymentId, signature: body.signature, payment_type: "featured_partnership", partnership_id: id, payer_wallet: payerWallet, amount: quote.amount, asset: quote.currency, network: quote.network, consumed_at: now() };
    try {
      await storage.put("Payments", paymentId, candidate, true);
    } catch (error) {
      const raced = await storage.get("Payments", paymentId);
      if (!raced) throw error;
      if (raced.partnership_id !== id) throw Object.assign(new Error("payment signature was already used"), { statusCode: 402 });
    }
  }
  if (existing) {
    const claimedAt = Date.parse(existing.consumed_at || "");
    if (Number.isFinite(claimedAt) && Date.now() - claimedAt < 30000)
      return { status: "processing", campaign, message: "payment accepted; promotion activation is already in progress", retryAfterSeconds: 3 };
  }
  const next = { ...campaign, payment_status: "paid", campaign_status: new Date(campaign.start_at) <= new Date() ? "active" : "scheduled", payment_signature: body.signature, payer_wallet: payerWallet, paid_amount: quote.amount, paid_at: now(), payment_network: quote.network, payment_asset: quote.currency, updated_at: now() };
  await storage.put("Campaigns", id, next);
  const settlement = { id: `seller_settlement_${id}`, kind: "seller_settlement", fee_type: "promotion", campaign_id: id, seller_agent_id: campaign.agentId, gross_amount: quote.amount, platform_fee_amount: quote.amount, platform_fee_bps: 10000, protocol_fee: quote.amount, seller_net_amount: 0, seller_amount: 0, asset: quote.currency, status: "platform_collected", created_at: now() };
  const receipt = { receipt_id: receiptId({ campaign_id: id, payment_signature: body.signature, amount: quote.amount }), campaign_id: id, fee_type: "promotion", promotion_package: quote.promotion_package, deliverables: quote.deliverables, seller_agent_id: campaign.agentId, payment_signature: body.signature, amount: quote.amount, gross_amount: quote.amount, platform_fee_amount: quote.amount, platform_fee_bps: 10000, seller_net_amount: 0, asset: quote.currency, network: quote.network, treasury: config.treasury, seller_settlement: settlement, status: "VERIFIED", created_at: campaign.created_at, completed_at: now() };
  receipt.public_url = `https://${config.domain}/receipts/${encodeURIComponent(receipt.receipt_id)}`;
  receipt.verification_url = `https://${config.domain}/verify/receipt/${encodeURIComponent(receipt.receipt_id)}`;
  await storage.put("Registry", settlement.id, settlement);
  await storage.put("Receipts", receipt.receipt_id, receipt);
  await storage.put("Revenue", `rev_${id}`, { id: `rev_${id}`, feeType: "promotion", campaignId: id, grossAmount: quote.amount, providerAmount: 0, protocolFee: quote.amount, platformFeeAmount: quote.amount, feeBps: 10000, asset: quote.currency, paymentSignature: body.signature, settlementStatus: "platform_collected", timestamp: now() });
  await storage.put("Campaigns", id, { ...next, receipt_id: receipt.receipt_id, settlement_id: settlement.id });
  return { status: next.campaign_status, campaign: { ...next, receipt_id: receipt.receipt_id, settlement_id: settlement.id }, receipt, settlement, payment: { signature: body.signature, block_time: payment.blockTime, network: quote.network, asset: quote.currency } };
}
async function partnersPage() {
  const campaigns = await activePartnerships();
  const cards = await Promise.all(campaigns.map(async (campaign) => {
    const agent = await (await store()).get("Registry", campaign.agentId);
    const technical = agent?.status === "connected" ? "MCP Connected" : agent?.status === "verified" ? "E2E Verified" : "Technical status unavailable";
    return `<article><p class="eyebrow">Featured Partner</p><h2><a href="/agents/${encodeURIComponent(campaign.agentId)}">${escapeHtml(campaign.agentName)}</a></h2><p>${escapeHtml(technical)} · Sponsored placement</p><p>Capabilities: ${escapeHtml((agent?.allowed_tools || agent?.capabilities || []).slice(0, 12).join(", ") || "Discovered capabilities")}</p><small>Campaign: ${escapeHtml(campaign.start_at)} → ${escapeHtml(campaign.end_at)}</small></article>`;
  })).then((items) => items.join("") || "<p>No active Featured Partners at this time.</p>");
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Featured Partners | PrivateDAO Agent Exchange</title><meta name="description" content="Active sponsored Featured Partners in the PrivateDAO Agent Marketplace."><style>body{font-family:system-ui,sans-serif;max-width:980px;margin:0 auto;padding:32px 20px;color:#081b33}a{color:#1769e0}.eyebrow{color:#1769e0;font-weight:800;letter-spacing:.12em;text-transform:uppercase;font-size:.75rem}header{display:flex;justify-content:space-between;margin-bottom:80px}section{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:16px}article{border:1px solid #dbe5f0;border-radius:16px;padding:22px}small{color:#52657c}@media(max-width:600px){header{margin-bottom:48px}}</style></head><body><header><strong><a href="/marketplace">PrivateDAO Agent Exchange</a></strong><nav><a href="/marketplace">Marketplace</a> · <a href="/connect">Build</a></nav></header><p class="eyebrow">Sponsored partnerships</p><h1>Featured Partners</h1><p>Paid promotion is disclosed separately from technical integration. Payment never creates MCP verification or execution access.</p><section>${cards}</section></body></html>`;
}
async function agentProfilePage(id) {
  const agent = await (await store()).get("Registry", id);
  if (!agent) return null;
  const campaigns = (await activePartnerships()).filter((campaign) => campaign.agentId === id);
  const pendingCampaign = (await (await store()).list("Campaigns")).find((campaign) => campaign.type === "featured_partner" && campaign.agentId === id && ["pending", "draft", "failed"].includes(campaign.payment_status));
  const technical = agent.status === "connected" ? "MCP Connected" : agent.status === "verified" ? "E2E Verified" : "Unavailable";
  const commercial = campaigns.length ? "Featured Partner / Sponsored" : "Standard Listing";
  const tools = (agent.allowed_tools || agent.capabilities || []).slice(0, 24).map((tool) => `<li>${escapeHtml(tool)}</li>`).join("") || "<li>No safe tools currently enabled</li>";
  const checkout = pendingCampaign ? `<p><a href="/partners/${encodeURIComponent(pendingCampaign.id)}/pay"><strong>Buy sponsored promotion · quoted USDC amount</strong></a></p>` : "";
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(agent.name)} | PrivateDAO Agent Marketplace</title><meta name="description" content="Technical and commercial status for ${escapeHtml(agent.name)} in the PrivateDAO Agent Marketplace."><style>body{font-family:system-ui,sans-serif;max-width:900px;margin:0 auto;padding:32px 20px;color:#081b33}a{color:#1769e0}.eyebrow{color:#1769e0;font-weight:800;letter-spacing:.12em;text-transform:uppercase;font-size:.75rem}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px;margin-top:28px}.panel{border:1px solid #dbe5f0;border-radius:16px;padding:22px}.status{font-size:1.2rem;font-weight:800}.muted{color:#52657c}li{margin:6px 0}@media(max-width:650px){.grid{grid-template-columns:1fr}}</style></head><body><p><a href="/marketplace">← Agent Marketplace</a></p><p class="eyebrow">Agent profile</p><h1>${escapeHtml(agent.name)}</h1><div class="grid"><section class="panel"><p class="eyebrow">Technical status</p><p class="status">${escapeHtml(technical)}</p><p class="muted">Protocol: ${escapeHtml(agent.protocol || "MCP")} · Capabilities discovered: ${escapeHtml(String((agent.capabilities || []).length))}</p><h2>Safe capabilities</h2><ul>${tools}</ul></section><section class="panel"><p class="eyebrow">Commercial status</p><p class="status">${escapeHtml(commercial)}</p><p class="muted">Paid promotion never creates MCP verification, permissions, or execution access.</p>${campaigns.length ? `<p>Campaign window: ${escapeHtml(campaigns[0].start_at)} → ${escapeHtml(campaigns[0].end_at)}</p>` : "<p>Free standard listing. No sponsored placement is active.</p>"}${checkout}</section></div></body></html>`;
}
async function listListings(query = {}) {
  const all = await (await store()).list(collectionFor("listings"));
  const visibleStored = all.filter((listing) => listing.type !== "seller_listing" || (listing.status === "active" && listing.payment_status === "paid" && listing.commercial_publication_status === "published"));
  const partnerships = await activePartnerships();
  const external = (await activeRegistryAgents())
    // A connected MCP endpoint without a declared commercial service belongs
    // in technical discovery, not the buyer-facing marketplace. Do not expose
    // a misleading active listing with null price/asset.
    .filter((agent) => agent.protocol === "MCP" && sellerListingState(agent) && sellerPublishedServices(agent).length > 0)
    .map((agent) => ({
      id: `external_${agent.id}`,
      agentId: agent.id,
      provider: agent.name,
      service: "external-mcp",
      description: `${agent.name} external MCP server`,
      capabilities: sellerPublishedServices(agent).flatMap((service) => [service.tool]),
      protocols: ["MCP"],
      chains: (agent.networks || []).map(normalizeNetworkId),
      price: null,
      asset: null,
      verificationLevel: "MCP_HANDSHAKE_VERIFIED",
      status: "active",
      external: true,
      lastSuccessfulConnection: agent.last_successful_connection,
      unavailableReason: agent.unavailable_reason || null,
      technicalStatus: agent.status === "connected" ? "MCP Connected" : "E2E Verified",
      commercialStatus: partnerships.some((campaign) => campaign.agentId === agent.id) ? "Featured Partner / Sponsored" : "Standard Listing",
    }));
  const firstParty = SERVICES.map((service) => ({
    id: `pdao_${service.id}`,
    agentId: "pdao-first-party",
    provider: "PrivateDAO",
    service: service.id,
    description: service.title,
    capabilities: [service.id],
    protocols: ["HTTP", "A2A", "MCP"],
    chains: [...LIVE_NETWORKS],
    networkCapabilities: NETWORK_CAPABILITIES,
    price: service.price,
    asset: service.currency,
    verificationLevel: "TRANSACTION_VERIFIED",
    status: "active",
    firstParty: true,
  }));
  const externalServices = (await externalServiceManifests()).map((service) => ({
    id: service.id, agentId: service.seller_agent_id, provider: service.provider, service: service.service_id, description: service.description || service.title, capabilities: [service.tool], protocols: ["MCP"], chains: [service.network], price: service.price, asset: service.asset, verificationLevel: "MCP_HANDSHAKE_VERIFIED", status: "active", external: true, externalSeller: true, sellerIdentity: service.seller_identity, commercialStatus: "External Seller Service",
  }));
  return [...firstParty, ...external, ...externalServices, ...visibleStored].filter(
    (x) =>
      x.status !== "paused" &&
      (!query.capability ||
        (x.capabilities || []).includes(query.capability)) &&
      (!query.protocol || (x.protocols || []).includes(query.protocol)) &&
      (!query.chain || (x.chains || []).map(normalizeNetworkId).includes(normalizeNetworkId(query.chain))) &&
      (!query.network || !(x.chains || []).length || (x.chains || []).map(normalizeNetworkId).includes(normalizeNetworkId(query.network))),
  );
}
async function publishListing(body) {
  if (!body.agentId || !body.service || !body.endpoint)
    throw new Error("agentId, service and endpoint are required");
  const asset = String(body.asset || "USDC").toUpperCase().trim();
  if (asset !== "USDC")
    throw Object.assign(new Error("listing asset must be USDC for the current settlement rail"), { statusCode: 400 });
  const agent = await (await store()).get("Registry", body.agentId);
  if (!agent || agent.status !== "verified")
    throw new Error("verified agent required");
  const chains = Array.isArray(body.chains) && body.chains.length
    ? body.chains.filter((id) => networkCapability(id))
    : ["solana:mainnet-beta"];
  if (!chains.length) throw new Error("at least one supported network is required");
  const price = body.price == null ? 0 : Number(body.price);
  if (!Number.isFinite(price) || price < 0) throw Object.assign(new Error("listing price must be a finite non-negative number"), { statusCode: 400 });
  const listing = {
    id: body.listingId || `listing_${randomUUID()}`,
    agentId: agent.id,
    service: body.service,
    description: body.description || "",
    endpoint: agent.url,
    capabilities: body.capabilities || [body.service],
    protocols: body.protocols || agent.protocols || ["HTTP"],
    chains,
    networkCapabilities: chains.map((id) => networkCapability(id)),
    price,
    asset,
    schema: body.schema || {},
    provenance: body.provenance || "provider-declared",
    status: "active",
    createdAt: now(),
    updatedAt: now(),
  };
  await (await store()).put("Listings", listing.id, listing, true);
  return listing;
}
async function sellerListingQuote(body) {
  const agentId = String(body.agent_id || body.agentId || "").trim();
  const { storage, agent } = await ownedSeller(agentId, body.owner_token || body.ownerToken);
  if (body.accept_terms !== true || String(body.terms_version || "") !== SELLER_TERMS_VERSION)
    throw Object.assign(new Error(`seller terms acceptance is required (${SELLER_TERMS_VERSION})`), { statusCode: 400 });
  const policy = await marketplacePolicy();
  const tierId = String(body.tier || "free").toLowerCase();
  const tier = policy.seller_tiers[tierId];
  if (!tier) throw Object.assign(new Error("seller tier is not supported"), { statusCode: 400 });
  const services = (agent.commercial_services || []).filter((service) => service.status !== "retired");
  if (!services.length) throw Object.assign(new Error("at least one commercial service is required before listing"), { statusCode: 400 });
  if (agent.status !== "connected") throw Object.assign(new Error("MCP verification must be connected before creating a listing quote"), { statusCode: 409 });
  if (!Array.isArray(agent.acceptedAssets) || !agent.acceptedAssets.length)
    throw Object.assign(new Error("accepted assets are required before creating a listing quote"), { statusCode: 400 });
  if (!agent.payout) throw Object.assign(new Error("payout configuration is required before creating a listing quote"), { statusCode: 400 });
  sellerPayout(agent.payout);
  if (services.length > tier.max_services || services.length > policy.max_services_per_seller)
    throw Object.assign(new Error(`seller tier permits at most ${tier.max_services} services; contact PrivateDAO to increase capacity`), { statusCode: 400 });
  const invalid = services.find((service) => !agent.allowed_tools?.includes(service.tool));
  if (invalid) throw Object.assign(new Error(`commercial service tool is not in the safe MCP allowlist: ${invalid.tool}`), { statusCode: 400 });
  const listingId = `seller_listing_${agent.id}`;
  const existing = await storage.get("Listings", listingId);
  const plan = sellerListingPlan(agent, services, policy, existing);
  if (existing?.payment_status === "paid" && plan.newServices.length && plan.amount === 0) {
    const nextLedger = [...plan.ledger, ...plan.newServices.map((service) => ({ service_id: service.id, status: "paid", fee_amount: 0, included: true, paid_at: now() }))];
    const nextListing = { ...existing, service_ids: [...new Set([...(existing.service_ids || []), ...plan.newServices.map((service) => service.id)])], pending_service_ids: [], commercial_services_hash: digest(services), updated_at: now() };
    await storage.put("Listings", listingId, nextListing);
    await storage.put("Registry", agent.id, { ...agent, listing_fee_ledger: nextLedger, updated_at: now() });
    return { listing: nextListing, status: "paid", policy, tier, fee_plan: { ...plan, amount: 0, items: plan.newServices.map((service) => ({ service_id: service.id, fee_amount: 0, included: true })) } };
  }
  if (existing?.payment_status === "paid" && !plan.newServices.length) return { listing: existing, status: "paid", policy, tier, fee_plan: plan };
  const amount = Number((existing?.payment_status === "paid" ? plan.amount : Number(tier.listing_fee_usd) + plan.items.reduce((sum, item) => sum + Number(item.fee_amount), 0)).toFixed(6));
  const quotedServices = existing?.payment_status === "paid" ? plan.newServices : services;
  const feeItems = existing?.payment_status === "paid"
    ? plan.items
    : services.map((service, index) => ({ service_id: service.id, fee_amount: index < policy.included_services ? 0 : policy.additional_service_fee_usd, included: index < policy.included_services }));
  const quoteId = `lq_${randomUUID()}`;
  const quote = {
    quote_id: quoteId, payment_type: existing?.payment_status === "paid" ? "seller_additional_service_fee" : "seller_listing_fee", listing_id: listingId,
    seller_agent_id: agent.id, seller_service_ids: quotedServices.map((service) => service.id), commercial_services_hash: digest(quotedServices), fee_items: feeItems, tier: tierId,
    amount, amountAtomic: Math.round(amount * 1e6), currency: "USDC", network: "solana-mainnet-beta",
    target_network: "agent-marketplace", mint: config.usdcMint, treasuryOwner: config.treasury,
    treasuryTokenAccount: await treasuryTokenAccount(config), recipient: config.treasury,
    paymentReference: `PDAO_LISTING:${listingId}:${quoteId}`, expires_at: new Date(Date.now() + 1800000).toISOString(),
    gross_amount: amount, platform_fee_amount: amount, platform_fee_bps: 10000, seller_net_amount: 0,
    terms_version: SELLER_TERMS_VERSION, terms_accepted_at: now(), billing_separation_disclosure: "PrivateDAO listing fees are separate from GitHub Marketplace billing.",
    settlement_status: "platform_collected", included_services: policy.included_services, additional_service_fee_usd: policy.additional_service_fee_usd, created_at: now(),
  };
  await storage.put("Quotes", quote.quote_id, quote, true);
  const listing = {
    ...(existing || {}), id: listingId, agentId: agent.id, seller_agent_id: agent.id, provider: agent.name, type: "seller_listing",
    tier: tierId, service_ids: existing?.payment_status === "paid" ? existing.service_ids || [] : quote.seller_service_ids, pending_service_ids: quote.seller_service_ids, listing_fee_status: existing?.payment_status === "paid" ? "paid" : "awaiting_payment", payment_status: existing?.payment_status === "paid" ? "paid" : "pending",
    status: existing?.payment_status === "paid" ? existing.status : "pending", commercial_publication_status: existing?.commercial_publication_status || "draft", quote_id: quote.quote_id, commercial_services_hash: quote.commercial_services_hash, terms_version: quote.terms_version, terms_accepted_at: quote.terms_accepted_at, created_at: existing?.created_at || now(), updated_at: now(),
  };
  await storage.put("Listings", listingId, listing);
  return { listing, quote, policy, tier, fee_plan: plan, status: "awaiting_payment" };
}
async function submitSellerListingPayment(id, body) {
  const storage = await store();
  const listing = await storage.get("Listings", id);
  if (!listing || listing.type !== "seller_listing") throw Object.assign(new Error("seller listing not found"), { statusCode: 404 });
  if (!body.signature || !body.quote_id && !body.quoteId) throw Object.assign(new Error("signature and quote_id are required"), { statusCode: 400 });
  const quote = await storage.get("Quotes", body.quote_id || body.quoteId);
  if (!quote || quote.listing_id !== id || !Number.isFinite(Date.parse(quote.expires_at)) || Date.parse(quote.expires_at) <= Date.now()) throw Object.assign(new Error("seller listing payment quote not found"), { statusCode: 404 });
  if (listing.payment_status === "paid" && (listing.payment_signature === body.signature || (quote.payment_type !== "seller_additional_service_fee" && listing.quote_id === quote.quote_id)))
    return { status: "paid", listing, receipt: listing.receipt_id ? await storage.get("Receipts", listing.receipt_id) : null };
  const agent = await storage.get("Registry", listing.seller_agent_id);
  if (!agent || agent.protocol !== "MCP") throw Object.assign(new Error("seller is no longer registered"), { statusCode: 404 });
  const currentServices = (agent.commercial_services || []).filter((service) => quote.seller_service_ids.includes(service.id));
  if (currentServices.length !== quote.seller_service_ids.length || digest(currentServices) !== quote.commercial_services_hash)
    throw Object.assign(new Error("seller services changed after this listing quote; request a new quote"), { statusCode: 409 });
  const payment = await verifyPayment(config, { signature: body.signature }, quote);
  if (payment.transient) return { status: "verifying", signature: body.signature, message: payment.reason, retryAfterSeconds: 3 };
  if (!payment.ok) throw Object.assign(new Error(payment.reason), { statusCode: 402 });
  if (!paymentWithinQuote(payment, quote)) throw Object.assign(new Error("seller listing payment quote expired before on-chain payment"), { statusCode: 402 });
  const paymentId = `payment_${body.signature}`;
  const existingPayment = await storage.get("Payments", paymentId);
  if (existingPayment && existingPayment.listing_id !== id) throw Object.assign(new Error("payment signature was already used"), { statusCode: 402 });
  if (!existingPayment) {
    const candidate = { id: paymentId, signature: body.signature, payment_type: "seller_listing_fee", listing_id: id, amount: quote.amount, asset: quote.currency, network: quote.network, consumed_at: now() };
    try {
      await storage.put("Payments", paymentId, candidate, true);
    } catch (error) {
      const raced = await storage.get("Payments", paymentId);
      if (!raced) throw error;
      if (raced.listing_id !== id) throw Object.assign(new Error("payment signature was already used"), { statusCode: 402 });
      return { status: "processing", listing, message: "payment accepted; listing activation is already in progress", retryAfterSeconds: 3 };
    }
  } else {
    const claimedAt = Date.parse(existingPayment.consumed_at || "");
    if (Number.isFinite(claimedAt) && Date.now() - claimedAt < 30000)
      return { status: "processing", listing, message: "payment accepted; listing activation is already in progress", retryAfterSeconds: 3 };
  }
  const feeType = quote.payment_type === "seller_additional_service_fee" ? "seller_additional_service_fee" : "seller_listing_fee";
  const settlementId = `seller_settlement_${id}_${quote.quote_id}`;
  const ledger = sellerServiceLedger(agent, listing);
  const ledgerById = new Map(ledger.map((item) => [item.service_id, item]));
  for (const item of quote.fee_items || []) ledgerById.set(item.service_id, { service_id: item.service_id, status: "paid", fee_amount: Number(item.fee_amount || 0), included: Boolean(item.included), quote_id: quote.quote_id, payment_signature: body.signature, paid_at: now() });
  const nextLedger = [...ledgerById.values()];
  const settlement = { id: settlementId, kind: "seller_settlement", fee_type: feeType, listing_id: id, seller_agent_id: agent.id, seller_service_ids: quote.seller_service_ids, gross_amount: quote.amount, platform_fee_amount: quote.amount, platform_fee_bps: 10000, protocol_fee: quote.amount, seller_net_amount: 0, seller_amount: 0, asset: quote.currency, payout: null, status: "platform_collected", created_at: now() };
  const receipt = { receipt_id: receiptId({ listing_id: id, payment_signature: body.signature, amount: quote.amount }), listing_id: id, fee_type: feeType, seller_agent_id: agent.id, seller_service_ids: quote.seller_service_ids, fee_items: quote.fee_items || [], tier: listing.tier, payment_signature: body.signature, amount: quote.amount, gross_amount: quote.amount, platform_fee_amount: quote.amount, platform_fee_bps: 10000, seller_net_amount: 0, asset: quote.currency, network: quote.network, treasury: config.treasury, seller_settlement: settlement, status: "VERIFIED", created_at: listing.created_at, completed_at: now() };
  receipt.public_url = `https://${config.domain}/receipts/${encodeURIComponent(receipt.receipt_id)}`;
  receipt.verification_url = `https://${config.domain}/verify/receipt/${encodeURIComponent(receipt.receipt_id)}`;
  await storage.put("Registry", settlementId, settlement);
  await storage.put("Receipts", receipt.receipt_id, receipt);
  await storage.put("Revenue", `rev_${id}_${quote.quote_id}`, { id: `rev_${id}_${quote.quote_id}`, feeType, listingId: id, seller_agent_id: agent.id, seller_service_ids: quote.seller_service_ids, grossAmount: quote.amount, providerAmount: 0, protocolFee: quote.amount, platformFeeAmount: quote.amount, feeBps: 10000, asset: quote.currency, paymentSignature: body.signature, settlementStatus: "platform_collected", timestamp: now() });
  const paidServiceIds = [...new Set([...(listing.service_ids || []), ...quote.seller_service_ids])];
  const isAdditional = quote.payment_type === "seller_additional_service_fee";
  const nextListing = { ...listing, payment_status: "paid", listing_fee_status: "paid", service_ids: paidServiceIds, pending_service_ids: [], commercial_publication_status: isAdditional ? listing.commercial_publication_status : "eligible", status: isAdditional ? listing.status : "eligible", payment_signature: body.signature, receipt_id: receipt.receipt_id, settlement_id: settlementId, paid_at: now(), updated_at: now() };
  await storage.put("Listings", id, nextListing);
  await storage.put("Registry", agent.id, { ...agent, commercial_publication_status: isAdditional ? agent.commercial_publication_status : "eligible", listing_fee_status: "paid", listing_fee_ledger: nextLedger, seller_tier: listing.tier, listing_fee_quote_id: quote.quote_id, listing_fee_payment_signature: body.signature, listing_fee_paid_at: now(), updated_at: now() });
  return { status: "paid", listing: nextListing, receipt, settlement };
}
async function sellerListingPaymentIntent(id) {
  const listing = await (await store()).get("Listings", id);
  if (!listing || listing.type !== "seller_listing") throw Object.assign(new Error("seller listing not found"), { statusCode: 404 });
  const quote = await (await store()).get("Quotes", listing.quote_id);
  if (listing.payment_status === "paid" && (!quote || quote.payment_type !== "seller_additional_service_fee" || !(listing.pending_service_ids || []).length)) return { listing_id: id, status: "paid", listing };
  if (!quote || Date.parse(quote.expires_at) <= Date.now()) throw Object.assign(new Error("seller listing payment quote expired; create a new quote"), { statusCode: 402 });
  return { listing_id: id, status: "awaiting_payment", quote_id: quote.quote_id, amount: quote.amount.toFixed(6), amountBaseUnits: String(quote.amountAtomic), currency: quote.currency, network: quote.network, mint: quote.mint, treasuryOwner: quote.treasuryOwner, treasuryTokenAccount: quote.treasuryTokenAccount, paymentReference: quote.paymentReference, expiresAt: quote.expires_at };
}
async function buildSellerListingPaymentTransaction(id, payerText, sourceTokenAccountText = "") {
  if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(payerText || "")) throw Object.assign(new Error("valid payer wallet is required"), { statusCode: 400 });
  const intent = await sellerListingPaymentIntent(id);
  if (intent.status === "paid") throw Object.assign(new Error("seller listing is already paid"), { statusCode: 409 });
  let source = sourceTokenAccountText ? { pubkey: sourceTokenAccountText } : null;
  if (source && !/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(source.pubkey)) throw Object.assign(new Error("valid source token account is required"), { statusCode: 400 });
  if (!source) {
    const accounts = await readRpc(config, "getTokenAccountsByOwner", [payerText, { mint: intent.mint }, { encoding: "jsonParsed" }]);
    source = (accounts.result?.value || []).find((item) => Number(item.account?.data?.parsed?.info?.tokenAmount?.amount || 0) >= Number(intent.amountBaseUnits));
  }
  if (!source) throw Object.assign(new Error("payer wallet has no funded Solana USDC token account"), { statusCode: 402 });
  const latest = await readRpc(config, "getLatestBlockhash", [{ commitment: "finalized" }]);
  return { payer: payerText, sourceTokenAccount: source.pubkey, mint: intent.mint, treasuryOwner: intent.treasuryOwner, treasuryTokenAccount: intent.treasuryTokenAccount, amountBaseUnits: intent.amountBaseUnits, paymentReference: intent.paymentReference, quoteId: intent.quote_id, recentBlockhash: latest.result.value.blockhash, lastValidBlockHeight: latest.result.value.lastValidBlockHeight, expiresAt: intent.expiresAt };
}
async function requestLogistics(body) {
  if (!body.capability) throw new Error("capability is required");
  const network = body.network ? normalizeNetworkId(body.network) : null;
  const registryMatches = await matchRegisteredAgents({
    capabilities: [body.capability],
    network,
  });
  const matchesByAgentId = new Map(
    registryMatches.matches.map((match) => [match.id, match]),
  );
  const candidates = (await listListings({ ...body, network }))
    .map((listing) => {
      const match = listing.agentId ? matchesByAgentId.get(listing.agentId) : null;
      if (!match) return listing;
      // Keep marketplace fields, but expose the canonical Registry identity so
      // logistics and agent_match return the same candidate set.
      return {
        ...listing,
        id: match.id,
        network_match: match.network_match,
        match_score: match.match_score,
      };
    })
    .sort((a, b) => Number(a.price) - Number(b.price))
    .slice(0, 10);
  const firstParty = serviceById(body.capability)
    ? [
        {
          provider: "PrivateDAO",
          service: body.capability,
          price: serviceById(body.capability).price,
          asset: "USDC",
          chains: ["solana-mainnet-beta"],
          verified: true,
        },
      ]
    : [];
  const request = {
    id: `log_${randomUUID()}`,
    capability: body.capability,
    requirements: body.requirements || {},
    maxPrice: body.maxPrice ?? null,
    asset: body.asset || "USDC",
    deadline: body.deadline || null,
    preferredProtocols: body.preferredProtocols || [],
    candidates: [...firstParty, ...candidates],
    ...(network ? { network } : { network: "solana-mainnet-beta" }),
    status: "quoted",
    createdAt: now(),
  };
  await (await store()).put("Logistics", request.id, request, true);
  return request;
}
async function createAgreement(body) {
  for (const field of ["buyerAgent", "providerAgent", "service", "price"])
    if (body[field] == null) throw new Error(`${field} is required`);
  const price = Number(body.price);
  if (!Number.isFinite(price) || price < 0) throw Object.assign(new Error("agreement price must be a finite non-negative number"), { statusCode: 400 });
  const asset = String(body.asset || "USDC").toUpperCase().trim();
  if (asset !== "USDC")
    throw Object.assign(new Error("agreement asset must be USDC for the current settlement rail"), { statusCode: 400 });
  const policy = await marketplacePolicy();
  const platformFeeBps = Number(policy.platform_fee_bps);
  const agreement = {
    id: `agr_${randomUUID()}`,
    agreementId: `agr_${randomUUID()}`,
    buyerAgent: body.buyerAgent,
    providerAgent: body.providerAgent,
    service: body.service,
    inputCommitment: digest(body.input || {}),
    price,
    asset,
    platformFeeBps,
    protocolFee: Number(((price * platformFeeBps) / 10000).toFixed(6)),
    providerAmount: Number(
      (price - (price * platformFeeBps) / 10000).toFixed(6),
    ),
    deadline: body.deadline || null,
    deliveryRequirements: body.deliveryRequirements || {},
    status: "proposed",
    createdAt: now(),
  };
  await (await store()).put("Agreements", agreement.id, agreement, true);
  return agreement;
}
async function getAgreement(id) {
  return (await store()).get("Agreements", id);
}
async function acceptAgreement(id, body) {
  const agreement = await getAgreement(id);
  if (!agreement)
    throw Object.assign(new Error("agreement not found"), { statusCode: 404 });
  if (agreement.status !== "proposed" && agreement.status !== "quoted")
    throw new Error("agreement cannot be accepted in its current state");
  if (!body.buyerAgent)
    throw Object.assign(new Error("buyerAgent is required to accept this agreement"), { statusCode: 400 });
  if (body.buyerAgent !== agreement.buyerAgent)
    throw Object.assign(new Error("buyer agent mismatch"), { statusCode: 403 });
  agreement.status = agreement.price > 0 ? "awaiting_payment" : "accepted";
  agreement.acceptedAt = now();
  await (await store()).put("Agreements", id, agreement);
  return agreement;
}
async function revenueSummary() {
  const entries = await (await store()).list("Revenue");
  const summary = entries.reduce(
    (value, item) => {
      const asset = item.asset || "UNKNOWN";
      const bucket = value.byAsset[asset] || { grossAmount: 0, protocolFee: 0, jobs: 0 };
      bucket.grossAmount += Number(item.grossAmount || 0);
      bucket.protocolFee += Number(item.protocolFee || 0);
      bucket.jobs += 1;
      value.byAsset[asset] = bucket;
      value.jobs += 1;
      value.grossAmount += Number(item.grossAmount || 0);
      value.protocolFee += Number(item.protocolFee || 0);
      return value;
    },
    { jobs: 0, grossAmount: 0, protocolFee: 0, byAsset: {} },
  );
  const assets = Object.keys(summary.byAsset);
  return { ...summary, asset: assets.length === 1 ? assets[0] : "MULTI" };
}
async function telemetrySummary() {
  const events = await (await store()).list("Telemetry");
  const byEvent = {};
  const byService = {};
  for (const event of events) {
    byEvent[event.event] = (byEvent[event.event] || 0) + 1;
    if (event.service) byService[event.service] = (byService[event.service] || 0) + 1;
  }
  return {
    network: "solana-mainnet-beta",
    totalEvents: events.length,
    byEvent,
    byService,
    providerRuntime: evmRuntimeStats(),
    lastEventAt: events.map((event) => event.createdAt).sort().at(-1) || null,
  };
}
async function treasuryStatus() {
  const ata = await treasuryTokenAccount(config);
  const [native, token, activity] = await Promise.all([
    readRpc(config, "getBalance", [config.treasury]),
    readRpc(config, "getTokenAccountBalance", [ata]).catch(() => ({
      result: { value: null },
    })),
    readRpc(config, "getSignaturesForAddress", [ata, { limit: 10 }]),
  ]);
  return {
    network: "solana:mainnet-beta",
    owner: config.treasury,
    usdcMint: config.usdcMint,
    usdcAta: ata,
    solLamports: native.result?.value || 0,
    usdc: token.result?.value || null,
    usdcStatus: token.result?.value ? "ready" : "ATA_NOT_INITIALIZED",
    recentSignatures: (activity.result || []).map((item) => ({
      signature: item.signature,
      slot: item.slot,
      status: item.err ? "failed" : "confirmed",
      blockTime: item.blockTime || null,
    })),
    notifications: {
      telegram: config.telegramNotifications ? "configured" : "disabled",
      discord: config.discordNotifications ? "configured" : "disabled",
      custody: "receive-only",
    },
    observedAt: now(),
  };
}
async function recordRevenue(job, payment) {
  const grossAmount = Number(payment?.amount || 0);
  const policy = await marketplacePolicy();
  const firstParty = !job?.seller_agent_id;
  const feeBps = firstParty ? 0 : Number(job.platform_fee_bps ?? policy.platform_fee_bps);
  const protocolFee = Number(
    ((grossAmount * feeBps) / 10000).toFixed(6),
  );
  await (
    await store()
  ).put(
    "Revenue",
    `rev_${job.id}`,
    {
      id: `rev_${job.id}`,
      jobId: job.id,
      service: job.service_id,
      revenueClass: firstParty ? "first_party_service" : "external_seller_service",
      seller_agent_id: job.seller_agent_id || null,
      grossAmount,
      providerAmount: grossAmount - protocolFee,
      protocolFee,
      platformFeeAmount: protocolFee,
      feeBps,
      asset: payment?.currency || "USDC",
      paymentSignature: payment?.signature || null,
      timestamp: now(),
    },
    true,
  );
}
const upstreamFailurePattern = /(?:DynamoDB storage unavailable|DynamoDB|provided key element|ValidationException|Solana RPC|Jupiter quote HTTP|market data HTTP|IBM watsonx HTTP|Intel inference HTTP|GitHub (?:API returned|repository API) HTTP|RPC is not configured|fetch failed)/i;
function publicErrorMessage(error) {
  const message = String(error?.message || "request failed");
  return Number(error?.statusCode) >= 500 || upstreamFailurePattern.test(message)
    ? "upstream service temporarily unavailable"
    : message;
}
function errorResponse(error) {
  const rawStatus = Number(error?.statusCode);
  const upstreamFailure = !Number.isFinite(rawStatus) && upstreamFailurePattern.test(String(error?.message || ""));
  const status = Number.isFinite(rawStatus) && rawStatus > 0 ? rawStatus : upstreamFailure ? 502 : 400;
  const message = publicErrorMessage(error);
  return json(
    {
      error: status === 402 ? "payment_required" : "request_failed",
      message,
      ...(error.payment_intent ? { payment_intent: error.payment_intent } : {}),
      ...(error.quote ? { quote: error.quote } : {}),
      ...(error.retryAfterSeconds ? { retry_after_seconds: error.retryAfterSeconds } : {}),
    },
    status,
    {
      ...(status === 402 ? { "www-authenticate": "Solana" } : {}),
      ...(error.retryAfterSeconds ? { "retry-after": String(error.retryAfterSeconds) } : {}),
    },
  );
}

function publicJobStatus(job) {
  if (!job) return job;
  const { execution_input: _privateInput, ...publicJob } = job;
  return {
    ...publicJob,
    target_network: normalizeNetworkId(job.execution_input?.network || job.target_network || "") || null,
  };
}

async function makeQuote(serviceId, jobId, admin = false, currency = "USDC", targetNetwork = null) {
  const service = serviceById(serviceId);
  if (!service) throw new Error("unknown service");
  const amount = admin && currency === "SOL"
    ? 0.0001
    : admin
      ? 0.01
      : Number((service.price * config.priceMultiplier).toFixed(6));
  const policy = await marketplacePolicy();
  const platformFeeAmount = 0;
  let ata = null;
  let ataExists = null;
  if (service.price && currency === "USDC") {
    ata = await treasuryTokenAccount(config);
    const account = await readRpc(config, "getAccountInfo", [
      ata,
      { commitment: "finalized", encoding: "base64" },
    ]);
    ataExists = Boolean(account.result?.value);
  }
  // Give a real wallet enough time to connect, create its ATA if needed, sign,
  // and reach finalized status; payment verification still requires the quote.
  const expiresAt = new Date(Date.now() + (admin ? 3600000 : 1800000));
  const quote = {
    created_at: now(),
    quote_id: `q_${randomUUID()}`,
    job_id: jobId,
    service_id: serviceId,
    amount,
    gross_amount: amount,
    revenue_class: "first_party_service",
    platform_fee_bps: 0,
    platform_fee_amount: platformFeeAmount,
    private_dao_revenue_amount: amount,
    seller_net_amount: null,
    amountAtomic: Math.round(amount * (currency === "SOL" ? 1e9 : 1e6)),
    currency,
    network: "solana-mainnet-beta",
    target_network: normalizeNetworkId(targetNetwork || "solana-mainnet-beta"),
    mint: config.usdcMint,
    treasuryOwner: config.treasury,
    treasuryTokenAccount: ata,
    recipient: config.treasury,
    paymentReference: `PDAOJOB:${jobId}`,
    expires_at: expiresAt.toISOString(),
    expires_at_utc: expiresAt.toISOString(),
    expires_at_epoch_ms: expiresAt.getTime(),
    payment_required: Boolean(service.price),
    ata_required: ataExists === false,
  };
  await (await store()).put("Quotes", quote.quote_id, quote, true);
  return quote;
}

async function externalServiceById(serviceId) {
  return (await externalServiceManifests()).find((service) => service.id === serviceId);
}
async function createExternalJob(serviceId, input = {}) {
  const service = await externalServiceById(serviceId);
  if (!service) throw Object.assign(new Error("unknown external service"), { statusCode: 404 });
  const id = `job_${randomUUID()}`;
  const job = { id, kind: "external", service_id: service.id, seller_agent_id: service.seller_agent_id, seller_tool: service.tool, seller_service_id: service.service_id, seller_name: service.provider, input_hash: digest(input), execution_input: input, status: service.free ? "running" : "awaiting_payment", created_at: now(), payment_network: "solana-mainnet-beta", payment_asset: service.asset, target_network: normalizeNetworkId(service.network) };
  const storage = await store();
  await storage.put("Jobs", id, job, true);
  if (service.free) return completeExternalJob(job, await invokeMcpAgent(await storage.get("Registry", service.seller_agent_id), service.tool, input), null);
  const amount = Number((service.price * config.priceMultiplier).toFixed(6));
  const policy = await marketplacePolicy();
  const platformFee = Number(((amount * policy.platform_fee_bps) / 10000).toFixed(6));
  const sellerNet = Number((amount - platformFee).toFixed(6));
  const ata = await treasuryTokenAccount(config);
  const quote = { created_at: now(), quote_id: `q_${randomUUID()}`, job_id: id, service_id: service.id, external: true, seller_agent_id: service.seller_agent_id, seller_service_id: service.service_id, seller_tool: service.tool, amount, amountAtomic: Math.round(amount * 1e6), gross_amount: amount, platform_fee_bps: policy.platform_fee_bps, platform_fee_amount: platformFee, protocol_fee: platformFee, seller_net_amount: sellerNet, seller_amount: sellerNet, currency: service.asset, network: "solana-mainnet-beta", target_network: service.network, mint: config.usdcMint, treasuryOwner: config.treasury, treasuryTokenAccount: ata, recipient: config.treasury, paymentReference: `PDAOJOB:${id}`, expires_at: new Date(Date.now() + 1800000).toISOString(), payment_required: true, seller_payout: service.payout || (await storage.get("Registry", service.seller_agent_id))?.payout || null };
  job.platform_fee_bps = policy.platform_fee_bps;
  await storage.put("Quotes", quote.quote_id, quote, true);
  job.quote_id = quote.quote_id;
  await storage.put("Jobs", id, job);
  return { job_id: id, status: "awaiting_payment", seller: { agent_id: service.seller_agent_id, name: service.provider }, payment_intent: { jobId: id, quoteId: quote.quote_id, amount: quote.amount.toFixed(6), amountBaseUnits: String(quote.amountAtomic), mint: quote.mint, network: quote.network, target_network: quote.target_network, treasuryOwner: quote.treasuryOwner, treasuryTokenAccount: quote.treasuryTokenAccount, paymentReference: quote.paymentReference, expiresAtUtc: quote.expires_at } };
}
async function completeExternalJob(job, execution, payment) {
  const storage = await store();
  if (job.status === "completed" && job.receipt_id) return { job_id: job.id, status: job.status, result: job.result, receipt: await storage.get("Receipts", job.receipt_id) };
  const result = execution?.result || execution;
  const policy = await marketplacePolicy();
  const feeBps = Number(job.platform_fee_bps ?? policy.platform_fee_bps);
  const grossAmount = Number(payment?.amount || 0);
  const platformFee = Number(((grossAmount * feeBps) / 10000).toFixed(6));
  const sellerNet = Number((grossAmount - platformFee).toFixed(6));
  const persistence = await persistEvidence(config, { job_id: job.id, service: job.service_id, input_hash: job.input_hash, completed_at: now(), result });
  const settlement = { id: `seller_settlement_${job.id}`, kind: "seller_settlement", job_id: job.id, seller_agent_id: job.seller_agent_id, gross_amount: grossAmount, platform_fee_amount: platformFee, platform_fee_bps: feeBps, protocol_fee: platformFee, seller_net_amount: sellerNet, seller_amount: sellerNet, asset: payment?.currency || job.payment_asset, payout: (await storage.get("Registry", job.seller_agent_id))?.payout || null, status: "payable_pending_admin_settlement", created_at: now() };
  await storage.put("Registry", settlement.id, settlement, true);
  const receipt = { receipt_id: receiptId({ job_id: job.id, service: job.service_id, result_hash: digest(result) }), job_id: job.id, service: job.service_id, input_hash: job.input_hash, result_hash: digest(result), evidence_hash: digest(result), payment_signature: payment?.signature || null, amount: payment?.amount || 0, gross_amount: grossAmount, platform_fee_amount: platformFee, platform_fee_bps: feeBps, seller_net_amount: sellerNet, asset: payment?.currency || null, treasury: config.treasury, network: "solana-mainnet-beta", target_network: job.target_network || null, seller_agent_id: job.seller_agent_id, seller_service_id: job.seller_service_id, seller_settlement: { id: settlement.id, gross_amount: settlement.gross_amount, platform_fee_amount: settlement.platform_fee_amount, platform_fee_bps: settlement.platform_fee_bps, protocol_fee: settlement.protocol_fee, seller_net_amount: settlement.seller_net_amount, seller_amount: settlement.seller_amount, status: settlement.status }, evidence_persistence: persistence.status, status: "VERIFIED", created_at: job.created_at, completed_at: now() };
  receipt.public_url = `https://${config.domain}/receipts/${encodeURIComponent(receipt.receipt_id)}`;
  receipt.verification_url = `https://${config.domain}/verify/receipt/${encodeURIComponent(receipt.receipt_id)}`;
  await storage.put("Receipts", receipt.receipt_id, receipt, true);
  job.status = "completed"; job.result = result; job.receipt_id = receipt.receipt_id; job.completed_at = receipt.completed_at;
  await storage.put("Jobs", job.id, job);
  await recordRevenue(job, payment);
  return { job_id: job.id, status: job.status, result, receipt };
}
async function submitExternalPayment(jobId, body) {
  const storage = await store();
  const job = await storage.get("Jobs", jobId);
  if (!job || job.kind !== "external") throw Object.assign(new Error("external job not found"), { statusCode: 404 });
  if (job.status === "completed") return publicJobStatus(job);
  if (job.status === "recovery_required") {
    return {
      job_id: jobId,
      status: "recovery_required",
      recovery_required: true,
      message: "payment was accepted but execution requires recovery; the external service will not be replayed automatically",
      retryAfterSeconds: 30,
    };
  }
  const quote = (await storage.list("Quotes")).find((item) => item.job_id === jobId && item.external);
  if (!quote) throw new Error("external quote not found");
  if (!Number.isFinite(Date.parse(quote.expires_at)) || Date.parse(quote.expires_at) <= Date.now())
    throw Object.assign(new Error("external payment quote expired"), { statusCode: 402 });
  const payment = await verifyPayment(config, { signature: body.signature }, quote);
  if (payment.transient) return { status: "verifying", message: payment.reason, retryAfterSeconds: 3 };
  if (!payment.ok) throw Object.assign(new Error(payment.reason), { statusCode: 402, payment_intent: { jobId, quoteId: quote.quote_id, status: "awaiting_payment" } });
  if (!paymentWithinQuote(payment, quote)) throw Object.assign(new Error("external payment quote expired before on-chain payment"), { statusCode: 402 });
  const claimId = `payment_${body.signature}`;
  let claim = await storage.get("Payments", claimId);
  if (claim && claim.job_id !== jobId) throw Object.assign(new Error("payment signature was already used"), { statusCode: 402 });
  let claimedByThisInvocation = false;
  if (!claim) {
    const candidate = { id: claimId, signature: body.signature, job_id: jobId, consumed_at: now() };
    try {
      await storage.put("Payments", claimId, candidate, true);
      claimedByThisInvocation = true;
    } catch (error) {
      let raced = await storage.get("Payments", claimId);
      if (!raced) {
        await new Promise((resolve) => setTimeout(resolve, 0));
        raced = await storage.get("Payments", claimId);
      }
      if (!raced) throw Object.assign(new Error("payment claim could not be resolved after a concurrent request"), { statusCode: 409 });
      if (raced.job_id !== jobId) throw Object.assign(new Error("payment signature was already used"), { statusCode: 402 });
      claim = raced;
    }
  }
  if (!claimedByThisInvocation && claim) {
    // Never replay an external MCP call from a stale payment claim. The
    // provider may have completed the side effect before Lambda crashed, so
    // a buyer retry must remain non-executing.
    const recoveryJob = {
      ...job,
      status: "recovery_required",
      recovery_required_at: now(),
      recovery_reason: "payment_claim_exists_without_a_completed_receipt",
      updated_at: now(),
    };
    await storage.put("Jobs", job.id, recoveryJob);
    return {
      job_id: jobId,
      status: "recovery_required",
      recovery_required: true,
      message: "payment was accepted but execution requires recovery; the external service will not be replayed automatically",
      retryAfterSeconds: 30,
    };
  }
  const agent = await storage.get("Registry", job.seller_agent_id);
  if (!activeRegistryAgent(agent)) throw new Error("seller is no longer active");
  job.execution_started_at = now();
  await storage.put("Jobs", job.id, job);
  const execution = await invokeMcpAgent(agent, job.seller_tool, job.execution_input);
  return completeExternalJob(job, execution, { signature: body.signature, currency: quote.currency, amount: quote.amount });
}

async function matchRegisteredAgents(input = {}) {
  const all = await activeRegistryAgents();
  const wanted = new Set(input?.capabilities || []);
  const requestedNetwork = input?.network ? normalizeNetworkId(input.network) : null;
  return {
    matches: all
      .filter((x) => ["verified", "connected"].includes(x.status))
      .filter((x) => !requestedNetwork || !(x.networks || []).length || x.networks.map(normalizeNetworkId).includes(requestedNetwork))
      .map((x) => ({
        ...publicRegistryAgent(x),
        network_match: requestedNetwork ? ((x.networks || []).length ? x.networks.map(normalizeNetworkId).includes(requestedNetwork) : "capability-declared") : null,
        match_score:
          (x.capabilities || []).filter((c) => wanted.has(c)).length /
          Math.max(wanted.size, 1),
      }))
      .sort((a, b) => b.match_score - a.match_score)
      .slice(0, 20),
  };
}

async function executeService(id, input) {
  if (id === "github.repository") return repositoryEvidence(config, input);
  const requestedNetwork = input?.network ? normalizeNetworkId(input.network) : "";
  const normalizedInput = requestedNetwork ? { ...input, network: requestedNetwork } : input;
  const service = serviceById(id);
  if (["research.asset", "research.wallet", "contract.explain", "transaction.explain", "anomaly.detect", "agent.research.report", "portfolio.intelligence", "market.snapshot"].includes(id)) {
    if (!service?.supportedNetworks?.includes(requestedNetwork))
      throw new Error(`${id} is not supported on ${requestedNetwork || "this network"}`);
    if (id === "research.asset") return researchAsset(config, normalizedInput);
    if (id === "research.wallet") return researchWallet(config, normalizedInput);
    if (id === "contract.explain") return explainContract(config, normalizedInput);
    if (id === "transaction.explain") return explainTransaction(config, normalizedInput);
    if (id === "anomaly.detect") return detectAnomaly(config, normalizedInput);
    if (id === "agent.research.report") return researchReport(config, normalizedInput);
    if (id === "market.snapshot") return marketSnapshot(config, normalizedInput);
    return portfolioIntelligence(config, normalizedInput);
  }
  if (requestedNetwork && evmNetwork(requestedNetwork)) {
    if (!service?.supportedNetworks?.includes(requestedNetwork))
      throw new Error(`${id} is not supported on ${requestedNetwork}`);
    return executeEvmService(config, id, normalizedInput);
  }
  if (requestedNetwork && requestedNetwork !== "solana-mainnet-beta")
    throw new Error(`unsupported target network: ${requestedNetwork}`);
  if (id === "swap.quote") return swapQuote(config, normalizedInput);
  if (id === "transaction.simulate") return simulateSolanaTransaction(config, normalizedInput);
  if (id === "verify.basic" || id === "verify.deep") {
    const mint = input?.mint || input?.asset;
    if (mint) {
      const evidence = await mintEvidence(config, mint);
      if (id === "verify.deep") {
        const sigs = await readRpc(config, "getSignaturesForAddress", [
          input.mint,
          { limit: 50 },
        ]);
        evidence.recent_activity = sigs.result;
        evidence.risk_flags = [];
      }
      return evidence;
    }
    if (!input?.record || typeof input.record !== "object")
      throw new Error("mint or record is required");
    const inputHash = digest(input.record);
    return {
      verification_status:
        input.expected_digest && input.expected_digest !== inputHash
          ? "INVALID"
          : "VERIFIED",
      input_hash: inputHash,
      canonicalization: "privatedao-agent-v1",
      checks: [
        {
          name: "canonical_digest",
          passed: !input.expected_digest || input.expected_digest === inputHash,
        },
      ],
    };
  }
  if (id === "forensics.trace") {
    const address = input?.wallet || input?.address;
    if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address || ""))
      throw new Error("valid Solana wallet is required");
    const result = await readRpc(config, "getSignaturesForAddress", [
      address,
      { limit: Math.min(Number(input.limit || 20), 100) },
    ]);
    return {
      address,
      evidence_confidence: "rpc-confirmed",
      signatures: result.result.map((x) => ({
        signature: x.signature,
        slot: x.slot,
        err: x.err,
        block_time: x.blockTime,
      })),
    };
  }
  if (
    [
      "token.intelligence",
      "risk.score",
      "launch.check",
      "market.snapshot",
    ].includes(id)
  ) {
    const evidence = await mintEvidence(config, input?.mint || input?.asset);
    const authorityRisk = [
      evidence.mint_authority,
      evidence.freeze_authority,
    ].filter(Boolean).length;
    if (id === "risk.score")
      return {
        mint: evidence.mint,
        cluster: evidence.cluster,
        score: Math.max(0, 100 - authorityRisk * 25),
        factors: {
          mint_authority_present: Boolean(evidence.mint_authority),
          freeze_authority_present: Boolean(evidence.freeze_authority),
          evidence_confidence: evidence.evidence_confidence,
        },
        methodology: "deterministic-authority-v1",
      };
    if (id === "market.snapshot")
      return {
        mint: evidence.mint,
        cluster: evidence.cluster,
        supply: evidence.supply,
        decimals: evidence.decimals,
        largest_accounts: evidence.largest_accounts,
        observed_at: evidence.observed_at,
        provider: evidence.provider_source,
      };
    if (id === "launch.check")
      return {
        mint: evidence.mint,
        cluster: evidence.cluster,
        valid: evidence.valid,
        authority_flags: {
          mint_authority_present: Boolean(evidence.mint_authority),
          freeze_authority_present: Boolean(evidence.freeze_authority),
        },
        evidence_confidence: evidence.evidence_confidence,
        observed_at: evidence.observed_at,
      };
    return {
      ...evidence,
      service: id,
      holder_snapshot: evidence.largest_accounts,
      metadata_status: evidence.valid ? "on-chain-account-found" : "not-found",
    };
  }
  if (id === "wallet.intelligence") {
    const address = input?.wallet || input?.address;
    if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address || ""))
      throw new Error("valid Solana wallet is required");
    const result = await readRpc(config, "getSignaturesForAddress", [
      address,
      { limit: Math.min(Number(input.limit || 25), 100) },
    ]);
    return {
      address,
      cluster: "mainnet-beta",
      observed_signatures: result.result.length,
      recent_activity: result.result.map((x) => ({
        signature: x.signature,
        slot: x.slot,
        blockTime: x.blockTime || null,
        error: x.err || null,
      })),
      evidence_confidence: "rpc-confirmed",
    };
  }
  if (id === "contract.inspect") {
    const address = input?.program || input?.address;
    if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address || ""))
      throw new Error("valid Solana program is required");
    const result = await readRpc(config, "getAccountInfo", [
      address,
      { encoding: "base64" },
    ]);
    return {
      address,
      cluster: "mainnet-beta",
      exists: Boolean(result.result?.value),
      owner: result.result?.value?.owner || null,
      executable: result.result?.value?.executable || false,
      lamports: result.result?.value?.lamports || 0,
      evidence_confidence: "rpc-confirmed",
    };
  }
  if (id === "decision.context")
    return {
      cluster: "mainnet-beta",
      evidence_digest: digest(input?.evidence || input),
      checks: [
        {
          name: "structured_input",
          passed: Boolean(input && typeof input === "object"),
        },
      ],
      methodology: "deterministic-context-v1",
    };
  if (id === "receipt.verify") {
    const actual = digest(input?.receipt || {});
    return {
      verification_status:
        input?.expected_hash && input.expected_hash !== actual
          ? "INVALID"
          : "VERIFIED",
      receipt_digest: actual,
      cluster: "mainnet-beta",
    };
  }
  if (id === "agent.match") {
    return matchRegisteredAgents(input);
  }
  if (id === "intelligence.synthesize") {
    let inference = await runIntelInference(config, {
      evidence: input?.evidence || input,
      requested_output: input?.requested_output || "structured synthesis",
    });
    if (inference.status !== "completed" && ibmProviderStatus(config).status === "configured") {
      try {
        inference = await runWatsonxInference(config, {
          evidence: input?.evidence || input,
          requested_output: input?.requested_output || "structured synthesis",
        });
      } catch (error) {
        inference = { ...inference, fallback: { provider: "ibm-watsonx", status: "unavailable", reason: error.message } };
      }
    }
    return {
      status: inference.status,
      provider: inference.provider,
      model: inference.model,
      result: inference.result,
      evidence_digest: digest(input?.evidence || input),
      machine_readable: true,
      ...(inference.note ? { note: inference.note } : {}),
    };
  }
  if (id === "game.tool") {
    const world = String(input?.world || "dao").slice(0, 40);
    const tool = String(input?.tool || "privacy-lens").slice(0, 60);
    const allowedTools = new Set(["privacy-lens", "verification-scanner", "hoverboard"]);
    if (!allowedTools.has(tool)) throw new Error("unknown game tool");
    return {
      entitlement: `pdao.game.${world}.${tool}`,
      world,
      tool,
      delivery: "accountless receipt-bound entitlement",
      network: "solana-mainnet-beta",
      note: "This entitlement unlocks an optional cosmetic or gameplay convenience; it does not guarantee profit or token value.",
    };
  }
  if (id === "sponsored.discovery") {
    if (!input?.campaignId || !input?.destination)
      throw new Error("campaignId and destination are required");
    const campaign = {
      id: input.campaignId,
      subject: input.subject || input.name,
      destination: input.destination,
      targetCapabilities: input.targetCapabilities || [],
      targetChains: input.targetChains || ["solana"],
      tags: input.tags || [],
      start: input.start || now(),
      expiry: input.expiry,
      price: 5,
      sponsored: true,
      disclosure: "sponsored",
    };
    await (await store()).put("Campaigns", campaign.id, campaign, true);
    return { campaign };
  }
  throw new Error("service implementation unavailable");
}

async function executeMeasuredService(id, input) {
  const before = evmRuntimeStats();
  const result = await executeService(id, input);
  const after = evmRuntimeStats();
  return {
    result,
    telemetry: {
      providerCalls: Math.max(0, after.calls - before.calls),
      cacheHits: Math.max(0, after.cache_hits - before.cache_hits),
      cacheMisses: Math.max(0, after.cache_misses - before.cache_misses),
    },
  };
}

async function createJob(serviceId, input, admin = false, currency = "USDC", metadata = {}) {
  const service = serviceById(serviceId);
  if (!service) throw new Error("unknown service");
  validateServiceInput(serviceId, input);
  const persistForPaymentRetry = Boolean(service.price);
  const job = {
    id: `job_${randomUUID()}`,
    service_id: serviceId,
    input_hash: digest(input),
    status: service.price ? "awaiting_payment" : "running",
    created_at: now(),
    expires_at: new Date(Date.now() + 1800000).toISOString(),
    ...(persistForPaymentRetry ? { execution_input: input } : {}),
  };
  await (await store()).put("Jobs", job.id, job, true);
  trackFunnel("job_created", { service: serviceId, ...metadata });
  if (service.price) {
    const quote = await makeQuote(serviceId, job.id, admin, currency, input?.network || null);
    job.quote_id = quote.quote_id;
    await (await store()).put("Jobs", job.id, job);
    const intent = {
      jobId: job.id,
      status: "awaiting_payment",
      network: quote.network,
      target_network: quote.target_network,
      asset: quote.currency,
      mint: quote.mint,
      amount: quote.amount.toFixed(6),
      amountBaseUnits: String(quote.amountAtomic),
      decimals: quote.currency === "SOL" ? 9 : 6,
      treasuryOwner: quote.treasuryOwner,
      treasuryTokenAccount: quote.treasuryTokenAccount,
      treasuryOwner: quote.treasuryOwner,
      recipient: quote.recipient,
      paymentReference: quote.paymentReference,
      expiresAt: quote.expires_at,
      expiresAtUtc: quote.expires_at_utc,
      expiresAtEpochMs: quote.expires_at_epoch_ms,
      submitSignatureUrl: `https://${config.domain}/api/jobs/${job.id}/payment`,
      statusUrl: `https://${config.domain}/api/jobs/${job.id}`,
      quoteId: quote.quote_id,
      ataRequired: quote.ata_required,
    };
    const e = new Error("payment required");
    e.statusCode = 402;
    e.payment_intent = intent;
    throw e;
  }
  job.execution_started_at = now();
  await (await store()).put("Jobs", job.id, job);
  const execution = await executeMeasuredService(serviceId, input);
  return await completeJob(job, execution.result, null, execution.telemetry);
}

async function completeJob(job, result, payment, telemetry = {}) {
  if (job.status === "completed" && job.receipt_id) {
    const existingReceipt = await (await store()).get(
      "Receipts",
      job.receipt_id,
    );
    return {
      job_id: job.id,
      status: "completed",
      result: job.result,
      receipt: existingReceipt,
    };
  }
  const recommendations = job.service_id === "verify.basic" || job.service_id === "risk.score"
    ? recommendedNextServices(job.service_id, result)
    : [];
  const persistence = await persistEvidence(config, {
    job_id: job.id,
    service: job.service_id,
    input_hash: job.input_hash,
    completed_at: now(),
    result,
  });
  const providerProvenance = [
    { provider: "aws-lambda", role: "job-execution" },
    { provider: config.allowTestStorage ? "memory" : "aws-dynamodb", role: "job-persistence" },
    ...(result?.provider_source ? [{ provider: result.provider_source, role: "chain-evidence" }] : []),
    ...(result?.provider_class ? [{ provider: result.provider_class, role: "chain-evidence" }] : []),
    ...(persistence.persisted ? [{ provider: "mongodb", role: "evidence-history" }] : []),
  ];
  const resultWithProvenance = { ...result, provider_provenance: providerProvenance, evidence_persistence: persistence.status };
  const enrichedResult = recommendations.length
    ? { ...resultWithProvenance, recommended_next_services: recommendations }
    : resultWithProvenance;
  const targetNetwork = normalizeNetworkId(job.execution_input?.network || enrichedResult?.network || "solana-mainnet-beta");
  const executionMs = Date.now() - Date.parse(job.execution_started_at || job.created_at);
  trackFunnel("service_completed", {
    service: job.service_id,
    targetNetwork,
    outcome: "success",
    durationMs: Number.isFinite(executionMs) ? executionMs : null,
    providerCalls: Number.isFinite(telemetry.providerCalls)
      ? telemetry.providerCalls
      : Number.isFinite(enrichedResult?.provider_calls) ? enrichedResult.provider_calls : null,
    cacheHits: telemetry.cacheHits,
    cacheMisses: telemetry.cacheMisses,
  });
  const payload = {
    job_id: job.id,
    service: job.service_id,
    input_hash: job.input_hash,
    result_hash: digest(enrichedResult),
    created_at: job.created_at,
    completed_at: now(),
  };
  const policy = await marketplacePolicy();
  const grossAmount = Number(payment?.amount || 0);
  const firstParty = !job?.seller_agent_id;
  const receiptFeeBps = firstParty ? 0 : policy.platform_fee_bps;
  const platformFeeAmount = Number(((grossAmount * receiptFeeBps) / 10000).toFixed(6));
  const receipt = {
    receipt_id: receiptId(payload),
    ...payload,
    evidence_hash: digest(enrichedResult),
    payment_signature: payment?.signature || null,
    asset: payment?.currency || null,
    amount: payment?.amount || 0,
    gross_amount: grossAmount,
    revenue_class: firstParty ? "first_party_service" : "external_seller_service",
    seller_agent_id: job.seller_agent_id || null,
    platform_fee_bps: receiptFeeBps,
    platform_fee_amount: platformFeeAmount,
    private_dao_revenue_amount: firstParty ? grossAmount : platformFeeAmount,
    seller_net_amount: firstParty ? null : Number((grossAmount - platformFeeAmount).toFixed(6)),
    treasury: config.treasury,
    network: "solana-mainnet-beta",
    payment_network: "solana-mainnet-beta",
    target_network: targetNetwork,
    evidence_persistence: persistence.status,
    status: "VERIFIED",
  };
  receipt.public_url = `https://${config.domain}/receipts/${encodeURIComponent(receipt.receipt_id)}`;
  receipt.verification_url = `https://${config.domain}/verify/receipt/${encodeURIComponent(receipt.receipt_id)}`;
  receipt.job_url = `https://${config.domain}/jobs/${encodeURIComponent(job.id)}`;
  await (await store()).put("Receipts", receipt.receipt_id, receipt, true);
  await recordRevenue(job, payment);
  job.status = "completed";
  job.result = enrichedResult;
  job.receipt_id = receipt.receipt_id;
  job.completed_at = receipt.completed_at;
  await (await store()).put("Jobs", job.id, job);
  return { job_id: job.id, status: job.status, result: enrichedResult, receipt };
}

async function submitPayment(jobId, body) {
  const storage = await store();
  const job = await storage.get("Jobs", jobId);
  if (!job)
    throw Object.assign(new Error("job not found"), { statusCode: 404 });
  if (job.status === "completed" && job.receipt_id) {
    return completeJob(job, job.result, null);
  }
  if (job.status === "recovery_required") {
    return {
      job_id: jobId,
      status: "recovery_required",
      recovery_required: true,
      message: "payment was accepted but execution requires recovery; the service will not be replayed automatically",
      retryAfterSeconds: 30,
    };
  }
  if (job.status !== "awaiting_payment")
    throw new Error("job is not awaiting payment");
  if (body.input !== undefined && digest(body.input) !== job.input_hash)
    throw Object.assign(new Error("payment input does not match the quoted job"), { statusCode: 400 });
  const quote = await quoteForJob(storage, job);
  if (!quote)
    throw new Error("quote expired");
  const payment = await verifyPayment(
    config,
    { signature: body.signature },
    quote,
  );
  if (payment.transient)
    return {
      status: "verifying",
      message: payment.reason,
      signature: body.signature,
      retryAfterSeconds: 3,
    };
  if (!payment.ok)
    throw Object.assign(new Error(payment.reason), {
      statusCode: 402,
      payment_intent: {
        jobId,
        quoteId: quote.quote_id,
        status: "awaiting_payment",
      },
    });
  const expiresAt = Date.parse(quote.expires_at);
  const paidAt = payment.blockTime ? payment.blockTime * 1000 : NaN;
  if (!Number.isFinite(expiresAt) || !Number.isFinite(paidAt) || paidAt > expiresAt)
    throw new Error("quote expired before the on-chain payment");

  const paymentId = `payment_${body.signature}`;
  const existingPayment = await storage.get("Payments", paymentId);
  if (existingPayment && existingPayment.job_id !== jobId)
    throw Object.assign(new Error("payment signature was already used"), {
      statusCode: 402,
    });
  let paymentClaim = existingPayment;
  let claimedByThisInvocation = false;
  if (!existingPayment) {
    const candidate = {
      id: paymentId,
      signature: body.signature,
      job_id: jobId,
      consumed_at: now(),
    };
    try {
      await storage.put("Payments", paymentId, candidate, true);
      paymentClaim = candidate;
      claimedByThisInvocation = true;
    } catch (error) {
      paymentClaim = await storage.get("Payments", paymentId);
      if (!paymentClaim) throw error;
      if (paymentClaim.job_id !== jobId)
        throw Object.assign(new Error("payment signature was already used"), { statusCode: 402 });
    }
  }

  const currentJob = await storage.get("Jobs", jobId);
  if (currentJob?.status === "completed" && currentJob.receipt_id)
    return completeJob(currentJob, currentJob.result, null);
  if (!claimedByThisInvocation && paymentClaim) {
    // Never replay an external service from a stale payment claim. The
    // provider may have completed the side effect before Lambda crashed, so
    // a buyer retry must remain non-executing.
    const recoveryJob = {
      ...job,
      status: "recovery_required",
      recovery_required_at: now(),
      recovery_reason: "payment_claim_exists_without_a_completed_receipt",
      updated_at: now(),
    };
    await storage.put("Jobs", job.id, recoveryJob);
    return {
      job_id: jobId,
      status: "recovery_required",
      recovery_required: true,
      message: "payment was accepted but execution requires recovery; the service will not be replayed automatically",
      retryAfterSeconds: 30,
    };
  }
  job.execution_started_at = now();
  await storage.put("Jobs", job.id, job);
  const executionInput = job.execution_input || body.input || {};
  if (digest(executionInput) !== job.input_hash)
    throw Object.assign(new Error("quoted job input is unavailable or changed"), { statusCode: 400 });
  const execution = await executeMeasuredService(job.service_id, executionInput);
  return completeJob(job, execution.result, {
    signature: body.signature,
    currency: quote.currency,
    amount: quote.amount,
  }, execution.telemetry);
}

async function register(body) {
  if (body.mcpUrl || body.mcp_url || String(body.protocol || "").toUpperCase() === "MCP")
    return registerMcp(body);
  const url = await assertPublicHttps(body.agentCardUrl || body.agent_card_url);
  const response = await fetchPublicHttps(url, {
    redirect: "manual",
    signal: AbortSignal.timeout(5000),
    headers: { accept: "application/json" },
  });
  if (!response.ok || response.status >= 300)
    throw new Error("Agent Card endpoint verification failed");
  const remote = await response.json();
  if (!remote.name || !remote.url) throw new Error("invalid Agent Card");
  const endpoint = await assertPublicHttps(body.endpoint || remote.url);
  const agent = {
    id: `agent_${digest({ url: url.href }).slice(0, 24)}`,
    name: body.name || remote.name,
    url: endpoint.href,
    agent_card_url: url.href,
    capabilities: body.capabilities || remote.skills?.map((s) => s.id) || [],
    acceptedAssets: body.acceptedAssets || ["USDC"],
    pricing: body.pricing || {},
    protocols: body.protocols || ["A2A", "HTTP"],
    networks: body.networks || remote.networks || ["solana:mainnet-beta"],
    tags: body.tags || [],
    status: "verified",
    verified_at: now(),
  };
  await (await store()).put("Registry", agent.id, agent);
  return agent;
}

const MCP_TIMEOUT_MS = 8000;
const MCP_RISKY_TOOL_PATTERN = /(?:build|sign|send|transfer|withdraw|swap|write|delete|destroy|execute|submit|approve|govern|vote|publish|deploy|close|cancel)/i;

async function mcpHttp(url, request, sessionId = null) {
  const headers = {
    "content-type": "application/json",
    accept: "application/json, text/event-stream",
    "MCP-Protocol-Version": "2025-06-18",
    "user-agent": "PrivateDAO-Agent-Exchange/1.0 (+https://privatedao.org)",
  };
  if (sessionId) headers["Mcp-Session-Id"] = sessionId;
  const response = await fetchPublicHttps(url, {
    method: "POST",
    redirect: "manual",
    signal: AbortSignal.timeout(MCP_TIMEOUT_MS),
    headers,
    body: JSON.stringify(request),
  });
  if (request.id == null) {
    if (!response.ok) {
      const error = new Error(`MCP notification returned HTTP ${response.status}`);
      error.statusCode = 502;
      error.upstreamStatus = response.status;
      throw error;
    }
    return { payload: null, sessionId: response.headers.get("mcp-session-id") || sessionId };
  }
  const text = await response.text();
  let payload;
  try { payload = JSON.parse(text); }
  catch {
    const error = new Error(`MCP endpoint returned non-JSON HTTP ${response.status}`);
    error.statusCode = 502;
    error.upstreamStatus = response.status;
    throw error;
  }
  if (!response.ok) {
    const error = new Error(`MCP endpoint returned HTTP ${response.status}`);
    error.statusCode = 502;
    error.upstreamStatus = response.status;
    throw error;
  }
  if (payload.error) throw new Error(`MCP ${payload.error.code || "error"}: ${payload.error.message || "request failed"}`);
  return { payload, sessionId: response.headers.get("mcp-session-id") || sessionId };
}

function mcpToolSummary(tool) {
  return {
    name: String(tool?.name || "").slice(0, 120),
    title: tool?.title ? String(tool.title).slice(0, 200) : null,
    description: tool?.description ? String(tool.description).slice(0, 1000) : "",
    inputSchema: tool?.inputSchema && typeof tool.inputSchema === "object" ? tool.inputSchema : { type: "object" },
    annotations: tool?.annotations && typeof tool.annotations === "object" ? tool.annotations : {},
  };
}

async function discoverMcp(mcpUrl) {
  const url = await assertPublicHttps(mcpUrl);
  const initialized = await mcpHttp(url.href, {
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: {
      protocolVersion: "2025-06-18",
      capabilities: {},
      clientInfo: { name: "PrivateDAO-Agent-Exchange", version: "1.0.0" },
    },
  });
  const init = initialized.payload.result;
  if (!init?.protocolVersion || !init?.serverInfo?.name)
    throw new Error("MCP initialize response is incomplete");
  const sessionId = initialized.sessionId;
  await mcpHttp(url.href, { jsonrpc: "2.0", method: "notifications/initialized", params: {} }, sessionId);
  const toolsResponse = await mcpHttp(url.href, { jsonrpc: "2.0", id: 2, method: "tools/list", params: {} }, sessionId);
  const tools = Array.isArray(toolsResponse.payload.result?.tools)
    ? toolsResponse.payload.result.tools.map(mcpToolSummary).filter((tool) => tool.name)
    : [];
  const optional = async (method, id) => {
    try {
      const response = await mcpHttp(url.href, { jsonrpc: "2.0", id, method, params: {} }, toolsResponse.sessionId);
      return response.payload.result || {};
    } catch (error) {
      return { unsupported: true, reason: error.message };
    }
  };
  const resources = await optional("resources/list", 3);
  const prompts = await optional("prompts/list", 4);
  return {
    url: url.href,
    protocolVersion: init.protocolVersion,
    serverInfo: { name: String(init.serverInfo.name).slice(0, 200), version: String(init.serverInfo.version || "").slice(0, 80) },
    capabilities: init.capabilities || {},
    tools,
    resourcesSupported: !resources.unsupported,
    promptsSupported: !prompts.unsupported,
    sessionId: toolsResponse.sessionId,
  };
}

function defaultMcpAllowlist(tools) {
  return tools.filter((tool) => safeMcpTool(tool)).map((tool) => tool.name);
}

function safeMcpTool(tool) {
  if (!tool || MCP_RISKY_TOOL_PATTERN.test(tool.name)) return false;
  return tool.annotations?.readOnlyHint !== false;
}
function validateMcpCommercialServices(discovery, services) {
  const safeNames = new Set(discovery.tools.filter(safeMcpTool).map((tool) => tool.name));
  for (const service of services) {
    if (!discovery.tools.some((tool) => tool.name === service.tool))
      throw Object.assign(new Error(`commercial service tool was not returned by tools/list: ${service.tool}`), { statusCode: 400 });
    if (!safeNames.has(service.tool))
      throw Object.assign(new Error(`commercial service tool is not read-only or is blocked by policy: ${service.tool}`), { statusCode: 400 });
  }
}

async function previewSellerMetadata(body) {
  const endpoint = body.mcp_url || body.mcpUrl || body.endpoint;
  if (!endpoint) throw Object.assign(new Error("mcp_url is required"), { statusCode: 400 });
  const discovery = await discoverMcp(endpoint);
  const safeTools = discovery.tools.filter(safeMcpTool);
  const safeNames = new Set(safeTools.map((tool) => tool.name));
  let services;
  try { services = normalizeCommercialServices(body.commercial_services || body.commercialServices || []); }
  catch (error) { throw Object.assign(new Error(`invalid commercial metadata: ${error.message}`), { statusCode: 400 }); }
  const errors = [];
  if (!services.length) errors.push({ field: "commercial_services", message: "select at least one discovered read-only tool" });
  if (services.length > 5) errors.push({ field: "commercial_services", message: "Basic Listing allows at most 5 services" });
  for (const service of services) {
    if (!discovery.tools.some((tool) => tool.name === service.tool)) errors.push({ field: `services.${service.id}.tool`, message: "tool was not returned by tools/list" });
    else if (!safeNames.has(service.tool)) errors.push({ field: `services.${service.id}.tool`, message: "tool is not read-only or is blocked by policy" });
  }
  const payout = body.payout === undefined ? null : sellerPayout(body.payout);
  const acceptedAssets = sellerAcceptedAssets(body.accepted_assets || body.acceptedAssets);
  if (!acceptedAssets.length) errors.push({ field: "accepted_assets", message: "at least one accepted asset is required before publication" });
  if (!payout) errors.push({ field: "payout", message: "payout address, network, and asset are required before publication" });
  return {
    status: errors.length ? "action_required" : "ready_for_registration",
    endpoint: discovery.url,
    mcp: { protocol_version: discovery.protocolVersion, server: discovery.serverInfo, tool_count: discovery.tools.length, safe_tool_count: safeTools.length },
    discovered_tools: discovery.tools,
    commercial_services: services,
    accepted_assets: acceptedAssets,
    payout,
    errors,
  };
}

async function registerMcp(body) {
  body = {
    ...body,
    agentId: body.agentId ?? body.agent_id ?? body.sellerId ?? body.seller_id,
    ownerToken: body.ownerToken ?? body.owner_token,
    allowedTools: body.allowedTools ?? body.allowed_tools,
    forceRefresh: body.forceRefresh ?? body.force_refresh,
    persistUnavailable: body.persistUnavailable ?? body.persist_unavailable,
    commercialServices: body.commercialServices ?? body.commercial_services,
    acceptedAssets: body.acceptedAssets ?? body.accepted_assets,
  };
  const endpoint = body.mcpUrl || body.mcp_url || body.endpoint;
  if (!endpoint) throw new Error("mcpUrl is required");
  const url = await assertPublicHttps(endpoint);
  const requestedId = body.agentId || body.agent_id || body.sellerId || body.seller_id;
  if (requestedId && !/^agent_[A-Za-z0-9_-]{8,100}$/.test(String(requestedId))) throw new Error("agent_id must be a stable agent_ identifier");
  const id = String(requestedId || `agent_${digest({ protocol: "MCP", url: url.href }).slice(0, 24)}`);
  const storage = await store();
  const existing = await storage.get("Registry", id);
  const existingListing = existing ? await storage.get("Listings", `seller_listing_${id}`) : null;
  const suppliedOwnerToken = body.ownerToken || body.owner_token || "";
  const hasSellerMutation = [
    "name", "allowedTools", "allowed_tools", "tags", "networks", "commercialServices", "commercial_services",
    "acceptedAssets", "accepted_assets", "payout", "forceRefresh", "force_refresh", "persistUnavailable", "persist_unavailable",
  ].some((key) => body[key] !== undefined);
  if (existing?.owner_token_hash && suppliedOwnerToken && !secretMatches(suppliedOwnerToken, existing.owner_token_hash))
    throw Object.assign(new Error("seller ownership token is invalid"), { statusCode: 403 });
  if (existing?.owner_token_hash && !suppliedOwnerToken && !body.internalRefresh && (requestedId || hasSellerMutation))
    throw Object.assign(new Error("owner_token is required to update this seller"), { statusCode: 403 });
  const ownerToken = existing?.owner_token_hash ? null : (suppliedOwnerToken || (body.internalRefresh ? null : randomBytes(24).toString("base64url")));
  const commercialServicesChanged = body.commercialServices !== undefined || body.commercial_services !== undefined;
  const commercialServices = commercialServicesChanged
    ? normalizeCommercialServices(body.commercialServices || body.commercial_services)
    : (existing?.commercial_services || []);
  const payout = body.payout !== undefined ? sellerPayout(body.payout) : (existing?.payout || null);
  if (existing?.protocol === "MCP" && existing.endpoint === url.href && existing.status === "connected" && !hasSellerMutation)
    return { ...publicRegistryAgent(existing), registration_status: "already_registered" };
  let discovery;
  try {
    discovery = await discoverMcp(url.href);
  } catch (error) {
    if (!body.persistUnavailable) throw error;
    const match = /HTTP (\d{3})/.exec(error.message);
    const reason = match ? `HTTP_${match[1]}` : /timeout/i.test(error.message) ? "TIMEOUT" : "MCP_CHECK_FAILED";
    const unavailable = {
      id,
      name: body.name || "External MCP Agent",
      url: url.href,
      endpoint: url.href,
      protocol: "MCP",
      protocols: ["MCP"],
      transport: "streamable-http",
      capabilities: [],
      allowed_tools: [],
      tools: [],
      mcp: { resourcesSupported: false, promptsSupported: false },
      acceptedAssets: [],
      pricing: body.pricing || {},
      networks: Array.isArray(body.networks) ? body.networks.map(normalizeNetworkId).filter(Boolean) : [],
      tags: body.tags || ["external", "mcp"],
      status: "unavailable",
      health: "unavailable",
      unavailable_reason: reason,
      last_successful_connection: null,
      verified_at: null,
      side_effect_policy: "execution disabled until MCP handshake succeeds",
      commercial_services: commercialServices,
      commercial_publication_status: commercialServices.length ? "draft" : null,
      listing_fee_status: commercialServices.length ? "required" : null,
      payout,
      owner_token_hash: ownerToken ? hashSecret(ownerToken) : null,
      updated_at: now(),
    };
    await storage.put("Registry", id, unavailable);
    return { ...publicRegistryAgent(unavailable), ...(ownerToken ? { owner_token: ownerToken } : {}) };
  }
  const requested = Array.isArray(body.allowedTools) ? body.allowedTools.map(String) : null;
  const discoveredNames = new Set(discovery.tools.map((tool) => tool.name));
  const safeByName = new Map(discovery.tools.map((tool) => [tool.name, tool]));
  validateMcpCommercialServices(discovery, commercialServices);
  const allowedTools = (requested || existing?.allowed_tools || defaultMcpAllowlist(discovery.tools)).filter((name) => discoveredNames.has(name) && safeMcpTool(safeByName.get(name)));
  const agent = {
    id,
    name: body.name || discovery.serverInfo.name,
    url: discovery.url,
    endpoint: discovery.url,
    protocol: "MCP",
    protocols: ["MCP"],
    transport: "streamable-http",
    capabilities: discovery.tools.map((tool) => tool.name),
    allowed_tools: allowedTools,
    tools: discovery.tools,
    mcp: {
      protocolVersion: discovery.protocolVersion,
      serverInfo: discovery.serverInfo,
      capabilities: discovery.capabilities,
      resourcesSupported: discovery.resourcesSupported,
      promptsSupported: discovery.promptsSupported,
    },
    acceptedAssets: body.acceptedAssets !== undefined || body.accepted_assets !== undefined
      ? sellerAcceptedAssets(body.acceptedAssets || body.accepted_assets)
      : (existing?.acceptedAssets || []),
    pricing: body.pricing || existing?.pricing || {},
    commercial_services: commercialServices,
    // A paid listing is eligible for publication, but a technical refresh or
    // metadata update must not silently republish a seller who explicitly
    // unpublished. Preserve the seller's current publication decision.
    commercial_publication_status: existingListing?.payment_status === "paid"
      ? (existing?.commercial_publication_status || existingListing.commercial_publication_status || "eligible")
      : (commercialServicesChanged || !existing?.commercial_publication_status ? (commercialServices.length ? "draft" : null) : existing.commercial_publication_status),
    listing_fee_status: existingListing?.payment_status === "paid" ? "paid" : (commercialServicesChanged || !existing?.listing_fee_status ? (commercialServices.length ? "required" : null) : existing.listing_fee_status),
    payout,
    owner_token_hash: existing?.owner_token_hash || hashSecret(ownerToken),
    networks: Array.isArray(body.networks) ? body.networks.map(normalizeNetworkId).filter(Boolean) : (existing?.networks || []),
    tags: body.tags || ["external", "mcp"],
    status: "connected",
    health: "connected",
    last_successful_connection: now(),
    verified_at: now(),
    side_effect_policy: "read-only allowlist; financial, signing and destructive tools blocked",
  };
  await storage.put("Registry", id, agent);
  const siblings = await storage.list("Registry");
  for (const sibling of siblings) {
    if (sibling.id !== id && sibling.protocol === "MCP" && sibling.name === agent.name && sibling.endpoint !== agent.endpoint && !sibling.retired_at) {
      await storage.put("Registry", sibling.id, { ...sibling, status: "retired", retired_at: now(), retired_reason: "superseded_by_stable_registration" });
    }
  }
  return { ...publicRegistryAgent(agent), ...(ownerToken && !body.internalRefresh ? { owner_token: ownerToken } : {}), registration_status: existing ? "updated" : "registered" };
}

async function invokeMcpAgent(agent, tool, args = {}) {
  const discovery = await discoverMcp(agent.endpoint);
  if (!tool || typeof tool !== "string") throw Object.assign(new Error("MCP tool is required"), { statusCode: 400 });
  if (!agent.allowed_tools?.includes(tool))
    throw Object.assign(new Error("MCP tool is not allowlisted for this agent"), { statusCode: 403 });
  if (!safeMcpTool(discovery.tools.find((item) => item.name === tool)))
    throw Object.assign(new Error("MCP tool is not available as a safe discovered tool"), { statusCode: 403 });
  if (!args || typeof args !== "object" || Array.isArray(args) || JSON.stringify(args).length > 32768)
    throw Object.assign(new Error("MCP tool arguments must be a bounded JSON object"), { statusCode: 400 });
  const response = await mcpHttp(agent.endpoint, {
    jsonrpc: "2.0",
    id: randomUUID(),
    method: "tools/call",
    params: { name: tool, arguments: args },
  }, discovery.sessionId || null);
  return {
    agent_id: agent.id,
    agent_name: agent.name,
    protocol: "MCP",
    tool,
    status: response.payload.result?.isError ? "error" : "completed",
    result: response.payload.result || null,
    evidence: { provider_url: agent.endpoint, observed_at: now(), handshake: "verified" },
  };
}

async function ownedSeller(agentId, ownerToken) {
  if (!String(agentId || "").trim())
    throw Object.assign(new Error("agent_id is required"), { statusCode: 400 });
  const storage = await store();
  const agent = await storage.get("Registry", agentId);
  if (!agent || agent.protocol !== "MCP") throw Object.assign(new Error("MCP seller not found"), { statusCode: 404 });
  if (!agent.owner_token_hash || !secretMatches(ownerToken, agent.owner_token_hash))
    throw Object.assign(new Error("valid owner_token is required"), { statusCode: 403 });
  return { storage, agent };
}
async function sellerReadiness(agentId) {
  const agent = await (await store()).get("Registry", agentId);
  if (!agent || agent.protocol !== "MCP") throw Object.assign(new Error("MCP seller not found"), { statusCode: 404 });
  const policy = await marketplacePolicy();
  const services = (agent.commercial_services || []).filter((service) => service.status !== "retired");
  const listing = await (await store()).get("Listings", `seller_listing_${agentId}`);
  const plan = sellerListingPlan(agent, services, policy, listing);
  const ledger = sellerServiceLedger(agent, listing);
  const paidServiceIds = new Set(ledger.filter((item) => item.status === "paid").map((item) => item.service_id));
  const missing = [];
  if (agent.status !== "connected") missing.push("mcp_verification");
  if (!services.length) missing.push("commercial_services");
  if (services.length > policy.max_services_per_seller) missing.push("service_limit");
  if (!Array.isArray(agent.acceptedAssets) || !agent.acceptedAssets.length) missing.push("accepted_assets");
  if (!agent.payout) missing.push("payout");
  if (agent.listing_fee_status !== "paid") missing.push("listing_fee");
  return {
    agent_id: agent.id,
    status: agent.status,
    health: agent.health || null,
    commercial_services_count: services.length,
    listed_services_count: paidServiceIds.size,
    unlisted_service_ids: services.map((service) => service.id).filter((id) => !paidServiceIds.has(id)),
    additional_service_fee_due: listing?.payment_status === "paid" ? Number(plan.amount.toFixed(6)) : Number(plan.items.reduce((sum, item) => sum + Number(item.fee_amount), 0).toFixed(6)),
    max_services_per_seller: policy.max_services_per_seller,
    accepted_assets_configured: Boolean(agent.acceptedAssets?.length),
    payout_configured: Boolean(agent.payout),
    listing_fee_status: agent.listing_fee_status || "required",
    ready_for_quote: missing.filter((item) => item !== "listing_fee").length === 0,
    ready_for_publication: missing.length === 0,
    missing,
    owner_credential: "required_for_seller_mutations",
  };
}
async function sellerDashboard(agentId, ownerToken) {
  const { storage, agent } = await ownedSeller(agentId, ownerToken);
  const readiness = await sellerReadiness(agentId);
  const listing = await storage.get("Listings", `seller_listing_${agentId}`);
  const [quotes, receipts, settlements, revenue] = await Promise.all([
    storage.list("Quotes"), storage.list("Receipts"), storage.list("Registry"), storage.list("Revenue"),
  ]);
  const sellerQuotes = quotes.filter((item) => item.seller_agent_id === agentId || item.listing_id === `seller_listing_${agentId}` || item.seller_agent_id === agentId);
  const sellerReceipts = receipts.filter((item) => item.seller_agent_id === agentId).map((item) => ({ receipt_id: item.receipt_id, job_id: item.job_id || null, service: item.service || null, gross_amount: item.gross_amount ?? item.amount ?? 0, platform_fee_amount: item.platform_fee_amount ?? 0, seller_net_amount: item.seller_net_amount ?? 0, asset: item.asset || null, status: item.status, verification_url: item.verification_url || null, completed_at: item.completed_at || null }));
  const sellerSettlements = settlements.filter((item) => item.kind === "seller_settlement" && item.seller_agent_id === agentId).map((item) => ({ id: item.id, job_id: item.job_id || null, gross_amount: item.gross_amount ?? 0, platform_fee_amount: item.platform_fee_amount ?? 0, seller_net_amount: item.seller_net_amount ?? 0, asset: item.asset || null, payout: item.payout || null, status: item.status, created_at: item.created_at || null }));
  const sellerRevenue = revenue.filter((item) => item.seller_agent_id === agentId || item.jobId && item.seller_agent_id === agentId).map((item) => ({ id: item.id, gross_amount: item.grossAmount ?? 0, platform_fee_amount: item.platformFeeAmount ?? item.protocolFee ?? 0, seller_net_amount: Number((Number(item.grossAmount || 0) - Number(item.platformFeeAmount ?? item.protocolFee ?? 0)).toFixed(6)), asset: item.asset || null, timestamp: item.timestamp || null }));
  return { agent: publicRegistryAgent(agent), readiness, listing: listing ? { id: listing.id, status: listing.status, payment_status: listing.payment_status, listing_fee_status: listing.listing_fee_status, commercial_publication_status: listing.commercial_publication_status, service_ids: listing.service_ids || [], receipt_id: listing.receipt_id || null } : null, quote_count: sellerQuotes.length, sales: { receipt_count: sellerReceipts.length, gross_amount: sellerReceipts.reduce((n, item) => n + Number(item.gross_amount || 0), 0), platform_fee_amount: sellerReceipts.reduce((n, item) => n + Number(item.platform_fee_amount || 0), 0), seller_net_amount: sellerReceipts.reduce((n, item) => n + Number(item.seller_net_amount || 0), 0), receipts: sellerReceipts }, settlements: sellerSettlements, revenue: sellerRevenue };
}

// Recovery is deliberately admin-gated: the seller token is never recoverable from its hash.
async function rotateSellerOwnerToken(agentId) {
  const storage = await store();
  const agent = await storage.get("Registry", agentId);
  if (!agent || agent.protocol !== "MCP") throw Object.assign(new Error("MCP seller not found"), { statusCode: 404 });
  const ownerToken = randomBytes(24).toString("base64url");
  const next = { ...agent, owner_token_hash: hashSecret(ownerToken), owner_token_rotated_at: now(), updated_at: now() };
  await storage.put("Registry", agent.id, next);
  return { ...publicRegistryAgent(next), owner_token: ownerToken, registration_status: "owner_token_rotated" };
}
async function rotateSellerOwnerTokenAuthenticated(agentId, suppliedToken) {
  const { storage, agent } = await ownedSeller(agentId, suppliedToken);
  const ownerToken = randomBytes(24).toString("base64url");
  const next = { ...agent, owner_token_hash: hashSecret(ownerToken), owner_token_rotated_at: now(), updated_at: now() };
  await storage.put("Registry", agent.id, next);
  return { ...publicRegistryAgent(next), owner_token: ownerToken, registration_status: "owner_token_rotated" };
}

async function updateSellerServices(agentId, body) {
  const { storage, agent } = await ownedSeller(agentId, body.ownerToken || body.owner_token);
  const listing = await storage.get("Listings", `seller_listing_${agent.id}`);
  const alreadyListed = listing?.payment_status === "paid" && listing?.listing_fee_status === "paid";
  const policy = await marketplacePolicy();
  const services = normalizeCommercialServices(body.services || body.commercialServices || body.commercial_services || []);
  if (services.length > policy.max_services_per_seller)
    throw Object.assign(new Error(`seller supports at most ${policy.max_services_per_seller} services`), { statusCode: 400 });
  let discovery;
  try {
    discovery = await discoverMcp(agent.endpoint);
    validateMcpCommercialServices(discovery, services);
  } catch (error) {
    if (error.statusCode) throw error;
    throw Object.assign(new Error(`MCP verification is required before service changes: ${error.message}`), { statusCode: 503 });
  }
  const ledger = sellerServiceLedger(agent, listing);
  const paidIds = new Set(ledger.filter((item) => item.status === "paid").map((item) => item.service_id));
  const pendingIds = alreadyListed ? services.map((service) => service.id).filter((id) => !paidIds.has(id)) : [];
  const next = {
    ...agent,
    commercial_services: services,
    commercial_publication_status: alreadyListed ? (agent.commercial_publication_status === "published" ? "published" : "eligible") : "draft",
    listing_fee_status: alreadyListed ? "paid" : "required",
    acceptedAssets: body.acceptedAssets !== undefined || body.accepted_assets !== undefined
      ? sellerAcceptedAssets(body.acceptedAssets || body.accepted_assets)
      : agent.acceptedAssets || [],
    payout: body.payout === undefined ? agent.payout || null : sellerPayout(body.payout),
    updated_at: now(),
  };
  await storage.put("Registry", agent.id, next);
  if (alreadyListed) await storage.put("Listings", listing.id, { ...listing, service_ids: next.commercial_services.map((service) => service.id).filter((id) => paidIds.has(id)), pending_service_ids: pendingIds, commercial_services_hash: digest(next.commercial_services), commercial_publication_status: next.commercial_publication_status, status: next.commercial_publication_status === "published" ? "active" : "eligible", updated_at: now() });
  return publicRegistryAgent(next);
}
async function setSellerPublication(agentId, body, published) {
  const { storage, agent } = await ownedSeller(agentId, body.ownerToken || body.owner_token);
  if (published && agent.listing_fee_status !== "paid") throw Object.assign(new Error("a confirmed listing fee is required before publication"), { statusCode: 402 });
  if (published && agent.status !== "connected") throw Object.assign(new Error("MCP verification must be connected before publication"), { statusCode: 409 });
  if (published && !(agent.commercial_services || []).length) throw Object.assign(new Error("at least one commercial service is required before publication"), { statusCode: 400 });
  if (published && !(agent.acceptedAssets || []).length) throw Object.assign(new Error("at least one accepted asset is required before publication"), { statusCode: 400 });
  if (published && !agent.payout) throw Object.assign(new Error("payout configuration is required before publication"), { statusCode: 400 });
  if (published) {
    try {
      const discovery = await discoverMcp(agent.endpoint);
      validateMcpCommercialServices(discovery, (agent.commercial_services || []).filter((service) => service.status !== "retired"));
    } catch (error) {
      if (error.statusCode) throw error;
      throw Object.assign(new Error(`MCP verification is required before publication: ${error.message}`), { statusCode: 503 });
    }
    const readiness = await sellerReadiness(agentId);
    if (readiness.unlisted_service_ids.length)
      throw Object.assign(new Error("all commercial services must be included in a confirmed listing quote before publication"), { statusCode: 402 });
  }
  const next = { ...agent, commercial_publication_status: published ? "published" : "unpublished", updated_at: now() };
  await storage.put("Registry", agent.id, next);
  const listing = await storage.get("Listings", `seller_listing_${agent.id}`);
  if (listing?.type === "seller_listing") {
    await storage.put("Listings", listing.id, {
      ...listing,
      commercial_publication_status: next.commercial_publication_status,
      status: published ? "active" : "unpublished",
      updated_at: now(),
    });
  }
  return publicRegistryAgent(next);
}

async function replaceSellerEndpoint(agentId, body) {
  const { storage, agent } = await ownedSeller(agentId, body.ownerToken || body.owner_token);
  const endpoint = await assertPublicHttps(body.mcpUrl || body.mcp_url || body.endpoint);
  const next = { ...agent, endpoint: endpoint.href, url: endpoint.href, status: "pending", health: "pending", updated_at: now(), endpoint_history: [...(agent.endpoint_history || []), { endpoint: agent.endpoint, retired_at: now() }].slice(-10) };
  await storage.put("Registry", agent.id, next);
  return registerMcp({ agentId: agent.id, name: agent.name, mcpUrl: endpoint.href, ownerToken: body.ownerToken || body.owner_token, commercialServices: agent.commercial_services, acceptedAssets: agent.acceptedAssets, payout: agent.payout, forceRefresh: true });
}

async function retireSeller(agentId, body) {
  const { storage, agent } = await ownedSeller(agentId, body.ownerToken || body.owner_token);
  const next = { ...agent, status: "retired", retired_at: now(), retired_reason: String(body.reason || "seller_requested").slice(0, 300), updated_at: now() };
  await storage.put("Registry", agent.id, next);
  return publicRegistryAgent(next);
}

async function invokeAgent(body) {
  const agentId = String(body.agentId || body.agent_id || "").trim();
  if (!agentId)
    throw Object.assign(new Error("agent_id is required"), { statusCode: 400 });
  const agent = await (await store()).get("Registry", agentId);
  if (!agent || !["verified", "connected"].includes(agent.status))
    throw new Error("verified agent required");
  if (agent.protocol === "MCP" || agent.transport === "streamable-http") {
    const service = (agent.commercial_services || []).find((item) => item.status !== "retired" && item.tool === body.tool);
    if (!sellerListingState(agent) || !service)
      throw Object.assign(new Error("MCP seller services require a confirmed published marketplace listing"), { statusCode: 403 });
    if (!service.free && Number(service.price || 0) > 0)
      throw Object.assign(new Error("paid MCP services require a marketplace quote and finalized payment"), { statusCode: 402 });
    return invokeMcpAgent(agent, body.tool, body.arguments || body.payload || {});
  }
  const response = await fetchPublicHttps(agent.url, {
    method: "POST",
    redirect: "manual",
    signal: AbortSignal.timeout(10000),
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify(body.payload || {}),
  });
  if (!response.ok)
    throw new Error(`provider returned HTTP ${response.status}`);
  return {
    agent_id: agent.id,
    status: "completed",
    result: await response.json(),
    evidence: { provider_url: agent.url, observed_at: now() },
  };
}

async function enforcePersistentWriteRateLimit(event, path) {
  const method = methodOf(event);
  if (!path.startsWith("/api/") || !["POST", "PUT", "PATCH", "DELETE"].includes(method)) return;
  const key = `write:${rateLimitKey(event)}:${path.split("/").slice(0, 4).join("/")}`;
  try {
    const decision = await (await store()).consumeRateLimit(key, Math.max(1, Math.floor(config.rateLimitPerMinute / 2)), 60_000);
    if (!decision.allowed) {
      const error = new Error("write rate limit exceeded");
      error.statusCode = 429;
      error.retryAfterSeconds = decision.retryAfterSeconds;
      throw error;
    }
  } catch (error) {
    if (error.statusCode === 429) throw error;
    enforceRateLimit(key, Math.max(1, Math.floor(config.rateLimitPerMinute / 2)));
  }
}

const DEFAULT_SECURITY_HEADERS = {
  "x-content-type-options": "nosniff",
  "referrer-policy": "no-referrer",
  "permissions-policy": "camera=(), microphone=(), geolocation=()",
  "x-frame-options": "DENY",
};

function withSecurityHeaders(response) {
  if (!response || !response.headers) return response;
  return { ...response, headers: { ...DEFAULT_SECURITY_HEADERS, ...response.headers } };
}

async function handle(e) {
  const routePath = pathOf(e);
  if (routePath.startsWith("/api/") || routePath === "/a2a" || routePath === "/mcp")
    enforceRateLimit(rateLimitKey(e), config.rateLimitPerMinute);
  await runtimeConfig();
  await enforcePersistentWriteRateLimit(e, routePath);
  const requestMethod = methodOf(e),
    method = requestMethod === "HEAD" ? "GET" : requestMethod,
    path = pathOf(e),
    body = method === "GET" ? {} : parseBody(e);
  if (method === "OPTIONS") return json({}, 204);
  if (method === "GET" && path === "/github/setup") {
    const installationId = String(e.queryStringParameters?.installation_id || "");
    if (!githubAppConfigured(config))
      return githubSetupResponse("The GitHub App is not configured in this environment yet.");
    return githubInstallationSetup(e);
  }
  if (method === "GET" && path === "/github/oauth/callback")
    return githubSetupResponse("GitHub user OAuth is not used. Start the GitHub App installation from the setup URL.");
  if (method === "POST" && path === "/api/github/webhook") {
    const rawBody = e.isBase64Encoded ? Buffer.from(e.body || "", "base64").toString() : String(e.body || JSON.stringify(body));
    const eventName = e.headers?.["x-github-event"] || e.headers?.["X-GitHub-Event"] || "unknown";
    const signature = e.headers?.["x-hub-signature-256"] || e.headers?.["X-Hub-Signature-256"] || "";
    return json(await githubWebhook(body, rawBody, signature, eventName));
  }
  const githubInstallationRoute = path.match(/^\/api\/github\/installations\/([^/]+)$/);
  if (method === "GET" && githubInstallationRoute) {
    const item = await (await store()).get("Registry", githubRecordId(decodeURIComponent(githubInstallationRoute[1])));
    return item?.kind === "github_installation" ? json(publicGithubInstallationRecord(item)) : json({ error: "not_found" }, 404);
  }
  if (method === "POST" && path === "/api/github/context") {
    const installationId = String(body.installation_id || "");
    const token = body.connection_token || e.headers?.["x-pdao-github-token"] || e.headers?.["X-Pdao-Github-Token"] || "";
    const item = await (await store()).get("Registry", githubRecordId(installationId));
    if (!item || item.kind !== "github_installation" || item.status !== "active" || !secretMatches(token, item.connection_token_hash))
      return json({ error: "github_installation_authentication_failed" }, 403);
    return json(await githubRepositoryContext(config, installationId, body.repository || body.repo));
  }
  if (method === "GET" && ASSETS[path]) return clientAssetResponse(path);
  if (method === "GET" && path === "/integrations") {
    trackFunnel("integrations_view");
    return { statusCode: 200, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" }, body: integrationPage() };
  }
  if (method === "GET" && path === "/connect") {
    trackFunnel("developer_page_view");
    return { statusCode: 200, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" }, body: connectionHubPage() };
  }
  if (method === "GET" && ["/connect/chatgpt", "/connect/claude", "/connect/grok", "/connect/openclaw"].includes(path)) {
    trackFunnel("client_connection_page_view", { client: path.split("/").at(-1) });
    return { statusCode: 200, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" }, body: clientConnectionPage(path.split("/").at(-1)) };
  }
  if (method === "GET" && path === "/developers") {
    trackFunnel("developer_page_view");
    return { statusCode: 200, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" }, body: connectPage() };
  }
  if (method === "GET" && (path === "/sellers" || path === "/list-your-agent")) {
    trackFunnel("seller_portal_view");
    const sellerPortal = sellerPortalPageV5()
      .replace("</style>", "@media(max-width:650px){.shell{padding:10px}}</style>")
      .replace('<input id="metadataFile" type="file" accept="application/json" hidden>', '<div class="actions" style="margin-top:12px"><button id="chooseMetadata" class="secondary" type="button">Import metadata JSON</button><input id="metadataFile" type="file" accept="application/json" hidden></div>')
      .replace("</script></body></html>", 'const metadataFile=document.querySelector("#metadataFile"),chooseMetadata=document.querySelector("#chooseMetadata");if(metadataFile&&chooseMetadata){chooseMetadata.onclick=()=>metadataFile.click();metadataFile.onchange=async()=>{const file=metadataFile.files&&metadataFile.files[0];if(!file)return;try{$("metadataImport").value=await file.text();notice("Metadata imported and ready for validation.","success")}catch(error){notice("Metadata import failed: "+(error.message||String(error)),"error")}}}function bindPaymentRetry(){const retry=$("retryPayment");if(!retry||retry.dataset.retryBound==="1")return;retry.dataset.retryBound="1";retry.onclick=()=>verifySellerPayment().catch(error=>{$("paymentResult").innerHTML=`<div class="notice error">${escapeHtml(error.message)}<br><button id="retryPayment" class="secondary" type="button">Retry verification (do not pay again)</button></div>`;bindPaymentRetry()})}const paymentResult=$("paymentResult");if(paymentResult){new MutationObserver(bindPaymentRetry).observe(paymentResult,{childList:true,subtree:true});bindPaymentRetry()}</script></body></html>');
    return { statusCode: 200, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store", "content-security-policy": "default-src 'self'; base-uri 'none'; object-src 'none'; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; connect-src 'self' https://agents.privatedao.org https://api.mainnet-beta.solana.com; frame-ancestors 'none'", "x-content-type-options": "nosniff", "referrer-policy": "no-referrer", "permissions-policy": "camera=(), microphone=(), geolocation=()" }, body: sellerPortal };
  }
  if (method === "GET" && path === "/marketplace") {
    trackFunnel("marketplace_view");
    const campaigns = await activePartnerships();
    const featuredNames = campaigns.map((campaign) => `<a href="/partners"><strong>${escapeHtml(campaign.agentName)}</strong><span>Featured Partner · Sponsored</span></a>`).join("");
    const featured = campaigns.length ? `<section class="featured-partners" aria-label="Featured Partners"><div><p class="eyebrow">Sponsored partnerships</p><h2>Featured Partners</h2><p>Paid promotion is disclosed separately from technical MCP status.</p></div><div class="featured-list">${featuredNames}</div></section>` : "";
    const page = await marketplacePage();
    return { statusCode: 200, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" }, body: page.replace("<footer>", `${featured}<footer>`) };
  }
  if (method === "GET" && (path === "/partners" || path === "/marketplace/partners"))
    return { statusCode: 200, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" }, body: await partnersPage() };
  const partnershipPayPage = path.match(/^\/partners\/([^/]+)\/pay$/);
  if (method === "GET" && partnershipPayPage) {
    const campaign = await (await store()).get("Campaigns", decodeURIComponent(partnershipPayPage[1]));
    if (!campaign || campaign.type !== "featured_partner") return json({ error: "partnership_not_found" }, 404);
    return { statusCode: 200, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" }, body: partnershipPaymentPage(decodeURIComponent(partnershipPayPage[1])) };
  }
  const agentProfile = path.match(/^\/agents\/([^/]+)$/);
  if (method === "GET" && agentProfile) {
    const page = await agentProfilePage(decodeURIComponent(agentProfile[1]));
    return page ? { statusCode: 200, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" }, body: page } : json({ error: "not_found" }, 404);
  }
  const servicePage = path.match(/^\/services\/([^/]+)$/);
  if (method === "GET" && servicePage) {
    const serviceId = decodeURIComponent(servicePage[1]).replaceAll("-", ".");
    const service = serviceById(serviceId);
    if (!service) return json({ error: "not_found" }, 404);
    trackFunnel("service_detail_view", { service: service.id });
    return { statusCode: 200, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" }, body: serviceDetailPage(service) };
  }
  const humanReceipt = path.match(/^\/(receipts|verify\/receipt)\/([^/]+)$/);
  if (method === "GET" && humanReceipt) {
    const receipt = await (await store()).get("Receipts", decodeURIComponent(humanReceipt[2]));
    if (!receipt) return json({ error: "not_found" }, 404);
    return { statusCode: 200, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" }, body: publicReceiptPage(receipt, humanReceipt[1] === "verify/receipt") };
  }
  const humanJob = path.match(/^\/jobs\/([^/]+)$/);
  if (method === "GET" && humanJob) {
    const job = await (await store()).get("Jobs", decodeURIComponent(humanJob[1]));
    if (!job) return json({ error: "not_found" }, 404);
    if (!job.receipt_id) return json({ job_id: job.id, status: job.status, message: job.status === "recovery_required" ? "payment was accepted but execution requires recovery; do not replay the service" : "receipt is not available yet" }, job.status === "recovery_required" ? 409 : 202);
    const receipt = await (await store()).get("Receipts", job.receipt_id);
    if (!receipt) return json({ error: "receipt_not_found" }, 404);
    return { statusCode: 200, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" }, body: publicReceiptPage(receipt) };
  }
  if (method === "GET" && ["/agent-registry/register", "/register/8004"].includes(path)) {
    const page = registryRegistrationPage();
    return { statusCode: 200, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store", "content-security-policy": `default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline' 'nonce-${page.nonce}'; connect-src 'self' https://agents.privatedao.org https://api.mainnet-beta.solana.com; frame-ancestors 'none'` }, body: injectLanguageWidget(page.body) };
  }
  if (method === "GET" && path === "/") {
    trackFunnel("human_home_view");
    return { statusCode: 200, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" }, body: injectLanguageWidget(commercialHomePage()) };
  }
  if (method === "GET" && path === "/api/health") {
    const stats =
      config.allowTestStorage ? null : await networkStats(config);
    return json({
      status: "ok",
      service: "pdao-agent-exchange",
      version: "1.6.0",
      network: "solana-mainnet-beta",
      rpcMode: stats?.providerClass || (config.rpcPrimary.includes("api.mainnet-beta")
        ? "public-fallback"
        : "configured-primary"),
      paymentVerification: "finalized-usdc",
      a2a: "active",
      mcp: "active",
      registry: "active",
      marketplace: "active",
      logistics: "active",
      treasury: config.treasury,
      usdcMint: config.usdcMint,
      cluster: config.cluster,
      mainnetGenesisHash: config.mainnetGenesisHash,
      rpcAttestation: stats ? "mainnet-verified" : "test-runtime",
      timestamp: now(),
    });
  }
  if (
    method === "GET" &&
    [
      "/.well-known/agent-card.json",
      "/.well-known/agent.json",
      "/agent.json",
    ].includes(path)
  ) {
    trackFunnel("agent_card_view");
    return json(card());
  }
  if (method === "GET" && path === "/openapi.json") {
    trackFunnel("openapi_view");
    return json(openapi());
  }
  if (method === "GET" && ["/llms.txt", "/llms-full.txt"].includes(path))
    return text(llms() + String.fromCharCode(10) + "Distribution: https://" + config.domain + "/connect" + String.fromCharCode(10) + "ChatGPT: https://" + config.domain + "/connect/chatgpt" + String.fromCharCode(10) + "Claude: https://" + config.domain + "/connect/claude" + String.fromCharCode(10) + "Grok: https://" + config.domain + "/connect/grok" + String.fromCharCode(10) + "OpenClaw: https://" + config.domain + "/connect/openclaw" + String.fromCharCode(10) + "MCP landing: https://" + config.domain + "/mcp" + String.fromCharCode(10) + "Production services: " + SERVICES.length + String.fromCharCode(10));
  if (method === "GET" && path === "/robots.txt")
    return text(`User-agent: *\nAllow: /\nAllow: /marketplace\nAllow: /integrations\nAllow: /partners\nAllow: /marketplace/partners\nAllow: /connect\nAllow: /connect/chatgpt\nAllow: /connect/claude\nAllow: /connect/grok\nAllow: /connect/openclaw\nAllow: /mcp\nAllow: /.well-known/\nAllow: /api/acquisition\nAllow: /api/services\nAllow: /api/pricing\nAllow: /api/discovery\nAllow: /api/logistics/capabilities\nDisallow: /api/admin/\nDisallow: /api/revenue\nDisallow: /api/treasury/\nSitemap: https://${config.domain}/sitemap.xml\n`);
  if (method === "GET" && path === "/favicon.ico")
    return { statusCode: 200, headers: { "content-type": "image/svg+xml", "cache-control": "public, max-age=86400" }, body: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="16" fill="#071a32"/><path d="M18 47V17h17c9 0 15 5 15 13s-6 13-15 13H27v4zm9-12h8c4 0 6-2 6-5s-2-5-6-5h-8z" fill="#fff"/><path d="M18 17h9v30h-9z" fill="#1769e0"/></svg>` };
  if (method === "GET" && path === "/sitemap.xml")
    return { statusCode: 200, headers: { "content-type": "application/xml; charset=utf-8", "cache-control": "public, max-age=3600" }, body: `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>https://${config.domain}/</loc></url><url><loc>https://${config.domain}/marketplace</loc></url><url><loc>https://${config.domain}/partners</loc></url><url><loc>https://${config.domain}/marketplace/partners</loc></url><url><loc>https://${config.domain}/connect</loc></url><url><loc>https://${config.domain}/connect/chatgpt</loc></url><url><loc>https://${config.domain}/connect/claude</loc></url><url><loc>https://${config.domain}/connect/grok</loc></url><url><loc>https://${config.domain}/connect/openclaw</loc></url><url><loc>https://${config.domain}/mcp</loc></url><url><loc>https://${config.domain}/.well-known/agent-card.json</loc></url><url><loc>https://${config.domain}/openapi.json</loc></url>${SERVICES.map((service) => `<url><loc>https://${config.domain}${servicePath(service.id)}</loc></url>`).join("")}</urlset>` };
  if (method === "GET" && path === "/llms.json")
    return json({
      name: "PrivateDAO Agent Exchange",
      purpose: "machine-to-machine service marketplace",
      lifecycle: ["discover", "request", "execute", "pay_when_required", "verify"],
      categories: SERVICE_CATEGORIES,
      services: SERVICES.map(serviceManifest),
      integrations: integrationDirectory(),
      payment: { quote_first: true, network: "solana-mainnet-beta", asset: "USDC", finalized_transaction_required: true },
      discovery: `https://${config.domain}/.well-known/agent-card.json`,
      mcp: `https://${config.domain}/mcp`,
    });
  if (method === "GET" && path === "/api/services") {
    trackFunnel("service_catalog_view");
    return json({
      services: [...SERVICES.map(serviceManifest), ...(await externalServiceManifests())],
      payment: {
        network: "solana-mainnet-beta",
        treasury: config.treasury,
        usdc_mint: config.usdcMint,
      },
    });
  }
  if (method === "GET" && path === "/api/pricing")
    return json({
      network: "solana:mainnet-beta",
      currency: "USDC",
      services: SERVICES.map((service) => ({
        id: service.id,
        price: service.price,
        currency: service.currency,
        access: service.access,
        free: service.access === "free",
      })),
    });
  if (method === "GET" && path === "/api/integrations")
    return json({
      integrations: integrationDirectory(),
      provider_status: [intelProviderStatus(config), ibmProviderStatus(config), mongoProviderStatus(config), githubProviderStatus(config)],
      disclosure: "Client interoperability and program participation are not the same as official partnership, certification or directory placement.",
    });
  if (method === "GET" && path === "/api/logistics/capabilities")
    return json({
      network: "solana:mainnet-beta",
      capabilities: [
        "service-discovery",
        "provider-matching",
        "structured-agreements",
        "mainnet-evidence",
        "walletless-receipts",
      ],
      protocols: ["HTTP", "A2A", "MCP"],
    });
  const receipt = path.match(/^\/api\/receipts\/([^/]+)$/);
  if (method === "GET" && receipt) {
    const item = await (await store()).get("Receipts", receipt[1]);
    return item ? json(item) : json({ error: "not_found" }, 404);
  }
  const job = path.match(/^\/api\/jobs\/([^/]+)$/);
  if (method === "GET" && job) {
    const item = await (await store()).get("Jobs", job[1]);
    return item ? json(publicJobStatus(item)) : json({ error: "not_found" }, 404);
  }
  const paymentIntent = path.match(/^\/api\/jobs\/([^/]+)\/payment-intent$/);
  if (method === "GET" && paymentIntent) {
    const item = await (await store()).get("Jobs", paymentIntent[1]);
    const quote = await quoteForJob(await store(), item);
    if (!item || !quote) return json({ error: "not_found" }, 404);
    return json({ jobId: item.id, status: item.status, paymentIntent: { jobId: item.id, amount: quote.amount.toFixed(6), amountBaseUnits: String(quote.amountAtomic), mint: quote.mint, network: quote.network, target_network: quote.target_network || item.execution_input?.network || "solana-mainnet-beta", treasuryOwner: quote.treasuryOwner, treasuryTokenAccount: quote.treasuryTokenAccount, paymentReference: quote.paymentReference, expiresAtUtc: quote.expires_at_utc || quote.expires_at, expiresAtEpochMs: quote.expires_at_epoch_ms || Date.parse(quote.expires_at) } });
  }
  const payment = path.match(/^\/api\/jobs\/([^/]+)\/payment$/);
  if (method === "POST" && payment) {
    const result = await submitPayment(payment[1], body);
    return json(result, paymentStatusCode(result));
  }
  const paymentTransaction = path.match(/^\/api\/jobs\/([^/]+)\/payment-transaction$/);
  if (method === "POST" && paymentTransaction)
    return json(await buildPaymentTransaction(paymentTransaction[1], body.payer, body.sourceTokenAccount));
  if (method === "GET" && path === "/api/network/stats")
    return json(await networkStats(config));
  if (method === "GET" && path === "/api/network/health") {
    const requested = String(e.queryStringParameters?.network || "").trim();
    const networks = requested ? [requested] : ["solana-mainnet-beta", "ethereum-mainnet", "base-mainnet", "arbitrum-mainnet"];
    const results = await Promise.all(networks.map(async (network) => {
      try {
        return network === "solana-mainnet-beta"
          ? await solanaHealth(config)
          : await evmHealth(config, network);
      }
      catch (error) { return { network, status: "rpc_unhealthy", reason: error.message }; }
    }));
    return json({ results, read_only: true, note: "RPC health does not imply service execution or payment readiness." });
  }
  if (method === "GET" && path === "/api/providers/status")
    return json({ providers: [intelProviderStatus(config), ibmProviderStatus(config), mongoProviderStatus(config), githubProviderStatus(config)] });
  if (method === "GET" && path === "/api/acquisition") {
    const referral = e.queryStringParameters?.ref || null;
    trackFunnel("acquisition_manifest_view", { source: referral || "direct" });
    return json(acquisition());
  }
  if (method === "POST" && path === "/api/referrals")
    return json(createReferral(body), 201);
  if (method === "GET" && path === "/api/admin/telemetry") {
    const token = e.headers?.["x-pdao-admin-smoke"] || e.headers?.["X-Pdao-Admin-Smoke"];
    if (!config.adminSmokeToken || token !== config.adminSmokeToken)
      return json({ error: "not_found" }, 404);
    return json(await telemetrySummary());
  }
  if (method === "GET" && path === "/api/discovery")
    return json({
      organic: (await activeRegistryAgents()).map(publicRegistryAgent),
      sponsored: [
        {
          id: "pdao-house-discovery",
          sponsored: true,
          disclosure: "PrivateDAO-owned sponsored placement",
          subject: "PDAO utility token",
          destination: `https://pump.fun/coin/${config.pdaoMint}`,
          mint: config.pdaoMint,
          targetChains: ["solana:mainnet-beta"],
          targetCapabilities: ["agent-services", "verification", "logistics"],
          housePlacement: true,
        },
        ...(await activePartnerships()).map(publicPartnershipCampaign),
      ],
    });
  if (method === "GET" && path === "/api/marketplace/listings")
    return json({
      listings: await listListings(e.queryStringParameters || {}),
    });
  if (method === "GET" && path === "/api/marketplace/policy")
    return json(await marketplacePolicy());
  if (method === "GET" && path === "/api/admin/marketplace/policy") {
    if (!adminTokenAuthorized(e)) return json({ error: "not_found" }, 404);
    return json(await marketplacePolicy());
  }
  if (method === "PATCH" && path === "/api/admin/marketplace/policy") {
    if (!adminTokenAuthorized(e)) return json({ error: "not_found" }, 404);
    return json(await saveMarketplacePolicy(body));
  }
  if (method === "GET" && path === "/api/marketplace/partners")
    return json({ partners: (await activePartnerships()).map(publicPartnershipCampaign) });
  if (method === "POST" && path === "/api/admin/partnerships") {
    if (!adminTokenAuthorized(e)) return json({ error: "not_found" }, 404);
    return json(await createPartnership(body), 201);
  }
  const partnership = path.match(/^\/api\/admin\/partnerships\/([^/]+)$/);
  if (method === "PATCH" && partnership) {
    if (!adminTokenAuthorized(e)) return json({ error: "not_found" }, 404);
    return json(await updatePartnership(partnership[1], body));
  }
  const partnershipPaymentIntentRoute = path.match(/^\/api\/partnerships\/([^/]+)\/payment-intent$/);
  if (method === "GET" && partnershipPaymentIntentRoute)
    return json(await partnershipPaymentIntent(decodeURIComponent(partnershipPaymentIntentRoute[1])));
  const partnershipPaymentTransactionRoute = path.match(/^\/api\/partnerships\/([^/]+)\/payment-transaction$/);
  if (method === "POST" && partnershipPaymentTransactionRoute)
    return json(await buildPartnershipPaymentTransaction(decodeURIComponent(partnershipPaymentTransactionRoute[1]), body.payer, body.sourceTokenAccount));
  const partnershipPaymentRoute = path.match(/^\/api\/partnerships\/([^/]+)\/payment$/);
  if (method === "POST" && partnershipPaymentRoute)
    return json(await submitPartnershipPayment(decodeURIComponent(partnershipPaymentRoute[1]), body));
  if (method === "POST" && path === "/api/marketplace/promotions/quote")
    return json(await createSellerPromotionQuote(body), 201);
  const sellerListingQuoteRoute = path === "/api/marketplace/seller-listings/quote";
  if (method === "POST" && sellerListingQuoteRoute)
    return json(await sellerListingQuote(body), 201);
  const sellerListingPaymentRoute = path.match(/^\/api\/marketplace\/seller-listings\/([^/]+)\/payment$/);
  if (method === "POST" && sellerListingPaymentRoute) {
    const result = await submitSellerListingPayment(decodeURIComponent(sellerListingPaymentRoute[1]), body);
    return json(result, paymentStatusCode(result));
  }
  const sellerListingIntentRoute = path.match(/^\/api\/marketplace\/seller-listings\/([^/]+)\/payment-intent$/);
  if (method === "GET" && sellerListingIntentRoute)
    return json(await sellerListingPaymentIntent(decodeURIComponent(sellerListingIntentRoute[1])));
  const sellerListingTransactionRoute = path.match(/^\/api\/marketplace\/seller-listings\/([^/]+)\/payment-transaction$/);
  if (method === "POST" && sellerListingTransactionRoute)
    return json(await buildSellerListingPaymentTransaction(decodeURIComponent(sellerListingTransactionRoute[1]), body.payer, body.sourceTokenAccount));
  if (method === "POST" && path === "/api/marketplace/listings") {
    if (!adminTokenAuthorized(e)) return json({ error: "not_found" }, 404);
    return json(await publishListing(body), 201);
  }
  if (method === "POST" && path === "/api/logistics/request")
    return json(await requestLogistics(body), 201);
  if (method === "POST" && path === "/api/agreements")
    return json(await createAgreement(body), 201);
  const agreement = path.match(/^\/api\/agreements\/([^/]+)$/);
  if (method === "GET" && agreement) {
    const item = await getAgreement(agreement[1]);
    return item ? json(item) : json({ error: "not_found" }, 404);
  }
  const acceptance = path.match(/^\/api\/agreements\/([^/]+)\/accept$/);
  if (method === "POST" && acceptance)
    return json(await acceptAgreement(acceptance[1], body));
  if (method === "GET" && path === "/api/revenue") {
    if (!adminTokenAuthorized(e)) return json({ error: "not_found" }, 404);
    return json(await revenueSummary());
  }
  if (method === "GET" && path === "/api/treasury/status") {
    if (!adminTokenAuthorized(e)) return json({ error: "not_found" }, 404);
    return json(await treasuryStatus());
  }
  const payPage = path.match(/^\/pay\/([^/]+)$/);
  if (method === "GET" && payPage) return { statusCode: 200, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" }, body: injectLanguageWidget(paymentPage(decodeURIComponent(payPage[1]))) };
  if (method === "GET" && path === "/mcp")
    return { statusCode: 200, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" }, body: mcpLandingPage() };
  if (method === "GET" && path === "/a2a")
    return json(card());
  if (method === "POST" && path === "/api/admin/smoke-invoice") {
    const token =
      e.headers?.["x-pdao-admin-smoke"] || e.headers?.["X-PDAO-Admin-Smoke"];
    if (!config.adminSmokeToken || token !== config.adminSmokeToken)
      return json({ error: "not_found" }, 404);
    return json(
      await createJob(
        "verify.deep",
        body.input || { mint: config.pdaoMint },
        true,
        body.currency || "USDC",
      ),
    );
  }
  if (method === "POST" && path === "/api/jobs")
    return json(await createJob(body.service_id, body.input || {}, false, "USDC", requestMetadata(e)));
  if (method === "POST" && path === "/api/external/jobs")
    return json(await createExternalJob(body.service_id, body.input || {}), 201);
  const externalPayment = path.match(/^\/api\/external\/jobs\/([^/]+)\/payment$/);
  if (method === "POST" && externalPayment) {
    const result = await submitExternalPayment(decodeURIComponent(externalPayment[1]), body);
    return json(result, paymentStatusCode(result));
  }
  if (method === "POST" && path === "/api/tasks")
    return json(await createJob(body.service_id, body.input || {}, false, "USDC", requestMetadata(e)));
  if (method === "POST" && path === "/api/payments/quote")
    return json(
      await makeQuote(body.service_id, body.job_id || `job_${randomUUID()}`),
    );
  if (method === "POST" && path === "/api/registry/register")
    return json(await register(body), 201);
  if (method === "POST" && path === "/api/seller/metadata/preview")
    return json(await previewSellerMetadata(body));
  const sellerTokenRotation = path.match(/^\/api\/registry\/agents\/([^/]+)\/owner-token\/rotate$/);
  if (method === "POST" && sellerTokenRotation)
    return json(await rotateSellerOwnerTokenAuthenticated(decodeURIComponent(sellerTokenRotation[1]), body.ownerToken || body.owner_token));
  const adminTokenRotation = path.match(/^\/api\/admin\/registry\/agents\/([^/]+)\/owner-token\/rotate$/);
  if (method === "POST" && adminTokenRotation) {
    if (!adminTokenAuthorized(e)) return json({ error: "not_found" }, 404);
    return json(await rotateSellerOwnerToken(decodeURIComponent(adminTokenRotation[1])));
  }
  if (method === "GET" && path === "/api/registry/search") {
    const q = String(e.queryStringParameters?.q || "").toLowerCase();
    const all = await activeRegistryAgents();
    return json({
      agents: all.filter(
        (x) => !q || JSON.stringify(x).toLowerCase().includes(q),
      ).map(publicRegistryAgent),
    });
  }
  if (method === "GET" && path === "/api/registry/services")
    return json({ services: await externalServiceManifests() });
  const sellerServices = path.match(/^\/api\/registry\/agents\/([^/]+)\/services$/);
  if (method === "PATCH" && sellerServices)
    return json(await updateSellerServices(decodeURIComponent(sellerServices[1]), body));
  const sellerReadinessRoute = path.match(/^\/api\/registry\/agents\/([^/]+)\/seller-readiness$/);
  if (method === "GET" && sellerReadinessRoute)
    return json(await sellerReadiness(decodeURIComponent(sellerReadinessRoute[1])));
  const sellerDashboardRoute = path.match(/^\/api\/seller\/dashboard\/([^/]+)$/);
  if (method === "GET" && sellerDashboardRoute)
    return json(await sellerDashboard(decodeURIComponent(sellerDashboardRoute[1]), e.headers?.["x-pdao-owner-token"] || e.headers?.["X-Pdao-Owner-Token"] || ""));
  const sellerPublishRoute = path.match(/^\/api\/registry\/agents\/([^/]+)\/(publish|unpublish)$/);
  if (method === "POST" && sellerPublishRoute)
    return json(await setSellerPublication(decodeURIComponent(sellerPublishRoute[1]), { ...body, owner_token: body.owner_token || e.headers?.["x-pdao-owner-token"] || e.headers?.["X-Pdao-Owner-Token"] || "" }, sellerPublishRoute[2] === "publish"));
  const sellerReplace = path.match(/^\/api\/registry\/agents\/([^/]+)\/replace$/);
  if (method === "POST" && sellerReplace)
    return json(await replaceSellerEndpoint(decodeURIComponent(sellerReplace[1]), body));
  const sellerRetire = path.match(/^\/api\/registry\/agents\/([^/]+)\/retire$/);
  if (method === "POST" && sellerRetire)
    return json(await retireSeller(decodeURIComponent(sellerRetire[1]), body));
  const agent = path.match(/^\/api\/registry\/agents\/([^/]+)$/);
  if (method === "GET" && agent) {
    const item = await (await store()).get("Registry", agent[1]);
    return item && !item.kind ? json(publicRegistryAgent(item)) : json({ error: "not_found" }, 404);
  }
  const agentRefresh = path.match(/^\/api\/registry\/agents\/([^/]+)\/refresh$/);
  if (method === "POST" && agentRefresh) {
    const agentId = decodeURIComponent(agentRefresh[1]);
    const item = await (await store()).get("Registry", agentId);
    if (!item || item.protocol !== "MCP") return json({ error: "mcp_agent_not_found" }, 404);
    // Refresh performs a discovery and persists health/tool metadata. It is a
    // seller mutation, so callers must prove ownership unless they are an
    // authenticated PrivateDAO admin operation.
    if (!adminTokenAuthorized(e)) await ownedSeller(agentId, body.ownerToken || body.owner_token);
    const ownerToken = body.ownerToken || body.owner_token;
    try {
      return json(await registerMcp({
        name: item.name,
        mcpUrl: item.endpoint,
        agentId: item.id,
        ownerToken,
        tags: item.tags,
        commercialServices: item.commercial_services,
        acceptedAssets: item.acceptedAssets,
        payout: item.payout,
        forceRefresh: true,
        internalRefresh: true,
      }));
    } catch (error) {
      const unavailable = await registerMcp({
        name: item.name,
        mcpUrl: item.endpoint,
        agentId: item.id,
        ownerToken,
        allowedTools: [],
        tags: item.tags,
        commercialServices: item.commercial_services,
        acceptedAssets: item.acceptedAssets,
        payout: item.payout,
        persistUnavailable: true,
        internalRefresh: true,
      });
      return json(unavailable, unavailable.status === "connected" ? 200 : (error.statusCode || 503));
    }
  }
  if (method === "POST" && path === "/api/agents/invoke")
    return json(await invokeAgent(body));
  if (method === "POST" && path === "/a2a") {
    if (body.method === "message/send" || body.method === "SendMessage") {
      const params = body.params || {};
      const message = params.message || {};
      const textPart = (message.parts || []).find((part) => part.text)?.text || "";
      const serviceId = message.metadata?.service_id || params.metadata?.service_id;
      if (!serviceId) {
        return json({
          jsonrpc: "2.0",
          id: body.id ?? null,
          result: {
            id: randomUUID(),
            status: { state: "completed" },
            artifacts: [{ parts: [{ type: "data", data: { service: "discovery", query: textPart, services: SERVICES } }] }],
          },
        });
      }
      try {
        const result = await createJob(serviceId, message.metadata?.input || {}, false);
        return json({ jsonrpc: "2.0", id: body.id ?? null, result: { id: result.job_id, status: { state: "completed" }, artifacts: [{ parts: [{ type: "data", data: result.result }] }], receipt: result.receipt } });
      } catch (error) {
        const rawStatus = Number(error?.statusCode);
        const status = Number.isFinite(rawStatus) && rawStatus > 0
          ? rawStatus
          : upstreamFailurePattern.test(String(error?.message || "")) ? 502 : 400;
        return json({ jsonrpc: "2.0", id: body.id ?? null, error: { code: -32000, message: publicErrorMessage(error) } }, status);
      }
    }
    const result = await createJob(
      body.service || body.service_id,
      body.input || body.payload || {},
      false,
    );
    return json({
      id: result.job_id,
      status: { state: "completed" },
      artifacts: [{ parts: [{ type: "data", data: result.result }] }],
      receipt: result.receipt,
    });
  }
  if (method === "POST" && path === "/mcp") return await mcp(body);
  return json({ error: "not_found" }, 404);
}

async function mcp(request) {
  const id = request.id;
  if (typeof request.method === "string" && request.method.startsWith("notifications/"))
    return { statusCode: 202, headers: { "cache-control": "no-store" }, body: "" };
  if (request.method === "initialize")
    return json({
      jsonrpc: "2.0",
      id,
      result: {
        protocolVersion: "2025-06-18",
        serverInfo: { name: "pdao-agent-exchange", version: "1.6.0" },
        capabilities: { tools: {} },
      },
    });
  if (request.method === "ping")
    return json({ jsonrpc: "2.0", id, result: {} });
  const schemas = {
    exchange_overview: { type: "object", properties: {}, additionalProperties: false, description: "Explain what the PrivateDAO Agent Exchange is, its lifecycle, endpoints, payment rail and verification model." },
    pdao_services: { type: "object", properties: {}, additionalProperties: false, description: "List every current PrivateDAO service with category, customer value, access, price, inputs, output, networks, runtime status and payment behavior." },
    service_recommendation: { type: "object", properties: { task: { type: "string", minLength: 2, maxLength: 500, description: "Natural-language task the agent wants to accomplish." }, network: { type: "string", description: "Optional target network constraint." } }, required: ["task"], additionalProperties: false },
    provider_integrations: { type: "object", properties: {}, additionalProperties: false, description: "Explain the commercial role and verified status of each ecosystem integration without exposing credentials." },
    payment_guide: { type: "object", properties: {}, additionalProperties: false, description: "Return the exact quote-first paid-service lifecycle and safety rules." },
    execution_guide: { type: "object", properties: {}, additionalProperties: false, description: "Return the endpoints and state transitions needed to request, execute, poll and verify a service." },
    verify_basic: {
      type: "object",
      properties: {
        network: { type: "string", description: "Optional target network identifier." },
        mint: { type: "string", description: "Solana mint address to inspect." },
        asset: { type: "string", description: "Alias for mint." },
        record: { type: "object", description: "Structured record to hash and verify." },
        expected_digest: { type: "string", description: "Optional expected canonical digest." },
      },
      anyOf: [{ required: ["mint"] }, { required: ["asset"] }, { required: ["record"] }],
      additionalProperties: false,
    },
    create_paid_job: {
      type: "object",
      properties: {
        service_id: { type: "string", enum: SERVICES.filter((service) => service.access === "paid").map((service) => service.id) },
        input: { type: "object", description: "Service-specific JSON input." },
      },
      required: ["service_id"],
      additionalProperties: false,
    },
    submit_payment: {
      type: "object",
      properties: { job_id: { type: "string", pattern: "^job_[A-Za-z0-9-]+$" }, signature: { type: "string", description: "Finalized Solana transaction signature." } },
      required: ["job_id", "signature"],
      additionalProperties: false,
    },
    job_status: {
      type: "object",
      properties: { job_id: { type: "string", pattern: "^job_[A-Za-z0-9-]+$" } },
      required: ["job_id"],
      additionalProperties: false,
    },
    get_receipt: {
      type: "object",
      properties: { receipt_id: { type: "string", pattern: "^rvr_[A-Za-z0-9]+$" } },
      required: ["receipt_id"],
      additionalProperties: false,
    },
    search_agents: {
      type: "object",
      properties: {
        q: { type: "string", maxLength: 200, description: "Free-text registry search." },
        capability: { type: "string", maxLength: 120 },
        network: { type: "string", description: "Canonical network or accepted alias." },
        limit: { type: "integer", minimum: 1, maximum: 100 },
      },
      additionalProperties: false,
    },
    register_agent: {
      type: "object",
      properties: {
        name: { type: "string", maxLength: 200 },
        protocol: { type: "string", enum: ["MCP"] },
        mcpUrl: { type: "string", format: "uri", description: "Public HTTPS MCP endpoint" },
        mcp_url: { type: "string", format: "uri", description: "Compatibility alias for mcpUrl." },
        endpoint: { type: "string", format: "uri", description: "Compatibility alias for mcpUrl." },
        agent_id: { type: "string", pattern: "^agent_[A-Za-z0-9_-]{8,100}$", description: "Snake-case compatibility alias for agentId." },
        sellerId: { type: "string", pattern: "^agent_[A-Za-z0-9_-]{8,100}$", description: "Compatibility alias for agentId." },
        seller_id: { type: "string", pattern: "^agent_[A-Za-z0-9_-]{8,100}$", description: "Snake-case compatibility alias for agentId." },
        allowedTools: { type: "array", items: { type: "string", maxLength: 120 }, maxItems: 64 },
        allowed_tools: { type: "array", items: { type: "string", maxLength: 120 }, maxItems: 64, description: "Snake-case compatibility alias for allowedTools." },
        tags: { type: "array", items: { type: "string", maxLength: 64 }, maxItems: 16 },
        networks: { type: "array", items: { type: "string", maxLength: 80 }, maxItems: 32, description: "Explicitly declared supported networks; aliases are normalized." },
        forceRefresh: { type: "boolean", description: "Force a fresh MCP handshake instead of returning an existing healthy registration." },
        force_refresh: { type: "boolean", description: "Snake-case compatibility alias for forceRefresh." },
        persistUnavailable: { type: "boolean", description: "Persist Unavailable after a failed health check; never marks it connected" },
        persist_unavailable: { type: "boolean", description: "Snake-case compatibility alias for persistUnavailable." },
        agentId: { type: "string", pattern: "^agent_[A-Za-z0-9_-]{8,100}$", description: "Stable seller identity for updates and endpoint replacement." },
        ownerToken: { type: "string", minLength: 16, maxLength: 200, description: "Seller ownership token; returned only once on first registration." },
        owner_token: { type: "string", minLength: 16, maxLength: 200, description: "Snake-case compatibility alias for ownerToken." },
        commercialServices: { type: "array", maxItems: 64, items: { type: "object" }, description: "Explicit per-tool commercial metadata; prices are never inferred." },
        commercial_services: { type: "array", maxItems: 64, items: { type: "object" }, description: "Snake-case compatibility alias for commercialServices." },
        acceptedAssets: { type: "array", maxItems: 20, items: { type: "string", maxLength: 20 } },
        accepted_assets: { type: "array", maxItems: 20, items: { type: "string", maxLength: 20 }, description: "Snake-case compatibility alias for acceptedAssets." },
        payout: { type: "object", properties: { address: { type: "string" }, network: { type: "string" }, asset: { type: "string" } }, additionalProperties: false },
      },
      anyOf: [{ required: ["mcpUrl"] }, { required: ["mcp_url"] }, { required: ["endpoint"] }],
      additionalProperties: false,
    },
    agent_match: {
      type: "object",
      properties: { capabilities: { type: "array", items: { type: "string", maxLength: 120 }, maxItems: 32 }, network: { type: "string", description: "Canonical network or accepted alias." } },
      required: ["capabilities"],
      additionalProperties: false,
    },
    logistics_request: {
      type: "object",
      properties: {
        capability: { type: "string", maxLength: 120 },
        requirements: { type: "object" },
        maxPrice: { type: "number", minimum: 0 },
        asset: { type: "string", maxLength: 20 },
        deadline: { type: "string", format: "date-time" },
        preferredProtocols: { type: "array", items: { type: "string", maxLength: 40 }, maxItems: 8 },
        network: { type: "string", description: "Canonical network or accepted alias." },
      },
      required: ["capability"],
      additionalProperties: false,
    },
    network_stats: { type: "object", properties: {}, additionalProperties: false },
    external_services: { type: "object", properties: { q: { type: "string", maxLength: 200 }, limit: { type: "integer", minimum: 1, maximum: 100 } }, additionalProperties: false },
    seller_update_services: { type: "object", properties: { agent_id: { type: "string" }, owner_token: { type: "string", minLength: 16 }, services: { type: "array", items: { type: "object" } }, accepted_assets: { type: "array", items: { type: "string" } }, payout: { type: "object" } }, required: ["agent_id", "owner_token", "services"], additionalProperties: false },
    seller_replace_endpoint: { type: "object", properties: { agent_id: { type: "string" }, owner_token: { type: "string", minLength: 16 }, mcp_url: { type: "string", format: "uri" } }, required: ["agent_id", "owner_token", "mcp_url"], additionalProperties: false },
    seller_retire: { type: "object", properties: { agent_id: { type: "string" }, owner_token: { type: "string", minLength: 16 }, reason: { type: "string", maxLength: 300 } }, required: ["agent_id", "owner_token"], additionalProperties: false },
  };
  const annotations = {
    exchange_overview: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    pdao_services: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    service_recommendation: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    provider_integrations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    payment_guide: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    execution_guide: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    verify_basic: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    create_paid_job: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
    submit_payment: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: false },
    job_status: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    get_receipt: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    search_agents: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    register_agent: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    agent_match: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    logistics_request: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    network_stats: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    external_services: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    seller_update_services: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    seller_replace_endpoint: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    seller_retire: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: true },
  };
  const tools = [
    "exchange_overview",
    "pdao_services",
    "service_recommendation",
    "provider_integrations",
    "payment_guide",
    "execution_guide",
    "verify_basic",
    "create_paid_job",
    "submit_payment",
    "job_status",
    "get_receipt",
    "search_agents",
    "register_agent",
    "agent_match",
    "logistics_request",
    "network_stats",
    "external_services",
    "seller_update_services",
    "seller_replace_endpoint",
    "seller_retire",
  ].map((name) => ({
    name,
    title: `PrivateDAO ${name}`,
    description: ({
      exchange_overview: "Start here. Explain the PrivateDAO Agent Exchange as a service economy for AI agents: discover a capability, request it, receive a quote when paid, execute read-only evidence work, and verify the receipt.",
      pdao_services: "Return the complete current catalog with service IDs, customer value, category, pricing, inputs, outputs, target networks and payment behavior.",
      service_recommendation: "Map a natural-language task to the best available PrivateDAO services. Use this before create_paid_job when the user has not named a service ID.",
      provider_integrations: "Explain what IBM watsonx, Intel OpenVINO, MongoDB, GitHub, ChatGPT, Claude, Grok, OpenClaw and the PrivateDAO Kernel add to the ecosystem, with relationship disclosures and safe provider status.",
      payment_guide: "Explain the quote-first Solana Mainnet USDC payment flow. Never infer an amount, never pay before a payment_intent, and never request a private key.",
      execution_guide: "Explain how to create a free or paid job, interpret 402 payment_intent, submit finalized payment proof, poll status, retrieve a receipt and verify it.",
      agent_match: "Free registry discovery and capability matching. Use create_paid_job for the paid agent.match service.",
    }[name] || `PrivateDAO ${name}`),
    inputSchema: schemas[name] || { type: "object", additionalProperties: false },
    annotations: annotations[name],
  }));
  if (request.method === "tools/list")
    return json({ jsonrpc: "2.0", id, result: { tools } });
  if (request.method === "tools/call") {
    const name = request.params?.name,
      a = request.params?.arguments || {};
    try {
      let result;
      if (name === "exchange_overview") result = {
        name: "PrivateDAO Agent Exchange",
        purpose: "A machine-to-machine marketplace where AI agents discover, request, execute, pay when required, and verify evidence services.",
        lifecycle: ["discover", "request", "execute", "pay_when_required", "verify"],
        categories: SERVICE_CATEGORIES,
        endpoints: { mcp: `https://${config.domain}/mcp`, agent_card: `https://${config.domain}/.well-known/agent-card.json`, services: `https://${config.domain}/api/services`, pricing: `https://${config.domain}/api/pricing`, integrations: `https://${config.domain}/api/integrations`, openapi: `https://${config.domain}/openapi.json` },
        payment: { quote_first: true, asset: "USDC", network: "solana-mainnet-beta", finalized_transaction_required: true, agent_signs_transaction: true },
        verification: { receipt_endpoint: `https://${config.domain}/api/receipts/{receiptId}`, result_hashes: true, provider_provenance: true },
        guidance: "Use service_recommendation for task selection, pdao_services for exact schemas, and payment_guide before any paid action.",
      };
      else if (name === "pdao_services") result = { categories: SERVICE_CATEGORIES, services: [...SERVICES.map(serviceManifest), ...(await externalServiceManifests())] };
      else if (name === "service_recommendation") {
        const ids = serviceRecommendation(a.task);
        result = { task: a.task, matches: (ids.length ? ids : SERVICES.map((service) => service.id)).map((id) => serviceManifest(serviceById(id))), note: ids.length ? "Matches are ranked by task keywords; inspect each input schema before requesting." : "No direct keyword match; review the full catalog before choosing." };
      }
      else if (name === "provider_integrations") result = { integrations: integrationDirectory(), provider_status: [intelProviderStatus(config), ibmProviderStatus(config), mongoProviderStatus(config), githubProviderStatus(config)], disclosure: "Tested client interoperability and program participation do not imply official partnership, certification or directory placement." };
      else if (name === "payment_guide") result = {
        free: "POST /api/jobs with verify.basic or another free service; receive the result and receipt immediately.",
        paid: ["POST /api/jobs", "expect HTTP 402", "read payment_intent exactly", "send exact finalized USDC on Solana Mainnet to the quoted treasury token account with the quoted reference", "POST /api/jobs/{jobId}/payment with the finalized signature", "GET /api/jobs/{jobId}", "GET /api/receipts/{receiptId}"],
        rules: ["quote first", "do not pay an amount from catalog text alone", "do not send private keys or seed phrases", "target network is separate from payment network", "payment is not execution authorization for writes", "HTTP 409 recovery_required means do not replay the payment or service"],
      };
      else if (name === "execution_guide") result = {
        states: ["awaiting_payment", "running", "completed", "recovery_required"],
        create: `POST https://${config.domain}/api/jobs`,
        status: `GET https://${config.domain}/api/jobs/{jobId}`,
        payment_intent: `GET https://${config.domain}/api/jobs/{jobId}/payment-intent`,
        payment_proof: `POST https://${config.domain}/api/jobs/{jobId}/payment`,
        receipt: `GET https://${config.domain}/api/receipts/{receiptId}`,
        retry: "Retry 429 and transient 503 responses with backoff; correct 400 input errors; do not repeat a payment signature; HTTP 409 recovery_required is terminal for automatic execution and must not replay the service.",
      };
      else if (name === "verify_basic")
        result = await executeService("verify.basic", a);
      else if (name === "create_paid_job") {
        try {
          result = await createJob(a.service_id, a.input || {}, false);
        } catch (error) {
          if (error.statusCode === 402)
            result = {
              status: "awaiting_payment",
              payment_intent: error.payment_intent,
            };
          else throw error;
        }
      } else if (name === "job_status")
        result = publicJobStatus(await (await store()).get("Jobs", a.job_id));
      else if (name === "get_receipt")
        result = await (await store()).get("Receipts", a.receipt_id);
      else if (name === "search_agents") {
        const query = String(a.q || "").toLowerCase();
        const capability = a.capability ? String(a.capability) : null;
        const network = a.network ? normalizeNetworkId(a.network) : null;
        const agents = (await activeRegistryAgents()).filter((agent) => {
          const haystack = JSON.stringify(agent).toLowerCase();
          const chains = (agent.networks || []).map(normalizeNetworkId);
          return (!query || haystack.includes(query)) &&
            (!capability || (agent.capabilities || []).includes(capability)) &&
            (!network || !chains.length || chains.includes(network));
        }).slice(0, Math.min(Number(a.limit || 50), 100)).map(publicRegistryAgent);
        result = { agents };
      }
      else if (name === "external_services") {
        const query = String(a.q || "").toLowerCase();
        result = { services: (await externalServiceManifests()).filter((service) => !query || JSON.stringify(service).toLowerCase().includes(query)).slice(0, Math.min(Number(a.limit || 50), 100)) };
      }
      else if (name === "agent_match")
        result = await matchRegisteredAgents(a);
      else if (name === "logistics_request") result = await requestLogistics(a);
      else if (name === "network_stats") result = await networkStats(config);
      else if (name === "register_agent") result = await register(a);
      else if (name === "seller_update_services") result = await updateSellerServices(a.agent_id, a);
      else if (name === "seller_replace_endpoint") result = await replaceSellerEndpoint(a.agent_id, a);
      else if (name === "seller_retire") result = await retireSeller(a.agent_id, a);
      else if (name === "submit_payment")
        result = {
          status: "use_http_payment_endpoint",
          required: ["job_id", "signature"],
        };
      else throw Object.assign(new Error("unknown MCP tool"), { statusCode: 400 });
      return json({
        jsonrpc: "2.0",
        id,
        result: {
          content: [{ type: "text", text: JSON.stringify(result) }],
          structuredContent: result,
        },
      });
    } catch (error) {
      const diagnostic = {
        error: publicErrorMessage(error),
        statusCode: error.statusCode || 400,
        ...(error.upstreamStatus ? { upstreamStatus: error.upstreamStatus } : {}),
      };
      return json({
        jsonrpc: "2.0",
        id,
        result: {
          isError: true,
          content: [{ type: "text", text: JSON.stringify(diagnostic) }],
          structuredContent: diagnostic,
        },
      });
    }
  }
  return json(
    {
      jsonrpc: "2.0",
      id,
      error: { code: -32601, message: "method not found" },
    },
  );
}

export async function handler(event) {
  try {
    const response = withSecurityHeaders(await handle(event));
    if (methodOf(event) !== "HEAD") return response;
    const headers = { ...(response.headers || {}) };
    delete headers["content-length"];
    delete headers["Content-Length"];
    return { ...response, headers, body: "" };
  } catch (error) {
    console.error(JSON.stringify({
      event: "request_failed",
      requestId: event?.requestContext?.requestId || event?.requestContext?.http?.requestId || null,
      method: methodOf(event),
      path: pathOf(event),
      status: error.statusCode || 400,
      error: error.name || "Error",
      upstreamStatus: error.upstreamStatus || null,
    }));
    return withSecurityHeaders(errorResponse(error));
  }
}
export function resetForTests() {
  storePromise = Promise.resolve(new MemoryStore());
  config.adminSmokeToken = process.env.AGENT_EXCHANGE_TEST_ADMIN_TOKEN || "";
  configPromise = Promise.resolve(config);
  resetRuntimeControls();
}
