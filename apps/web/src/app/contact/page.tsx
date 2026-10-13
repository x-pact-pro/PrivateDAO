import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Mail, Send } from "lucide-react";

import { OperationsShell } from "@/components/operations-shell";
import { buttonVariants } from "@/components/ui/button";
import { buildRouteMetadata } from "@/lib/route-metadata";
import { VERIFIED_PDAO_HOLDERS_URL } from "@/lib/site-data";
import { cn } from "@/lib/utils";
import { companyLocation, contactEmails } from "@/lib/site-brand";

export const metadata: Metadata = buildRouteMetadata({
  title: "Contact",
  description: "Talk to PrivateDAO about keeping sensitive organizational work private and trusted.",
  path: "/contact",
  keywords: ["PrivateDAO contact", "private workflow", "enterprise privacy"],
});

const contacts = [
  ["General", contactEmails.general, `mailto:${contactEmails.general}`, Mail],
  ["Business", contactEmails.business, `mailto:${contactEmails.business}`, Mail],
  ["Sales", contactEmails.sales, `mailto:${contactEmails.sales}`, Mail],
  ["Partnerships", contactEmails.partners, `mailto:${contactEmails.partners}`, Mail],
  ["Developers", contactEmails.developers, `mailto:${contactEmails.developers}`, Mail],
  ["Support", contactEmails.support, `mailto:${contactEmails.support}`, Mail],
  ["Security", contactEmails.security, `mailto:${contactEmails.security}`, Mail],
  ["Legal", contactEmails.legal, `mailto:${contactEmails.legal}`, Mail],
  ["Careers", contactEmails.careers, `mailto:${contactEmails.careers}`, Mail],
  ["Billing", contactEmails.billing, `mailto:${contactEmails.billing}`, Mail],
  ["Telegram", "@privateDAOOS", "https://t.me/privateDAOOS", Send],
  ["X", "@privateDAOOS", "https://x.com/privateDAOOS", ArrowRight],
  ["PDAO community", "Verified holders", VERIFIED_PDAO_HOLDERS_URL, Send],
] as const;

export default function ContactPage() {
  return (
    <OperationsShell
      eyebrow="Contact"
      title="Tell us what needs to stay private."
      description={`PrivateDAO works with organizations that need a clearer way to coordinate sensitive work. Based in ${companyLocation}.`}
      navigationMode="focused"
      badges={[
        { label: "Teams of five or more", variant: "cyan" },
        { label: "Organizations and markets", variant: "success" },
        { label: "Private deployment", variant: "violet" },
      ]}
    >
      <section className="grid gap-4 lg:grid-cols-3">
        {[
          ["Payroll and people", "Keep salary information private while giving the people who need to approve and review it a clear path.", "/payroll"],
          ["Treasury and decisions", "Coordinate spending, governance, and approvals without publishing sensitive intent too early.", "/treasury"],
          ["Bids and evidence", "Run private offers or create a shareable verification outcome without exposing the original record.", "/auctions"],
        ].map(([title, body, href]) => (
          <Link key={title} href={href} className="enterprise-card rounded-[20px] p-5 transition hover:-translate-y-0.5 hover:border-[#175cd3]">
            <div className="text-base font-semibold text-[#10233f]">{title}</div>
            <p className="mt-3 text-sm leading-7 text-[#5d6d82]">{body}</p>
            <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#175cd3]">Open <ArrowRight className="h-4 w-4" /></span>
          </Link>
        ))}
      </section>

      <section className="enterprise-card rounded-[24px] p-6 sm:p-8">
        <div className="text-[11px] font-bold uppercase tracking-[0.25em] text-[#175cd3]">A simple first conversation</div>
        <h2 className="mt-3 text-2xl font-semibold text-[#10233f]">Bring one workflow. We will help you map the right private process.</h2>
        <div className="mt-5 grid gap-3 lg:grid-cols-2">
          <div className="rounded-2xl border border-[#dce5f0] bg-[#f7f9fc] p-4"><div className="text-sm font-semibold text-[#10233f]">What should stay private?</div><p className="mt-2 text-sm leading-6 text-[#5d6d82]">Payroll, treasury intent, bids, member decisions, or records that should not become public.</p></div>
          <div className="rounded-2xl border border-[#dce5f0] bg-[#f7f9fc] p-4"><div className="text-sm font-semibold text-[#10233f]">Who needs confidence in the result?</div><p className="mt-2 text-sm leading-6 text-[#5d6d82]">Your team, an auditor, a board, a partner, a regulator, or a wider community.</p></div>
        </div>
        <div className="mt-5 flex flex-wrap gap-3">
          <a href="mailto:fahd@privatedao.org?subject=PrivateDAO%20commercial%20conversation" className={cn(buttonVariants({ size: "sm" }))}>Email PrivateDAO</a>
          <Link href="/thesis" className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>Read the thesis</Link>
        </div>
      </section>

      <section className="enterprise-card rounded-[24px] p-5 sm:p-6">
        <div className="text-[11px] font-bold uppercase tracking-[0.25em] text-[#175cd3]">Official channels</div>
        <p className="mt-3 text-sm leading-7 text-[#5d6d82]">Choose the team that fits your request. PrivateDAO operates from {companyLocation}.</p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {contacts.map(([label, value, href, Icon]) => (
            <a key={href} href={href} title={`${label}: ${value}`} aria-label={`${label}: ${value}`} className="group flex min-h-24 items-start gap-3 rounded-2xl border border-[#dce5f0] bg-[#f7f9fc] p-4 text-[#175cd3] transition hover:-translate-y-0.5 hover:border-[#175cd3] hover:bg-[#edf4ff]">
              <Icon className="mt-0.5 h-5 w-5 shrink-0 transition group-hover:scale-110" aria-hidden="true" />
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-[#10233f]">{label}</span>
                <span className="mt-1 block break-words text-xs leading-5 text-[#5d6d82]">{value}</span>
              </span>
            </a>
          ))}
        </div>
      </section>
    </OperationsShell>
  );
}
