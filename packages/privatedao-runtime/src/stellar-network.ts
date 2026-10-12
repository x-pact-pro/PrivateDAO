import type {
  CapabilityId,
  ExecutionIntent,
  ExecutionReceipt,
  ExecutionState,
  NetworkId,
  PreparedExecution,
  ProviderId,
} from "./index.js";
import { getNetwork } from "./networks.js";
import type { FeeEstimate, NetworkAdapter } from "./protocol.js";
import { validateStellarProductWorkflow, type StellarProductWorkflow } from "./stellar-product-workflow.js";

export type StellarEnvironment = "testnet";

export interface StellarNetworkConfig {
  network: NetworkId;
  label: string;
  environment: StellarEnvironment;
  networkPassphrase: string;
  horizonUrlEnv: string;
  explorerBaseUrl: string;
  nativeAsset: "XLM";
  broadcastEnabled: boolean;
}

export const STELLAR_TESTNET_NETWORK_PASSPHRASE = "Test SDF Network ; September 2015";

export const STELLAR_KERNEL_CAPABILITIES: readonly CapabilityId[] = [
  "verification.blind.prove",
  "verification.record.create",
  "verification.record.verify",
  "payroll.calculate",
  "payroll.approve",
  "payroll.settle",
  "treasury.policy.check",
  "governance.proposal.execute",
  "auction.bid.commit",
  "auction.settle",
];

export const STELLAR_NETWORK_CONFIGS: readonly StellarNetworkConfig[] = [
  {
    network: "stellar-testnet",
    label: "Stellar Testnet",
    environment: "testnet",
    networkPassphrase: STELLAR_TESTNET_NETWORK_PASSPHRASE,
    horizonUrlEnv: "PDAO_STELLAR_TESTNET_HORIZON_URL",
    explorerBaseUrl: "https://stellar.expert/explorer/testnet/tx/",
    nativeAsset: "XLM",
    broadcastEnabled: false,
  },
];

export interface StellarUnsignedPayload {
  kind: "stellar-operation-intent";
  network: "stellar-testnet";
  networkPassphrase: string;
  capability: CapabilityId;
  product: string;
  payload: unknown;
  accounts: readonly { role: string; address: string }[];
  transactionXdr?: string;
  transactionKind?: "payment" | "payroll-settlement";
}

export interface StellarPaymentPayload {
  kind: "stellar-payment";
  destination: string;
  amount: string;
  memo?: string;
  workflow?: StellarProductWorkflow;
}

export interface StellarPayrollRecipient {
  destination: string;
  amount: string;
}

export interface StellarPayrollSettlementPayload {
  kind: "stellar-payroll-settlement";
  recipients: readonly StellarPayrollRecipient[];
  totalAmount: string;
  memo?: string;
  workflow: StellarProductWorkflow;
}

export interface StellarRecoveredAccount {
  network: "stellar-testnet";
  publicKey: string;
  sequence: string;
  ledger?: string;
  balances: readonly { asset: string; balance: string; buyingLiabilities?: string; sellingLiabilities?: string }[];
  recoveredAt: string;
}

export interface StellarSignedPayload {
  kind: "stellar-signed-xdr";
  network: "stellar-testnet";
  signedTransactionXdr: string;
}

type HorizonTransaction = {
  hash?: unknown;
  successful?: unknown;
  ledger?: unknown;
  created_at?: unknown;
  source_account?: unknown;
  fee_charged?: unknown;
};

type HorizonRoot = {
  network_passphrase?: unknown;
  latest_ledger?: unknown;
};

