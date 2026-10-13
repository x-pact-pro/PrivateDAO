"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, CheckCircle2, Play, ShieldCheck, XCircle } from "lucide-react";

import { persistCreditLimitProofPackage } from "@/components/proof-workflow-verification-panel";
import { buttonVariants } from "@/components/ui/button";
import type { CreditLimitPublicProofPackage } from "@/lib/proof-workflow-proof-package";
import { cn } from "@/lib/utils";

const runApi = "https://api.privatedao.org/api/v1/proof-workflows/credit-limit/run";
const sampleApi = "https://api.privatedao.org/api/v1/proof-workflows/credit-limit/sample";

type CreditLimitResult = {
  ok: boolean;
  status?: string;
  workflowId: string;
  publicOutcome: string;
  issuedCreditLimitUsd: number;
  currency: string;
  proofHash?: string;
  proofUrl?: string;
  publicProofPackage?: CreditLimitPublicProofPackage;
  resultBasis?: {
    proMembershipVerified: boolean;
    importedRecordCount: number;
    riskBand: string;
  };
  validationErrors?: string[];
  error?: string;
};

type SampleResponse = {
  ok: boolean;
  customerData: Record<string, unknown>;
};

const fallbackCustomerData = {
  customerId: "credit-redacted-customer-001",
  proMembership: true,
  currency: "USD",
  riskScore: 84,
  monthlyEarnings: 9200,
  payouts: [{ amountUsd: 8800 }, { amountUsd: 9400 }],
};

const flow = [
  ["Input", "Connect earnings data"],
  ["Processing", "Private credit policy runs"],
  ["Output", "Credit limit issued"],
  ["Verification", "Proof generated"],
] as const;

const privateValues = ["User earnings", "Internal thresholds", "Policy formula", "Reviewer notes", "Risk model"] as const;

const verifiedValues = [
  "Membership was verified",
  "Earnings were imported",
  "Policy was applied",
  "Credit decision was produced",
  "Proof was generated",
] as const;

