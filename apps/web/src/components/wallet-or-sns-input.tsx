"use client";

import { useState } from "react";
import { Connection, clusterApiUrl } from "@solana/web3.js";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type WalletOrSnsInputProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
};

export function normalizeSnsDomain(input: string) {
  const trimmed = input.trim().toLowerCase();
  if (!trimmed) return "";
  return trimmed.endsWith(".sol") ? trimmed : `${trimmed}.sol`;
}

export function isSnsName(value: string) {
  return value.trim().toLowerCase().endsWith(".sol");
}

export async function resolveSnsName(domainInput: string) {
  const normalizedDomain = normalizeSnsDomain(domainInput);
  if (!normalizedDomain) throw new Error("Enter a .sol domain first.");

  const [{ resolve }] = await Promise.all([import("@bonfida/spl-name-service")]);
  const connection = new Connection(process.env.NEXT_PUBLIC_SOLANA_MAINNET_RPC_URL?.trim() || clusterApiUrl("mainnet-beta"), "confirmed");
  const publicKey = await resolve(connection, normalizedDomain);
  return {
    domain: normalizedDomain,
    address: publicKey.toBase58(),
  };
}

export function WalletOrSnsInput({ label, value, onChange, placeholder, className }: WalletOrSnsInputProps) {
  const [status, setStatus] = useState("Raw Solana address or .sol SNS name accepted.");
  const [running, setRunning] = useState(false);

  async function handleResolve() {
    setRunning(true);
    setStatus("Resolving SNS name on Solana mainnet...");
    try {
      const result = await resolveSnsName(value);
      onChange(result.address);
      setStatus(`${result.domain} resolved. The resolved wallet is now staged for this operation.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "SNS lookup failed.");
    } finally {
      setRunning(false);
    }
  }

  return (
    <label className={cn("space-y-2 text-sm text-white/70", className)}>
      <div>{label}</div>
      <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_auto]">
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none"
          placeholder={placeholder ?? "wallet.sol or Solana wallet address"}
        />
        <button
          type="button"
          onClick={() => void handleResolve()}
          disabled={running || !isSnsName(value)}
          className={cn(buttonVariants({ size: "sm", variant: "outline" }), "min-h-[44px]")}
        >
          {running ? "Resolving..." : "Resolve SNS"}
        </button>
      </div>
      <div className="text-xs leading-5 text-white/48">{status}</div>
    </label>
  );
}
