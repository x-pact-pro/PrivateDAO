export type HyperCoreNetworkId = "hypercore-testnet";

export interface HyperCoreMetaSnapshot {
  network: HyperCoreNetworkId;
  universeSize: number;
  observedAt: string;
}

export interface HyperCoreHealth {
  ok: boolean;
  network: HyperCoreNetworkId;
  universeSize?: number;
  latencyMs?: number;
  reason?: string;
}

/**
 * Native HyperCore actions are signed through the Hyperliquid exchange API;
 * they are not EVM transactions. Preparation is intentionally separate from
 * signing and submission so product code cannot accidentally broadcast a
 * native action through the HyperEVM adapter.
 */
export type HyperCoreNativeActionType =
  | "usdSend"
  | "spotSend"
  | "usdClassTransfer"
  | "withdraw3"
  | "cDeposit"
  | "cWithdraw"
  | "tokenDelegate"
  | "vaultTransfer";

export interface HyperCorePreparedAction {
  network: HyperCoreNetworkId;
  endpoint: string;
  action: { type: HyperCoreNativeActionType; [key: string]: unknown };
  nonce: number;
  requiresSignature: true;
  broadcastEnabled: false;
}

export interface HyperCoreTypedDataSigner {
  signTypedData(args: {
    domain: {
      name: "HyperliquidSignTransaction";
      version: "1";
      chainId: `0x${string}`;
      verifyingContract: `0x${string}`;
    };
    types: Record<string, readonly { name: string; type: string }[]>;
    primaryType: string;
    message: Record<string, string | boolean | bigint>;
  }): Promise<`0x${string}`>;
}

export interface HyperCoreSignedAction extends HyperCorePreparedAction {
  signature: `0x${string}`;
  signatureChainId: `0x${string}`;
  broadcastEnabled: false;
}

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

const DEFAULT_TESTNET_API = "https://api.hyperliquid-testnet.xyz/info";

/**
 * Read-only native HyperCore boundary. HyperCore is not HyperEVM: it has no
 * EVM chain ID, contract receipt, or generic transaction path here. This
 * adapter only observes the official Testnet info API and fails closed on
 * non-Testnet endpoints or malformed responses.
 */
export class HyperCoreNetworkAdapter {
  readonly id = "privatedao-hyperliquid-core-testnet";
  readonly network: HyperCoreNetworkId = "hypercore-testnet";
  readonly apiUrl: string;

  constructor(
    options: { apiUrl?: string; fetchImpl?: FetchLike; timeoutMs?: number } = {},
  ) {
    this.apiUrl = (options.apiUrl || process.env.PDAO_HYPERCORE_API_URL || DEFAULT_TESTNET_API).trim();
    if (!/^https:\/\//i.test(this.apiUrl) || !/hyperliquid-testnet/i.test(this.apiUrl)) {
      throw new Error("HyperCore adapter accepts only an HTTPS Hyperliquid Testnet API endpoint.");
    }
    this.fetchImpl = options.fetchImpl || fetch;
    this.timeoutMs = options.timeoutMs || 15_000;
  }

  private readonly fetchImpl: FetchLike;
  private readonly timeoutMs: number;

  async readMeta(): Promise<HyperCoreMetaSnapshot> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await this.fetchImpl(this.apiUrl, {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({ type: "meta" }),
        signal: controller.signal,
      });
      const payload = await response.json().catch(() => undefined);
      if (!response.ok) throw new Error(`HyperCore Testnet API returned HTTP ${response.status}.`);
      if (!payload || typeof payload !== "object" || !Array.isArray((payload as { universe?: unknown }).universe)) {
        throw new Error("HyperCore Testnet API returned an invalid meta response.");
      }
      return {
        network: this.network,
        universeSize: (payload as { universe: unknown[] }).universe.length,
        observedAt: new Date().toISOString(),
      };
    } finally {
      clearTimeout(timer);
    }
  }

  async health(): Promise<HyperCoreHealth> {
    const started = Date.now();
    try {
      const snapshot = await this.readMeta();
      return {
        ok: true,
        network: snapshot.network,
        universeSize: snapshot.universeSize,
        latencyMs: Date.now() - started,
      };
    } catch (error) {
      return {
        ok: false,
        network: this.network,
        latencyMs: Date.now() - started,
        reason: error instanceof Error ? error.message : "HyperCore Testnet API health check failed.",
      };
    }
  }

  prepareNativeAction(
    type: HyperCoreNativeActionType,
    payload: Record<string, unknown>,
    nonce = Date.now(),
  ): HyperCorePreparedAction {
    if (!Number.isSafeInteger(nonce) || nonce <= 0) throw new Error("HyperCore action nonce must be a positive safe integer.");
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) throw new Error("HyperCore action payload must be an object.");
    if (typeof payload.type !== "undefined" && payload.type !== type) throw new Error("HyperCore action type does not match the prepared action.");
    if (typeof payload.hyperliquidChain !== "undefined" && payload.hyperliquidChain !== "Testnet") {
      throw new Error("HyperCore Testnet actions cannot target Mainnet.");
    }
    validateNativeActionPayload(type, payload);
    const action = {
      ...payload,
      ...(typeof payload.time === "undefined" && ["usdSend", "spotSend", "withdraw3"].includes(type)
        ? { time: Date.now() }
        : {}),
      type,
      hyperliquidChain: payload.hyperliquidChain ?? "Testnet",
    };
    return {
      network: this.network,
      endpoint: this.apiUrl.replace(/\/info$/i, "/exchange"),
      action,
      nonce,
      requiresSignature: true,
      broadcastEnabled: false,
    };
  }

  /**
   * Signs only the user-signed HyperCore actions supported by the official
   * Exchange API. This produces an offline payload; submission remains a
   * separate, disabled operation until a reviewed receipt path exists.
   */
  async signNativeAction(
    prepared: HyperCorePreparedAction,
    signer: HyperCoreTypedDataSigner,
    signatureChainId: `0x${string}`,
  ): Promise<HyperCoreSignedAction> {
    if (prepared.network !== this.network) throw new Error("HyperCore action network mismatch.");
    if (!/^0x[0-9a-f]+$/i.test(signatureChainId)) throw new Error("HyperCore signatureChainId must be a hexadecimal chain ID.");
    const typed = typedDataForAction(prepared.action, signatureChainId);
    if (!typed) throw new Error(`HyperCore action type ${prepared.action.type} has no supported user-signed EIP-712 mapping.`);
    const signature = await signer.signTypedData(typed);
    if (!/^0x[0-9a-f]{130}$/i.test(signature)) throw new Error("HyperCore signer returned an invalid EIP-712 signature.");
    return { ...prepared, signature, signatureChainId };
  }
}

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as const;
const USER_SIGNED_TYPES = {
  usdSend: [
    { name: "hyperliquidChain", type: "string" },
    { name: "destination", type: "string" },
    { name: "amount", type: "string" },
    { name: "time", type: "uint64" },
  ],
  spotSend: [
    { name: "hyperliquidChain", type: "string" },
    { name: "destination", type: "string" },
    { name: "token", type: "string" },
    { name: "amount", type: "string" },
    { name: "time", type: "uint64" },
  ],
  usdClassTransfer: [
    { name: "hyperliquidChain", type: "string" },
    { name: "amount", type: "string" },
    { name: "toPerp", type: "bool" },
    { name: "nonce", type: "uint64" },
  ],
  tokenDelegate: [
    { name: "hyperliquidChain", type: "string" },
    { name: "validator", type: "address" },
    { name: "wei", type: "uint64" },
    { name: "isUndelegate", type: "bool" },
    { name: "nonce", type: "uint64" },
  ],
} as const;