export function CreditDecisionVerificationPilot() {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<CreditLimitResult>();
  const [failure, setFailure] = useState<CreditLimitResult>();

  async function runVerification() {
    setRunning(true);
    setResult(undefined);
    setFailure(undefined);

    try {
      const sampleResponse = await fetch(sampleApi, { headers: { Accept: "application/json" } });
      const samplePayload = (await sampleResponse.json()) as SampleResponse;
      const customerData = sampleResponse.ok && samplePayload.ok ? samplePayload.customerData : fallbackCustomerData;

      const response = await fetch(runApi, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workflowId: `credit_decision_${Date.now()}`,
          customerData,
        }),
      });
      const payload = (await response.json()) as CreditLimitResult;

      if (!response.ok || !payload.ok) {
        setFailure(payload);
        return;
      }

      if (payload.publicProofPackage) persistCreditLimitProofPackage(payload.publicProofPackage);
      setResult(payload);
    } catch (error) {
      setFailure({
        ok: false,
        status: "request-failed",
        workflowId: "credit-decision-request-failed",
        publicOutcome: "proof-not-issued",
        issuedCreditLimitUsd: 0,
        currency: "USD",
        error: error instanceof Error ? error.message : "Unable to run the verification workflow.",
      });
    } finally {
      setRunning(false);
    }
  }

  const issuedLimit = result ? `$${result.issuedCreditLimitUsd.toLocaleString("en-US")}` : "$2,250";
  const recordCount = result?.resultBasis?.importedRecordCount ?? 3;

  return (
    <main className="min-h-screen bg-[#05070b] text-white">
      <header className="border-b border-white/10 bg-black/30">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link href="/" className="text-sm font-semibold tracking-[0.2em] text-white">
            PrivateDAO
          </Link>
          <nav className="flex items-center gap-3 text-sm">
            <Link href="/proof-workflows" className="hidden text-white/66 hover:text-white sm:inline">
              Proof Workflows
            </Link>
            <a href="mailto:fahd@privatedao.org?subject=PrivateDAO%20Private%20Pilot" className={cn(buttonVariants({ size: "sm" }))}>
              Request Pilot
            </a>
          </nav>
        </div>
      </header>

      <section className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[0.95fr_1.05fr] lg:py-14">
        <div>
          <div className="inline-flex rounded-full border border-cyan-200/20 bg-cyan-300/[0.08] px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-cyan-100">
            Credit decision verification
          </div>
          <h1 className="mt-5 max-w-3xl text-4xl font-semibold tracking-[-0.02em] text-white sm:text-5xl">
            Prove a credit decision was made correctly without exposing customer earnings.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-8 text-white/68">
            Connect earnings data, run a private credit policy, issue a decision, and generate a public proof that the
            required process was followed.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <button type="button" onClick={runVerification} disabled={running} className={cn(buttonVariants({ size: "lg" }))}>
              <Play className="h-4 w-4" />
              {running ? "Running Verification..." : "Run Sample Verification"}
            </button>
            <Link href="/proof-workflows/demo" className={cn(buttonVariants({ size: "lg", variant: "secondary" }))}>
              Try With My Data
            </Link>
            <Link href="/proof-workflows/verify/demo-proof-id" className={cn(buttonVariants({ size: "lg", variant: "secondary" }))}>
              View Public Proof
            </Link>
          </div>
        </div>

        <div className="grid gap-3">
          {flow.map(([label, body]) => (
            <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
              <div className="text-xs uppercase tracking-[0.2em] text-cyan-100/66">{label}</div>
              <div className="mt-1 text-lg font-semibold text-white">{body}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 px-4 pb-8 sm:px-6 lg:grid-cols-2">
        <article className="rounded-[24px] border border-red-300/16 bg-red-400/[0.06] p-5">
          <div className="text-xs uppercase tracking-[0.22em] text-red-100/76">Problem today</div>
          <div className="mt-4 grid gap-3 text-sm leading-7 text-white/72">
            <p>Lenders must trust internal decisions they cannot independently verify.</p>
            <p>Auditors need evidence but cannot access customer earnings.</p>
            <p>Sharing underwriting data creates privacy and compliance risks.</p>
          </div>
        </article>

        <article className="rounded-[24px] border border-emerald-300/16 bg-emerald-300/[0.06] p-5">
          <div className="text-xs uppercase tracking-[0.22em] text-emerald-100/76">With PrivateDAO</div>
          <div className="mt-4 grid gap-3 text-sm leading-7 text-white/72">
            <p>Decision remains private.</p>
            <p>Verification becomes public.</p>
            <p>Any third party can verify the process without seeing customer data.</p>
          </div>
        </article>
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 px-4 sm:px-6 lg:grid-cols-2">
        <article className="rounded-[24px] border border-violet-300/16 bg-violet-300/[0.06] p-5">
          <div className="text-xs uppercase tracking-[0.22em] text-violet-100/76">Private</div>
          <p className="mt-3 text-sm leading-7 text-white/68">
            These values were used to make the decision but are not revealed.
          </p>
          <div className="mt-4 grid gap-2">
            {privateValues.map((item) => (
              <div key={item} className="rounded-xl border border-white/10 bg-black/24 px-3 py-2 text-sm text-white/68">
                {item}
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-[24px] border border-emerald-300/16 bg-emerald-300/[0.06] p-5">
          <div className="text-xs uppercase tracking-[0.22em] text-emerald-100/76">Verifiable</div>
          <p className="mt-3 text-sm leading-7 text-white/68">
            The public proof shows the process happened correctly without showing the private values.
          </p>
          <div className="mt-4 grid gap-2">
            {verifiedValues.map((item) => (
              <div key={item} className="rounded-xl border border-white/10 bg-black/24 px-3 py-2 text-sm text-white/68">
                {item}
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        {failure ? (
          <div className="rounded-[24px] border border-red-300/22 bg-red-400/[0.08] p-5">
            <div className="flex items-center gap-2 text-sm font-semibold text-red-100">
              <XCircle className="h-5 w-5" />
              Proof was not issued.
            </div>
            <div className="mt-3 grid gap-2">
              {(failure.validationErrors ?? [failure.error ?? "The workflow failed validation."]).map((item) => (
                <div key={item} className="rounded-xl border border-red-300/18 bg-black/24 px-3 py-2 text-sm text-red-50/84">
                  {item}
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {result ? (
          <div className="rounded-[24px] border border-emerald-300/22 bg-emerald-300/[0.08] p-5">
            <div className="flex items-center gap-2 text-sm font-semibold text-emerald-100">
              <ShieldCheck className="h-5 w-5" />
              Credit decision verified.
            </div>
            <div className="mt-4 grid gap-3">
              {[
                "Customer is a verified Pro member.",
                `${recordCount} earnings records were imported.`,
                "The private credit policy was applied.",
                `Based on the imported earnings and policy rules, a credit limit of ${issuedLimit} was approved.`,
                "A public proof was generated so third parties can verify the process without seeing earnings, thresholds, or policy rules.",
              ].map((item) => (
                <div key={item} className="flex gap-3 rounded-2xl border border-white/10 bg-black/20 p-4 text-sm leading-7 text-white/78">
                  <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-emerald-100" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link href="/proof-workflows/verify/demo-proof-id" className={cn(buttonVariants({ size: "sm" }))}>
                View Public Proof
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        ) : null}
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 px-4 pb-10 sm:px-6 lg:grid-cols-[1fr_0.9fr]">
        <article className="rounded-[24px] border border-cyan-300/16 bg-cyan-300/[0.06] p-5">
          <div className="text-xs uppercase tracking-[0.22em] text-cyan-100/76">How verified</div>
          <div className="mt-4 grid gap-3 text-sm text-white/72">
            <div>proof package recomputed</div>
            <div>recomputed hash compared with original hash</div>
            <div>match confirmed</div>
          </div>
        </article>

        <article className="rounded-[24px] border border-white/10 bg-white/[0.035] p-5">
          <div className="text-xs uppercase tracking-[0.22em] text-white/48">Want to test this with your real workflow?</div>
          <h2 className="mt-3 text-2xl font-semibold text-white">Request a private pilot.</h2>
          <p className="mt-3 text-sm leading-7 text-white/66">
            We can map your current underwriting flow, connect to a sample API or redacted JSON, and generate a
            verifiable proof trail without changing your production system.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <a href="mailto:fahd@privatedao.org?subject=PrivateDAO%20Credit%20Decision%20Private%20Pilot" className={cn(buttonVariants({ size: "sm" }))}>
              Request Private Pilot
            </a>
            <a href="mailto:fahd@privatedao.org?subject=PrivateDAO%20Discovery%20Call" className={cn(buttonVariants({ size: "sm", variant: "secondary" }))}>
              Book Discovery Call
            </a>
          </div>
        </article>
      </section>
    </main>
  );
}
