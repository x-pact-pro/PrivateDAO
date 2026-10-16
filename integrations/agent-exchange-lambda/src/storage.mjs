import { randomUUID } from "node:crypto";

export class MemoryStore {
  constructor() { this.maps = new Map(); this.rateLimits = new Map(); }
  map(name) { if (!this.maps.has(name)) this.maps.set(name, new Map()); return this.maps.get(name); }
  async put(collection, key, value, condition = false) {
    const map = this.map(collection);
    if (condition && map.has(key)) throw new Error("conditional write failed");
    map.set(key, structuredClone(value)); return value;
  }
  async get(collection, key) { const value = this.map(collection).get(key); return value ? structuredClone(value) : null; }
  async list(collection) { return [...this.map(collection).values()].map((v) => structuredClone(v)); }
  async claim(collection, key, claim) {
    const map = this.map(collection);
    const current = map.get(key);
    if (claim.expected_status && current?.status !== claim.expected_status) throw new Error("conditional claim failed");
    if (current?.claim_expires_at && Date.parse(current.claim_expires_at) > Date.now()) throw new Error("conditional claim failed");
    const next = { ...(current || {}), ...structuredClone(claim) };
    map.set(key, next);
    return next;
  }
  async update(collection, key, fn) { const current = await this.get(collection, key); const next = await fn(current); return this.put(collection, key, next); }
  async consumeRateLimit(key, limit, windowMs) {
    const now = Date.now();
    const current = this.rateLimits.get(key);
    const entry = current && current.expiresAt > now ? current : { count: 0, expiresAt: now + windowMs };
    entry.count += 1;
    this.rateLimits.set(key, entry);
    return { allowed: entry.count <= limit, retryAfterSeconds: Math.max(1, Math.ceil((entry.expiresAt - now) / 1000)) };
  }
}

export async function createStore(config) {
  if (config.allowTestStorage || (config.tablePrefix === "memory" && process.env.AGENT_EXCHANGE_TEST_MODE === "true")) return new MemoryStore();
  try {
    const [{ DynamoDBClient }, { DynamoDBDocumentClient, PutCommand, GetCommand, ScanCommand, UpdateCommand }] = await Promise.all([
      import("@aws-sdk/client-dynamodb"), import("@aws-sdk/lib-dynamodb")
    ]);
    const client = DynamoDBDocumentClient.from(new DynamoDBClient({ region: config.region }));
    const table = (suffix) => config.tables?.[suffix] || `${config.tablePrefix}-${suffix}`;
    return {
      async put(collection, key, value, condition = false) {
        await client.send(new PutCommand({ TableName: table(collection), Item: { id: key, ...value }, ...(condition ? { ConditionExpression: "attribute_not_exists(id)" } : {}) }));
        return value;
      },
      async get(collection, key) {
        const result = await client.send(new GetCommand({ TableName: table(collection), Key: { id: key }, ConsistentRead: true }));
        if (!result.Item) return null; return result.Item;
      },
      async list(collection) {
        const items = [];
        let ExclusiveStartKey;
        do {
          const result = await client.send(new ScanCommand({
            TableName: table(collection),
            ...(ExclusiveStartKey ? { ExclusiveStartKey } : {}),
          }));
          items.push(...(result.Items || []));
          ExclusiveStartKey = result.LastEvaluatedKey;
        } while (ExclusiveStartKey);
        return items;
      },
      async claim(collection, key, claim) {
        const result = await client.send(new UpdateCommand({
          TableName: table(collection),
          Key: { id: key },
          UpdateExpression: "SET #claimStartedAt = :claimStartedAt, #claimExpiresAt = :claimExpiresAt, #claimInstallationId = :claimInstallationId",
          ConditionExpression: `${claim.expected_status ? "#status = :expectedStatus AND " : ""}(attribute_not_exists(#claimExpiresAt) OR #claimExpiresAt < :now)`,
          ExpressionAttributeNames: { "#claimStartedAt": "claim_started_at", "#claimExpiresAt": "claim_expires_at", "#claimInstallationId": "claim_installation_id", ...(claim.expected_status ? { "#status": "status" } : {}) },
          ExpressionAttributeValues: { ":claimStartedAt": claim.claim_started_at, ":claimExpiresAt": claim.claim_expires_at, ":claimInstallationId": claim.claim_installation_id, ":now": new Date().toISOString(), ...(claim.expected_status ? { ":expectedStatus": claim.expected_status } : {}) },
          ReturnValues: "ALL_NEW",
        }));
        return result.Attributes;
      },
      async update(collection, key, fn) {
        const current = await this.get(collection, key); const next = await fn(current);
        await this.put(collection, key, next);
        return next;
      },
      async consumeRateLimit(key, limit, windowMs) {
        const bucket = Math.floor(Date.now() / windowMs);
        const expiresAt = Math.floor(((bucket + 1) * windowMs) / 1000);
        const result = await client.send(new UpdateCommand({
          TableName: table("RateLimits"),
          Key: { id: `${key}:${expiresAt}` },
          UpdateExpression: "ADD #count :one SET #expiresAt = :expiresAt",
          ExpressionAttributeNames: { "#count": "count", "#expiresAt": "expiresAt" },
          ExpressionAttributeValues: { ":one": 1, ":expiresAt": expiresAt },
          ReturnValues: "UPDATED_NEW",
        }));
        const count = Number(result.Attributes?.count || 0);
        return { allowed: count <= limit, retryAfterSeconds: Math.max(1, expiresAt - Math.floor(Date.now() / 1000)) };
      }
    };
  } catch (error) {
    if (process.env.AGENT_EXCHANGE_TEST_MODE === "true") return new MemoryStore();
    throw new Error(`DynamoDB storage unavailable: ${error.message}`);
  }
}

export const newId = (prefix) => `${prefix}_${randomUUID()}`;