function typedDataForAction(
  action: HyperCorePreparedAction["action"],
  signatureChainId: `0x${string}`,
): Parameters<HyperCoreTypedDataSigner["signTypedData"]>[0] | null {
  const fields = USER_SIGNED_TYPES[action.type as keyof typeof USER_SIGNED_TYPES];
  if (!fields) return null;
  const primaryType = `HyperliquidTransaction:${action.type === "usdClassTransfer" ? "UsdClassTransfer" : action.type === "tokenDelegate" ? "TokenDelegate" : action.type === "spotSend" ? "SpotSend" : "UsdSend"}`;
  const message: Record<string, string | boolean | bigint> = {
    hyperliquidChain: String(action.hyperliquidChain),
  };
  for (const field of fields) {
    if (field.name === "hyperliquidChain") continue;
    const value = action[field.name];
    if (field.type === "uint64") {
      if (typeof value !== "number" || !Number.isSafeInteger(value) || value <= 0) {
        throw new Error(`HyperCore ${action.type} ${field.name} must be a positive safe integer.`);
      }
      message[field.name] = BigInt(value);
    } else if (field.type === "bool") {
      if (typeof value !== "boolean") throw new Error(`HyperCore ${action.type} ${field.name} must be boolean.`);
      message[field.name] = value;
    } else {
      if (typeof value !== "string" || value.length === 0) throw new Error(`HyperCore ${action.type} ${field.name} must be a non-empty string.`);
      message[field.name] = value;
    }
  }
  return {
    domain: {
      name: "HyperliquidSignTransaction",
      version: "1",
      chainId: signatureChainId,
      verifyingContract: ZERO_ADDRESS,
    },
    types: { [primaryType]: fields },
    primaryType,
    message,
  };
}

function validateNativeActionPayload(type: HyperCoreNativeActionType, payload: Record<string, unknown>): void {
  if (["usdSend", "spotSend", "withdraw3"].includes(type)) {
    assertAddress(payload.destination, `${type} destination`);
    assertDecimal(payload.amount, `${type} amount`);
    assertPositiveInteger(payload.time ?? Date.now(), `${type} time`);
  }
  if (type === "spotSend") assertNonEmptyString(payload.token, "spotSend token");
  if (type === "usdClassTransfer") {
    assertDecimal(payload.amount, "usdClassTransfer amount");
    if (typeof payload.toPerp !== "boolean") throw new Error("usdClassTransfer toPerp must be boolean.");
    assertPositiveInteger(payload.nonce, "usdClassTransfer nonce");
  }
  if (type === "tokenDelegate") {
    assertAddress(payload.validator, "tokenDelegate validator");
    assertPositiveInteger(payload.wei, "tokenDelegate wei");
    if (typeof payload.isUndelegate !== "boolean") throw new Error("tokenDelegate isUndelegate must be boolean.");
    assertPositiveInteger(payload.nonce, "tokenDelegate nonce");
  }
}

function assertNonEmptyString(value: unknown, label: string): asserts value is string {
  if (typeof value !== "string" || value.trim().length === 0) throw new Error(`${label} must be a non-empty string.`);
}

function assertAddress(value: unknown, label: string): asserts value is string {
  assertNonEmptyString(value, label);
  if (!/^0x[0-9a-f]{40}$/i.test(value)) throw new Error(`${label} must be a valid EVM address.`);
}

function assertDecimal(value: unknown, label: string): asserts value is string {
  assertNonEmptyString(value, label);
  if (!/^(?:0|[1-9]\d*)(?:\.\d+)?$/.test(value) || Number(value) <= 0) {
    throw new Error(`${label} must be a positive decimal amount.`);
  }
}

function assertPositiveInteger(value: unknown, label: string): asserts value is number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value <= 0) throw new Error(`${label} must be a positive safe integer.`);
}
