import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Code2, ShieldCheck } from "lucide-react";

import { BlindPolicyDemo } from "@/components/blind-policy-demo";
import { OperationsShell } from "@/components/operations-shell";
import { buttonVariants } from "@/components/ui/button";
import { blindPolicyAdoptionSignals, blindPolicyArchitectureSteps, blindPolicyBenchmark } from "@/lib/blind-policy-enterprise";
import { blindPolicyVerificationPricing } from "@/lib/proof-workflows";
import { buildRouteMetadata } from "@/lib/route-metadata";
import { cn } from "@/lib/utils";

export const metadata: Metadata = buildRouteMetadata({
  title: "Blind Verification",
  description:
    "PrivateDAO Blind Verification proves that a private decision policy was satisfied without exposing customer data, policy inputs, thresholds, or internal rules.",
  path: "/proof-workflows/blind-policy",
  keywords: ["blind verification", "private policy verification", "underwriting proof", "audit-ready decision proof"],
});

const outcomes = [
  "A customer or case is checked against a private policy.",
  "The sensitive inputs stay hidden.",
  "The organization receives a decision and a proof receipt.",
  "A third party can verify the process without seeing private data.",
] as const;

const useCases = [
  ["Lending", "Prove underwriting or credit-limit checks happened without exposing earnings or thresholds."],
  ["Compliance", "Prove required checks were completed without exposing documents or review notes."],
  ["Business decisions", "Prove a review policy was followed without exposing internal scoring or sensitive case data."],
  ["Private identity", "A KYC or KYB provider supplies the attestation while the proof shows what was checked, who issued it, and whether it remains valid."],
] as const;

const verificationKeyHash = "05aeb7e27479d7f1551b0c2e18134c58f760de43f2ff085a8ea2e82f212209eb";

const technicalVerificationNotes = [
  ["Circuit", "`private_dao_blind_policy_overlay.circom` is the current Circom/Groth16 circuit."],
  [
    "Constraints",
    "The circuit proves membership is true, three private records are positive, the average capacity threshold is satisfied, liabilities stay within the policy envelope, risk score meets the floor, and Poseidon commitments bind the policy and inputs.",
  ],
  [
    "Witness generation",
    "The API writes private inputs to a temporary witness input, runs `generate_witness.js` with the compiled WASM, then runs `snarkjs groth16 prove`.",
  ],
  [
    "Proving key",
    "The proving key is the server-side `private_dao_blind_policy_overlay_final.zkey`; it is not sent to the browser or verifier.",
  ],
  ["Verification key", `The verification key is fixed for circuit version groth16-v1. verificationKeyHash: ${verificationKeyHash}.`],
  [
    "Replay protection",
    "The public package binds `proofId`, `nonce`, `issuedAt`, `expiresAt`, `circuitVersion`, `policyVersion`, `policyCommitment`, and `inputCommitment` into the original proof hash.",
  ],
  [
    "Policy changes",
    "A policy cannot be changed after proof issuance. Changing `policyVersion` changes the policy salt and produces a new `policyCommitment`.",
  ],
  ["Versioning", "The current public version pair is `circuitId=private_dao_blind_policy_overlay` and `circuitVersion=groth16-v1`."],
  [
    "Solana receipt registry",
    "After Groth16 verification passes, the API attempts an Anchor PDA receipt and falls back to a Solana Memo receipt transaction if the Anchor program path is unavailable. The response labels the storage mode.",
  ],
  [
    "Proof scope",
    "The public record identifies the proof version, policy scope, issuer, timestamp, and validity window so a reviewer knows exactly what was checked.",
  ],
] as const;

