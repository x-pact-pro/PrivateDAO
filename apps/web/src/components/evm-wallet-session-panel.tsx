"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, Wallet, XCircle } from "lucide-react";

type EvmNetwork = {
  id: string;
  label: string;
  chainId: number;
  currency: string;
  rpcUrl: string;
  explorer: string;
};

const EVM_NETWORKS: readonly EvmNetwork[] = [
  { id: "ethereum-sepolia", label: "Ethereum Sepolia", chainId: 11155111, currency: "ETH", rpcUrl: "https://ethereum-sepolia-rpc.publicnode.com", explorer: "https://sepolia.etherscan.io" },
  { id: "arbitrum-sepolia", label: "Arbitrum Sepolia", chainId: 421614, currency: "ETH", rpcUrl: "https://sepolia-rollup.arbitrum.io/rpc", explorer: "https://sepolia.arbiscan.io" },
  { id: "base-sepolia", label: "Base Sepolia", chainId: 84532, currency: "ETH", rpcUrl: "https://sepolia.base.org", explorer: "https://sepolia.basescan.org" },
  { id: "bnb-testnet", label: "BNB Smart Chain Testnet", chainId: 97, currency: "tBNB", rpcUrl: "https://data-seed-prebsc-1-s1.bnbchain.org:8545", explorer: "https://testnet.bscscan.com" },
  { id: "robinhood-testnet", label: "Robinhood Chain Testnet", chainId: 46630, currency: "ETH", rpcUrl: "https://rpc.testnet.chain.robinhood.com", explorer: "https://explorer.testnet.chain.robinhood.com" },
  { id: "hyperliquid-testnet", label: "Hyperliquid HyperEVM Testnet", chainId: 998, currency: "HYPE", rpcUrl: "https://rpc.hyperliquid-testnet.xyz/evm", explorer: "https://www.hyperscan.com" },
  { id: "tempo-testnet", label: "Tempo Testnet", chainId: 42431, currency: "USD", rpcUrl: "https://rpc.moderato.tempo.xyz", explorer: "https://explore.testnet.tempo.xyz" },
];

function getProvider(): PrivateDaoEip1193Provider | null {
  if (typeof window === "undefined" || !window.ethereum) return null;
  return window.ethereum.providers?.[0] ?? window.ethereum;
}

function toChainHex(chainId: number) {
  return `0x${chainId.toString(16)}`;
}

export function EvmWalletSessionPanel() {
  const [selectedId, setSelectedId] = useState(EVM_NETWORKS[0].id);
  const [address, setAddress] = useState<string | null>(null);
  const [activeChainId, setActiveChainId] = useState<string | null>(null);
  const [status, setStatus] = useState("Choose a network when you are ready to connect.");
  const [error, setError] = useState<string | null>(null);
  const selected = useMemo(() => EVM_NETWORKS.find((network) => network.id === selectedId) ?? EVM_NETWORKS[0], [selectedId]);

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
      setStatus(chain.toLowerCase() === toChainHex(selected.chainId).toLowerCase() ? `${selected.label} is ready for this session.` : "Wallet connected. Switch to the selected network before signing.");
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
      setStatus(`${selected.label} is ready for this session.`);
    } catch (cause) {
      const code = typeof cause === "object" && cause !== null && "code" in cause ? (cause as { code?: number }).code : undefined;
      if (code === 4902) {
        try {
          await provider.request({
            method: "wallet_addEthereumChain",
            params: [{ chainId: toChainHex(selected.chainId), chainName: selected.label, nativeCurrency: { name: selected.currency, symbol: selected.currency, decimals: 18 }, rpcUrls: [selected.rpcUrl], blockExplorerUrls: [selected.explorer] }],
          });
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

  const connectedOnSelected = activeChainId?.toLowerCase() === toChainHex(selected.chainId).toLowerCase();

  return (
    <section className="mt-8 rounded-3xl border border-white/10 bg-white/[0.035] p-5 sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-200/80">Wallet session</div>
          <h2 className="mt-2 text-xl font-semibold text-white">Connect through the network your organization chooses.</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-white/60">This check only confirms wallet access and network selection. No transaction is created or signed here.</p>
        </div>
        <Wallet className="h-6 w-6 text-cyan-200" />
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto_auto]">
        <select value={selectedId} onChange={(event) => setSelectedId(event.target.value)} className="rounded-xl border border-white/10 bg-[#0b1421] px-3 py-3 text-sm text-white outline-none focus:border-cyan-200/60">
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
      {error ? <p className="mt-3 text-sm leading-6 text-rose-200">{error}</p> : null}
    </section>
  );
}
