import { GetPublicKeyCommand, KMSClient, SignCommand } from "@aws-sdk/client-kms";
import {
  ConfiguredHybridAuthorizationVerifier,
  createNoblePqcProvider,
  type HybridAuthorizationEnvelope,
  type HybridAuthorizationPublicKeys,
  type HybridAuthorizationVerifier,
} from "./wallet-security.js";

const ML_DSA_65_PUBLIC_KEY_BYTES = 1952;
const ED25519_PUBLIC_KEY_BYTES = 32;

export type KmsHybridAuthorizationConfig = {
  pqcKeyId: string;
  classicalKeyId: string;
  keyId?: string;
  region?: string;
};

/**
 * Load a hybrid verifier from KMS public keys. Private key material never
 * leaves KMS; the downloaded SPKI values contain public material only.
 */
export async function createHybridAuthorizationVerifierFromKms(
  config: KmsHybridAuthorizationConfig,
): Promise<HybridAuthorizationVerifier> {
  const client = new KMSClient({ region: config.region || process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || "eu-north-1" });
  const [pqc, classical] = await Promise.all([
    client.send(new GetPublicKeyCommand({ KeyId: config.pqcKeyId })),
    client.send(new GetPublicKeyCommand({ KeyId: config.classicalKeyId })),
  ]);
  if (pqc.KeySpec !== "ML_DSA_65" || !pqc.SigningAlgorithms?.includes("ML_DSA_SHAKE_256")) {
    throw new Error("PQC KMS key must be ML_DSA_65 with ML_DSA_SHAKE_256 signing.");
  }
  if (classical.KeySpec !== "ECC_NIST_EDWARDS25519" || !classical.SigningAlgorithms?.includes("ED25519_SHA_512")) {
    throw new Error("Classical KMS key must be Ed25519 with ED25519_SHA_512 signing.");
  }
  const publicKeys: HybridAuthorizationPublicKeys = {
    keyId: config.keyId?.trim() || "aws-kms-active-v1",
    status: "active",
    pqcPublicKey: extractSpkiPublicKey(pqc.PublicKey, ML_DSA_65_PUBLIC_KEY_BYTES),
    classicalPublicKey: extractSpkiPublicKey(classical.PublicKey, ED25519_PUBLIC_KEY_BYTES),
  };
  return new ConfiguredHybridAuthorizationVerifier(createNoblePqcProvider(), [publicKeys]);
}

/**
 * Create a hybrid authorization envelope with both private signatures made
 * inside KMS. This is for server-controlled authorization flows only.
 */
export async function createKmsHybridAuthorizationEnvelope(
  message: Uint8Array,
  config: KmsHybridAuthorizationConfig,
): Promise<HybridAuthorizationEnvelope> {
  const client = new KMSClient({ region: config.region || process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || "eu-north-1" });
  const [pqc, classical] = await Promise.all([
    client.send(new SignCommand({
      KeyId: config.pqcKeyId,
      Message: Buffer.from(message),
      MessageType: "RAW",
      SigningAlgorithm: "ML_DSA_SHAKE_256",
    })),
    client.send(new SignCommand({
      KeyId: config.classicalKeyId,
      Message: Buffer.from(message),
      MessageType: "RAW",
      SigningAlgorithm: "ED25519_SHA_512",
    })),
  ]);
  if (!pqc.Signature || !classical.Signature) throw new Error("KMS did not return both hybrid signatures.");
  return {
    scheme: "ed25519+ml-dsa-65",
    providerId: createNoblePqcProvider().id,
    keyId: config.keyId?.trim() || "aws-kms-active-v1",
    message: Uint8Array.from(message),
    classicalSignature: Uint8Array.from(classical.Signature),
    pqcSignature: Uint8Array.from(pqc.Signature),
  };
}

export async function createHybridAuthorizationVerifierFromKmsEnv(
  env: NodeJS.ProcessEnv = process.env,
): Promise<HybridAuthorizationVerifier | undefined> {
  if (env.PDAO_PQC_KEY_PROVIDER?.trim().toLowerCase() !== "aws-kms") return undefined;
  const pqcKeyId = env.PDAO_PQC_KEY_ID?.trim();
  const classicalKeyId = env.PDAO_PQC_CLASSICAL_KEY_ID?.trim();
  if (!pqcKeyId || !classicalKeyId) throw new Error("AWS KMS hybrid authorization requires PDAO_PQC_KEY_ID and PDAO_PQC_CLASSICAL_KEY_ID.");
  return createHybridAuthorizationVerifierFromKms({
    pqcKeyId,
    classicalKeyId,
    keyId: env.PDAO_PQC_ACTIVE_KEY_ID?.trim(),
    region: env.AWS_REGION || env.AWS_DEFAULT_REGION,
  });
}

function extractSpkiPublicKey(value: Uint8Array | undefined, expectedLength: number): Uint8Array {
  if (!value || value.length < expectedLength) throw new Error("KMS returned an invalid SPKI public key.");
  const raw = Uint8Array.from(value.slice(value.length - expectedLength));
  if (raw.length !== expectedLength) throw new Error("KMS public-key length does not match the configured hybrid profile.");
  return raw;
}
