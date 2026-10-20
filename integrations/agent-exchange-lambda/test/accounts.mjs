import assert from "node:assert/strict";
import test from "node:test";
import { createAccountService } from "../src/accounts.mjs";

function fakeCollections() {
  const rows = { accounts: [], sessions: [], state: [] };
  const matches = (row, query) => Object.entries(query || {}).every(([key, expected]) => {
    if (expected && typeof expected === "object" && "$gt" in expected) return row[key] > expected.$gt;
    return row[key] === expected;
  });
  const collection = (name) => ({
    async findOne(query, options = {}) {
      const row = rows[name].find((item) => matches(item, query));
      if (!row) return null;
      if (!options.projection) return { ...row };
      return Object.fromEntries(Object.keys(options.projection).filter((key) => options.projection[key] && key in row).map((key) => [key, row[key]]));
    },
    async insertOne(row) { rows[name].push({ ...row }); return { acknowledged: true, insertedId: row._id }; },
    async deleteOne(query) { const index = rows[name].findIndex((item) => matches(item, query)); if (index >= 0) rows[name].splice(index, 1); return { deletedCount: index >= 0 ? 1 : 0 }; },
    async updateOne(query, update, options = {}) {
      let row = rows[name].find((item) => matches(item, query));
      if (!row && options.upsert) { row = { ...query }; rows[name].push(row); }
      if (row && update.$set) Object.assign(row, update.$set);
      return { acknowledged: true, matchedCount: row ? 1 : 0 };
    },
  });
  return { collections: { accounts: collection("accounts"), sessions: collection("sessions"), state: collection("state") }, rows };
}

test("account lifecycle supports registration, sessions, favorites, cart, and logout", async () => {
  const fake = fakeCollections();
  const service = createAccountService({ mongoUri: "test-only" }, { collectionsProvider: async () => fake.collections });
  const registered = await service.register("Buyer@Example.com", "correct horse battery");
  assert.equal(registered.state.authenticated, true);
  assert.equal(registered.state.user.email, "buyer@example.com");
  assert.match(registered.token, /^[A-Za-z0-9_-]{40,}$/);
  const cookie = { cookie: `pdao_session=${encodeURIComponent(registered.token)}` };

  const favorite = await service.addFavorite(cookie, "token.intelligence");
  assert.deepEqual(favorite.favorites, ["token.intelligence"]);
  const cart = await service.addCart(cookie, "token.intelligence", 2);
  assert.deepEqual(cart.cart, [{ id: "token.intelligence", quantity: 2 }]);

  const loggedIn = await service.login("buyer@example.com", "correct horse battery");
  assert.equal(loggedIn.state.authenticated, true);
  await assert.rejects(() => service.login("buyer@example.com", "wrong password"), /incorrect/);
  await service.logout(cookie);
  assert.equal((await service.publicState(cookie)).authenticated, false);
  assert.equal(fake.rows.accounts.length, 1);
  assert.equal(fake.rows.sessions.length, 1);
});

test("account service fails closed when MongoDB is not configured", async () => {
  const service = createAccountService({ mongoUri: "" });
  await assert.rejects(() => service.register("buyer@example.com", "correct horse battery"), (error) => error.statusCode === 503 && error.code === "accounts_not_configured");
});
