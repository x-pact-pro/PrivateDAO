import { createHmac, createSign, timingSafeEqual } from "node:crypto";

const API_VERSION = "2022-11-28";
const tokenCache = new Map();

function required(value, message) {
  if (!value) throw Object.assign(new Error(message), { statusCode: 503 });
  return value;
}

export function githubAppConfigured(config) {
  return Boolean(config.githubAppId && config.githubAppPrivateKey);
}

export function githubAppJwt(config) {
  const key = required(config.githubAppPrivateKey, "GitHub App private key is not configured");
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify({ iss: String(config.githubAppId), iat: now - 60, exp: now + 540 })).toString("base64url");
  const input = `${header}.${payload}`;
  const signer = createSign("RSA-SHA256");
  signer.update(input);
  return `${input}.${signer.sign(key, "base64url")}`;
}

async function request(config, path, options = {}) {
  const response = await fetch(`${String(config.githubApiUrl).replace(/\/$/, "")}${path}`, {
    method: options.method || "GET",
    signal: AbortSignal.timeout(10000),
    headers: {
      accept: "application/vnd.github+json",
      "content-type": "application/json",
      "x-github-api-version": API_VERSION,
      authorization: `Bearer ${required(options.token, "GitHub authentication token is unavailable")}`,
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  const text = await response.text();
  let body = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = { message: text.slice(0, 500) }; }
  if (!response.ok) {
    const error = new Error(`GitHub API returned HTTP ${response.status}`);
    error.statusCode = response.status === 404 ? 404 : 502;
    error.upstreamStatus = response.status;
    throw error;
  }
  return { body, headers: response.headers };
}

export async function githubInstallationToken(config, installationId) {
  const id = String(installationId || "").match(/^\d+$/)?.[0];
  if (!id) throw Object.assign(new Error("valid GitHub installation_id is required"), { statusCode: 400 });
  const cached = tokenCache.get(id);
  if (cached && cached.expiresAt > Date.now() + 60_000) return cached;
  const result = await request(config, `/app/installations/${id}/access_tokens`, {
    method: "POST",
    token: githubAppJwt(config),
    body: {},
  });
  const value = {
    token: result.body.token,
    expiresAt: Date.parse(result.body.expires_at || "") || Date.now() + 3_540_000,
    expires_at: result.body.expires_at || null,
    permissions: result.body.permissions || {},
    repositories: result.body.repositories || [],
  };
  tokenCache.set(id, value);
  return value;
}

export async function githubGetInstallation(config, installationId) {
  const id = String(installationId || "").match(/^\d+$/)?.[0];
  if (!id) throw Object.assign(new Error("valid GitHub installation_id is required"), { statusCode: 400 });
  return (await request(config, `/app/installations/${id}`, { token: githubAppJwt(config) })).body;
}

export async function githubInstallationRepositories(config, installationId) {
  const token = await githubInstallationToken(config, installationId);
  const repositories = [];
  for (let page = 1; page <= 100; page += 1) {
    const body = (await request(config, `/installation/repositories?per_page=100&page=${page}`, { token: token.token })).body;
    const pageRepositories = Array.isArray(body.repositories) ? body.repositories : [];
    repositories.push(...pageRepositories);
    if (pageRepositories.length < 100) break;
  }
  return repositories.map((repo) => ({ id: repo.id, full_name: repo.full_name, private: Boolean(repo.private), default_branch: repo.default_branch || null }));
}

export function mergeGithubInstallationRepositories(existing = [], added = [], removed = []) {
  const key = (repo) => String(repo?.id ?? "");
  const repositories = new Map(
    (Array.isArray(existing) ? existing : [])
      .filter((repo) => repo && repo.removed !== true && key(repo))
      .map((repo) => [key(repo), { id: repo.id, full_name: repo.full_name, private: Boolean(repo.private), default_branch: repo.default_branch || null }]),
  );
  for (const repo of Array.isArray(removed) ? removed : []) repositories.delete(key(repo));
  for (const repo of Array.isArray(added) ? added : []) {
    if (!key(repo)) continue;
    repositories.set(key(repo), { id: repo.id, full_name: repo.full_name, private: Boolean(repo.private), default_branch: repo.default_branch || null });
  }
  return [...repositories.values()].sort((left, right) => String(left.full_name || "").localeCompare(String(right.full_name || "")));
}

export function githubMarketplaceAccountRecordId(accountId) {
  const id = String(accountId ?? "").match(/^\d+$/)?.[0];
  if (!id) throw Object.assign(new Error("valid GitHub Marketplace account id is required"), { statusCode: 400 });
  return `github_marketplace_account_${id}`;
}

export function applyGithubMarketplacePurchase(records = [], purchase = {}, action = "", updatedAt = new Date().toISOString()) {
  const accountId = String(purchase?.account?.id ?? "").match(/^\d+$/)?.[0];
  if (!accountId) throw Object.assign(new Error("GitHub Marketplace purchase account id is required"), { statusCode: 400 });
  const normalizedAction = String(action || "");
  const account = purchase.account
    ? { id: purchase.account.id, login: purchase.account.login || null, type: purchase.account.type || null }
    : null;
  const marketplace = {
    action: normalizedAction,
    plan_id: purchase.plan?.id || purchase.plan?.base?.id || null,
    plan_name: purchase.plan?.name || null,
    account,
    effective_date: purchase.effective_date || null,
    on_free_trial: Boolean(purchase.on_free_trial),
    updated_at: updatedAt,
  };
  // A pending plan change does not revoke today's entitlement. Only the
  // explicit cancelled action makes the current entitlement inactive.
  const entitlementStatus = normalizedAction === "cancelled" ? "cancelled" : "active";
  const source = Array.isArray(records) ? records : [];
  const accountRecordId = githubMarketplaceAccountRecordId(accountId);
  const existingAccountRecord = source.find((record) => record?.id === accountRecordId) || {};
  const accountRecord = {
    ...existingAccountRecord,
    id: accountRecordId,
    kind: "github_marketplace_account",
    account,
    marketplace,
    entitlement_status: entitlementStatus,
    updated_at: updatedAt,
  };
  const installationRecords = source
    .filter((record) =>
      record?.kind === "github_installation" &&
      String(record?.account?.id ?? "") === accountId
    )
    .map((record) => ({
      ...record,
      marketplace,
      entitlement_status: entitlementStatus,
      updated_at: updatedAt,
    }));
  return {
    account_id: accountId,
    account_record: accountRecord,
    installation_records: installationRecords,
    entitlement_status: entitlementStatus,
  };
}

export function publicGithubInstallationRecord(record) {
  const source = record || {};
  const safe = {};
  for (const key of [
    "id", "kind", "installation_id", "account", "repository_selection", "authentication",
    "status", "entitlement_status", "marketplace", "updated_at",
  ]) {
    if (source[key] !== undefined) safe[key] = source[key];
  }
  safe.repository_count = Array.isArray(source.repositories) ? source.repositories.length : 0;
  return safe;
}

export async function githubRepositoryContext(config, installationId, repository) {
  const match = String(repository || "").trim().match(/^(?:https:\/\/github\.com\/)?([A-Za-z0-9_.-]{1,100})\/([A-Za-z0-9_.-]{1,100})(?:\/)?$/);
  if (!match) throw Object.assign(new Error("repository must be owner/name or a GitHub repository URL"), { statusCode: 400 });
  const token = await githubInstallationToken(config, installationId);
  const repo = (await request(config, `/repos/${encodeURIComponent(match[1])}/${encodeURIComponent(match[2])}`, { token: token.token })).body;
  return {
    provider: "github",
    repository: repo.full_name,
    id: repo.id,
    private: Boolean(repo.private),
    default_branch: repo.default_branch || null,
    visibility: repo.visibility || null,
    html_url: repo.html_url || null,
    installation_id: String(installationId),
    evidence_confidence: "github-app-installation-confirmed",
    observed_at: new Date().toISOString(),
  };
}

export function verifyGithubWebhook(rawBody, signature, secret) {
  if (!secret || !signature || !String(signature).startsWith("sha256=")) return false;
  const expected = Buffer.from(`sha256=${createHmac("sha256", secret).update(rawBody).digest("hex")}`);
  const actual = Buffer.from(String(signature));
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
