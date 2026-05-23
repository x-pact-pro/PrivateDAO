import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, DatabaseZap, Gauge, LockKeyhole, RadioTower } from "lucide-react";

import { OperationsShell } from "@/components/operations-shell";
import { RpcServicesLivePanel } from "@/components/rpc-services-live-panel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { buildRouteMetadata } from "@/lib/route-metadata";
import { cn } from "@/lib/utils";

export const metadata: Metadata = buildRouteMetadata({
  title: "RPC Services",
  description:
    "PrivateDAO RPC services, read-node health, QuickNode stream intake, Umbra relayer readiness, QVAC runtime proof, and backend evidence for Testnet operations.",
  path: "/rpc-services",
  keywords: ["RPC services", "read node", "QuickNode streams", "Umbra relayer", "QVAC runtime proof", "Testnet operations"],
});

const serviceCards = [
  {
    icon: RadioTower,
    title: "Testnet read-node",
    body: "A public backend surface for runtime health, indexed operation posture, and same-domain reviewer checks.",
    href: "https://api.privatedao.org/healthz",
  },
  {
    icon: LockKeyhole,
    title: "Private rail proxy",
    body: "Umbra relayer health is exposed through the backend so private payout readiness is inspectable without leaking secrets.",
    href: "https://api.privatedao.org/api/v1/umbra/relayer/health",
  },
  {
    icon: DatabaseZap,
    title: "Runtime proof export",
    body: "QVAC runtime proof and operational diagnostics are available as JSON for judges and future automation.",
    href: "https://api.privatedao.org/api/v1/qvac/runtime-proof",
  },
  {
    icon: RadioTower,
    title: "QuickNode stream intake",
    body: "A protected webhook converts Solana Testnet block and program-log streams into proof freshness and intelligence telemetry without exposing stream secrets.",
    href: "/documents/quicknode-stream-intelligence",
  },
  {
    icon: Gauge,
    title: "Operator flow",
    body: "Use Command Center for the visual ops layer, Proof for receipts, and Execute for the wallet-signed actions.",
    href: "/command-center",
  },
];

export default function RpcServicesPage() {
  return (
    <OperationsShell
      eyebrow="RPC SERVICES"
      title="Live read-node and backend services for PrivateDAO Testnet execution"
      description="A reviewer-facing route that proves the product is not only static pages: the read-node, relay checks, and runtime proof endpoints are inspectable from the public surface."
      badges={[
        { label: "Read-node live", variant: "success" },
        { label: "Testnet RPC", variant: "cyan" },
        { label: "QuickNode stream", variant: "cyan" },
        { label: "Backend-only secrets", variant: "violet" },
      ]}
    >
      <RpcServicesLivePanel />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {serviceCards.map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.title} className="border-white/10 bg-white/[0.03] text-white">
              <CardHeader>
                <Icon className="h-5 w-5 text-cyan-200" />
                <CardTitle className="text-lg">{item.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="min-h-24 text-sm leading-6 text-white/60">{item.body}</p>
                <Link
                  className={cn(buttonVariants({ variant: "outline", size: "sm" }), "mt-4 border-white/15 bg-white/5 text-white hover:bg-white/10")}
                  href={item.href}
                  target={item.href.startsWith("http") ? "_blank" : undefined}
                >
                  Open <ArrowUpRight className="ml-2 h-4 w-4" />
                </Link>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </OperationsShell>
  );
}
