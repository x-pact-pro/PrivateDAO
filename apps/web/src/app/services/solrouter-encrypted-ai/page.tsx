import type { Metadata } from "next";
import Link from "next/link";

import { LocalizedRouteBrief } from "@/components/localized-route-brief";
import { LocalizedRouteSummary } from "@/components/localized-route-summary";
import { OperationsShell } from "@/components/operations-shell";
import { SolrouterEncryptedAiSurface } from "@/components/solrouter-encrypted-ai-surface";
import { buttonVariants } from "@/components/ui/button";
import { buildRouteMetadata } from "@/lib/route-metadata";
import { cn } from "@/lib/utils";

export const metadata: Metadata = buildRouteMetadata({
  title: "SolRouter Encrypted AI",
  description:
    "Deterministic governance intelligence and encrypted brief generation in one operational route.",
  path: "/services/solrouter-encrypted-ai",
  keywords: ["solrouter", "encrypted ai", "governance analysis", "private dao"],
});

export default function SolrouterEncryptedAiPage() {
  return (
    <OperationsShell
      eyebrow="Encrypted AI"
      title="SolRouter for general proposal analysis and encrypted brief export"
      description="SolRouter is the general analysis lane: summarize proposals, produce an operator-ready brief, encrypt the output locally, then continue to proof without positioning it as the sensitive-decision gate."
      badges={[
        { label: "SolRouter", variant: "cyan" },
        { label: "Deterministic AI", variant: "success" },
        { label: "Encrypted output", variant: "violet" },
      ]}
    >
      <LocalizedRouteSummary routeKey="services" />
      <LocalizedRouteBrief routeKey="servicesCore" />
      <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5 text-sm leading-7 text-white/68">
        The route avoids overclaiming autonomous AI. It keeps the scope practical: generate review-grade intelligence, encrypt output,
        then continue through governed execution and proof surfaces.
        <div className="mt-4 flex flex-wrap gap-3">
          <Link href="/intelligence" className={cn(buttonVariants({ size: "sm" }))}>
            Open intelligence
          </Link>
          <Link href="/govern" className={cn(buttonVariants({ size: "sm", variant: "secondary" }))}>
            Open govern
          </Link>
          <Link href="/proof" className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>
            Open proof
          </Link>
        </div>
      </div>
      <SolrouterEncryptedAiSurface />
    </OperationsShell>
  );
}