export default function BlindPolicyVerificationPage() {
  return (
    <OperationsShell
      eyebrow="Blind Verification"
      title="Prove a private decision was made correctly."
      description="For teams that need audit-ready proof without revealing customer data, internal rules, or sensitive policy inputs."
      navigationMode="focused"
      badges={[
        { label: "Customer-ready", variant: "success" },
        { label: "Private inputs hidden", variant: "violet" },
        { label: "Public proof receipt", variant: "cyan" },
      ]}
    >
      <section className="grid gap-4 lg:grid-cols-[1fr_0.85fr]">
        <article className="rounded-[28px] border border-white/10 bg-white/[0.035] p-5 sm:p-6">
          <div className="text-[11px] uppercase tracking-[0.25em] text-emerald-100/78">What it does</div>
          <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-white">
            Verify the decision without exposing how it was made.
          </h2>
          <p className="mt-4 text-sm leading-7 text-white/66">
            Blind Verification lets an organization run a private policy over sensitive inputs, issue a decision, and
            publish a proof receipt that shows the process was followed. The verifier sees proof, not private data.
          </p>
          <div className="mt-5 grid gap-3">
            {outcomes.map((item) => (
              <div key={item} className="flex gap-3 rounded-2xl border border-emerald-300/14 bg-emerald-300/[0.06] p-3 text-sm leading-6 text-white/72">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-100" />
                {item}
              </div>
            ))}
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <a href="#run" className={cn(buttonVariants({ size: "sm" }))}>
              Run Workflow
              <ArrowRight className="h-4 w-4" />
            </a>
            <Link href="/contact" className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>
              Talk to PrivateDAO
            </Link>
          </div>
        </article>

        <article className="rounded-[28px] border border-violet-300/16 bg-violet-300/[0.06] p-5 sm:p-6">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.25em] text-violet-100/78">
            <ShieldCheck className="h-4 w-4" />
            Why buyers care
          </div>
          <div className="mt-5 grid gap-4">
            <div>
              <div className="text-sm font-semibold text-white">Problem</div>
              <p className="mt-2 text-sm leading-7 text-white/62">
                Auditors, partners, and customers need confidence that a decision was made correctly. But exposing raw
                data and internal rules creates privacy, compliance, and competitive risk.
              </p>
            </div>
            <div>
              <div className="text-sm font-semibold text-white">PrivateDAO answer</div>
              <p className="mt-2 text-sm leading-7 text-white/62">
                Keep the decision process private. Publish a proof receipt that can be checked independently.
              </p>
            </div>
          </div>
        </article>
      </section>

      <section id="run">
        <BlindPolicyDemo />
      </section>

      <section id="identity-verification" className="enterprise-card rounded-[28px] p-5 sm:p-6">
        <div className="text-[11px] uppercase tracking-[0.25em] text-[#175cd3]">Private Identity Verification</div>
        <h2 className="mt-3 text-2xl font-semibold text-[#10233f]">Prove who you are. Not everything about you.</h2>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-[#5d6d82]">A KYC or KYB provider remains the source of the attestation. PrivateDAO keeps the proof focused on the requirement, its issuer, and whether it is still valid.</p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {["KYC completed: VERIFIED", "Age requirement: VERIFIED", "Jurisdiction requirement: VERIFIED", "Required business verification: VERIFIED", "Entity verification completed: VERIFIED", "Authorized representative: VERIFIED"].map((claim) => <div key={claim} className="flex items-center gap-2 rounded-2xl border border-[#dce5f0] bg-[#f7f9fc] p-4 text-sm font-semibold text-[#10233f]"><CheckCircle2 className="h-4 w-4 shrink-0 text-[#175cd3]" />{claim}</div>)}
        </div>
        <div className="mt-5 grid gap-3 text-sm sm:grid-cols-3">
          {["Issued by: attestation provider", "Scope: selected requirements", "Validity: visible and reviewable"].map((item) => <div key={item} className="rounded-2xl border border-[#dce5f0] p-4 text-[#5d6d82]">{item}</div>)}
        </div>
      </section>

      <details className="enterprise-advanced-details rounded-[24px] border border-[#dce5f0] bg-[#f7f9fc] p-5 sm:p-6">
        <summary className="cursor-pointer text-sm font-semibold text-[#10233f]">For technical reviewers</summary>
        <div className="mt-5 space-y-8">
      <section className="rounded-[28px] border border-emerald-300/16 bg-emerald-300/[0.06] p-5 sm:p-6">
        <div className="text-[11px] uppercase tracking-[0.25em] text-emerald-100/76">What is cryptographically real today</div>
        <h2 className="mt-3 text-2xl font-semibold text-white">Groth16 is the live proof system.</h2>
        <div className="mt-5 grid gap-3 lg:grid-cols-3">
          {[
            ["Real proof", "The API generates a witness, runs snarkjs Groth16 prove, then verifies the proof before issuing a receipt."],
            ["Public verifier data", "The receipt includes proof, public signals, verification key, verification key hash, policy commitment, and input commitment."],
            ["Solana receipt", "A verified proof package can be anchored as a Solana PDA receipt with Explorer links for the receipt account and transaction."],
            ["Clear boundary", "REFHE, Ika / Encrypt, and MagicBlock are commitment lanes here unless a separate provider receipt is attached."],
          ].map(([title, copy]) => (
            <article key={title} className="rounded-2xl border border-white/10 bg-black/22 p-4">
              <div className="text-base font-semibold text-white">{title}</div>
              <p className="mt-2 text-sm leading-6 text-white/62">{copy}</p>
            </article>
          ))}
        </div>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link href="/developers/blind-policy-api" className={cn(buttonVariants({ size: "sm" }))}>
            Inspect API proof package
            <Code2 className="h-4 w-4" />
          </Link>
          <Link href="/documents/blind-policy-enterprise-readiness" className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>
            Enterprise readiness
          </Link>
          <a href="https://api.privatedao.org/api/v1/proof-workflows/blind-policy/status" className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>
            Open live proof status
          </a>
        </div>
      </section>

      <section className="rounded-[28px] border border-white/10 bg-white/[0.035] p-5 sm:p-6">
        <div className="text-[11px] uppercase tracking-[0.25em] text-white/42">Technical Verification Notes</div>
        <h2 className="mt-3 text-2xl font-semibold text-white">What a technical customer can verify.</h2>
        <div className="mt-5 grid gap-3 lg:grid-cols-3">
          {technicalVerificationNotes.map(([title, copy]) => (
            <article key={title} className="rounded-2xl border border-white/10 bg-black/22 p-4">
              <div className="text-sm font-semibold text-white">{title}</div>
              <p className="mt-2 text-sm leading-6 text-white/62">{copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-[28px] border border-white/10 bg-white/[0.035] p-5 sm:p-6">
        <div className="text-[11px] uppercase tracking-[0.25em] text-white/42">Architecture</div>
        <h2 className="mt-3 text-2xl font-semibold text-white">The verification path in one line.</h2>
        <div className="mt-5 grid gap-3 lg:grid-cols-6">
          {blindPolicyArchitectureSteps.map(([title, copy], index) => (
            <article key={title} className="rounded-2xl border border-white/10 bg-black/22 p-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-full border border-violet-200/20 bg-violet-300/[0.1] text-sm font-semibold text-violet-50">
                {index + 1}
              </div>
              <div className="mt-3 text-sm font-semibold text-white">{title}</div>
              <p className="mt-2 text-xs leading-5 text-white/56">{copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <article className="rounded-[28px] border border-cyan-300/16 bg-cyan-300/[0.055] p-5 sm:p-6">
          <div className="text-[11px] uppercase tracking-[0.25em] text-cyan-100/76">Benchmarks</div>
          <h2 className="mt-3 text-2xl font-semibold text-white">Measured verification performance.</h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {[
              ["Proof receipt build", `${blindPolicyBenchmark.proofPackageBuildMs} ms`],
              ["Hash recompute", `${blindPolicyBenchmark.proofHashRecomputeAvgMs} ms avg`],
              ["Receipt verification", `${blindPolicyBenchmark.localReceiptVerificationAvgMs} ms avg`],
              ["Groth16 verification", `${blindPolicyBenchmark.groth16VerificationAvgMs} ms avg`],
              ["Verification capacity", `${blindPolicyBenchmark.maxProofsPerSecondEstimate} / sec est.`],
              ["Runs", `${blindPolicyBenchmark.runs} local runs`],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl border border-white/10 bg-black/22 p-4">
                <div className="text-[11px] uppercase tracking-[0.2em] text-white/40">{label}</div>
                <div className="mt-2 text-lg font-semibold text-white">{value}</div>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs leading-6 text-white/48">{blindPolicyBenchmark.note}</p>
        </article>

        <article className="rounded-[28px] border border-violet-300/16 bg-violet-300/[0.06] p-5 sm:p-6">
          <div className="text-[11px] uppercase tracking-[0.25em] text-violet-100/76">Adoption signals</div>
          <h2 className="mt-3 text-2xl font-semibold text-white">Built for real pilot conversations.</h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {blindPolicyAdoptionSignals.map(([title, copy]) => (
              <div key={title} className="rounded-2xl border border-white/10 bg-black/22 p-4">
                <div className="font-semibold text-white">{title}</div>
                <p className="mt-2 text-sm leading-6 text-white/60">{copy}</p>
              </div>
            ))}
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/developers/blind-policy-api" className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>
              <Code2 className="h-4 w-4" />
              Developer API
            </Link>
            <Link href="/developers/blind-policy-sdk" className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>
              SDK surface
            </Link>
          </div>
        </article>
      </section>

      </div>
      </details>

      <section className="rounded-[28px] border border-white/10 bg-white/[0.035] p-5 sm:p-6">
        <div className="text-[11px] uppercase tracking-[0.25em] text-white/42">Use cases</div>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {useCases.map(([title, copy]) => (
            <div key={title} className="rounded-2xl border border-white/10 bg-black/18 p-4">
              <div className="font-semibold text-white">{title}</div>
              <p className="mt-2 text-sm leading-6 text-white/60">{copy}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-[28px] border border-emerald-300/16 bg-emerald-300/[0.06] p-5 sm:p-6">
        <div className="text-[11px] uppercase tracking-[0.25em] text-emerald-100/76">Commercial packages</div>
        <h2 className="mt-3 text-2xl font-semibold text-white">Sell it as a focused verification product.</h2>
        <div className="mt-5 grid gap-3 lg:grid-cols-3">
          {blindPolicyVerificationPricing.map((plan) => (
            <article key={plan.plan} className="rounded-2xl border border-white/10 bg-black/22 p-4">
              <div className="text-base font-semibold text-white">{plan.plan}</div>
              <div className="mt-2 text-sm font-semibold text-emerald-100">{plan.price}</div>
              <div className="mt-4 grid gap-2">
                {plan.includes.map((item) => (
                  <div key={item} className="text-sm leading-6 text-white/62">{item}</div>
                ))}
              </div>
            </article>
          ))}
        </div>
        <div className="mt-5 flex flex-wrap gap-3">
          <a href="mailto:fahd@privatedao.org?subject=PrivateDAO%20Blind%20Verification%20Pilot" className={cn(buttonVariants({ size: "sm" }))}>
            Request Pilot
            <ArrowRight className="h-4 w-4" />
          </a>
          <Link href="/payment-gate" className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>
            Try a sample check
          </Link>
        </div>
      </section>
    </OperationsShell>
  );
}
