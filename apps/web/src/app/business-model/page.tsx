import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";

import { BusinessModelSurface } from "@/components/business-model-surface";
import { OperationsShell } from "@/components/operations-shell";
import { buttonVariants } from "@/components/ui/button";
import { buildRouteMetadata } from "@/lib/route-metadata";
import { cn } from "@/lib/utils";

export const metadata: Metadata = buildRouteMetadata({
  title: "PrivateDAO Business Model",
  description:
    "PrivateDAO business model: open-source adoption, fixed-scope pilots, managed organizational operations, and sovereign deployments.",
  path: "/business-model",
  keywords: ["PrivateDAO business model", "DAO infrastructure revenue", "Solana organization pilots", "confidential coordination business"],
});

const goToMarket = [
  ["1. Prove value", "A normal user runs the public Testnet workflow and verifies the result."],
  ["2. Start one pilot", "An organization selects one painful workflow such as grant review, treasury approval, or payroll coordination."],
  ["3. Measure the outcome", "The pilot leaves a proof packet, operating report, and clear recommendation for repeated use."],
  ["4. Expand responsibly", "Managed operations or a sovereign deployment follow only when the workflow earns continued adoption."],
] as const;

export default function BusinessModelPage() {
  return (
    <OperationsShell
      eyebrow="Business model"
      title="Open infrastructure creates trust. Operational outcomes create revenue."
      description="PrivateDAO converts a public Solana Testnet product into a commercial path through fixed-scope pilots, managed operations, and dedicated deployments."
      navigationMode="guided"
      badges={[
        { label: "Open protocol", variant: "success" },
        { label: "Paid pilots", variant: "cyan" },
        { label: "Managed operations", variant: "violet" },
      ]}
    >
      <section className="rounded-[28px] border border-cyan-300/16 bg-cyan-300/[0.06] p-5 sm:p-6">
        <div className="text-[11px] uppercase tracking-[0.25em] text-cyan-100/76">Go-to-market</div>
        <h2 className="mt-3 text-2xl font-semibold text-white">Sell relief from one operational pain, then expand.</h2>
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {goToMarket.map(([title, body]) => (
            <article key={title} className="rounded-2xl border border-white/10 bg-black/22 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-white">
                <CheckCircle2 className="h-4 w-4 text-emerald-100" />
                {title}
              </div>
              <p className="mt-2 text-sm leading-6 text-white/62">{body}</p>
            </article>
          ))}
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/pricing" className={cn(buttonVariants({ size: "sm" }))}>
            View pricing
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link href="/try" className={cn(buttonVariants({ size: "sm", variant: "secondary" }))}>
            Try the product
          </Link>
          <a
            href="mailto:Fahd.kotb@tuta.io?subject=PrivateDAO%20Pilot"
            className={cn(buttonVariants({ size: "sm", variant: "outline" }))}
          >
            Request a pilot
          </a>
        </div>
      </section>
      <BusinessModelSurface />
    </OperationsShell>
  );
}