type HorizonFeeStats = { fee_charged?: { p10?: unknown }; max_fee?: { mode?: unknown } };
type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export interface StellarTransport {
  readonly broadcastEnabled: boolean;
  health(): Promise<{ ok: boolean; network: NetworkId; ledger?: string; latencyMs?: number; reason?: string }>;
  recoverAccount(publicKey: string): Promise<StellarRecoveredAccount>;
  prepare<TPayload, TUnsigned>(intent: ExecutionIntent<TPayload>): Promise<PreparedExecution<TUnsigned>>;
  submit<TUnsigned>(execution: PreparedExecution<TUnsigned>, signedPayload: TUnsigned): Promise<{ executionId: string; signatures: string[] }>;
  observeConfirmedTransaction(executionId: string, transactionHash: string): Promise<void>;
  status(executionId: string): Promise<{ executionId: string; state: ExecutionState; errorCode?: string }>;
  receipt<TResult = unknown>(executionId: string): Promise<ExecutionReceipt<TResult>>;
  estimateFee<TPayload>(intent: ExecutionIntent<TPayload>): Promise<FeeEstimate>;
}

type StellarRecord = {
  intent: ExecutionIntent<unknown>;
  state: ExecutionState;
  preparedAt: string;
  transactionHash?: string;
  workflow?: StellarProductWorkflow;
};

const DEFAULT_HORIZON_URL = "https://horizon-testnet.stellar.org";

/**
 * Horizon boundary for Stellar. Product code only supplies a workflow intent;
 * XDR construction/signing stays outside this adapter. Broadcast is fail-closed
 * until a separately approved signer and E2E run are configured.
 */
export class StellarHorizonTransport implements StellarTransport {
  private readonly records = new Map<string, StellarRecord>();
  private readonly horizonUrl: string;

