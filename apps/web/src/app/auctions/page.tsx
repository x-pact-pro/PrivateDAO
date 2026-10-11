import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { OperationsShell } from "@/components/operations-shell";
import { SelectedKernelWorkflow } from "@/components/selected-kernel-workflow";
import { ConfidentialAuctionWorkbench } from "@/components/confidential-auction-workbench";
import { buttonVariants } from "@/components/ui/button";
import { buildRouteMetadata } from "@/lib/route-metadata";
import { cn } from "@/lib/utils";

export const metadata: Metadata = buildRouteMetadata({
  title: "Sealed Auctions",
  description: "Run fair private auctions where bids stay hidden until the result is ready to share.",
  path: "/sealed-auctions",
  keywords: ["sealed auctions", "private auctions", "confidential procurement", "fair bidding"],
});

export default function AuctionsPage() {
  return (
    <OperationsShell
      eyebrow="Sealed Auctions"
      title="Choose fairly without exposing live bids."
      description="Invite trusted participants, collect private offers, and share a clear verified result when bidding closes."
      navigationMode="guided"
      badges={[
        { label: "Private offers", variant: "violet" },
        { label: "Simple workflow", variant: "cyan" },
        { label: "Shareable result", variant: "success" },
      ]}
    >
      <SelectedKernelWorkflow product="auction">
      <section className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-[28px] border border-[#f0c9cd] bg-[#fff6f6] p-5 sm:p-6">
          <div className="text-[11px] font-bold uppercase tracking-[0.25em] text-[#b42318]">Problem</div>
          <p className="mt-3 text-sm leading-7 text-[#52647d]">
            Normal auctions leak momentum. Bidders can see pressure, infer strategy, and react to public signals before
            the auction is over.
          </p>
        </article>
        <article className="rounded-[28px] border border-[#c7eadc] bg-[#f3fcf8] p-5 sm:p-6">
          <div className="text-[11px] font-bold uppercase tracking-[0.25em] text-[#147d5a]">With PrivateDAO</div>
          <p className="mt-3 text-sm leading-7 text-[#52647d]">
            Bids are committed while the auction is active. The winner and proof are revealed after the bidding window,
            without exposing intent during the process.
          </p>
        </article>
      </section>

      <ConfidentialAuctionWorkbench />

      <section className="rounded-[28px] border border-violet-200/16 bg-violet-200/[0.045] p-5 sm:p-6">
        <div className="text-[11px] uppercase tracking-[0.25em] text-violet-100/70">Outcome assurance</div>
        <h2 className="mt-3 text-2xl font-semibold text-white">Prove the result without revealing the bids.</h2>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-white/64">
          After the auction closes, the selected outcome can be shared and checked without exposing the offers that were kept private during the process.
        </p>
        <div className="mt-4 flex flex-wrap gap-3 text-xs text-white/52">
          <span className="rounded-full border border-white/10 px-3 py-2">Fair selection</span>
          <span className="rounded-full border border-white/10 px-3 py-2">Private offers</span>
          <span className="rounded-full border border-white/10 px-3 py-2">Shareable result</span>
        </div>
      </section>

      <section className="rounded-[28px] border border-white/10 bg-white/[0.035] p-5 sm:p-6">
        <div className="text-[11px] uppercase tracking-[0.25em] text-white/42">Commercial use</div>
        <h2 className="mt-3 text-2xl font-semibold text-white">Use sealed auctions for more than collectibles.</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {[
            ["Budget allocation", "Let decision-makers submit allocation bids without revealing momentum."],
            ["Vendor selection", "Run sealed commercial bidding with proof after selection."],
            ["Marketplace buying", "Run commercial buying decisions without revealing the market before the right moment."],
          ].map(([title, copy]) => (
            <div key={title} className="rounded-2xl border border-white/10 bg-black/18 p-4">
              <div className="font-semibold text-white">{title}</div>
              <p className="mt-2 text-sm leading-6 text-white/60">{copy}</p>
            </div>
          ))}
        </div>
        <div className="mt-5 flex flex-wrap gap-3">
          <a href="mailto:business@privatedao.org?subject=PrivateDAO%20Sealed%20Auction%20Pilot" className={cn(buttonVariants({ size: "sm" }))}>
            Request Auction Pilot
            <ArrowRight className="h-4 w-4" />
          </a>
          <Link href="/pricing" className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>
            View pricing
          </Link>
        </div>
      </section>
      </SelectedKernelWorkflow>
    </OperationsShell>
  );
}
