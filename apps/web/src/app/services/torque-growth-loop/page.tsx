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
  const activationEvidence = [
    ["Delivery", "Verified server-side relay"],
    ["Project", "cmpm5lnzt00hujq1jd9imtp2o"],
    ["Event", "private_treasury_execution"],
    ["Event ID", "cmpm5lolt00iajq1jjluy5a3m"],
    ["Ingestion proof", "4e660492-af75-4a28-9cb2-a81f7779be38"],
  ] as const;
  const operatingSteps = [
    ["Action", "A user creates a DAO, creates a proposal, signs a billing route, finishes learning, or executes a private treasury event."],
    ["Event", "The browser builds a Torque-style custom_event payload with wallet, route, network, reward intent, and proof routes."],
    ["Relay", "The read-node endpoint /api/v1/torque/custom-event forwards the event with a verified server-side Torque ingestion key."],
    ["Proof", "The user lands back in Judge, Proof, or Learn so the incentive loop points to a real product action, not a vanity visit."],
  ] as const;
  const productionGates = [
    "Server-side TORQUE_API_KEY configured outside the static site",
    "Accepted ingestion proof: 4e660492-af75-4a28-9cb2-a81f7779be38",
    "Campaign IDs and reward policy mapped per event type",
    "Abuse checks for duplicate wallets, repeated events, and non-finalized actions",
    "Delivery transcript recorded for reviewer and operator inspection",
  ] as const;
  const incentiveRecipes = [
    {
      type: "Leaderboard",
      use: "Rank operators by verified private treasury actions or governance activation.",
      guardrail: "Never use raw metric payout. Use fixed rank prizes or capped formulas such as min(N * 0.05, 500).",
    },
    {
      type: "Rebate",
      use: "Return a small percentage after a signed billing SKU, proposal execution, or treasury route preview.",
      guardrail: "Always cap the pool and user payout before creation so Testnet behavior cannot imply unlimited rewards.",
    },
    {
      type: "Raffle",
      use: "Reward learning completion, first wallet execution, or weekly verified participation.",
      guardrail: "Use equal chances for education loops; use weighted tickets only when activity-based weighting is intentional.",
    },
    {
      type: "Direct",
      use: "Distribute partner, contributor, or judge-demo rewards to a fixed wallet list.",
      guardrail: "Treat pasted allocations as explicit inputs and keep the browser out of reward credential custody.",
    },
  ] as const;
  const mcpWorkflow = [
    ["Authenticate", "Torque MCP token stays local/operator-side; ingestion keys stay server-side in the read-node."],
    ["Select project", "PrivateDAO project cmpm5lnzt00hujq1jd9imtp2o is the active growth workspace."],
    ["Load context", "The assistant should load project context before choosing formula, source, schedule, or reward type."],
    ["Preview first", "Every query must be previewed before an incentive is created; no blind leaderboard formulas."],
    ["Publish evidence", "Each incentive should link back to /judge, provider status, event ID, and accepted ingestion proof."],
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
      <section className="rounded-[32px] border border-emerald-300/28 bg-[radial-gradient(circle_at_top_left,rgba(20,241,149,0.22),rgba(8,13,28,0.94)_45%,rgba(5,11,24,0.98))] p-6 shadow-2xl shadow-emerald-950/30">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-[11px] uppercase tracking-[0.3em] text-emerald-100/80">Live Torque delivery verified</div>
            <h2 className="mt-3 max-w-4xl text-2xl font-semibold tracking-[-0.03em] text-white">
              PrivateDAO now sends real product actions into Torque from the protected read-node
            </h2>
            <p className="mt-3 max-w-4xl text-sm leading-7 text-white/66">
              The browser never receives the Torque key. It prepares the action payload, the read-node signs the delivery
              boundary with server-only credentials, and Torque returns an accepted ingestion receipt.
            </p>
          </div>
          <Link href="https://api.privatedao.org/api/v1/provider-integrations/status" className={cn(buttonVariants({ size: "sm" }))}>
            Open live status
          </Link>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {activationEvidence.map(([label, value]) => (
            <div key={label} className="rounded-2xl border border-white/10 bg-black/24 p-4">
              <div className="text-[10px] uppercase tracking-[0.22em] text-emerald-100/58">{label}</div>
              <div className="mt-2 break-all font-mono text-xs leading-5 text-white/78">{value}</div>
            </div>
          ))}
        </div>
      </section>
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
          actions into custom_events, forwards them through the protected read-node relay with verified credentials, then
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
        <h2 className="mt-3 text-2xl font-semibold text-white">The page builds events and the read-node forwards them to Torque</h2>
        <p className="mt-3 max-w-4xl text-sm leading-7 text-white/66">
          The visible workbench builds inspectable event payloads, records local delivery state, and posts to
          <span className="font-mono text-amber-100"> /api/v1/torque/custom-event</span>. The API route exists in the
          read-node and forwards to Torque with a scoped server credential. This keeps private keys out of the browser
          while preserving a testable growth UX for judges.
        </p>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {productionGates.map((gate) => (
            <div key={gate} className="rounded-2xl border border-white/10 bg-black/22 p-4 text-sm leading-6 text-white/62">
              {gate}
            </div>
          ))}
        </div>
      </section>
      <section className="rounded-[30px] border border-fuchsia-300/18 bg-[linear-gradient(135deg,rgba(217,70,239,0.10),rgba(34,211,238,0.07),rgba(8,13,28,0.94))] p-6">
        <div className="text-[11px] uppercase tracking-[0.28em] text-fuchsia-100/78">MCP-safe incentive design</div>
        <h2 className="mt-3 max-w-4xl text-2xl font-semibold text-white">Torque is wired as an operator-controlled growth engine, not a blind reward faucet</h2>
        <p className="mt-3 max-w-4xl text-sm leading-7 text-white/66">
          The page exposes the public product loop while the MCP workflow remains an operator action: authenticate, choose
          project context, preview the query, confirm reward economics, and publish evidence. This prevents the common
          leaderboard mistake where raw activity values become uncapped token payouts.
        </p>
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {incentiveRecipes.map((recipe) => (
            <div key={recipe.type} className="rounded-[22px] border border-white/10 bg-black/24 p-4">
              <div className="text-sm font-semibold text-white">{recipe.type}</div>
              <p className="mt-3 text-sm leading-6 text-white/62">{recipe.use}</p>
              <div className="mt-4 rounded-2xl border border-fuchsia-200/12 bg-fuchsia-200/[0.06] p-3 text-xs leading-6 text-fuchsia-50/72">
                {recipe.guardrail}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-5 grid gap-3 lg:grid-cols-5">
          {mcpWorkflow.map(([label, detail]) => (
            <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <div className="text-[10px] uppercase tracking-[0.22em] text-cyan-100/62">{label}</div>
              <p className="mt-3 text-xs leading-6 text-white/58">{detail}</p>
            </div>
          ))}
        </div>
      </section>
      <TorqueGrowthLoopSurface />
    </OperationsShell>
  );
}
