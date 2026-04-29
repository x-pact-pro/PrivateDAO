"use client";

import Link from "next/link";
import { ArrowRight, FileText, KeyRound, ShieldCheck, TerminalSquare } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type CustodyTruthQuickActionsProps = {
  title?: string;
  description?: string;
};

const actions = [
  {
    title: "Reviewer packet",
    summary:
      "Shortest reviewer-facing custody truth packet with proven evidence, ceremony gates, and the ingestion route.",
    href: "/documents/custody-proof-reviewer-packet",
    icon: FileText,
  },
  {
    title: "Canonical custody proof",
    summary:
      "Exact ceremony gates, observed chain readouts, and explorer-linked closure points.",
    href: "/documents/canonical-custody-proof",
    icon: ShieldCheck,
  },
  {
    title: "Strict intake shape",
    summary:
      "Canonical multisig intake schema for signer keys, multisig address, timelock proof, and authority-transfer evidence.",
    href: "/documents/multisig-setup-intake",
    icon: KeyRound,
  },
  {
    title: "Apply route",
    summary:
      "Open the strict packet workspace, then apply the operator JSON with `npm run apply:custody-evidence-intake`.",
    href: "/custody#strict-intake-packet",
    icon: TerminalSquare,
  },
];

export function CustodyTruthQuickActions({
  title = "Custody truth quick actions",
  description = "Open the exact truth surfaces directly instead of navigating through the full custody route first.",
}: CustodyTruthQuickActionsProps) {
  return (
    <Card className="border-white/10 bg-[linear-gradient(180deg,rgba(10,16,32,0.94),rgba(7,11,23,0.98))]">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <div className="text-sm leading-7 text-white/58">{description}</div>
      </CardHeader>
      <CardContent className="grid gap-4 xl:grid-cols-4">
        {actions.map((action) => {
          const Icon = action.icon;

          return (
            <div key={action.title} className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-[18px] border border-white/10 bg-black/20 text-cyan-200">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="text-base font-medium text-white">{action.title}</div>
              </div>
              <div className="mt-3 text-sm leading-7 text-white/56">{action.summary}</div>
              <Link
                href={action.href}
                className={cn(buttonVariants({ size: "sm", variant: "outline" }), "mt-4 w-full justify-between")}
              >
                Open
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
