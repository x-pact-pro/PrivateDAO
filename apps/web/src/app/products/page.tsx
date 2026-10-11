import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { OperationsShell } from "@/components/operations-shell";
import { OrganizationFitSelector } from "@/components/organization-fit-selector";
import { ProductNetworkWorkspace } from "@/components/product-network-workspace";
import { buildRouteMetadata } from "@/lib/route-metadata";
import { commercialProductGroups, ecosystemCommercialProducts, primaryCommercialProducts, type CommercialProduct } from "@/lib/commercial-product-map";
import { isRuntimeProductAvailable } from "@/lib/runtime-catalog";

export const metadata: Metadata = buildRouteMetadata({
  title: "Solutions",
  description: "PrivateDAO solutions for sensitive payroll, treasury, governance, transactions, and verification workflows.",
  path: "/products",
  keywords: ["PrivateDAO solutions", "confidential payroll", "private treasury", "blind verification", "private governance"],
});

function ProductLink({ product }: { product: CommercialProduct }) {
  const status = product.runtimeProductId
    ? isRuntimeProductAvailable(product.runtimeProductId)
      ? "Ready to explore"
      : "Guided setup"
    : null;
  const content = <><div className="flex items-start justify-between gap-3"><h3 className="text-base font-semibold text-[#10233f]">{product.title}</h3><ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-[#175cd3]" /></div><p className="mt-2 text-sm leading-6 text-[#5d6d82]">{product.summary}</p><div className="mt-3 flex flex-wrap items-center gap-2"><p className="text-xs font-medium text-[#7a8ba0]">For {product.audience.toLowerCase()}</p>{status ? <span className="rounded-full bg-[#edf4ff] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#175cd3]">{status}</span> : null}</div></>;
  const className = "group rounded-[16px] border border-[#dce5f0] bg-[#f7f9fc] p-4 transition hover:-translate-y-0.5 hover:border-[#175cd3]";
  if (product.href.startsWith("http")) return <a href={product.href} target="_blank" rel="noreferrer" className={className}>{content}</a>;
  return <Link href={product.href} className={className}>{content}</Link>;
}

function ProductGroup({ group }: { group: (typeof commercialProductGroups)[number] }) {
  const Icon = group.icon;
  return <section className="enterprise-card rounded-[20px] p-5 sm:p-6"><div className="flex items-start gap-3 border-b border-[#dce5f0] pb-4"><div className="rounded-[12px] bg-[#edf4ff] p-2.5"><Icon className="h-5 w-5 text-[#175cd3]" /></div><div><div className="text-[11px] font-bold uppercase tracking-[0.23em] text-[#175cd3]">{group.title}</div><p className="mt-2 text-sm leading-6 text-[#5d6d82]">{group.summary}</p></div></div><div className="mt-4 grid gap-3">{group.products.map((product) => <ProductLink key={product.title} product={product} />)}</div></section>;
}

export default function ProductsPage() {
  return (
    <OperationsShell
      eyebrow="Solutions"
      title="Protect the work. Prove the outcome."
      description="Start with the information, decision, payment, or bid that should stay private. PrivateDAO gives your organization a clear path from sensitive work to trusted results."
      navigationMode="guided"
      badges={[{ label: "Private by design", variant: "success" }, { label: "Clear approvals", variant: "cyan" }, { label: "Trusted outcomes", variant: "violet" }]}
    >
    <ProductNetworkWorkspace />
    <div className="grid gap-5 lg:grid-cols-3">{primaryCommercialProducts.map((group) => <ProductGroup key={group.title} group={group} />)}</div>
    <OrganizationFitSelector />
    <section className="enterprise-dark-panel rounded-[24px] bg-[#10233f] p-6 text-white sm:p-8"><div className="text-[11px] font-bold uppercase tracking-[0.25em] text-[#9fc7ff]">Beyond the core workflow</div><div className="mt-3 flex flex-wrap items-end justify-between gap-5"><div><h2 className="text-2xl font-semibold tracking-[-0.03em]">Extend the ecosystem when your organization is ready.</h2><p className="mt-3 max-w-2xl text-sm leading-7 text-[#d5e2f3]">Agent services and PDAO Worlds remain separate products without complicating the enterprise path.</p></div><div className="flex flex-wrap gap-3">{ecosystemCommercialProducts.flatMap((group) => group.products).map((product) => product.href.startsWith("http") ? <a key={product.title} href={product.href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full border border-white/25 px-4 py-2.5 text-sm font-semibold text-white">{product.cta} <ArrowRight className="h-4 w-4" /></a> : <Link key={product.title} href={product.href} className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-[#10233f]">{product.cta} <ArrowRight className="h-4 w-4" /></Link>)}</div></div></section>
    </OperationsShell>
  );
}
