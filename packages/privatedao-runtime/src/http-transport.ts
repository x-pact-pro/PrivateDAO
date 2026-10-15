import type {
  ExecutionIntent,
  ExecutionReceipt,
  ExecutionState,
  PreparedExecution,
} from "./index.js";
import type { AdapterTransport } from "./adapters.js";
import type { FeeEstimate } from "./protocol.js";

export type HttpFetch = (input: string | URL, init?: RequestInit) => Promise<Response>;

export interface HttpExecutionTransportPaths {
  prepare: string;
  submit: string;
  status: (executionId: string) => string;
  receipt: (executionId: string) => string;
  feeEstimate: string;
}

export interface HttpExecutionTransportOptions {
  baseUrl: string;
  headers?: Record<string, string>;
  fetchImpl?: HttpFetch;
  timeoutMs?: number;
  paths?: Partial<HttpExecutionTransportPaths>;
}

const DEFAULT_PATHS: HttpExecutionTransportPaths = {
  prepare: "/v1/executions/prepare",
  submit: "/v1/executions/submit",
  status: (executionId) => `/v1/executions/${encodeURIComponent(executionId)}/status`,
  receipt: (executionId) => `/v1/executions/${encodeURIComponent(executionId)}/receipt`,
  feeEstimate: "/v1/executions/fee-estimate",
};

const EXECUTION_STATES: ReadonlySet<ExecutionState> = new Set([
  "created",
  "prepared",
  "awaiting_signature",
  "signed",
  "submitted",
  "confirmed",
  "finalized",
  "reconciled",
  "failed",
  "cancelled",
]);

/**
 * HTTP boundary for a real backend execution service.
 *
 * The transport is deliberately thin: it never invents an execution id,
 * signature, status, receipt, or fee. The configured backend must return an
 * observed lifecycle response or the call fails closed.
 */
export class HttpExecutionTransport implements AdapterTransport {
  private readonly baseUrl: URL;
  private readonly headers: Record<string, string>;
  private readonly fetchImpl: HttpFetch;
  private readonly timeoutMs: number;
  private readonly paths: HttpExecutionTransportPaths;

  constructor(options: HttpExecutionTransportOptions) {
    this.baseUrl = new URL(options.baseUrl);
    if (!/^https?:$/.test(this.baseUrl.protocol)) {
      throw new Error("HTTP execution transport requires an http(s) base URL.");
    }
    this.headers = { Accept: "application/json", ...options.headers };
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.timeoutMs = options.timeoutMs ?? 30_000;
    if (!Number.isInteger(this.timeoutMs) || this.timeoutMs <= 0) {
      throw new Error("HTTP execution transport timeout must be a positive integer.");
    }
    this.paths = { ...DEFAULT_PATHS, ...options.paths };
  }

  prepare<TPayload, TUnsigned>(intent: ExecutionIntent<TPayload>): Promise<PreparedExecution<TUnsigned>> {
    return this.request<PreparedExecution<TUnsigned>>(this.paths.prepare, {
      method: "POST",
      body: { intent },
    }).then((payload) => {
      if (!isPreparedExecution(payload)) throw new Error("Execution backend returned an invalid prepared execution.");
      return payload as PreparedExecution<TUnsigned>;
    });
  }

  submit<TUnsigned>(execution: PreparedExecution<TUnsigned>, signedPayload: TUnsigned): Promise<{ executionId: string; signatures: string[] }> {
    return this.request<{ executionId: string; signatures: string[] }>(this.paths.submit, {
      method: "POST",
      body: { execution, signedPayload },
    }).then((payload) => {
      if (payload.executionId !== execution.executionId || !Array.isArray(payload.signatures)) {
        throw new Error("Execution backend returned an invalid submission.");
      }
      return { executionId: payload.executionId, signatures: payload.signatures.map(String) };
    });
  }

  status(executionId: string): Promise<{ executionId: string; state: ExecutionState; errorCode?: string }> {
    return this.request<{ executionId: string; state: ExecutionState; errorCode?: string }>(this.paths.status(executionId), {
      method: "GET",
    }).then((payload) => {
      if (payload.executionId !== executionId || !EXECUTION_STATES.has(payload.state)) {
        throw new Error("Execution backend returned an invalid status.");
      }
      return payload;
    });
  }

  receipt<TResult = unknown>(executionId: string): Promise<ExecutionReceipt<TResult>> {
    return this.request<ExecutionReceipt<TResult>>(this.paths.receipt(executionId), {
      method: "GET",
    }).then((payload) => {
      if (
        payload.executionId !== executionId ||
        !payload.requestId ||
        !payload.capability ||
        !payload.network ||
        !EXECUTION_STATES.has(payload.state) ||
        !["confirmed", "finalized", "reconciled"].includes(payload.state) ||
        !Array.isArray(payload.signatures) ||
        !payload.createdAt
      ) {
        throw new Error("Execution backend returned an invalid receipt.");
      }
      return payload;
    });
  }

  estimateFee<TPayload>(intent: ExecutionIntent<TPayload>): Promise<FeeEstimate> {
    return this.request<FeeEstimate>(this.paths.feeEstimate, {
      method: "POST",
      body: { intent },
    }).then((payload) => {
      if (!payload.network || !payload.atomicAmount || !payload.asset) {
        throw new Error("Execution backend returned an invalid fee estimate.");
      }
      return payload;
    });
  }

  private async request<T>(path: string, init: { method: string; body?: unknown }): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await this.fetchImpl(this.resolvePath(path), {
        method: init.method,
        headers: init.body === undefined ? this.headers : { ...this.headers, "Content-Type": "application/json" },
        body: init.body === undefined ? undefined : JSON.stringify(init.body),
        signal: controller.signal,
      });
      const text = await response.text();
      let payload: unknown;
      try {
        payload = text ? JSON.parse(text) : undefined;
      } catch {
        throw new Error("Execution backend returned non-JSON data.");
      }
      if (!response.ok) {
        const message = isRecord(payload) && typeof payload.error === "string" ? payload.error : `Execution backend responded ${response.status}.`;
        throw new Error(message);
      }
      return payload as T;
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") throw new Error("Execution backend request timed out.");
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  private resolvePath(path: string): URL {
    if (!path.startsWith("/")) throw new Error("Execution backend path must be origin-relative.");
    const url = new URL(path, this.baseUrl);
    if (url.origin !== this.baseUrl.origin) throw new Error("Execution backend path must stay on the configured origin.");
    return url;
  }
}

function isPreparedExecution(value: unknown): value is PreparedExecution<unknown> {
  if (!isRecord(value)) return false;
  return typeof value.executionId === "string" &&
    isRecord(value.intent) &&
    (value.state === "prepared" || value.state === "awaiting_signature") &&
    Array.isArray(value.requiredSigners);
}

function isRecord(value: unknown): value is Record<string, any> {
  return Boolean(value && typeof value === "object");
}
