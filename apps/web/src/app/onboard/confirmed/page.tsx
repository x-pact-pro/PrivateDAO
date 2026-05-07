import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CheckCircle2, FileText, PlayCircle, ShieldCheck } from "lucide-react";

import { OperationsShell } from "@/components/operations-shell";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { buildRouteMetadata } from "@/lib/route-metadata";
import { cn } from "@/lib/utils";

export const metadata: Metadata = buildRouteMetadata({
  title: "Onboarding Confirmed",
  description: "PrivateDAO onboarding brief received. Continue into Testnet exploration, proof, or product walkthrough.",
  path: "/onboard/confirmed",
  keywords: ["onboarding", "confirmed", "PrivateDAO"],
});

export default function OnboardConfirmedPage() {
  return (
    <OperationsShell
      eyebrow="Brief received"
      title="We received your governance brief"
      description="The next step is a focused Testnet path: the smallest real workflow that proves the value of private governance, confidential settlement, and verifiable receipts for your use case."
      badges={[
        { label: "24h response target", variant: "success" },
        { label: "Testnet-first", variant: "cyan" },
      ]}
    >
      <Card className="border-emerald-300/20 bg-emerald-300/[0.08]">
        <CardContent className="grid gap-5 p-6 md:grid-cols-3">
          {[
            [CheckCircle2, "Your request is stored", "The onboarding brief is now in the PrivateDAO intake queue."],
            [ShieldCheck, "Proof-first follow-up", "We will recommend a workflow that can be verified on Testnet."],
            [FileText, "No terminal required", "The product path stays UI-first: review, sign, verify."],
          ].map(([Icon, title, body]) => {
            const TypedIcon = Icon as typeof CheckCircle2;
            return (
              <div key={title as string} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <TypedIcon className="h-5 w-5 text-emerald-100" />
                <div className="mt-3 font-semibold text-white">{title as string}</div>
                <div className="mt-2 text-sm leading-6 text-white/58">{body as string}</div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-3">
        <Link href="/start/" className={cn(buttonVariants({ size: "lg" }))}>
          Explore your setup
          <ArrowRight className="h-4 w-4" />
        </Link>
        <Link href="/proof/" className={cn(buttonVariants({ size: "lg", variant: "outline" }))}>
          Open proof center
          <ArrowRight className="h-4 w-4" />
        </Link>
        <Link href="/demo/" className={cn(buttonVariants({ size: "lg", variant: "secondary" }))}>
          Watch product demo
          <PlayCircle className="h-4 w-4" />
        </Link>
      </div>
    </OperationsShell>
  );
}
