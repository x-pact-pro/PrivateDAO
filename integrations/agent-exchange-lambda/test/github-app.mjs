import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";
import { applyGithubMarketplacePurchase, githubMarketplaceAccountRecordId, mergeGithubInstallationRepositories, publicGithubInstallationRecord, verifyGithubWebhook } from "../src/github-app.mjs";
import { MemoryStore } from "../src/storage.mjs";

test("GitHub webhook verification binds the signature to the exact raw body", () => {
  const secret = "webhook-test-secret";
  const rawBody = '{"action":"created","installation":{"id":164152168}}';
  const signature = `sha256=${createHmac("sha256", secret).update(rawBody).digest("hex")}`;
  assert.equal(verifyGithubWebhook(rawBody, signature, secret), true);
  assert.equal(verifyGithubWebhook(`${rawBody} `, signature, secret), false);
  assert.equal(verifyGithubWebhook(rawBody, signature.replace(/^sha256=/, "sha1="), secret), false);
});

test("GitHub setup claims are single-use and recover after an expired lease", async () => {
  const store = new MemoryStore();
  await store.put("Registry", "state", { id: "state", kind: "github_setup_state" });
  await store.claim("Registry", "state", { claim_started_at: new Date().toISOString(), claim_expires_at: new Date(Date.now() + 60_000).toISOString(), claim_installation_id: "164152168" });
  await assert.rejects(() => store.claim("Registry", "state", { claim_started_at: new Date().toISOString(), claim_expires_at: new Date(Date.now() + 60_000).toISOString(), claim_installation_id: "164152168" }));
  await store.update("Registry", "state", (current) => ({ ...current, claim_expires_at: new Date(Date.now() - 1_000).toISOString() }));
  await store.claim("Registry", "state", { claim_started_at: new Date().toISOString(), claim_expires_at: new Date(Date.now() + 60_000).toISOString(), claim_installation_id: "164152168" });
});

test("installation repository webhook deltas preserve existing access and apply additions/removals", () => {
  const merged = mergeGithubInstallationRepositories(
    [
      { id: 1, full_name: "X-PACT/PrivateDAO", private: true, default_branch: "main" },
      { id: 2, full_name: "X-PACT/old", private: false, default_branch: "main" },
    ],
    [{ id: 3, full_name: "X-PACT/new", private: true, default_branch: "master" }],
    [{ id: 2, full_name: "X-PACT/old" }],
  );
  assert.deepEqual(merged, [
    { id: 3, full_name: "X-PACT/new", private: true, default_branch: "master" },
    { id: 1, full_name: "X-PACT/PrivateDAO", private: true, default_branch: "main" },
  ]);
});

test("installation repository webhook ignores legacy removed markers and malformed deltas", () => {
  const merged = mergeGithubInstallationRepositories(
    [{ id: 1, full_name: "X-PACT/old", removed: true }, { id: 2, full_name: "X-PACT/keep" }],
    [{ full_name: "X-PACT/no-id" }, { id: 3, full_name: "X-PACT/new" }],
    [],
  );
  assert.deepEqual(merged, [
    { id: 2, full_name: "X-PACT/keep", private: false, default_branch: null },
    { id: 3, full_name: "X-PACT/new", private: false, default_branch: null },
  ]);
});

test("public installation metadata never exposes repository names or credential hashes", () => {
  const safe = publicGithubInstallationRecord({
    id: "github_installation_164152168",
    kind: "github_installation",
    connection_token_hash: "secret-hash",
    owner_token_hash: "another-secret-hash",
    github_access_token_hash: "legacy-secret-hash",
    repositories: [{ id: 1, full_name: "X-PACT/private-repo", private: true }],
    status: "active",
  });
  assert.equal(safe.repository_count, 1);
  assert.equal("repositories" in safe, false);
  assert.equal("connection_token_hash" in safe, false);
  assert.equal("owner_token_hash" in safe, false);
  assert.equal("github_access_token_hash" in safe, false);
  assert.equal(JSON.stringify(safe).includes("private-repo"), false);
});


test("Marketplace purchase account id is never treated as an installation id", () => {
  const records = [
    {
      id: "github_installation_164152168",
      kind: "github_installation",
      installation_id: "164152168",
      account: { id: 259045474, login: "X-PACT", type: "User" },
      status: "active",
      entitlement_status: "active",
    },
  ];
  const purchase = {
    account: { id: 259045474, login: "X-PACT", type: "User" },
    plan: { id: 7001, name: "Pro" },
    effective_date: "2026-09-28T00:00:00Z",
  };
  const applied = applyGithubMarketplacePurchase(records, purchase, "purchased", "2026-09-28T12:00:00Z");
  assert.equal(applied.account_record.id, "github_marketplace_account_259045474");
  assert.notEqual(applied.account_record.id, "github_installation_259045474");
  assert.equal(applied.installation_records.length, 1);
  assert.equal(applied.installation_records[0].id, "github_installation_164152168");
  assert.equal(applied.installation_records[0].marketplace.plan_id, 7001);
  assert.equal(applied.entitlement_status, "active");
});

test("Marketplace entitlement updates only installations owned by the purchase account", () => {
  const records = [
    {
      id: "github_installation_1",
      kind: "github_installation",
      installation_id: "1",
      account: { id: 10, login: "alpha", type: "Organization" },
      entitlement_status: "active",
    },
    {
      id: "github_installation_2",
      kind: "github_installation",
      installation_id: "2",
      account: { id: 20, login: "beta", type: "Organization" },
      entitlement_status: "active",
    },
  ];
  const applied = applyGithubMarketplacePurchase(
    records,
    { account: { id: 10, login: "alpha", type: "Organization" }, plan: { id: 3, name: "Team" } },
    "changed",
    "2026-09-28T12:01:00Z",
  );
  assert.deepEqual(applied.installation_records.map((record) => record.id), ["github_installation_1"]);
  assert.equal(applied.installation_records[0].marketplace.plan_name, "Team");
});

test("Marketplace pending change stays active until an explicit cancellation", () => {
  const purchase = { account: { id: 10, login: "alpha", type: "Organization" }, plan: { id: 3, name: "Team" } };
  const pending = applyGithubMarketplacePurchase([], purchase, "pending_change", "2026-09-28T12:02:00Z");
  assert.equal(pending.entitlement_status, "active");
  const cancelled = applyGithubMarketplacePurchase([pending.account_record], purchase, "cancelled", "2026-09-28T12:03:00Z");
  assert.equal(cancelled.entitlement_status, "cancelled");
  assert.equal(cancelled.account_record.entitlement_status, "cancelled");
});

test("Marketplace account ids are validated", () => {
  assert.equal(githubMarketplaceAccountRecordId(259045474), "github_marketplace_account_259045474");
  assert.throws(() => githubMarketplaceAccountRecordId("not-an-id"), /valid GitHub Marketplace account id/);
  assert.throws(
    () => applyGithubMarketplacePurchase([], { account: { login: "missing-id" } }, "purchased"),
    /purchase account id is required/,
  );
});
