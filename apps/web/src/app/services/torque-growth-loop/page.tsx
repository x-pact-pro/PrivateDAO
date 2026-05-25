import type { Metadata } from "next";
import Link from "next/link";

import { LocalizedRouteBrief } from "@/components/localized-route-brief";
import { LocalizedRouteSummary } from "@/components/localized-route-summary";
import { OperationsShell } from "@/components/operations-shell";
import { TorqueGrowthLoopSurface } from "@/components/torque-growth-loop-surface";
import { buttonVariants } from "@/components/ui/button";
import { buildRouteMetadata } from "@/lib/route-metadata";
import { cn } from "@/lib/utils";

export const metadata: Metadata = buildRouteMetadata({
  title: "Torque Growth Loop",
  description:
    "Growth loop surface for emitting PrivateDAO custom_events into Torque-style incentives tied to real Solana product activity.",
  path: "/services/torque-growth-loop",
  keywords: ["torque mcp", "growth loop", "custom events", "private dao retention"],
});

export default function TorqueGrowthLoopPage() {
  const operatingSteps = [
    ["Action", "A user creates a DAO, creates a proposal, signs a billing route, finishes learning, or executes a private treasury event."],
    ["Event", "The browser builds a Torque-style custom_event payload with wallet, route, network, reward intent, and proof routes."],
    ["Relay", "The read-node endpoint /api/v1/torque/custom-event forwards the event only when server-side Torque credentials are configured."],
    ["Proof", "The user lands back in Judge, Proof, or Learn so the incentive loop points to a real product action, not a vanity visit."],
  ] as const;
  const productionGates = [
    "Server-side TORQUE_API_KEY configured outside the static site",
    "Campaign IDs and reward policy mapped per event type",
    "Abuse checks for duplicate wallets, repeated events, and non-finalized actions",
    "Delivery transcript recorded for reviewer and operator inspection",
  ] as const;

  return (
    <OperationsShell
      eyebrow="Growth infrastructure"
      title="Use incentives only where the product creates measurable on-chain activity"
      description="This route turns PrivateDAO usage into Torque-style custom_events: DAO creation, proposal creation, billing signatures, and education completion. The growth loop stays attached to real product behavior."
      badges={[
        { label: "Torque MCP path", variant: "success" },
        { label: "Custom events", variant: "cyan" },
        { label: "Retention loop", variant: "warning" },
      ]}
    >
      <LocalizedRouteSummary routeKey="services" />
      <LocalizedRouteBrief routeKey="servicesCore" />
      <div className="rounded-[28px] border border-emerald-300/16 bg-emerald-300/[0.08] p-6 text-sm leading-7 text-white/68">
        The correct Torque integration is not a separate bounty mechanic. It is the product growth layer: reward the
        actions that prove a user is learning, governing, paying, or returning. Private settlement execution now emits
        `private_treasury_execution` through the same relay path.
        <div className="mt-5 flex flex-wrap gap-3">
          <Link href="/documents/torque-growth-loop" className={cn(buttonVariants({ size: "sm" }))}>
            Open growth packet
          </Link>
          <Link href="/learn" className={cn(buttonVariants({ size: "sm", variant: "secondary" }))}>
            Open learn
          </Link>
          <Link href="/services/testnet-billing-rehearsal" className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>
            Open billing
          </Link>
        </div>
      </div>
      <section className="rounded-[30px] border border-cyan-300/18 bg-[linear-gradient(135deg,rgba(34,211,238,0.11),rgba(20,241,149,0.07),rgba(8,13,28,0.94))] p-6">
        <div className="text-[11px] uppercase tracking-[0.28em] text-cyan-100/78">Product growth architecture</div>
        <h2 className="mt-3 max-w-4xl text-2xl font-semibold text-white">Torque becomes the measurable retention layer for real PrivateDAO operations</h2>
        <p className="mt-3 max-w-4xl text-sm leading-7 text-white/66">
          The loop is intentionally strict: PrivateDAO does not reward passive page views. It converts wallet-first
          actions into custom_events, forwards them through the protected read-node relay when credentials exist, then
          sends the user back to a proof route where the action can be inspected.
        </p>
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {operatingSteps.map(([label, detail]) => (
            <div key={label} className="rounded-[22px] border border-white/10 bg-black/22 p-4">
              <div className="text-[10px] uppercase tracking-[0.22em] text-cyan-100/62">{label}</div>
              <p className="mt-3 text-sm leading-6 text-white/62">{detail}</p>
            </div>
          ))}
        </div>
      </section>
      <section className="rounded-[30px] border border-amber-300/18 bg-amber-300/[0.07] p-6">
        <div className="text-[11px] uppercase tracking-[0.28em] text-amber-100/78">What is already functional</div>
        <h2 className="mt-3 text-2xl font-semibold text-white">The page can build events now; production forwarding stays server-side</h2>
        <p className="mt-3 max-w-4xl text-sm leading-7 text-white/66">
          The visible workbench builds inspectable event payloads, records local delivery state, and posts to
          <span className="font-mono text-amber-100"> /api/v1/torque/custom-event</span>. The API route exists in the
          read-node and forwards to Torque only when scoped server credentials are present. This keeps private keys out
          of the browser while preserving a testable growth UX for judges.
        </p>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {productionGates.map((gate) => (
            <div key={gate} className="rounded-2xl border border-white/10 bg-black/22 p-4 text-sm leading-6 text-white/62">
              {gate}
            </div>
          ))}
        </div>
      </section>
      <TorqueGrowthLoopSurface />
    </OperationsShell>
  );
}
