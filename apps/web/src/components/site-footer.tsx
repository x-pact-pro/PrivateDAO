"use client";

/* eslint-disable @next/next/no-img-element -- the footer uses the supplied static brand asset. */

import Link from "next/link";
import { ArrowUpRight, Mail } from "lucide-react";

import { communityLinks } from "@/lib/site-data";
import { agentExchangeUrl, companyLocation, contactEmails } from "@/lib/site-brand";

const solutionLinks = [
  ["Confidential Payroll", "/payroll"],
  ["Treasury Coordination", "/treasury"],
  ["Private Governance", "/govern"],
  ["Confidential Auctions", "/auctions"],
  ["Verification", "/proof-workflows"],
] as const;

const companyLinks = [
  ["Why PrivateDAO", "/thesis"],
  ["Whitepaper", "/whitepaper"],
  ["PDAO", "/token"],
  ["Contact", "/contact"],
  ["About", "/about"],
  ["Terms", "/terms"],
  ["Privacy", "/privacy"],
] as const;

export function SiteFooter() {
  return (
    <footer className="border-t border-[#dce5f0] bg-white">
      <div className="mx-auto grid w-full max-w-7xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1.4fr_0.8fr_0.8fr] lg:px-8">
        <div>
          <div className="flex items-center gap-3">
            <img src="/assets/privatedao-brand-mark-20260918.jpeg" alt="PrivateDAO" width={42} height={42} className="h-10 w-10 rounded-full object-cover ring-1 ring-[#b9d8f2]" />
            <div className="text-lg font-semibold tracking-[-0.03em] text-[#10233f]">Private<span className="text-[#175cd3]">DAO</span></div>
          </div>
          <p className="mt-4 max-w-md text-sm leading-7 text-[#5d6d82]">Private software and Web3 infrastructure for sensitive organizational work, controlled execution, and verifiable outcomes.</p>
          <p className="mt-3 text-sm font-medium text-[#52647d]">{companyLocation}</p>
          <a href={`mailto:${contactEmails.general}`} className="mt-2 inline-flex text-sm font-semibold text-[#175cd3]">{contactEmails.general}</a>
          <Link href="/contact" className="mt-5 inline-flex items-center gap-2 rounded-full border border-[#b9d8f2] bg-[#f1f8ff] px-4 py-2 text-sm font-semibold text-[#175cd3] transition hover:border-[#175cd3]"> <Mail className="h-4 w-4" /> Talk to PrivateDAO <ArrowUpRight className="h-3.5 w-3.5" /></Link>
        </div>

        <nav aria-label="Solution links" className="grid content-start gap-2 text-sm">
          <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.24em] text-[#7a8ba0]">Solutions</div>
          {solutionLinks.map(([label, href]) => <Link key={href} href={href} className="text-[#52647d] transition hover:text-[#175cd3]">{label}</Link>)}
        </nav>

        <nav aria-label="Company links" className="grid content-start gap-2 text-sm">
          <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.24em] text-[#7a8ba0]">Company</div>
          {companyLinks.map(([label, href]) => <Link key={href} href={href} className="text-[#52647d] transition hover:text-[#175cd3]">{label}</Link>)}
          <Link href="/agents" className="text-[#52647d] transition hover:text-[#175cd3]">Agent ecosystem</Link>
          <a href={agentExchangeUrl} target="_blank" rel="noreferrer" className="text-[#52647d] transition hover:text-[#175cd3]">Agent Exchange</a>
          <Link href="/developers" className="text-[#52647d] transition hover:text-[#175cd3]">Developers</Link>
          <Link href="/security" className="text-[#52647d] transition hover:text-[#175cd3]">Security</Link>
          <a href={`mailto:${contactEmails.support}`} className="text-[#52647d] transition hover:text-[#175cd3]">Support</a>
          <a href="https://github.com/apps/privatedao-agent-exchange" target="_blank" rel="noreferrer" className="text-[#52647d] transition hover:text-[#175cd3]">GitHub App</a>
        </nav>
      </div>

      <div className="border-t border-[#dce5f0]">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-4 py-4 text-xs text-[#7a8ba0] sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2"><span>Official channels</span>{communityLinks.map((item) => <a key={item.href} href={item.href} target="_blank" rel="noreferrer" className="font-medium text-[#52647d] hover:text-[#175cd3]">{item.title}</a>)}</div>
          <span>© PrivateDAO. Private decisions. Verifiable outcomes.</span>
        </div>
      </div>
    </footer>
  );
}
