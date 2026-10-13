import type { Metadata } from "next";
import Link from "next/link";
import { createHash } from "crypto";

import { BlindPolicyVerificationPanel } from "@/components/blind-policy-verification-panel";
import { ProofWorkflowVerificationPanel } from "@/components/proof-workflow-verification-panel";
import { buttonVariants } from "@/components/ui/button";
import { buildDemoBlindPolicyProofPackage, type BlindPolicyGroth16Proof } from "@/lib/blind-policy-proof";
import { demoProofId } from "@/lib/proof-workflow-demo-data";
import { buildDemoCreditLimitProofPackageWithHash } from "@/lib/proof-workflow-verifier";
import { stableStringify } from "@/lib/proof-workflow-proof-package";
import { buildRouteMetadata } from "@/lib/route-metadata";
import { cn } from "@/lib/utils";
import blindPolicyProof from "@/lib/generated/private_dao_blind_policy_overlay.proof.json";
import blindPolicyPublicSignals from "@/lib/generated/private_dao_blind_policy_overlay.public.json";
import blindPolicyVerificationKey from "@/lib/generated/private_dao_blind_policy_overlay_vkey.json";

type VerifyDemoPageProps = {
  params: Promise<{
    proofId: string;
  }>;
};

export function generateStaticParams() {
  return [{ proofId: demoProofId }, { proofId: "blind-policy-demo" }];
}

function sha256Json(value: unknown) {
  return createHash("sha256").update(stableStringify(value)).digest("hex");
}

function readBlindPolicyGroth16Proof(): BlindPolicyGroth16Proof {
  return {
    provingSystem: "groth16",
    circuit: "private_dao_blind_policy_overlay",
    verificationMode: "groth16-snarkjs",
    verified: true,
    publicSignals: blindPolicyPublicSignals as string[],
    proof: blindPolicyProof,
    verificationKey: blindPolicyVerificationKey,
    proofHash: sha256Json(blindPolicyProof),
    publicSignalsHash: sha256Json(blindPolicyPublicSignals),
    verificationKeyHash: sha256Json(blindPolicyVerificationKey),
  };
}

export async function generateMetadata({ params }: VerifyDemoPageProps): Promise<Metadata> {
  const { proofId } = await params;
  const blindPolicyDemo = proofId === "blind-policy-demo";
  return buildRouteMetadata({
    title: blindPolicyDemo
      ? "Verified Blind Policy Proof"
      : proofId === demoProofId
        ? "Verified Credit Limit Workflow"
        : "Proof Workflow Verification",
    description: blindPolicyDemo
      ? "Public Groth16 verification that a private policy was satisfied without exposing policy inputs."
      : "Public verification for a Proof Workflow without exposing private values.",
    path: `/proof-workflows/verify/${proofId}`,
    keywords: ["proof workflow verification", "credit limit workflow", "public proof"],
  });
}

export default async function VerifyDemoProofPage({ params }: VerifyDemoPageProps) {
  const { proofId } = await params;
  const knownDemo = proofId === demoProofId;
  const blindPolicyDemo = proofId === "blind-policy-demo";
  const demoProofPackage = buildDemoCreditLimitProofPackageWithHash();
  const blindPolicyProofPackage = blindPolicyDemo ? buildDemoBlindPolicyProofPackage(readBlindPolicyGroth16Proof()) : null;

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

      <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="mb-6">
          <div className="text-[11px] uppercase tracking-[0.25em] text-cyan-100/76">Public verify link</div>
          <h1 className="mt-3 text-3xl font-semibold tracking-[-0.02em] text-white sm:text-4xl">
            {blindPolicyDemo
              ? "Blind Policy Verification"
              : knownDemo
                ? "Verified Credit Decision Workflow"
                : "Proof Workflow Verification"}
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-white/64">
            {blindPolicyDemo
              ? "This page confirms that the policy was satisfied with a Groth16 proof while private inputs and policy thresholds remain hidden."
              : "This page confirms the decision workflow without exposing user earnings, thresholds, formulas, reviewer notes, or the risk model."}
          </p>
        </div>

        {blindPolicyProofPackage ? (
          <BlindPolicyVerificationPanel fallbackProofPackage={blindPolicyProofPackage} />
        ) : (
          <ProofWorkflowVerificationPanel demoOriginalHash={demoProofPackage.originalProofHash} />
        )}

        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/pilots/credit-decision-verification" className={cn(buttonVariants({ size: "sm" }))}>
            Run sample verification
          </Link>
            <a href="mailto:fahd@privatedao.org?subject=PrivateDAO%20Private%20Pilot" className={cn(buttonVariants({ size: "sm", variant: "secondary" }))}>
            Request Private Pilot
          </a>
        </div>
      </section>
    </main>
  );
}
