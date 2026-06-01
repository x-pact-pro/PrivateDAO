import type { Metadata } from "next";
import Link from "next/link";

import { OperationsShell } from "@/components/operations-shell";
import { AssetContextCard } from "@/components/asset-context-card";
import { PrivatePayoutModes } from "@/components/private-payout-modes";
import { TransparencyReportPreview } from "@/components/transparency-report-preview";
import { buttonVariants } from "@/components/ui/button";
import { buildRouteMetadata } from "@/lib/route-metadata";
import { cn } from "@/lib/utils";

export const metadata: Metadata = buildRouteMetadata({
  title: "Private Rooms",
  description: "Create invite-only, token-gated, or allowlist private DAO rooms for private proposals, private voting, reveal, and proof export.",
  path: "/rooms",
  keywords: ["private rooms", "vip private room", "private dao workspace"],
});

export default function RoomsPage() {
  return (
    <OperationsShell
      eyebrow="Private rooms"
      title="Create private room → invite members → vote privately → reveal outcome → export proof"
      description="VIP rooms are premium workspaces for sensitive DAO coordination. Public visitors see only the public label; details require wallet access."
      navigationMode="guided"
      badges={[
        { label: "Invite-only", variant: "cyan" },
        { label: "No jargon", variant: "success" },
        { label: "Proof export", variant: "violet" },
      ]}
    >
      <section className="rounded-[30px] border border-white/10 bg-white/[0.035] p-5 md:p-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {["Create private room", "Invite members", "Add proposal", "Run private vote", "Export proof"].map((item) => (
            <Link key={item} href="/rooms/new" className="rounded-[22px] border border-white/10 bg-black/22 p-4 transition hover:border-cyan-300/28 hover:bg-white/[0.055]">
              <div className="text-base font-semibold text-white">{item}</div>
              <p className="mt-2 text-sm leading-6 text-white/58">Simple UI, encrypted/private metadata boundary, and reveal controlled by room policy.</p>
            </Link>
          ))}
        </div>
        <div className="mt-5">
          <Link href="/rooms/new" className={cn(buttonVariants({ size: "sm" }))}>Create private room</Link>
        </div>
      </section>
      <AssetContextCard symbol="USDC" amount="3500" useCase="vesting" />
      <PrivatePayoutModes />
      <TransparencyReportPreview compact />
    </OperationsShell>
  );
}
