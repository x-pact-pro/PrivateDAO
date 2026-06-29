import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { OperationsShell } from "@/components/operations-shell";
import { TxlineSettlementVerifier } from "@/components/txline-settlement-verifier";
import { buildRouteMetadata } from "@/lib/route-metadata";

type PageProps = {
  params: Promise<{ proofId: string }>;
};

export function generateStaticParams() {
  return [{ proofId: "demo-proof-id" }, { proofId: "txline-settlement-demo" }];
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { proofId } = await params;
  return buildRouteMetadata({
    title: "Verify TxLINE Settlement",
    description: `Public verification page for TxLINE settlement proof ${proofId}.`,
    path: `/txline-settlement/verify/${proofId}`,
    keywords: ["TxLINE verification", "settlement proof", "prediction market verification"],
  });
}

export default async function TxlineSettlementVerifyPage({ params }: PageProps) {
  const { proofId } = await params;
  return (
    <OperationsShell
      eyebrow="Public Verification"
      title="Verify a match settlement proof."
      description="Anyone can verify the settlement proof package without seeing the private settlement policy."
      navigationMode="focused"
      badges={[
        { label: "No CLI required", variant: "cyan" },
        { label: "Tamper visible", variant: "violet" },
        { label: "Public receipt", variant: "success" },
      ]}
    >
      <Link href="/txline-settlement" className="inline-flex items-center gap-2 text-sm text-cyan-100 hover:text-white">
        <ArrowLeft className="h-4 w-4" />
        Back to settlement demo
      </Link>
      <TxlineSettlementVerifier proofId={proofId} />
    </OperationsShell>
  );
}
