import type { Metadata } from "next";
import Link from "next/link";

import { BreadcrumbJsonLd, JsonLd } from "@/components/seo-structured-data";
import { OperationsShell } from "@/components/operations-shell";
import { buildRouteMetadata } from "@/lib/route-metadata";
import { siteUrl } from "@/lib/site-brand";
import evidence from "../../../../public/evm-verification/base-integration.json";

export const metadata: Metadata = buildRouteMetadata({
  title: "Base Integration and E2E Proof",
  description: "Evidence-backed Base Sepolia workflows for PrivateDAO verification, treasury, governance, and sealed auctions.",
  path: "/integrations/base",
  image: "/assets/social/whitepaper.png",
  keywords: ["PrivateDAO Base integration", "Base Sepolia E2E", "Base Builder Code"],
});

export default function BaseIntegrationPage() {
  return (
    <OperationsShell eyebrow="Build · Base integration" title="PrivateDAO on Base, with evidence you can inspect." description="Base Sepolia is the active testnet lane for these workflows. Each entry below is sourced from a recorded transaction and its corresponding verification result." navigationMode="guided" badges={[{ label: "Base Sepolia", variant: "cyan" }, { label: "Mainnet execution disabled", variant: "warning" }]}>
      <JsonLd data={{ "@context": "https://schema.org", "@type": "TechArticle", headline: "PrivateDAO Base Integration and E2E Proof", description: metadata.description, url: `${siteUrl}/integrations/base/`, author: { "@type": "Organization", name: "PrivateDAO", url: siteUrl } }} />
      <BreadcrumbJsonLd items={[{ name: "PrivateDAO", path: "/" }, { name: "Base integration", path: "/integrations/base" }]} />
      <section className="grid gap-4 md:grid-cols-3">
        {[["Network", "Base Sepolia"], ["Chain ID", String(evidence.chainId)], ["Builder Code", evidence.builderCode.builderCode]].map(([label, value]) => <div key={label} className="enterprise-card rounded-[22px] p-6"><div className="commercial-eyebrow">{label}</div><div className="mt-3 break-all text-xl font-semibold text-[#10233f]">{value}</div></div>)}
      </section>
      <section className="space-y-4">
        {evidence.workflows.map((workflow) => <article key={workflow.product} className="enterprise-card rounded-[22px] p-6 sm:p-7"><div className="flex flex-wrap items-start justify-between gap-4"><div><div className="commercial-eyebrow">{workflow.product}</div><h2 className="mt-2 text-xl font-semibold text-[#10233f]">{workflow.status === "testnet_verified" ? "E2E verified on Base Sepolia" : "Evidence recorded on Base Sepolia"}</h2></div><span className="rounded-full border border-[#b8e6cc] bg-[#effbf3] px-3 py-1 text-xs font-semibold text-[#18794e]">{workflow.verification ? "PASS" : "CHECK"}</span></div><dl className="mt-6 grid gap-4 text-sm sm:grid-cols-2"><div><dt className="text-[#718198]">Transaction hash</dt><dd className="mt-1 break-all font-mono text-[#10233f]">{workflow.txHash}</dd></div><div><dt className="text-[#718198]">Block</dt><dd className="mt-1 text-[#10233f]">{workflow.blockNumber || "Recorded in source evidence"}</dd></div><div className="sm:col-span-2"><dt className="text-[#718198]">Builder Code attribution</dt><dd className="mt-1 text-[#10233f]">{workflow.builderCodeAttribution}</dd></div></dl><div className="mt-6 flex flex-wrap gap-4 text-sm font-semibold"><a className="text-[#175cd3]" href={workflow.explorerUrl} target="_blank" rel="noreferrer">View on BaseScan</a>{workflow.proofUrl ? <a className="text-[#175cd3]" href={workflow.proofUrl}>Open verification result</a> : null}</div></article>)}
      </section>
      <section className="enterprise-card rounded-[24px] p-6 sm:p-8"><div className="commercial-eyebrow">Attribution and boundaries</div><h2 className="mt-3 text-2xl font-semibold text-[#10233f]">Builder Code is configured for Base transactions only.</h2><p className="mt-4 max-w-4xl text-sm leading-7 text-[#5d6d82]">The current runner appends the registered ERC-8021 data suffix only when the Base deployer wallet matches the registered public wallet. Base Mainnet execution remains disabled. No product is promoted from RPC health or funding alone.</p><Link href="/developers" className="mt-5 inline-flex text-sm font-semibold text-[#175cd3]">Open developer resources</Link></section>
    </OperationsShell>
  );
}
