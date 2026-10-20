import { promisify } from "node:util";
import { randomBytes, scrypt, timingSafeEqual, createHash } from "node:crypto";

const scryptAsync = promisify(scrypt);
const SESSION_COOKIE = "pdao_session";
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
let clientPromise;
let indexesPromise;

const normalizeEmail = (value) => String(value || "").trim().toLowerCase();
const hashToken = (value) => createHash("sha256").update(String(value || "")).digest("hex");

function validateEmail(email) {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254)
    throw Object.assign(new Error("a valid email is required"), { statusCode: 400 });
}

function validatePassword(password) {
  if (typeof password !== "string" || password.length < 10 || password.length > 128)
    throw Object.assign(new Error("password must be 10-128 characters"), { statusCode: 400 });
}

async function hashPassword(password) {
  const salt = randomBytes(16);
  const derived = await scryptAsync(password, salt, 64, { N: 16384, r: 8, p: 1 });
  return { algorithm: "scrypt", salt: salt.toString("base64url"), hash: Buffer.from(derived).toString("base64url"), N: 16384, r: 8, p: 1 };
}

async function verifyPassword(password, record) {
  if (!record?.password?.salt || !record.password.hash) return false;
  const derived = await scryptAsync(password, Buffer.from(record.password.salt, "base64url"), 64, {
    N: Number(record.password.N) || 16384, r: Number(record.password.r) || 8, p: Number(record.password.p) || 1,
  });
  const expected = Buffer.from(record.password.hash, "base64url");
  return expected.length === derived.length && timingSafeEqual(expected, Buffer.from(derived));
}

