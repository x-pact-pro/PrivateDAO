import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Code2 } from "lucide-react";

import { OperationsShell } from "@/components/operations-shell";
import { buttonVariants } from "@/components/ui/button";
import { buildRouteMetadata } from "@/lib/route-metadata";
import { cn } from "@/lib/utils";

export const metadata: Metadata = buildRouteMetadata({
  title: "TxLINE Settlement API",
  description: "Developer reference for PrivateDAO Match Settlement over TxLINE match data, Blind Policy proofs, and Solana receipt anchoring.",
  path: "/developers/txline-settlement-api",
  keywords: ["TxLINE API", "TxODDS", "prediction market settlement", "Solana memo receipt"],
});

const endpoints = [
  ["GET", "/api/v1/txline/status", "Shows provider mode, TxLINE configuration boundary, proof system, and Solana receipt cluster."],
  ["GET", "/api/v1/txline/matches", "Returns TxLINE matches when TXLINE_API_TOKEN is configured, otherwise clearly labeled simulated World Cup data."],
  ["POST", "/api/v1/txline/resolve", "Resolves a final match market and issues a Blind Settlement proof package."],
  ["POST", "/api/v1/txline/verify", "Verifies Groth16 proof material and recomputes the settlement receipt hash."],
  ["POST", "/api/v1/txline/onchain-receipt", "Stores only settlement hashes in a Solana Memo receipt and returns an Explorer link."],
] as const;

const fields = [
  "proofId",
  "nonce",
  "matchId",
  "marketId",
  "txlineSnapshotHash",
  "txlineProofHash",
  "settlementPolicyCommitment",
  "outcomeCommitment",
  "inputCommitment",
  "circuitId",
  "circuitVersion",
  "policyVersion",
  "issuedAt",
  "expiresAt",
  "groth16Proof",
  "verificationKeyHash",
  "originalProofHash",
] as const;

export default function TxlineSettlementApiPage() {
  return (
    <OperationsShell
      eyebrow="Developers"
      title="TxLINE Settlement API"
      description="Integrate TxLINE match data with PrivateDAO Blind Settlement proofs and Solana receipt anchoring."
      navigationMode="focused"
      badges={[
        { label: "TxLINE provider boundary", variant: "cyan" },
        { label: "Groth16 verification", variant: "violet" },
        { label: "Solana Memo receipt", variant: "success" },
      ]}
    >
      <section className="rounded-[28px] border border-white/10 bg-white/[0.035] p-5 sm:p-6">
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.25em] text-white/42">
          <Code2 className="h-4 w-4" />
          Endpoint map
        </div>
        <div className="mt-5 grid gap-3">
          {endpoints.map(([method, path, copy]) => (
            <article key={path} className="grid gap-3 rounded-2xl border border-white/10 bg-black/22 p-4 md:grid-cols-[0.12fr_0.34fr_0.54fr]">
              <div className="font-mono text-sm font-semibold text-cyan-100">{method}</div>
              <div className="break-all font-mono text-sm text-white">{path}</div>
              <p className="text-sm leading-6 text-white/60">{copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-[28px] border border-cyan-300/16 bg-cyan-300/[0.055] p-5 sm:p-6">
        <div className="text-[11px] uppercase tracking-[0.25em] text-cyan-100/76">Proof package</div>
        <h2 className="mt-3 text-2xl font-semibold text-white">Fields returned by `/resolve`.</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {fields.map((field) => (
            <span key={field} className="rounded-full border border-white/10 bg-black/24 px-3 py-1 text-xs font-mono text-white/70">
              {field}
            </span>
          ))}
        </div>
      </section>

      <section className="rounded-[28px] border border-violet-300/16 bg-violet-300/[0.06] p-5 sm:p-6">
        <div className="text-[11px] uppercase tracking-[0.25em] text-violet-100/76">Example</div>
        <pre className="mt-4 overflow-auto rounded-2xl border border-white/10 bg-black/30 p-4 text-xs leading-6 text-white/62">
{`const matches = await fetch("/api/v1/txline/matches").then(r => r.json());
const proof = await fetch("/api/v1/txline/resolve", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    matchId: matches.matches[0].matchId,
    marketId: "worldcup-winner-market"
  })
}).then(r => r.json());

const verification = await fetch("/api/v1/txline/verify", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ publicProofPackage: proof.publicProofPackage })
}).then(r => r.json());`}
        </pre>
        <div className="mt-5 flex flex-wrap gap-3">
          <a href="/txline-settlement-openapi.json" className={cn(buttonVariants({ size: "sm" }))}>
            Download OpenAPI JSON
          </a>
          <Link href="/txline-settlement" className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>
            Run product demo
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link href="/documents/txline-settlement-architecture" className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>
            Architecture
          </Link>
        </div>
      </section>
    </OperationsShell>
  );
}
