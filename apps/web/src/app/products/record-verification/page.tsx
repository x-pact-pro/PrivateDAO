import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { OperationsShell } from "@/components/operations-shell";
import { SelectedKernelWorkflow } from "@/components/selected-kernel-workflow";
import { RecordVerificationWorkbench } from "@/components/record-verification-workbench";
import { buildRouteMetadata } from "@/lib/route-metadata";

export const metadata: Metadata = {
  ...buildRouteMetadata({ title: "Record Verification", description: "Validate critical records, protect sensitive fields, and share a receipt anyone can check.", path: "/products/record-verification", keywords: ["record verification", "verifiable evidence", "private records"] }),
  openGraph: {
    title: "Record Verification | PrivateDAO",
    description: "Private inputs. Verifiable outcomes. Turn critical records into trusted evidence.",
    url: "/products/record-verification/",
    siteName: "PrivateDAO",
    type: "website",
    images: [{ url: "/assets/record-verification-og.png", width: 1200, height: 630, alt: "Record Verification by PrivateDAO" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Record Verification | PrivateDAO",
    description: "Private inputs. Verifiable outcomes. Turn critical records into trusted evidence.",
    images: ["/assets/record-verification-og.png"],
  },
};

export default function RecordVerificationPage() {
  return <OperationsShell eyebrow="Record Verification" title="Turn any critical record into independently verifiable evidence." description="Validate the record, apply your rules, protect sensitive fields, and share a receipt anyone can check without a wallet." navigationMode="guided" badges={[]}><SelectedKernelWorkflow product="verification"><section className="mb-6 grid gap-4 md:grid-cols-3">{[["1", "Submit", "Paste or upload a structured record."], ["2", "Verify", "Check schema, policy, and integrity."], ["3", "Share", "Give auditors a public receipt link."]].map(([number, title, copy]) => <article key={number} className="rounded-2xl border border-white/10 bg-white/[0.035] p-5"><div className="text-xs text-cyan-100/65">{number}</div><h2 className="mt-2 text-lg font-semibold text-white">{title}</h2><p className="mt-2 text-sm leading-6 text-white/56">{copy}</p></article>)}</section><RecordVerificationWorkbench /><section className="mt-6 flex flex-wrap items-center gap-4 rounded-2xl border border-white/10 bg-black/20 p-5 text-sm text-white/62"><ShieldCheck className="h-5 w-5 text-emerald-200" />Private fields stay outside the public receipt.<Link href="/developers" className="inline-flex items-center gap-2 text-cyan-100">Developer integration <ArrowRight className="h-4 w-4" /></Link></section></SelectedKernelWorkflow></OperationsShell>;
}