  constructor(
    private readonly fetchImpl: FetchLike = fetch,
    horizonUrl = process.env.PDAO_STELLAR_TESTNET_HORIZON_URL?.trim() || DEFAULT_HORIZON_URL,
    private readonly broadcastEnabledFlag = process.env.PDAO_STELLAR_TESTNET_BROADCAST_ENABLED === "1"
      && process.env.PDAO_STELLAR_TESTNET_E2E_APPROVED === "1",
  ) {
    if (!/^https:\/\//i.test(horizonUrl)) throw new Error("Stellar Horizon must use HTTPS.");
    this.horizonUrl = horizonUrl.replace(/\/$/, "");
  }

  get broadcastEnabled(): boolean { return this.broadcastEnabledFlag; }

  async health(): Promise<{ ok: boolean; network: NetworkId; ledger?: string; latencyMs?: number; reason?: string }> {
    const started = Date.now();
    try {
      const root = await this.request<HorizonRoot>("/");
      if (root.network_passphrase !== STELLAR_TESTNET_NETWORK_PASSPHRASE) {
        return { ok: false, network: "stellar-testnet", reason: "network_passphrase_mismatch" };
      }
      return {
        ok: true,
        network: "stellar-testnet",
        ledger: typeof root.latest_ledger === "number" ? String(root.latest_ledger) : undefined,
        latencyMs: Date.now() - started,
      };
    } catch (error) {
      return { ok: false, network: "stellar-testnet", latencyMs: Date.now() - started, reason: error instanceof Error ? error.message : "horizon_unavailable" };
    }
  }

  async recoverAccount(publicKey: string): Promise<StellarRecoveredAccount> {
    const { Keypair, Horizon } = await import("@stellar/stellar-sdk");
    try {
      Keypair.fromPublicKey(publicKey);
    } catch {
      throw new Error("Stellar account public key is malformed.");
    }
    const account = await new Horizon.Server(this.horizonUrl).loadAccount(publicKey);
    const health = await this.health();
    return {
      network: "stellar-testnet",
      publicKey,
      sequence: account.sequence,
      ledger: health.ledger,
      balances: account.balances.map((balance) => {
        const line = balance as { asset_type?: string; asset_code?: string; asset_issuer?: string; balance: string; buying_liabilities?: string; selling_liabilities?: string };
        return {
          asset: line.asset_type === "native" ? "XLM" : `${line.asset_code || "unknown"}:${line.asset_issuer || "unknown"}`,
          balance: line.balance,
          buyingLiabilities: line.buying_liabilities,
          sellingLiabilities: line.selling_liabilities,
        };
      }),
      recoveredAt: new Date().toISOString(),
    };
  }

  async prepare<TPayload, TUnsigned>(intent: ExecutionIntent<TPayload>): Promise<PreparedExecution<TUnsigned>> {
    const health = await this.health();
    if (!health.ok) throw new Error(`Stellar Horizon is not ready: ${health.reason || "unknown"}`);
    const executionId = `stellar-${intent.context.requestId}`;
    const unsignedPayload: StellarUnsignedPayload = {
      kind: "stellar-operation-intent",
      network: "stellar-testnet",
      networkPassphrase: STELLAR_TESTNET_NETWORK_PASSPHRASE,
      capability: intent.context.capability,
      product: intent.context.product,
      payload: intent.payload,
      accounts: intent.accounts.map(({ role, address }) => ({ role, address })),
    };
    const payment = parsePaymentPayload(intent.payload, intent.context.capability);
    if (payment) {
      const built = await this.buildPaymentTransaction(intent, payment);
      unsignedPayload.transactionXdr = built.xdr;
      unsignedPayload.transactionKind = payment.kind === "stellar-payroll-settlement" ? "payroll-settlement" : "payment";
    }
    this.records.set(executionId, {
      intent: intent as ExecutionIntent<unknown>,
      state: "awaiting_signature",
      preparedAt: new Date().toISOString(),
      workflow: payment?.workflow,
    });
    return {
      executionId,
      intent,
      unsignedPayload: unsignedPayload as TUnsigned,
      requiredSigners: intent.accounts.filter((account) => account.role === "authority" || account.role === "payer"),
      state: "awaiting_signature",
      signingMode: "browser",
    };
  }

  async submit<TUnsigned>(execution: PreparedExecution<TUnsigned>, signedPayload: TUnsigned): Promise<{ executionId: string; signatures: string[] }> {
    const payload = signedPayload as Partial<StellarSignedPayload>;
    if (payload.kind !== "stellar-signed-xdr" || payload.network !== "stellar-testnet" || typeof payload.signedTransactionXdr !== "string") {
      throw new Error("Stellar submit requires a signed Testnet XDR payload.");
    }
    if (!this.broadcastEnabledFlag) throw new Error("Stellar broadcast is disabled; no transaction was sent.");
    const record = this.records.get(execution.executionId);
    if (!record) throw new Error("Unknown Stellar execution.");
    if (record.transactionHash) return { executionId: execution.executionId, signatures: [record.transactionHash] };
    const { Horizon, Networks, TransactionBuilder } = await import("@stellar/stellar-sdk");
    const transaction = TransactionBuilder.fromXdr(payload.signedTransactionXdr, Networks.TESTNET);
    if (transaction.signatures.length === 0) throw new Error("Stellar submit requires at least one transaction signature.");
    const expectedSource = execution.intent.accounts.find((account) => account.role === "payer" || account.role === "authority")?.address;
    if (expectedSource && "source" in transaction && transaction.source !== expectedSource) {
      throw new Error("Stellar transaction source does not match the authorized execution account.");
    }
    const response = await new Horizon.Server(this.horizonUrl).submitTransaction(transaction);
    if (typeof response.hash !== "string" || !/^[a-f0-9]{64}$/i.test(response.hash)) throw new Error("Stellar Horizon returned no valid transaction hash.");
    record.transactionHash = response.hash;
    record.state = "submitted";
    return { executionId: execution.executionId, signatures: [response.hash] };
  }

  async observeConfirmedTransaction(executionId: string, transactionHash: string): Promise<void> {
    const record = this.records.get(executionId);
    if (!record) throw new Error("Unknown Stellar execution.");
    if (!/^[a-f0-9]{64}$/i.test(transactionHash)) throw new Error("Stellar transaction hash is malformed.");
    const transaction = await this.transaction(transactionHash);
    if (transaction.hash !== transactionHash || transaction.successful !== true || typeof transaction.ledger !== "number") {
      throw new Error("Stellar transaction is not a confirmed successful Testnet transaction.");
    }
    record.transactionHash = transactionHash;
    record.state = "confirmed";
  }

  async status(executionId: string): Promise<{ executionId: string; state: ExecutionState; errorCode?: string }> {
    const record = this.records.get(executionId);
    if (!record) throw new Error("Unknown Stellar execution.");
    if (!record.transactionHash) return { executionId, state: record.state };
    const transaction = await this.transaction(record.transactionHash);
    return { executionId, state: transaction.successful ? "confirmed" : "failed" };
  }

  async receipt<TResult = unknown>(executionId: string): Promise<ExecutionReceipt<TResult>> {
    const record = this.records.get(executionId);
    if (!record?.transactionHash) throw new Error("Stellar execution has no observed transaction hash.");
    const transaction = await this.transaction(record.transactionHash);
    if (typeof transaction.hash !== "string" || typeof transaction.successful !== "boolean" || typeof transaction.ledger !== "number") {
      throw new Error("Stellar Horizon returned a malformed transaction receipt.");
    }
    if (!transaction.successful) throw new Error("Stellar transaction failed on Testnet.");
    return {
      executionId,
      requestId: record.intent.context.requestId,
      capability: record.intent.context.capability,
      network: "stellar-testnet",
      provider: "stellar-testnet-horizon",
      state: "confirmed",
      signatures: [transaction.hash],
      result: transaction as TResult,
      metadata: record.workflow ? {
        workflowId: record.workflow.workflowId,
        inputCommitment: record.workflow.inputCommitment,
        ...(record.workflow.policyCommitment ? { policyCommitment: record.workflow.policyCommitment } : {}),
        ...(record.workflow.outcomeCommitment ? { outcomeCommitment: record.workflow.outcomeCommitment } : {}),
      } : undefined,
      createdAt: typeof transaction.created_at === "string" ? transaction.created_at : new Date().toISOString(),
      environment: "testnet",
      chainId: STELLAR_TESTNET_NETWORK_PASSPHRASE,
      asset: "XLM",
      blockNumber: String(transaction.ledger),
      explorerUrl: `${this.horizonUrl.replace("horizon-testnet.stellar.org", "stellar.expert/explorer/testnet/tx")}/${transaction.hash}`,
    };
  }

  async estimateFee<TPayload>(_intent: ExecutionIntent<TPayload>): Promise<FeeEstimate> {
    const stats = await this.request<HorizonFeeStats>("/fee_stats");
    const fee = typeof stats.fee_charged?.p10 === "number" ? String(stats.fee_charged.p10) : "100";
    return { network: "stellar-testnet", atomicAmount: fee, asset: "stroops", expiresAt: new Date(Date.now() + 60_000).toISOString() };
  }

  private async buildPaymentTransaction(intent: ExecutionIntent<unknown>, payment: StellarPaymentPayload | StellarPayrollSettlementPayload): Promise<{ xdr: string }> {
    const payer = intent.accounts.find((account) => account.role === "payer" || account.role === "authority");
    if (!payer) throw new Error("Stellar payment requires a payer or authority account.");
    const { Keypair, Horizon, Memo, Networks, Operation, TransactionBuilder, Asset } = await import("@stellar/stellar-sdk");
    try { Keypair.fromPublicKey(payer.address); } catch { throw new Error("Stellar payment contains an invalid payer account."); }
    const server = new Horizon.Server(this.horizonUrl);
    await this.recoverAccount(payer.address);
    const source = await server.loadAccount(payer.address);
    const fee = await this.estimateFee(intent);
    let builder = new TransactionBuilder(source, {
      fee: fee.atomicAmount,
      networkPassphrase: Networks.TESTNET,
    });
    if (payment.kind === "stellar-payroll-settlement") {
      for (const recipient of payment.recipients) {
        try { Keypair.fromPublicKey(recipient.destination); } catch { throw new Error("Stellar payroll contains an invalid recipient account."); }
        builder = builder.addOperation(Operation.payment({ destination: recipient.destination, asset: Asset.native(), amount: recipient.amount }));
      }
    } else {
      try { Keypair.fromPublicKey(payment.destination); } catch { throw new Error("Stellar payment contains an invalid public account."); }
      builder = builder.addOperation(Operation.payment({ destination: payment.destination, asset: Asset.native(), amount: payment.amount }));
    }
    if (payment.memo) builder = builder.addMemo(Memo.text(payment.memo));
    const transaction = builder.setTimeout(60).build();
    return { xdr: transaction.toXDR() };
  }

  private async transaction(hash: string): Promise<HorizonTransaction> {
    return this.request<HorizonTransaction>(`/transactions/${encodeURIComponent(hash)}`);
  }

  private async request<T>(path: string): Promise<T> {
    const response = await this.fetchImpl(`${this.horizonUrl}${path}`, { headers: { Accept: "application/json" } });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(`Stellar Horizon HTTP ${response.status}`);
    return body as T;
  }
}

function parsePaymentPayload(payload: unknown, capability: CapabilityId): StellarPaymentPayload | StellarPayrollSettlementPayload | undefined {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return undefined;
  const candidate = payload as Partial<StellarPaymentPayload> & Partial<StellarPayrollSettlementPayload>;
  if (candidate.kind === "stellar-payroll-settlement") {
    if (capability !== "payroll.settle") throw new Error("Stellar payroll settlement payload requires payroll.settle.");
    if (!Array.isArray(candidate.recipients) || candidate.recipients.length === 0 || candidate.recipients.length > 100) throw new Error("Stellar payroll requires between 1 and 100 recipients.");
    if (typeof candidate.totalAmount !== "string") throw new Error("Stellar payroll requires totalAmount.");
    const totalStroops = toStroops(candidate.totalAmount, "totalAmount");
    let sum = 0n;
    const recipients = candidate.recipients.map((recipient) => {
      if (!recipient || typeof recipient !== "object" || typeof recipient.destination !== "string" || typeof recipient.amount !== "string") throw new Error("Stellar payroll recipient requires destination and amount.");
      sum += toStroops(recipient.amount, "recipient amount");
      return { destination: recipient.destination, amount: recipient.amount };
    });
    if (sum !== totalStroops) throw new Error("Stellar payroll totalAmount does not match recipient amounts.");
    if (candidate.memo !== undefined && typeof candidate.memo !== "string") throw new Error("Stellar payroll memo must be text.");
    if (!candidate.workflow) throw new Error("Stellar payroll settlement requires a workflow commitment envelope.");
    return {
      kind: "stellar-payroll-settlement",
      recipients,
      totalAmount: candidate.totalAmount,
      memo: candidate.memo,
      workflow: validateStellarProductWorkflow(capability, candidate.workflow),
    };
  }
  if (candidate.kind !== "stellar-payment") return undefined;
  if (typeof candidate.destination !== "string" || typeof candidate.amount !== "string" || candidate.amount.length === 0) {
    throw new Error("Stellar payment requires destination and amount.");
  }
  toStroops(candidate.amount, "amount");
  if (candidate.memo !== undefined && typeof candidate.memo !== "string") throw new Error("Stellar payment memo must be text.");
  const workflow = candidate.workflow === undefined
    ? undefined
    : validateStellarProductWorkflow(capability, candidate.workflow);
  return { kind: "stellar-payment", destination: candidate.destination, amount: candidate.amount, memo: candidate.memo, workflow };
}

function toStroops(value: string, label: string): bigint {
  if (!/^\d+(\.\d{1,7})?$/.test(value) || Number(value) <= 0) throw new Error(`Stellar ${label} must be a positive amount with at most 7 decimal places.`);
  const [whole, fraction = ""] = value.split(".");
  return BigInt(whole) * 10_000_000n + BigInt((fraction + "0000000").slice(0, 7));
}

export class StellarAdapterError extends Error {
  constructor(readonly code: "NETWORK_MISMATCH" | "MALFORMED_RECEIPT" | "RPC_FAILURE" | "RPC_TIMEOUT" | "UNSUPPORTED_CAPABILITY", message: string) {
    super(message);
    this.name = "StellarAdapterError";
  }
}

export class StellarNetworkAdapter implements NetworkAdapter {
  readonly id: ProviderId;
  readonly networks: readonly NetworkId[];
  readonly descriptor;
  private readonly capabilities: ReadonlySet<CapabilityId>;

