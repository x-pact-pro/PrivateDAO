"use client";

const API_BASE = process.env.NEXT_PUBLIC_PRIVATE_DAO_API_BASE || "https://api.privatedao.org";

export type OnboardEnvelope = {
  version: string;
  algorithm: string;
  keyId: string;
  publicKeyFingerprint: string;
  encryptedAt: string;
  iv: string;
  encryptedKey: string;
  ciphertext: string;
  digest: string;
};

type OnboardKeyResponse = {
  ok: boolean;
  algorithm: string;
  keyId: string;
  publicKeyFingerprint: string;
  publicKeyPem: string;
};

function toBase64(bytes: ArrayBuffer | Uint8Array) {
  const array = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let binary = "";
  for (const byte of array) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function pemToArrayBuffer(pem: string) {
  const base64 = pem.replace(/-----BEGIN PUBLIC KEY-----|-----END PUBLIC KEY-----|\s+/g, "");
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes.buffer;
}

async function importRsaPublicKey(publicKeyPem: string) {
  return crypto.subtle.importKey(
    "spki",
    pemToArrayBuffer(publicKeyPem),
    {
      name: "RSA-OAEP",
      hash: "SHA-256",
    },
    false,
    ["encrypt"],
  );
}

async function sha256Base64(payload: Uint8Array) {
  const copy = new Uint8Array(payload.byteLength);
  copy.set(payload);
  const digest = await crypto.subtle.digest("SHA-256", copy.buffer);
  return toBase64(digest);
}

export async function fetchOnboardIntakeKey(): Promise<OnboardKeyResponse> {
  const response = await fetch(`${API_BASE}/api/v1/onboard/key`, {
    method: "GET",
    headers: { Accept: "application/json" },
  });
  const body = (await response.json().catch(() => null)) as OnboardKeyResponse | null;
  if (!response.ok || !body?.ok) {
    throw new Error("Encrypted intake key is unavailable.");
  }
  return body;
}

export async function buildOnboardEnvelope(payload: Record<string, unknown>): Promise<OnboardEnvelope> {
  const keyInfo = await fetchOnboardIntakeKey();
  const rsaKey = await importRsaPublicKey(keyInfo.publicKeyPem);
  const aesKey = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt"]);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plaintext = new TextEncoder().encode(JSON.stringify(payload));
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, aesKey, plaintext);
  const rawAesKey = await crypto.subtle.exportKey("raw", aesKey);
  const encryptedKey = await crypto.subtle.encrypt({ name: "RSA-OAEP" }, rsaKey, rawAesKey);

  return {
    version: "pd-onboard-envelope-v1",
    algorithm: keyInfo.algorithm,
    keyId: keyInfo.keyId,
    publicKeyFingerprint: keyInfo.publicKeyFingerprint,
    encryptedAt: new Date().toISOString(),
    iv: toBase64(iv),
    encryptedKey: toBase64(encryptedKey),
    ciphertext: toBase64(ciphertext),
    digest: await sha256Base64(new Uint8Array(ciphertext)),
  };
}
