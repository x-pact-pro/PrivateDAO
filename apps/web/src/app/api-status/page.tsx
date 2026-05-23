import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Activity, DatabaseZap, RadioTower, ShieldCheck } from "lucide-react";

import { LiveSiteActivityPanel } from "@/components/live-site-activity-panel";
import { OperationsShell } from "@/components/operations-shell";
import { RpcServicesLivePanel } from "@/components/rpc-services-live-panel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { buildRouteMetadata } from "@/lib/route-metadata";
import { cn } from "@/lib/utils";

export const metadata: Metadata = buildRouteMetadata({
  title: "API Status",
  description:
    "Live API, read-node, QuickNode stream intake, visitor freshness, Supabase receipt, Umbra relayer, and QVAC runtime status for PrivateDAO Testnet operations.",
  path: "/api-status",
  keywords: ["api status", "read node", "QuickNode streams", "Supabase receipts", "Umbra relayer", "QVAC", "Solana Testnet"],
});

const quickChecks = [
  {
    title: "Backend health",
    body: "Same-domain API status for reviewer and product runtime checks.",
    href: "https://api.privatedao.org/healthz",
    icon: RadioTower,
  },
  {
    title: "Visitor stats",
    body: "Privacy-respecting live visitor and visitor-signed Testnet transaction counters.",
    href: "https://api.privatedao.org/api/v1/visitors/stats",
    icon: Activity,
  },
  {
    title: "Proof freshness",
    body: "Latest throttled Solana Testnet freshness memo from the public product surface.",
    href: "https://api.privatedao.org/api/v1/freshness/latest",
    icon: ShieldCheck,
  },
  {
    title: "QuickNode stream intake",
    body: "Authenticated Solana Testnet stream webhook that turns block and program-log payloads into runtime evidence summaries.",
    href: "https://api.privatedao.org/api/v1/quicknode/stream",
    icon: RadioTower,
  },
  {
    title: "QVAC proof",
    body: "Runtime proof endpoint for the sovereign AI lane.",
    href: "https://api.privatedao.org/api/v1/qvac/runtime-proof",
    icon: DatabaseZap,
  },
];

export default function ApiStatusPage() {
  return (
    <OperationsShell
      eyebrow="API Status"
      title="Live backend, receipt, and visitor-signed Testnet status in one route"
      description="This page is the plain operational status surface for normal users and judges. It avoids hidden diagnostics: every public check points to the exact endpoint or proof route that powers the product."
      badges={[
        { label: "Backend live", variant: "success" },
        { label: "Visitor counters", variant: "cyan" },
        { label: "QuickNode stream-ready", variant: "cyan" },
        { label: "Proof freshness", variant: "violet" },
      ]}
    >
      <LiveSiteActivityPanel variant="analytics" />
      <RpcServicesLivePanel />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {quickChecks.map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.href} className="border-white/10 bg-white/[0.035] text-white">
              <CardHeader>
                <Icon className="h-5 w-5 text-cyan-200" />
                <CardTitle className="text-lg">{item.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="min-h-20 text-sm leading-6 text-white/62">{item.body}</p>
                <Link
                  className={cn(buttonVariants({ variant: "outline", size: "sm" }), "mt-4 border-white/15 bg-white/5 text-white hover:bg-white/10")}
                  href={item.href}
                  target={item.href.startsWith("http") ? "_blank" : undefined}
                  rel="noreferrer"
                >
                  Open endpoint <ArrowUpRight className="ml-2 h-4 w-4" />
                </Link>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </OperationsShell>
  );
}
