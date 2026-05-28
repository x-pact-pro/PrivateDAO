import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Scale, ShieldCheck } from "lucide-react";

import { OperationsShell } from "@/components/operations-shell";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { buildRouteMetadata } from "@/lib/route-metadata";
import { cn } from "@/lib/utils";

export const metadata: Metadata = buildRouteMetadata({
  title: "Legal Notice",
  description:
    "PrivateDAO public source review, IP, brand, evidence, and official deployment notice for reviewers, partners, and ecosystem contributors.",
  path: "/legal",
  keywords: ["PrivateDAO legal notice", "source review", "IP notice", "brand notice"],
});

const notices = [
  [
    "Public source review",
    "The repository remains open source where the repository license applies, and the website remains available so judges, auditors, partners, and ecosystem reviewers can inspect the work. Review access does not grant permission to impersonate PrivateDAO, redeploy official surfaces, reuse brand identity, or commercialize official service packages without written coordination.",
  ],
  [
    "Code and license boundary",
    "Source files that explicitly remain under AGPL-3.0-or-later keep the rights and duties of that license. PrivateDAO brand, product design, documents, evidence packets, roadmap material, media assets, service packaging, and official deployments are reserved unless separately licensed.",
  ],
  [
    "Digital evidence",
    "On-chain transaction hashes, Supabase receipt traces, runtime proof packets, screenshots, and submission evidence are preserved as PrivateDAO review artifacts. They may be cited for evaluation, security reporting, and ecosystem coordination, but not copied into misleading or competing official claims.",
  ],
  [
    "Coordination path",
    "PrivateDAO is open to ecosystem collaboration, audits, pilots, and official integration work. Open-source forks must respect the repository license; brand use, official-looking derivative deployments, commercial packaging, or government/institutional reuse should be coordinated through official PrivateDAO channels first.",
  ],
  [
    "DAO entity and IP package",
    "The Futardio and MetaDAO launch path uses a DAO entity workflow so PDAO ownership can be tied to enforceable project control. The future entity should hold or control repository administration, domains, brand assets, official launch materials, deployed program authorities, infrastructure administration, proof materials, and future production deployment rights.",
  ],
] as const;

export default function LegalNoticePage() {
  return (
    <OperationsShell
      eyebrow="Legal Notice"
      title="Public review is open; official use requires coordination"
      description="PrivateDAO remains open source where the license applies and visible for judges and ecosystem reviewers while protecting project authorship, brand identity, digital proof artifacts, and sensitive product packaging."
      badges={[
        { label: "Open-source core", variant: "cyan" },
        { label: "Review access", variant: "success" },
        { label: "Official use reserved", variant: "warning" },
      ]}
    >
      <section className="rounded-[28px] border border-amber-300/18 bg-amber-300/[0.07] p-6">
        <div className="flex flex-wrap gap-2">
          <Badge variant="warning">Legal notice</Badge>
          <Badge variant="cyan">IP and evidence boundary</Badge>
          <Badge variant="violet">Security review friendly</Badge>
        </div>
        <p className="mt-5 max-w-5xl text-sm leading-7 text-white/68">
          This notice is intended to protect the public-good review posture of PrivateDAO while keeping the path open for
          judges, auditors, Solana ecosystem contributors, partners, and serious institutional collaborators. It is not a
          substitute for formal legal counsel or a signed commercial agreement.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        {notices.map(([title, body]) => (
          <article key={title} className="rounded-[24px] border border-white/10 bg-white/[0.035] p-5">
            <Scale className="h-5 w-5 text-amber-100" />
            <h2 className="mt-4 text-lg font-semibold text-white">{title}</h2>
            <p className="mt-2 text-sm leading-7 text-white/62">{body}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <Link href="/trust" className="rounded-[22px] border border-white/10 bg-black/20 p-5 transition hover:border-emerald-200/40">
          <ShieldCheck className="h-5 w-5 text-emerald-100" />
          <div className="mt-4 text-base font-semibold text-white">Trust surface</div>
          <div className="mt-2 text-sm leading-6 text-white/58">Open security, proof, and operating boundaries.</div>
        </Link>
        <a href="https://github.com/X-PACT/PrivateDAO" target="_blank" rel="noreferrer" className="rounded-[22px] border border-white/10 bg-black/20 p-5 transition hover:border-violet-200/40">
          <ArrowUpRight className="h-5 w-5 text-violet-100" />
          <div className="mt-4 text-base font-semibold text-white">Repository</div>
          <div className="mt-2 text-sm leading-6 text-white/58">Review the source with the repository notice attached.</div>
        </a>
      </section>

      <section className="rounded-[28px] border border-cyan-300/16 bg-cyan-300/[0.06] p-6">
        <div className="text-[11px] uppercase tracking-[0.24em] text-cyan-100/76">Futardio launch legal route</div>
        <h2 className="mt-3 text-2xl font-semibold text-white">Public terms URL and IP packet for launch review</h2>
        <p className="mt-3 max-w-4xl text-sm leading-7 text-white/66">
          Use this page as the public legal terms URL for launch review. The companion IP packet lists the repository,
          domains, brand assets, deployed program boundaries, infrastructure controls, and DAO entity rights that should
          be administered for the benefit of the future PDAO ownership community.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link href="/futardio" className={cn(buttonVariants({ size: "sm" }))}>
            Open launch packet
          </Link>
          <Link href="/documents/futardio-launch-ip-details-2026-05-28" className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>
            Open IP details
          </Link>
        </div>
      </section>

      <div className="flex flex-wrap gap-3">
        <Link href="/trust" className={cn(buttonVariants({ size: "sm" }))}>
          Open trust
        </Link>
        <Link href="/proof" className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>
          Open proof
        </Link>
      </div>
    </OperationsShell>
  );
}