function cookieValue(headers = {}) {
  const raw = headers.cookie || headers.Cookie || "";
  const match = raw.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${SESSION_COOKIE}=`));
  return match ? decodeURIComponent(match.slice(SESSION_COOKIE.length + 1)) : "";
}

export function sessionCookie(token, maxAge = SESSION_TTL_MS / 1000) {
  return `${SESSION_COOKIE}=${encodeURIComponent(token)}; Max-Age=${Math.max(0, Math.floor(maxAge))}; Path=/; HttpOnly; Secure; SameSite=Lax`;
}

async function mongoClient(config) {
  if (!config.mongoUri) return null;
  if (!clientPromise) {
    const { MongoClient } = await import("mongodb");
    clientPromise = MongoClient.connect(config.mongoUri, {
      serverSelectionTimeoutMS: 3000,
      connectTimeoutMS: 3000,
      maxPoolSize: 10,
      minPoolSize: 0,
    }).catch((error) => { clientPromise = undefined; throw error; });
  }
  return clientPromise;
}

async function collections(config) {
  const client = await mongoClient(config);
  if (!client) return null;
  const db = client.db(config.mongoDatabase);
  if (!indexesPromise) {
    indexesPromise = Promise.all([
      db.collection("accounts").createIndex({ email: 1 }, { unique: true, name: "email_unique" }),
      db.collection("sessions").createIndex({ token_hash: 1 }, { unique: true, name: "token_hash_unique" }),
      db.collection("sessions").createIndex({ expires_at: 1 }, { expireAfterSeconds: 0, name: "session_expiry" }),
      db.collection("user_state").createIndex({ user_id: 1 }, { unique: true, name: "user_id_unique" }),
    ]).catch((error) => { indexesPromise = undefined; throw error; });
  }
  await indexesPromise;
  return { accounts: db.collection("accounts"), sessions: db.collection("sessions"), state: db.collection("user_state") };
}

export function accountProviderStatus(config) {
  return { provider: "mongodb", status: config.mongoUri ? "configured" : "not_configured", role: "visitor-accounts-favorites-cart", credentials_exposed: false };
}

export function createAccountService(config, { collectionsProvider = collections } = {}) {
  async function ready() {
    const value = await collectionsProvider(config);
    if (!value) throw Object.assign(new Error("visitor accounts are not configured"), { statusCode: 503, code: "accounts_not_configured" });
    return value;
  }
  async function sessionFromHeaders(headers) {
    const token = cookieValue(headers);
    if (!token) return null;
    const c = await ready();
    const item = await c.sessions.findOne({ token_hash: hashToken(token), expires_at: { $gt: new Date() } });
    return item ? { token, userId: item.user_id } : null;
  }
  async function publicState(headers) {
    const session = await sessionFromHeaders(headers);
    if (!session) return { authenticated: false, favorites: [], cart: [] };
    const c = await ready();
    const user = await c.accounts.findOne({ _id: session.userId }, { projection: { email: 1, created_at: 1 } });
    const state = await c.state.findOne({ user_id: session.userId });
    return { authenticated: true, user: user ? { id: String(user._id), email: user.email, created_at: user.created_at } : null, favorites: state?.favorites || [], cart: state?.cart || [] };
  }
  async function register(emailInput, password) {
    const email = normalizeEmail(emailInput); validateEmail(email); validatePassword(password);
    const c = await ready();
    if (await c.accounts.findOne({ email }, { projection: { _id: 1 } })) throw Object.assign(new Error("an account already exists for this email"), { statusCode: 409 });
    const passwordRecord = await hashPassword(password);
    const userId = `user_${randomBytes(16).toString("hex")}`;
    await c.accounts.insertOne({ _id: userId, email, password: passwordRecord, created_at: new Date(), updated_at: new Date() });
    await c.state.insertOne({ user_id: userId, favorites: [], cart: [], updated_at: new Date() });
    return login(email, password);
  }
  async function login(emailInput, password) {
    const email = normalizeEmail(emailInput); validateEmail(email); validatePassword(password);
    const c = await ready();
    const user = await c.accounts.findOne({ email });
    if (!user || !(await verifyPassword(password, user))) throw Object.assign(new Error("email or password is incorrect"), { statusCode: 401 });
    const token = randomBytes(32).toString("base64url");
    await c.sessions.insertOne({ token_hash: hashToken(token), user_id: String(user._id), created_at: new Date(), expires_at: new Date(Date.now() + SESSION_TTL_MS) });
    return { token, state: await publicState({ cookie: sessionCookie(token) }) };
  }
  async function logout(headers) {
    const token = cookieValue(headers);
    if (token) { const c = await ready(); await c.sessions.deleteOne({ token_hash: hashToken(token) }); }
  }
  async function updateState(headers, kind, item, present) {
    const session = await sessionFromHeaders(headers);
    if (!session) throw Object.assign(new Error("sign in is required"), { statusCode: 401 });
    const c = await ready();
    const current = await c.state.findOne({ user_id: session.userId }) || { favorites: [], cart: [] };
    let next;
    if (kind === "favorites") next = [...new Set((current.favorites || []).filter((id) => id !== item).concat(present ? [item] : []))].slice(0, 200);
    else {
      const cart = new Map((current.cart || []).map((entry) => [entry.id, { id: entry.id, quantity: Math.min(20, Math.max(1, Number(entry.quantity) || 1)) }]));
      if (present) cart.set(item, { id: item, quantity: Math.min(20, Math.max(1, Number(present) || 1)) }); else cart.delete(item);
      next = [...cart.values()].slice(0, 100);
    }
    await c.state.updateOne({ user_id: session.userId }, { $set: { [kind]: next, updated_at: new Date() } }, { upsert: true });
    return publicState(headers);
  }
  return { register, login, logout, publicState, addFavorite: (headers, id) => updateState(headers, "favorites", id, true), removeFavorite: (headers, id) => updateState(headers, "favorites", id, false), addCart: (headers, id, quantity) => updateState(headers, "cart", id, quantity || 1), removeCart: (headers, id) => updateState(headers, "cart", id, false) };
}

export { normalizeEmail };
