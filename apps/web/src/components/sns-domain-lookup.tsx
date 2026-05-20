"use client";

import { useState } from "react";

import { buttonVariants } from "@/components/ui/button";
import { normalizeSnsDomain, resolveSnsName } from "@/components/wallet-or-sns-input";
import { cn } from "@/lib/utils";

export function SnsDomainLookup() {
  const [domain, setDomain] = useState("bonfida.sol");
  const [resolvedAddress, setResolvedAddress] = useState("");
  const [status, setStatus] = useState("Enter a .sol name to resolve it before using a raw wallet address.");
  const [running, setRunning] = useState(false);

  async function resolveDomainName() {
    const normalizedDomain = normalizeSnsDomain(domain);
    if (!normalizedDomain) {
      setStatus("Enter a .sol domain first.");
      return;
    }

    setRunning(true);
    setResolvedAddress("");
    setStatus(`Resolving ${normalizedDomain} through SNS on Solana mainnet...`);

    try {
      const { address } = await resolveSnsName(normalizedDomain);
      setResolvedAddress(address);
      setStatus(`${normalizedDomain} resolved to a Solana wallet address. Use this address in Intelligence, Execute, or private settlement inputs.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "SNS lookup failed.");
    } finally {
      setRunning(false);
    }
  }

  return (
    <section className="rounded-[28px] border border-fuchsia-300/16 bg-fuchsia-300/[0.08] p-6">
      <div className="text-[11px] uppercase tracking-[0.28em] text-fuchsia-100/78">SNS identity lookup</div>
      <h2 className="mt-3 text-2xl font-semibold text-white">Use a name.sol identity instead of forcing raw wallet input</h2>
      <p className="mt-3 max-w-4xl text-sm leading-7 text-white/66">
        PrivateDAO resolves Solana Name Service domains locally from the browser before a user moves into counterparty review,
        treasury settlement, or proof. The resolved address is still shown before signing.
      </p>
      <div className="mt-5 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
        <input
          value={domain}
          onChange={(event) => setDomain(event.target.value)}
          className="w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-white outline-none"
          placeholder="example.sol"
        />
        <button type="button" className={cn(buttonVariants({ size: "sm" }))} onClick={() => void resolveDomainName()} disabled={running}>
          {running ? "Resolving..." : "Resolve .sol"}
        </button>
      </div>
      <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4 text-sm leading-7 text-white/70">
        <div>{status}</div>
        {resolvedAddress ? <div className="mt-2 break-all font-mono text-cyan-100">{resolvedAddress}</div> : null}
      </div>
    </section>
  );
}
