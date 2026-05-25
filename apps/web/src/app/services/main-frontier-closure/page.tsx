import type { Metadata } from "next";
import Link from "next/link";

import { LocalizedRouteBrief } from "@/components/localized-route-brief";
import { LocalizedRouteSummary } from "@/components/localized-route-summary";
import { OperationsShell } from "@/components/operations-shell";
import { buttonVariants } from "@/components/ui/button";
import { buildRouteMetadata } from "@/lib/route-metadata";
import { cn } from "@/lib/utils";

const MAIN_FRONTIER_LANES = [
  ["Cloak privacy", "/services/cloak-private-settlement"],
  ["GoldRush intelligence", "/intelligence"],
  ["Jupiter treasury route", "/services/jupiter-treasury-route"],
  ["Zerion agent policy", "/services/zerion-agent-policy"],
  ["Torque growth loop", "/services/torque-growth-loop"],
  ["AUDD stablecoin", "/services/audd-stablecoin"],
  ["PUSD stablecoin", "/services/pusd-stablecoin"],
  ["Umbra payout", "/services/umbra-confidential-payout"],
  ["MagicBlock private payments", "/services/magicblock-private-payments"],
  ["Eitherway wallet UX", "/services/eitherway-live-dapp"],
  ["Runtime infrastructure", "/services/runtime-infrastructure"],
  ["Encrypt / IKA", "/services/encrypt-ika-operations"],
  ["SolRouter encrypted AI", "/services/solrouter-encrypted-ai"],
  ["Consumer governance UX", "/services/consumer-governance-ux"],
] as const;

export const metadata: Metadata = buildRouteMetadata({
  title: "Main Frontier Closure",
  description:
    "Unified main-track route that demonstrates integrated governance, privacy, data, infrastructure, and consumer UX lanes in one product flow.",
  path: "/services/main-frontier-closure",
  keywords: ["frontier", "main track", "private dao", "integration closure"],
});

export default function MainFrontierClosurePage() {
  return (
    <OperationsShell
      eyebrow="Main track"
      title="One integrated operating system route across all production lanes"
      description="This route closes the main Frontier submission posture: it links every shipped lane into one coherent product path from decision to execution to proof."
      badges={[
        { label: "Main Frontier", variant: "warning" },
        { label: "Integrated product", variant: "cyan" },
        { label: "Judge-ready", variant: "success" },
      ]}
    >
      <LocalizedRouteSummary routeKey="services" />
      <LocalizedRouteBrief routeKey="servicesCore" />

      <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5 text-sm leading-7 text-white/68">
        PrivateDAO is no longer a collection of isolated demos. This route shows the integrated production posture across privacy, intelligence,
        market routing, stablecoin rails, runtime infrastructure, encrypted operations, and consumer UX.
        <div className="mt-4 flex flex-wrap gap-3">
          <Link href="/judge" className={cn(buttonVariants({ size: "sm" }))}>
            Open judge
          </Link>
          <Link href="/proof" className={cn(buttonVariants({ size: "sm", variant: "secondary" }))}>
            Open proof
          </Link>
          <Link href="/execute" className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>
            Open execute
          </Link>
          <Link href="/documents/frontier-track-closure-matrix-2026-05-25" className={cn(buttonVariants({ size: "sm", variant: "secondary" }))}>
            Open track closure matrix
          </Link>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
        {MAIN_FRONTIER_LANES.map(([label, href]) => (
          <div key={label} className="rounded-[22px] border border-white/8 bg-black/20 p-4">
            <div className="text-base font-medium text-white">{label}</div>
            <Link href={href} className={cn(buttonVariants({ size: "sm", variant: "outline" }), "mt-4 w-full justify-between")}>
              Open lane
            </Link>
          </div>
        ))}
      </div>
    </OperationsShell>
  );
}