  constructor(input: { id: ProviderId; config: StellarNetworkConfig; capabilities: readonly CapabilityId[]; transport: StellarTransport }) {
    const descriptor = getNetwork(input.config.network);
    if (descriptor.family !== "stellar" || input.config.network !== "stellar-testnet") throw new StellarAdapterError("NETWORK_MISMATCH", "Stellar adapter requires Stellar Testnet.");
    if (input.config.environment !== "testnet") throw new StellarAdapterError("NETWORK_MISMATCH", "Only Stellar Testnet is available.");
    if (input.capabilities.length === 0) throw new StellarAdapterError("UNSUPPORTED_CAPABILITY", "Stellar adapter requires explicit capabilities.");
    this.id = input.id;
    this.networks = [input.config.network];
    this.descriptor = descriptor;
    this.capabilities = new Set(input.capabilities);
    this.config = input.config;
    this.transport = input.transport;
  }

  readonly config: StellarNetworkConfig;
  private readonly transport: StellarTransport;

  supports(capability: CapabilityId): boolean { return this.capabilities.has(capability); }

  async prepare<TPayload, TUnsigned>(intent: ExecutionIntent<TPayload>): Promise<PreparedExecution<TUnsigned>> {
    this.assertIntent(intent);
    return this.transport.prepare(intent);
  }

