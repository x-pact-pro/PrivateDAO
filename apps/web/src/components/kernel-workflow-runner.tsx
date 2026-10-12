"use client";

import { useState } from "react";
import { CheckCircle2, Loader2, ShieldCheck } from "lucide-react";
import { encodeFunctionData, parseAbi } from "viem";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { auctionWriteAbi, getEvmProductContracts, governanceWriteAbi } from "@/lib/evm-contract-config";
import { buildExecuteProposalTransaction, PRIVATE_DAO_PROGRAM_ID } from "@/lib/dao-bootstrap";

type KernelWorkflowRunnerProps = {
  product: string;
  capability: string;
  network: string;
  networkLabel: string;
};

type PreparedExecution = {
  executionId: string;
  state: "prepared" | "awaiting_signature";
  requiredSigners?: Array<{ role?: string; address?: string; network?: string }>;
  intent?: { context?: { network?: string; capability?: string } };
  unsignedPayload?: Record<string, unknown>;
  signingMode?: "browser" | "server";
};

type ExecutionReceipt = {
  executionId?: string;
  state?: string;
  network?: string;
  provider?: string;
  signatures?: string[];
  result?: unknown;
};

const RUNTIME_API_BASE = (process.env.NEXT_PUBLIC_RUNTIME_API_BASE || "https://api.privatedao.org/api").replace(/\/+$/, "");

const EVM_CHAIN_IDS: Record<string, number> = {
  "ethereum-sepolia": 11155111,
  "arbitrum-sepolia": 421614,
  "tempo-testnet": 42431,
  "base-sepolia": 84532,
  "robinhood-testnet": 46630,
  "hyperliquid-testnet": 998,
};

function getEvmProvider(): PrivateDaoEip1193Provider | null {
  if (typeof window === "undefined" || !window.ethereum) return null;
  return window.ethereum;
}

function chainHex(network: string): string {
  const chainId = EVM_CHAIN_IDS[network];
  if (!chainId) throw new Error("This workflow does not have a supported browser-wallet network.");
  return `0x${chainId.toString(16)}`;
}

