"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, Wallet, XCircle } from "lucide-react";

import { buildNativeTransferRequest, buildUsdcTransferRequest } from "@/lib/evm-transaction-safety";

type Eip1193Provider = {
  request(args: { method: string; params?: unknown[] }): Promise<unknown>;
  providers?: Eip1193Provider[];
};

type EvmNetwork = {
  id: string;
  label: string;
  chainId: number;
  currency: string;
  rpcUrl: string;
  explorer: string;
  environment: "mainnet" | "testnet";
  usdcAddress?: string;
};

const EVM_NETWORKS: readonly EvmNetwork[] = [
  { id: "ethereum-mainnet", label: "Ethereum Mainnet", chainId: 1, currency: "ETH", rpcUrl: "https://ethereum-rpc.publicnode.com", explorer: "https://etherscan.io", environment: "mainnet", usdcAddress: "0xA0b86991c6218b36c1d19d4a2e9eb0ce3606eb48" },
  { id: "base-mainnet", label: "Base Mainnet", chainId: 8453, currency: "ETH", rpcUrl: "https://mainnet.base.org", explorer: "https://basescan.org", environment: "mainnet", usdcAddress: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" },
  { id: "arbitrum-one", label: "Arbitrum One", chainId: 42161, currency: "ETH", rpcUrl: "https://arb1.arbitrum.io/rpc", explorer: "https://arbiscan.io", environment: "mainnet", usdcAddress: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831" },
  { id: "ethereum-sepolia", label: "Ethereum Sepolia", chainId: 11155111, currency: "ETH", rpcUrl: "https://ethereum-sepolia-rpc.publicnode.com", explorer: "https://sepolia.etherscan.io", environment: "testnet" },
  { id: "arbitrum-sepolia", label: "Arbitrum Sepolia", chainId: 421614, currency: "ETH", rpcUrl: "https://sepolia-rollup.arbitrum.io/rpc", explorer: "https://sepolia.arbiscan.io", environment: "testnet" },
  { id: "base-sepolia", label: "Base Sepolia", chainId: 84532, currency: "ETH", rpcUrl: "https://sepolia.base.org", explorer: "https://sepolia.basescan.org", environment: "testnet" },
  { id: "bnb-testnet", label: "BNB Smart Chain Testnet", chainId: 97, currency: "tBNB", rpcUrl: "https://data-seed-prebsc-1-s1.bnbchain.org:8545", explorer: "https://testnet.bscscan.com", environment: "testnet" },
  { id: "robinhood-testnet", label: "Robinhood Chain Testnet", chainId: 46630, currency: "ETH", rpcUrl: "https://rpc.testnet.chain.robinhood.com", explorer: "https://explorer.testnet.chain.robinhood.com", environment: "testnet" },
  { id: "hyperliquid-testnet", label: "Hyperliquid HyperEVM Testnet", chainId: 998, currency: "HYPE", rpcUrl: "https://rpc.hyperliquid-testnet.xyz/evm", explorer: "https://www.hyperscan.com", environment: "testnet" },
  { id: "tempo-testnet", label: "Tempo Testnet", chainId: 42431, currency: "USD", rpcUrl: "https://rpc.moderato.tempo.xyz", explorer: "https://explore.testnet.tempo.xyz", environment: "testnet" },
];

function getProvider(): Eip1193Provider | null {
  if (typeof window === "undefined") return null;
  const ethereum = (window as Window & { ethereum?: Eip1193Provider }).ethereum;
  if (!ethereum) return null;
  return ethereum.providers?.[0] ?? ethereum;
}

function toChainHex(chainId: number) {
  return `0x${chainId.toString(16)}`;
}

function formatNativeBalance(value: string, currency: string) {
  const amount = Number(BigInt(value)) / 1e18;
  return `${amount.toLocaleString("en-US", { maximumFractionDigits: 6 })} ${currency}`;
}

function formatUsdcBalance(value: string) {
  const amount = Number(BigInt(value)) / 1e6;
  return `${amount.toLocaleString("en-US", { maximumFractionDigits: 2 })} USDC`;
}

async function readRpc(rpcUrl: string, method: string, params: unknown[]) {
  const response = await fetch(rpcUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  if (!response.ok) throw new Error(`The selected network returned HTTP ${response.status}.`);
  const payload = await response.json() as { result?: string; error?: { message?: string } };
  if (payload.error || !payload.result) throw new Error(payload.error?.message ?? "The selected network did not return a balance.");
  return payload.result;
}

async function readBalances(rpcUrl: string, address: string, usdcAddress?: string) {
  const native = await readRpc(rpcUrl, "eth_getBalance", [address, "latest"]);
  const usdc = usdcAddress
    ? await readRpc(rpcUrl, "eth_call", [{ to: usdcAddress, data: `0x70a08231${address.slice(2).toLowerCase().padStart(64, "0")}` }, "latest"])
    : null;
  return { native, usdc };
}

async function waitForReceipt(rpcUrl: string, hash: string, attempts = 24) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const response = await fetch(rpcUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_getTransactionReceipt", params: [hash] }),
    });
    if (!response.ok) throw new Error(`The selected network returned HTTP ${response.status} while checking confirmation.`);
    const payload = await response.json() as { result?: { status?: string } | null; error?: { message?: string } };
    if (payload.error) throw new Error(payload.error.message ?? "The selected network could not confirm the transaction.");
    if (payload.result) return payload.result;
    await new Promise((resolve) => window.setTimeout(resolve, 2500));
  }
  return null;
}

