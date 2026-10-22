import assert from "node:assert/strict";
import test from "node:test";
import { alibabaToken, handleAlibabaSpi } from "../src/alibaba-marketplace.mjs";
import { MemoryStore } from "../src/storage.mjs";

function signed(parameters, secret = "seller-secret") {
  return { ...parameters, token: alibabaToken(parameters, secret) };
}

test("Alibaba SPI authenticates and makes createInstance idempotent", async () => {
  const store = new MemoryStore();
  const parameters = signed({ action: "createInstance", aliUid: "ali-1", orderId: "order-1", orderBizId: "biz-1", productCode: "agent-exchange", skuId: "basic" });
  const first = await handleAlibabaSpi({ parameters, secret: "seller-secret", store });
  const second = await handleAlibabaSpi({ parameters, secret: "seller-secret", store });
  assert.deepEqual(first, { success: true, instanceId: "biz-1" });
  assert.deepEqual(second, { success: true, instanceId: "biz-1", idempotent: true });
});

test("Alibaba SPI renews, expires, and releases one instance without cross-tenant lookup", async () => {
  const store = new MemoryStore();
  const base = { aliUid: "ali-2", orderId: "order-2", orderBizId: "biz-2", productCode: "privatepay", skuId: "basic" };
  await handleAlibabaSpi({ parameters: signed({ ...base, action: "createInstance" }), secret: "seller-secret", store });
  const renewed = await handleAlibabaSpi({ parameters: signed({ ...base, action: "renewInstance", instanceId: "biz-2", expiredOn: "2027-01-01 00:00:00" }), secret: "seller-secret", store });
  assert.deepEqual(renewed, { success: true, instanceId: "biz-2" });
  const expired = await handleAlibabaSpi({ parameters: signed({ ...base, action: "expireInstance", instanceId: "biz-2" }), secret: "seller-secret", store });
  assert.deepEqual(expired, { success: true, instanceId: "biz-2" });
  const released = await handleAlibabaSpi({ parameters: signed({ ...base, action: "releaseInstance", instanceId: "biz-2" }), secret: "seller-secret", store });
  assert.deepEqual(released, { success: true, instanceId: "biz-2" });
  assert.equal((await store.get("AlibabaInstances", "alibaba:biz-2")).status, "released");
});

test("Alibaba SPI rejects bad tokens before persistence", async () => {
  const store = new MemoryStore();
  await assert.rejects(() => handleAlibabaSpi({ parameters: { action: "createInstance", orderBizId: "biz-3", productCode: "agent-exchange", token: "bad" }, secret: "seller-secret", store }), /authentication failed/);
  assert.equal(await store.get("AlibabaInstances", "alibaba:biz-3"), null);
});
