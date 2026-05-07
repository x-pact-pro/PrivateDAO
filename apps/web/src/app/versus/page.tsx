import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, CheckCircle2, MinusCircle, ShieldCheck } from "lucide-react";

import { OperationsShell } from "@/components/operations-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { buildRouteMetadata } from "@/lib/route-metadata";
import { cn } from "@/lib/utils";

export const metadata: Metadata = buildRouteMetadata({
  title: "PrivateDAO Versus",
  description:
    "A concise comparison of PrivateDAO against Realms, Squads, Snapshot, and DAOhaus across private voting, ZK anchors, confidential payout, AI governance, and Anchor 1.0.1.",
  path: "/versus",
  keywords: ["Realms", "Squads", "Snapshot", "DAOhaus", "comparison", "private governance"],
});

const rows = [
  { feature: "Private voting", realms: false, squads: false, snapshot: false, daohaus: false, privateDao: true },
  { feature: "ZK anchors", realms: false, squads: false, snapshot: false, daohaus: false, privateDao: true },
  { feature: "Confidential payout", realms: false, squads: false, snapshot: false, daohaus: false, privateDao: true },
  { feature: "AI governance layer", realms: false, squads: false, snapshot: false, daohaus: false, privateDao: true },
  { feature: "Anchor 1.0.1", realms: false, squads: false, snapshot: false, daohaus: false, privateDao: true },
] as const;

function Mark({ value }: { value: boolean }) {
  return value ? (
    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-emerald-100">
      <CheckCircle2 className="h-4 w-4" />
      Yes
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-white/42">
      <MinusCircle className="h-4 w-4" />
      No
    </span>
  );
}

export default function VersusPage() {
  return (
    <OperationsShell
      eyebrow="Competitive context"
      title="PrivateDAO is not another DAO UI; it closes the private governance-to-execution loop"
      description="Realms is public governance. Squads is multisig custody. Snapshot is off-chain signaling. DAOhaus is EVM-first. PrivateDAO combines private voting, ZK receipts, confidential payouts, and local intelligence on Solana."
      badges={[
        { label: "Private by default", variant: "success" },
        { label: "Solana-native", variant: "cyan" },
        { label: "Execution-ready", variant: "violet" },
      ]}
    >
      <Card className="overflow-hidden border-cyan-300/16 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.12),transparent_34%),rgba(7,12,20,0.94)]">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-2xl">
            <ShieldCheck className="h-6 w-6 text-cyan-100" />
            Feature comparison
          </CardTitle>
          <p className="max-w-4xl text-sm leading-7 text-white/62">
            The comparison is intentionally narrow: it focuses on the capabilities a treasury operator needs when votes, payroll, vendors, and audits cannot be fully public.
          </p>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[860px] border-separate border-spacing-y-2 text-left text-sm">
            <thead className="text-xs uppercase tracking-[0.24em] text-white/42">
              <tr>
                <th className="px-4 py-3">Feature</th>
                <th className="px-4 py-3">Realms</th>
                <th className="px-4 py-3">Squads</th>
                <th className="px-4 py-3">Snapshot</th>
                <th className="px-4 py-3">DAOhaus</th>
                <th className="px-4 py-3 text-emerald-100">PrivateDAO</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.feature} className="rounded-2xl bg-white/[0.035]">
                  <td className="rounded-l-2xl border-y border-l border-white/8 px-4 py-4 font-medium text-white">{row.feature}</td>
                  <td className="border-y border-white/8 px-4 py-4"><Mark value={row.realms} /></td>
                  <td className="border-y border-white/8 px-4 py-4"><Mark value={row.squads} /></td>
                  <td className="border-y border-white/8 px-4 py-4"><Mark value={row.snapshot} /></td>
                  <td className="border-y border-white/8 px-4 py-4"><Mark value={row.daohaus} /></td>
                  <td className="rounded-r-2xl border-y border-r border-emerald-300/18 bg-emerald-300/[0.05] px-4 py-4"><Mark value={row.privateDao} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-4">
        {[
          ["Realms", "SPL governance with public voting and treasury transparency by default."],
          ["Squads", "Excellent multisig custody, but not a privacy-preserving voting and payout OS."],
          ["Snapshot", "Useful off-chain signaling, but no native Solana execution finality."],
          ["DAOhaus", "DAO tooling for EVM ecosystems, not a Solana-native confidential treasury path."],
        ].map(([name, summary]) => (
          <Card key={name} className="border-white/10 bg-white/[0.035]">
            <CardHeader>
              <CardTitle>{name}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm leading-7 text-white/62">{summary}</CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-wrap gap-3">
        <Link href="/judges" className={cn(buttonVariants({ size: "lg" }))}>
          Open judges fast path
          <ArrowUpRight className="h-4 w-4" />
        </Link>
        <Link href="/proof" className={cn(buttonVariants({ size: "lg", variant: "outline" }))}>
          Verify proof
          <ArrowUpRight className="h-4 w-4" />
        </Link>
      </div>
    </OperationsShell>
  );
}