  submit<TUnsigned>(execution: PreparedExecution<TUnsigned>, signedPayload: TUnsigned): Promise<{ executionId: string; signatures: string[] }> {
    this.assertIntent(execution.intent);
    return this.transport.submit(execution, signedPayload);
  }

  status(executionId: string): Promise<{ executionId: string; state: ExecutionState; errorCode?: string }> { return this.transport.status(executionId); }
  receipt<TResult = unknown>(executionId: string): Promise<ExecutionReceipt<TResult>> { return this.transport.receipt<TResult>(executionId); }
  estimateFee<TPayload>(intent: ExecutionIntent<TPayload>): Promise<FeeEstimate> { this.assertIntent(intent); return this.transport.estimateFee(intent); }
  health() { return this.transport.health(); }
  get broadcastEnabled(): boolean { return this.transport.broadcastEnabled; }
  recoverAccount(publicKey: string): Promise<StellarRecoveredAccount> { return this.transport.recoverAccount(publicKey); }
  explorerUrl(reference: string): string { return `${this.config.explorerBaseUrl}${encodeURIComponent(reference)}`; }

  private assertIntent<TPayload>(intent: ExecutionIntent<TPayload>): void {
    if (intent.context.network !== this.config.network) throw new StellarAdapterError("NETWORK_MISMATCH", "Execution intent targets a different network.");
    if (intent.accounts.some((account) => account.network !== this.config.network)) throw new StellarAdapterError("NETWORK_MISMATCH", "Execution account targets a different network.");
    if (!this.supports(intent.context.capability)) throw new StellarAdapterError("UNSUPPORTED_CAPABILITY", `Capability is not enabled: ${intent.context.capability}`);
  }
}