export function KernelWorkflowRunner({ product, capability, network, networkLabel }: KernelWorkflowRunnerProps) {
  const [busy, setBusy] = useState(false);
  const [prepared, setPrepared] = useState<PreparedExecution | null>(null);
  const [receipt, setReceipt] = useState<ExecutionReceipt | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [evmProposalId, setEvmProposalId] = useState("");
  const [evmActionHash, setEvmActionHash] = useState("");
  const [evmAuctionId, setEvmAuctionId] = useState("");
  const [evmCommitment, setEvmCommitment] = useState("");
  const [evmWalletAddress, setEvmWalletAddress] = useState<string | null>(null);
  const [evmWalletChain, setEvmWalletChain] = useState<string | null>(null);
  const [solanaDaoAddress, setSolanaDaoAddress] = useState("");
  const [solanaProposalAddress, setSolanaProposalAddress] = useState("");
  const [solanaTreasuryRecipient, setSolanaTreasuryRecipient] = useState("");
  const { connection } = useConnection();
  const { connected: solanaConnected, publicKey: solanaPublicKey, sendTransaction } = useWallet();

  async function connectEvmWallet() {
    const provider = getEvmProvider();
    if (!provider) throw new Error("Connect an EVM wallet such as MetaMask or Rabby before signing.");
    const accounts = await provider.request({ method: "eth_requestAccounts" }) as string[];
    const address = accounts[0];
    if (!address) throw new Error("The wallet did not return an account.");
    let chain = await provider.request({ method: "eth_chainId" }) as string;
    if (chain.toLowerCase() !== chainHex(network).toLowerCase()) {
      await provider.request({ method: "wallet_switchEthereumChain", params: [{ chainId: chainHex(network) }] });
      chain = await provider.request({ method: "eth_chainId" }) as string;
    }
    if (chain.toLowerCase() !== chainHex(network).toLowerCase()) throw new Error("The wallet is on a different testnet.");
    setEvmWalletAddress(address);
    setEvmWalletChain(chain);
  }

  async function buildPayload() {
    if (network === "solana-devnet" && capability === "governance.proposal.execute") {
      if (!solanaConnected || !solanaPublicKey) throw new Error("Connect a Solana Devnet wallet before preparing governance execution.");
      try {
        new PublicKey(solanaDaoAddress.trim());
        new PublicKey(solanaProposalAddress.trim());
        if (solanaTreasuryRecipient.trim()) new PublicKey(solanaTreasuryRecipient.trim());
      } catch {
        throw new Error("Enter valid Solana DAO and proposal addresses.");
      }
      return {
        kind: "solana-browser-transaction",
        operation: "governance.proposal.execute",
        account: solanaPublicKey.toBase58(),
        programId: PRIVATE_DAO_PROGRAM_ID.toBase58(),
        daoAddress: solanaDaoAddress.trim(),
        proposalAddress: solanaProposalAddress.trim(),
        treasuryRecipient: solanaTreasuryRecipient.trim() || solanaPublicKey.toBase58(),
      };
    }
    const evmContracts = getEvmProductContracts(network);
    if (evmContracts && capability === "governance.proposal.execute") {
      if (!/^0x[0-9a-fA-F]{64}$/.test(evmProposalId) || !/^0x[0-9a-fA-F]{64}$/.test(evmActionHash)) {
        throw new Error("Enter a 32-byte proposal ID and action hash before preparing the Base, Tempo, or Ethereum workflow.");
      }
      const now = Math.floor(Date.now() / 1000);
      if (!evmWalletAddress) throw new Error("Connect your EVM wallet before preparing this workflow.");
      return { kind: "contract-write", address: evmContracts.governance, abi: governanceWriteAbi, functionName: "createProposal", args: [evmProposalId, evmActionHash, now + 120, now + 300, 1], account: evmWalletAddress };
    }
    if (capability === "governance.proposal.execute") {
      const proposalId = `policy-${network}-${requestIdForHash()}`;
      return {
        proposalId,
        proposalHash: await digestHex(`PrivateDAO:${proposalId}:proposal`),
        policyHash: await digestHex(`PrivateDAO:${proposalId}:policy`),
        requiredApprovals: 1,
      };
    }
    if (evmContracts && capability === "auction.bid.commit") {
      if (!/^0x[0-9a-fA-F]{64}$/.test(evmAuctionId) || !/^0x[0-9a-fA-F]{64}$/.test(evmCommitment)) {
        throw new Error("Enter a 32-byte auction ID and bid commitment before preparing the workflow.");
      }
      if (!evmWalletAddress) throw new Error("Connect your EVM wallet before preparing this workflow.");
      return { kind: "contract-write", address: evmContracts.auction, abi: auctionWriteAbi, functionName: "commitBid", args: [evmAuctionId, evmCommitment], account: evmWalletAddress };
    }
    if (evmContracts && capability === "auction.settle") {
      if (!/^0x[0-9a-fA-F]{64}$/.test(evmAuctionId)) throw new Error("Enter the 32-byte auction ID before preparing settlement.");
      if (!evmWalletAddress) throw new Error("Connect your EVM wallet before preparing this workflow.");
      return { kind: "contract-write", address: evmContracts.auction, abi: auctionWriteAbi, functionName: "settleAuction", args: [evmAuctionId], account: evmWalletAddress };
    }
    if (capability === "payroll.approve") {
      const batchId = `web-payroll-${requestIdForHash()}`;
      return {
        batchId,
        makerId: "demo-maker",
        policyHash: await digestHex(`PrivateDAO:${batchId}:policy`),
        policy: { requiredApprovals: 1, allowedRoles: ["checker"], preventSelfApproval: true },
      };
    }
    if (capability === "agent.discover") return { url: "https://agents.privatedao.org/.well-known/agent-card.json" };
    if (capability === "payroll.calculate") {
      return {
        lines: [{ employeeRef: "demo-employee-1", grossCents: 10000 }],
        policy: { network, jurisdiction: "demo", taxYear: "2026", taxRateBps: 1000, deductionRateBps: 500, maxTotalCents: 20000, maxEmployeeCents: 15000, allowedAsset: "USDC", rounding: "half-up" },
      };
    }
    if (capability === "treasury.policy.check") return { amountCents: 100, budgetCents: 1000, requestedAsset: "USDC", allowedAsset: "USDC" };
    if (capability === "verification.blind.prove") {
      return {
        workflowId: `demo-${network}`,
        privateInputs: {
          organizationId: "demo-organization",
          subjectId: "demo-subject-redacted",
          membershipVerified: true,
          records: [{ amountUsd: 8800 }, { amountUsd: 9400 }, { amountUsd: 9200 }],
          riskScore: 84,
          liabilitiesUsd: 2400,
        },
      };
    }
    if (capability === "verification.record.verify") {
      const record = {
        schemaVersion: "1" as const,
        recordType: "private-workflow",
        recordId: "demo-record-verification",
        issuer: "PrivateDAO",
        issuedAt: "2026-01-01T00:00:00.000Z",
        payload: { outcome: "approved" },
      };
      return { record, expectedDigest: await digestHex(canonicalizeRecord(record)) };
    }
    if (capability === "verification.record.create") return { schemaVersion: "1", recordType: "private-workflow", recordId: `demo-${Date.now()}`, issuer: "PrivateDAO", issuedAt: new Date().toISOString(), payload: { outcome: "approved" }, publicFieldPaths: ["outcome"] };
    if (capability === "auction.bid.commit") return { config: { auctionId: `demo-${network}`, asset: "USDC" }, privateBids: [{ bidderRef: "demo-bidder", amountCents: 100 }] };
    if (capability === "auction.settle") return { metadata: { auctionId: `demo-${network}`, policy: "highest-valid-bid" }, bids: [{ bidderRef: "demo-bidder", amountCents: 100 }] };
    throw new Error("This workflow requires its product-specific approval or wallet form before it can be prepared.");
  }

  async function prepare() {
    setBusy(true);
    setPrepared(null);
    setReceipt(null);
    setError(null);
    const requestId = `web-${product}-${capability}-${network}-${Date.now()}`;
    try {
      const response = await fetch(`${RUNTIME_API_BASE}/v1/executions/prepare`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          intent: {
            context: {
              requestId,
              idempotencyKey: requestId,
              product,
              capability,
              actorId: "browser-user",
              network,
            },
            payload: await buildPayload(),
            accounts: capability === "payroll.approve"
              ? [{ role: "authority", address: "demo-checker", network }]
              : capability === "governance.proposal.execute" && !getEvmProductContracts(network)
                ? [{ role: "authority", address: "browser-user", network }]
              : [],
          },
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok || typeof body.executionId !== "string") {
        throw new Error(typeof body.error === "string" ? body.error : `The selected workflow is unavailable (${response.status}).`);
      }
      setPrepared(body as PreparedExecution);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The selected workflow could not be prepared.");
    } finally {
      setBusy(false);
    }
  }

  async function complete() {
    if (!prepared) return;
    if (prepared.signingMode !== "browser" && (prepared.requiredSigners?.length ?? 0) > 0) {
      setError("This workflow is prepared, but it requires the listed authority or wallet signature before it can be completed.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      let signedPayload: unknown = null;
      if (prepared.signingMode === "browser") {
        const provider = getEvmProvider();
        const payload = prepared.unsignedPayload;
        if (payload?.kind === "solana-browser-transaction") {
          if (!solanaConnected || !solanaPublicKey) throw new Error("Connect a Solana Devnet wallet before signing.");
          if (solanaPublicKey.toBase58() !== payload.account || typeof payload.daoAddress !== "string" || typeof payload.proposalAddress !== "string") {
            throw new Error("The connected Solana wallet does not match the prepared governance execution.");
          }
          const built = await buildExecuteProposalTransaction({
            connection,
            daoAddress: new PublicKey(payload.daoAddress),
            executor: solanaPublicKey,
            proposalAddress: new PublicKey(payload.proposalAddress),
            treasuryRecipient: new PublicKey(typeof payload.treasuryRecipient === "string" ? payload.treasuryRecipient : payload.account),
          });
          const signature = await sendTransaction(built.transaction, connection, { skipPreflight: false, preflightCommitment: "confirmed" });
          signedPayload = { kind: "browser-solana-transaction", signature };
        } else {
          if (!provider || !payload || typeof payload.address !== "string" || typeof payload.account !== "string" || typeof payload.functionName !== "string" || !Array.isArray(payload.abi) || !Array.isArray(payload.args)) {
            throw new Error("The prepared browser-wallet transaction is incomplete.");
          }
          const data = encodeFunctionData({ abi: parseAbi(payload.abi as string[]), functionName: payload.functionName, args: payload.args });
          const hash = await provider.request({ method: "eth_sendTransaction", params: [{ from: payload.account, to: payload.address, data }] });
          if (typeof hash !== "string" || !/^0x[0-9a-fA-F]{64}$/.test(hash)) throw new Error("The wallet did not return a valid transaction hash.");
          signedPayload = { kind: "browser-evm-transaction", hash };
        }
      }
      const submitResponse = await fetch(`${RUNTIME_API_BASE}/v1/executions/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ execution: prepared, signedPayload }),
      });
      const submitted = await submitResponse.json().catch(() => ({}));
      if (!submitResponse.ok) throw new Error(typeof submitted.error === "string" ? submitted.error : `The workflow could not be completed (${submitResponse.status}).`);
      const receiptResponse = await fetch(`${RUNTIME_API_BASE}/v1/executions/${encodeURIComponent(prepared.executionId)}/receipt`, { headers: { Accept: "application/json" } });
      const finalReceipt = await receiptResponse.json().catch(() => ({}));
      const receiptState = typeof finalReceipt.state === "string" ? finalReceipt.state : "";
      if (!receiptResponse.ok || !["confirmed", "finalized", "reconciled"].includes(receiptState)) throw new Error(typeof finalReceipt.error === "string" ? finalReceipt.error : "The workflow completed without a confirmed receipt.");
      setReceipt(finalReceipt as ExecutionReceipt);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The selected workflow could not be completed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="rounded-[24px] border border-[#bcd5f7] bg-[#f7fbff] p-5 text-[#10233f]" aria-labelledby="selected-kernel-workflow">
      <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.22em] text-[#175cd3]"><ShieldCheck className="h-4 w-4" /> Selected workflow</div>
      <h2 id="selected-kernel-workflow" className="mt-3 text-xl font-semibold">Ready this workflow for {networkLabel}</h2>
      <p className="mt-2 text-sm leading-6 text-[#5d6d82]">PrivateDAO sends the selected request through the same execution boundary used by the product runtime. No success is shown unless the connected service returns a real prepared execution.</p>
      <button type="button" onClick={() => void prepare()} disabled={busy} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-[10px] bg-[#175cd3] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
        {busy ? "Preparing..." : "Continue with this workflow"}
      </button>
      {prepared ? <div className="mt-4 rounded-[14px] border border-[#bde7d3] bg-[#f1fcf6] p-4 text-sm text-[#14532d]"><strong>Prepared through the runtime</strong><div className="mt-2 text-xs">Execution: <code>{prepared.executionId}</code></div><div className="mt-1 text-xs">State: {prepared.state}</div>{prepared.requiredSigners?.length ? <div className="mt-2 text-xs">Required signer: {prepared.requiredSigners.map((signer) => signer.address || signer.role || "authority").join(", ")}</div> : <button type="button" onClick={() => void complete()} disabled={submitting} className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-[9px] bg-[#14532d] px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">{submitting ? "Completing..." : "Complete and verify receipt"}</button>}</div> : null}
      {receipt ? <div className="mt-4 rounded-[14px] border border-[#bcd5f7] bg-white p-4 text-sm text-[#10233f]"><strong>Reconciled receipt</strong><div className="mt-2 grid gap-1 text-xs text-[#40536d]"><span>Network: {receipt.network || network}</span><span>State: {receipt.state}</span>{receipt.signatures?.length ? <span>Reference: {receipt.signatures.join(", ")}</span> : null}</div></div> : null}
      {getEvmProductContracts(network) ? <div className="mt-5 rounded-[14px] border border-[#d7e2f0] bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-[#40536d]">EVM wallet signing stays in your browser. The Kernel only prepares the request and verifies the testnet receipt.</div>
          <button type="button" onClick={() => void connectEvmWallet().catch((cause) => setError(cause instanceof Error ? cause.message : "Wallet connection failed."))} className="inline-flex min-h-10 items-center rounded-[9px] border border-[#175cd3] px-3 py-2 text-xs font-semibold text-[#175cd3]">{evmWalletAddress ? `Connected ${evmWalletAddress.slice(0, 6)}…${evmWalletAddress.slice(-4)}` : "Connect EVM wallet"}</button>
        </div>
        {evmWalletAddress && evmWalletChain?.toLowerCase() === chainHex(network).toLowerCase() ? <div className="mt-2 text-xs text-[#1a7f5a]">Wallet ready on {networkLabel}.</div> : null}
      </div> : null}
      {network === "solana-devnet" && capability === "governance.proposal.execute" ? <div className="mt-5 grid gap-3 rounded-[14px] border border-[#d7e2f0] bg-white p-4 sm:grid-cols-3">
        <label className="text-xs font-semibold text-[#40536d]">DAO address<input value={solanaDaoAddress} onChange={(event) => setSolanaDaoAddress(event.target.value)} className="mt-2 min-h-10 w-full rounded-[8px] border border-[#cfdbea] px-3 text-sm font-mono font-normal" autoComplete="off" placeholder="Solana Devnet address" /></label>
        <label className="text-xs font-semibold text-[#40536d]">Proposal address<input value={solanaProposalAddress} onChange={(event) => setSolanaProposalAddress(event.target.value)} className="mt-2 min-h-10 w-full rounded-[8px] border border-[#cfdbea] px-3 text-sm font-mono font-normal" autoComplete="off" placeholder="Solana Devnet address" /></label>
        <label className="text-xs font-semibold text-[#40536d]">Treasury recipient<input value={solanaTreasuryRecipient} onChange={(event) => setSolanaTreasuryRecipient(event.target.value)} className="mt-2 min-h-10 w-full rounded-[8px] border border-[#cfdbea] px-3 text-sm font-mono font-normal" autoComplete="off" placeholder="Optional; defaults to wallet" /></label>
      </div> : null}
      {getEvmProductContracts(network) && capability === "governance.proposal.execute" ? <div className="mt-3 grid gap-3 rounded-[14px] border border-[#d7e2f0] bg-white p-4 sm:grid-cols-2">
        <label className="text-xs font-semibold text-[#40536d]">Proposal ID (bytes32)<input value={evmProposalId} onChange={(event) => setEvmProposalId(event.target.value)} className="mt-2 min-h-10 w-full rounded-[8px] border border-[#cfdbea] px-3 text-sm font-mono font-normal" autoComplete="off" placeholder="0x..." /></label>
        <label className="text-xs font-semibold text-[#40536d]">Action hash (bytes32)<input value={evmActionHash} onChange={(event) => setEvmActionHash(event.target.value)} className="mt-2 min-h-10 w-full rounded-[8px] border border-[#cfdbea] px-3 text-sm font-mono font-normal" autoComplete="off" placeholder="0x..." /></label>
      </div> : null}
      {getEvmProductContracts(network) && (capability === "auction.bid.commit" || capability === "auction.settle") ? <div className="mt-3 grid gap-3 rounded-[14px] border border-[#d7e2f0] bg-white p-4 sm:grid-cols-2">
        <label className="text-xs font-semibold text-[#40536d]">Auction ID (bytes32)<input value={evmAuctionId} onChange={(event) => setEvmAuctionId(event.target.value)} className="mt-2 min-h-10 w-full rounded-[8px] border border-[#cfdbea] px-3 text-sm font-mono font-normal" autoComplete="off" placeholder="0x..." /></label>
        {capability === "auction.bid.commit" ? <label className="text-xs font-semibold text-[#40536d]">Bid commitment (bytes32)<input value={evmCommitment} onChange={(event) => setEvmCommitment(event.target.value)} className="mt-2 min-h-10 w-full rounded-[8px] border border-[#cfdbea] px-3 text-sm font-mono font-normal" autoComplete="off" placeholder="0x..." /></label> : null}
      </div> : null}
      {error ? <div className="mt-4 rounded-[14px] border border-[#f1c7cc] bg-[#fff7f7] p-4 text-sm text-[#8f1d2c]" role="alert">{error}</div> : null}
    </section>
  );
}

function requestIdForHash() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

async function digestHex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function canonicalizeRecord(record: {
  schemaVersion: string;
  recordType: string;
  recordId: string;
  issuer: string;
  issuedAt: string;
  payload: Record<string, unknown>;
}) {
  return canonicalizeValue({
    schema_version: record.schemaVersion,
    record_type: record.recordType,
    record_id: record.recordId,
    issuer: record.issuer,
    issued_at: record.issuedAt,
    effective_at: null,
    payload: record.payload,
    source_refs: [],
  });
}

function canonicalizeValue(value: unknown): string {
  if (value === null) return "null";
  if (typeof value === "string") return JSON.stringify(value.normalize("NFC"));
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") return Number.isInteger(value) ? String(value) : String(value);
  if (Array.isArray(value)) return `[${value.map(canonicalizeValue).join(",")}]`;
  if (typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>).sort(([left], [right]) => left.localeCompare(right)).map(([key, child]) => `${JSON.stringify(key.normalize("NFC"))}:${canonicalizeValue(child)}`).join(",")}}`;
  }
  throw new Error(`Unsupported record value type: ${typeof value}`);
}