export function EvmWalletSessionPanel() {
  const [selectedId, setSelectedId] = useState(EVM_NETWORKS[0].id);
  const [address, setAddress] = useState<string | null>(null);
  const [activeChainId, setActiveChainId] = useState<string | null>(null);
  const [nativeBalance, setNativeBalance] = useState<string | null>(null);
  const [usdcBalance, setUsdcBalance] = useState<string | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [status, setStatus] = useState("Choose a network when you are ready to connect.");
  const [error, setError] = useState<string | null>(null);
  const [transferAsset, setTransferAsset] = useState<"native" | "usdc">("native");
  const [transferAmount, setTransferAmount] = useState("");
  const [transferRecipient, setTransferRecipient] = useState("");
  const [reviewConfirmed, setReviewConfirmed] = useState(false);
  const [transferStatus, setTransferStatus] = useState<string | null>(null);
  const [transferHash, setTransferHash] = useState<string | null>(null);
  const selected = useMemo(() => EVM_NETWORKS.find((network) => network.id === selectedId) ?? EVM_NETWORKS[0], [selectedId]);

  function selectNetwork(nextId: string) {
    const nextNetwork = EVM_NETWORKS.find((network) => network.id === nextId) ?? EVM_NETWORKS[0];
    setSelectedId(nextNetwork.id);
    setNativeBalance(null);
    setUsdcBalance(null);
    setReviewConfirmed(false);
    setTransferStatus(null);
    setTransferHash(null);
    setStatus(address ? "Network selected. Refresh the read-only balance or switch the wallet before signing." : "Choose a network when you are ready to connect.");
  }

  async function refreshBalance(nextAddress = address, nextNetwork = selected) {
    if (!nextAddress) return;
    setBalanceLoading(true);
    try {
      const balances = await readBalances(nextNetwork.rpcUrl, nextAddress, nextNetwork.usdcAddress);
      setNativeBalance(formatNativeBalance(balances.native, nextNetwork.currency));
      setUsdcBalance(balances.usdc ? formatUsdcBalance(balances.usdc) : null);
    } catch (cause) {
      setNativeBalance(null);
      setUsdcBalance(null);
      setError(cause instanceof Error ? cause.message : "Unable to read the selected network balance.");
    } finally {
      setBalanceLoading(false);
    }
  }

  async function connect() {
    const provider = getProvider();
    if (!provider) {
      setError("No EVM wallet was detected. Install a wallet that supports EIP-1193, then try again.");
      return;
    }
    setError(null);
    try {
      const accounts = await provider.request({ method: "eth_requestAccounts" }) as string[];
      const chain = await provider.request({ method: "eth_chainId" }) as string;
      setAddress(accounts[0] ?? null);
      setActiveChainId(chain);
      setNativeBalance(null);
      setUsdcBalance(null);
      setStatus(chain.toLowerCase() === toChainHex(selected.chainId).toLowerCase() ? `${selected.label} is ready for this session.` : "Wallet connected. Switch to the selected network before signing.");
      if (accounts[0]) await refreshBalance(accounts[0], selected);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Wallet connection was cancelled.");
    }
  }

  async function switchNetwork() {
    const provider = getProvider();
    if (!provider) {
      setError("No EVM wallet was detected.");
      return;
    }
    setError(null);
    try {
      await provider.request({ method: "wallet_switchEthereumChain", params: [{ chainId: toChainHex(selected.chainId) }] });
      const chain = await provider.request({ method: "eth_chainId" }) as string;
      setActiveChainId(chain);
      await refreshBalance(address, selected);
      setStatus(`${selected.label} is ready for this session.`);
    } catch (cause) {
      const code = typeof cause === "object" && cause !== null && "code" in cause ? (cause as { code?: number }).code : undefined;
      if (code === 4902) {
        try {
          await provider.request({
            method: "wallet_addEthereumChain",
            params: [{ chainId: toChainHex(selected.chainId), chainName: selected.label, nativeCurrency: { name: selected.currency, symbol: selected.currency, decimals: 18 }, rpcUrls: [selected.rpcUrl], blockExplorerUrls: [selected.explorer] }],
          });
          const chain = await provider.request({ method: "eth_chainId" }) as string;
          if (chain.toLowerCase() !== toChainHex(selected.chainId).toLowerCase()) {
            throw new Error("The wallet added the network but did not switch to it. Switch networks before signing.");
          }
          setActiveChainId(chain);
          await refreshBalance(address, selected);
          setStatus(`${selected.label} was added to the wallet. Review the selected network before signing.`);
          return;
        } catch (addCause) {
          setError(addCause instanceof Error ? addCause.message : "The wallet did not add this network.");
          return;
        }
      }
      setError(cause instanceof Error ? cause.message : "The wallet did not switch networks.");
    }
  }

  async function sendTransfer() {
    const provider = getProvider();
    if (!provider || !address) {
      setError("Connect the EVM wallet before preparing a transfer.");
      return;
    }
    let submittedHash: string | null = null;
    try {
      const liveChainId = await provider.request({ method: "eth_chainId" }) as string;
      setActiveChainId(liveChainId);
      if (liveChainId.toLowerCase() !== toChainHex(selected.chainId).toLowerCase()) {
        throw new Error("Switch the wallet to the selected network before signing.");
      }
      if (!reviewConfirmed) {
        throw new Error("Review the recipient, asset, amount, and network before requesting a signature.");
      }
      setError(null);
      setTransferStatus("Preparing a wallet signature request…");
      const request = transferAsset === "usdc"
        ? buildUsdcTransferRequest({ from: address, token: selected.usdcAddress ?? "", to: transferRecipient, amount: transferAmount, activeChainId: liveChainId, selectedChainId: selected.chainId })
        : buildNativeTransferRequest({ from: address, to: transferRecipient, amount: transferAmount, activeChainId: liveChainId, selectedChainId: selected.chainId });
      await provider.request({ method: "eth_estimateGas", params: [request] });
      const hash = await provider.request({ method: "eth_sendTransaction", params: [request] }) as string;
      submittedHash = hash;
      setTransferHash(hash);
      setTransferStatus("Submitted. Waiting for network confirmation…");
      setTransferAmount("");
      setTransferRecipient("");
      setReviewConfirmed(false);
      const receipt = await waitForReceipt(selected.rpcUrl, hash);
      if (!receipt) {
        setTransferStatus("Still pending. Keep the receipt link and check again from the network explorer.");
        return;
      }
      if (receipt.status?.toLowerCase() !== "0x1") {
        setTransferStatus("The network rejected the transaction. No successful settlement was detected.");
        return;
      }
      setTransferStatus("Confirmed on the selected network.");
      await refreshBalance();
    } catch (cause) {
      setTransferStatus(submittedHash
        ? "Submitted, but confirmation could not be completed. Keep the receipt link and verify it on the explorer before retrying."
        : null);
      setError(cause instanceof Error ? cause.message : "The wallet rejected or could not submit the transfer.");
    }
  }

  const connectedOnSelected = activeChainId?.toLowerCase() === toChainHex(selected.chainId).toLowerCase();

  return (
    <section className="mt-8 rounded-3xl border border-white/10 bg-white/[0.035] p-5 sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-200/80">Wallet session</div>
          <h2 className="mt-2 text-xl font-semibold text-white">Connect through the network your organization chooses.</h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-white/60">Balances are read directly from the selected network. Transfers are built locally and require your explicit wallet signature.</p>
        </div>
        <Wallet className="h-6 w-6 text-cyan-200" />
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto_auto]">
        <select value={selectedId} onChange={(event) => selectNetwork(event.target.value)} className="rounded-xl border border-white/10 bg-[#0b1421] px-3 py-3 text-sm text-white outline-none focus:border-cyan-200/60">
          {EVM_NETWORKS.map((network) => <option key={network.id} value={network.id}>{network.label}</option>)}
        </select>
        <button type="button" onClick={() => void connect()} className="rounded-xl bg-cyan-300 px-4 py-3 text-sm font-semibold text-slate-950">Connect wallet</button>
        <button type="button" onClick={() => void switchNetwork()} className="rounded-xl border border-white/15 px-4 py-3 text-sm font-semibold text-white">Switch network</button>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
        {connectedOnSelected ? <CheckCircle2 className="h-4 w-4 text-emerald-300" /> : <XCircle className="h-4 w-4 text-amber-300" />}
        <span className="text-white/70">{status}</span>
        {address ? <span className="font-mono text-xs text-cyan-100">{address.slice(0, 6)}…{address.slice(-4)}</span> : null}
      </div>
      {address ? <>
        <div className="mt-4 border-t border-white/10 pt-4"><div className="flex flex-wrap items-center justify-between gap-3 text-sm"><span className="text-white/55">{selected.environment === "mainnet" ? "Mainnet balances" : "Testnet balance"}</span><span className="font-mono text-white">{balanceLoading ? "Loading…" : nativeBalance ?? "—"}</span><button type="button" onClick={() => void refreshBalance()} disabled={balanceLoading} className="border border-white/15 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">Refresh balance</button></div>{selected.usdcAddress ? <div className="mt-2 flex items-center justify-between gap-3 text-xs text-white/55"><span>USDC</span><span className="font-mono text-white/80">{balanceLoading ? "Loading…" : usdcBalance ?? "—"}</span></div> : null}</div>
        <div className="mt-5 border-t border-white/10 pt-5">
          <div className="text-sm font-semibold text-white">Send from this wallet</div>
          <p className="mt-1 text-xs leading-5 text-white/55">The browser prepares the request. Your wallet remains the only signer.</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-[150px_1fr]">
            <select aria-label="Transfer asset" value={transferAsset} onChange={(event) => { setTransferAsset(event.target.value as "native" | "usdc"); setReviewConfirmed(false); }} className="rounded-xl border border-white/10 bg-[#0b1421] px-3 py-3 text-sm text-white">
              <option value="native">{selected.currency}</option>
              {selected.usdcAddress ? <option value="usdc">USDC</option> : null}
            </select>
            <input aria-label="Transfer amount" inputMode="decimal" value={transferAmount} onChange={(event) => { setTransferAmount(event.target.value); setReviewConfirmed(false); }} placeholder="Amount" className="rounded-xl border border-white/10 bg-[#0b1421] px-3 py-3 text-sm text-white placeholder:text-white/35" />
          </div>
          <input aria-label="Transfer recipient" value={transferRecipient} onChange={(event) => { setTransferRecipient(event.target.value); setReviewConfirmed(false); }} placeholder="Recipient 0x address" className="mt-3 w-full rounded-xl border border-white/10 bg-[#0b1421] px-3 py-3 font-mono text-sm text-white placeholder:font-sans placeholder:text-white/35" />
          <div className="mt-3 border border-white/10 bg-black/10 p-3 text-xs text-white/65"><div className="flex flex-wrap justify-between gap-2"><span>Network</span><strong className="text-white">{selected.label}</strong></div><div className="mt-1 flex flex-wrap justify-between gap-2"><span>Asset / amount</span><strong className="text-white">{transferAsset === "usdc" ? "USDC" : selected.currency} {transferAmount || "—"}</strong></div><div className="mt-1 flex flex-wrap justify-between gap-2"><span>Recipient</span><strong className="max-w-[70%] truncate font-mono text-white">{transferRecipient || "—"}</strong></div></div>
          <label className="mt-3 flex items-start gap-2 text-xs leading-5 text-white/70"><input type="checkbox" checked={reviewConfirmed} onChange={(event) => setReviewConfirmed(event.target.checked)} className="mt-1" /> I reviewed the network, recipient, asset, and amount. The next step will open my wallet for approval.</label>
          <button type="button" onClick={() => void sendTransfer()} disabled={!connectedOnSelected || Boolean(transferHash && transferStatus?.startsWith("Submitted")) || !reviewConfirmed || !transferAmount || !transferRecipient} className="mt-3 w-full rounded-xl bg-cyan-300 px-4 py-3 text-sm font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-40">Review and request signature</button>
          {transferStatus ? <p className="mt-3 text-xs leading-5 text-emerald-200">{transferStatus}{transferHash ? <> {" "}<a href={`${selected.explorer}/tx/${transferHash}`} target="_blank" rel="noreferrer" className="underline underline-offset-2">Open receipt</a></> : null}</p> : null}
        </div>
      </> : null}
      {error ? <p className="mt-3 text-sm leading-6 text-rose-200">{error}</p> : null}
    </section>
  );
}
