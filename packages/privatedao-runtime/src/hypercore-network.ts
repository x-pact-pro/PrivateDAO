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
    return {
      network: this.network,
      endpoint: this.apiUrl.replace(/\/info$/i, "/exchange"),
      action: { ...payload, type },
      nonce,
      requiresSignature: true,
      broadcastEnabled: false,
    };
  }
}
