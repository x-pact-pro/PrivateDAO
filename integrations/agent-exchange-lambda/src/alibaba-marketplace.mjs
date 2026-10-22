import { createHash, timingSafeEqual } from "node:crypto";

const ACTIONS = new Set(["createInstance", "renewInstance", "expireInstance", "releaseInstance", "orderPay"]);
const text = (value) => String(value == null ? "" : value).trim();

export function alibabaToken(parameters, secret) {
  const pairs = Object.entries(parameters || {})
    .filter(([key]) => key !== "token")
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value == null ? "" : value}`);
  return createHash("md5").update(`${pairs.join("&")}&key=${secret}`).digest("hex");
}

export function verifyAlibabaToken(parameters, secret) {
  const received = text(parameters?.token).toLowerCase();
  const expected = alibabaToken(parameters, secret);
  if (!/^[a-f0-9]{32}$/.test(received)) return false;
  return timingSafeEqual(Buffer.from(received), Buffer.from(expected));
}

export function normalizeAlibabaEvent(parameters = {}) {
  const action = text(parameters.action);
  if (!ACTIONS.has(action)) throw Object.assign(new Error("unsupported Alibaba Marketplace action"), { statusCode: 400 });
  const instanceId = text(parameters.instanceId || parameters.orderBizId);
  const orderBizId = text(parameters.orderBizId || instanceId);
  const productCode = text(parameters.productCode);
  if (!orderBizId || !productCode) throw Object.assign(new Error("orderBizId and productCode are required"), { statusCode: 400 });
  if (action !== "orderPay" && !instanceId) throw Object.assign(new Error("instanceId is required"), { statusCode: 400 });
  return {
    action,
    instance_id: instanceId || orderBizId,
    order_biz_id: orderBizId,
    order_id: text(parameters.orderId),
    product_code: productCode,
    sku_id: text(parameters.skuId),
    ali_uid: text(parameters.aliUid),
    expired_on: text(parameters.expiredOn),
    received_at: new Date().toISOString(),
  };
}

export async function handleAlibabaSpi({ parameters, secret, store, collection = "AlibabaInstances" }) {
  if (!secret || !verifyAlibabaToken(parameters, secret))
    throw Object.assign(new Error("Alibaba Marketplace SPI authentication failed"), { statusCode: 401 });
  const event = normalizeAlibabaEvent(parameters);
  const key = `alibaba:${event.instance_id}`;
  const current = await store.get(collection, key);
  if (event.action === "createInstance" || event.action === "orderPay") {
    if (current) return { success: true, instanceId: current.instance_id, idempotent: true };
    const record = { id: key, ...event, status: "active", created_at: event.received_at, updated_at: event.received_at };
    await store.put(collection, key, record, true);
    return { success: true, instanceId: record.instance_id };
  }
  if (!current) return { success: false, instanceId: event.instance_id };
  const status = event.action === "renewInstance" ? "active" : event.action === "expireInstance" ? "expired" : "released";
  const next = { ...current, ...event, status, updated_at: event.received_at };
  await store.put(collection, key, next);
  return { success: true, instanceId: next.instance_id };
}
