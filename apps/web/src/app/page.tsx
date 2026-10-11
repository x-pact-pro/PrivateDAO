import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Suspense } from "react";

import { LegacyEntryBridge } from "@/components/legacy-entry-bridge";
import { CommercialHeroCopy } from "@/components/commercial-hero-copy";
import { NetworkMarquee } from "@/components/network-marquee";
import { OrganizationFitSelector } from "@/components/organization-fit-selector";
import { buildBrandHomeMetadata } from "@/lib/route-metadata";
import { commercialProductGroups, ecosystemCommercialProducts } from "@/lib/commercial-product-map";

export const metadata: Metadata = buildBrandHomeMetadata();

const solutionGroups = commercialProductGroups.slice(0, 3).map((group) => ({
  label: group.title,
  title: group.summary,
  items: group.products.map((product) => [product.title, product.summary, product.href] as const),
}));

const principles = [
  ["Private by design", "Sensitive inputs stay bounded to the people and policies that need them."],
  ["Wallet-agnostic", "Your team starts with the workflow. The right wallet, network, and provider appear only when execution requires them."],
  ["Outcome-led", "Every workflow ends with a clear decision, receipt, or verification path."],
] as const;

const audiences = ["Companies", "Web3 organizations", "Governments", "Financial markets", "Institutions"];

const realWorldExamples = [
  ["Collective ownership", "Members can vote privately on a shared physical or digital asset, while the result remains accountable and resistant to pressure."],
  ["A private investment fund", "Capital can be pooled, projects can be reviewed without bias, and the final decision can be disclosed with a clear proof."],
  ["A trusted payroll", "Salary, tax, and deduction details stay private while the organization proves the approved payroll was calculated and settled correctly."],
  ["Private identity checks", "A KYC or KYB provider attests to eligibility, identity, jurisdiction, or authorized representation without exposing the underlying file."],
] as const;

export default function HomePage() {
  return (
    <>
      <Suspense fallback={null}>
        <LegacyEntryBridge />
      </Suspense>

      <main className="commercial-home">
        <section className="commercial-hero mx-auto w-full max-w-7xl px-4 pb-16 pt-10 sm:px-6 sm:pb-24 sm:pt-16 lg:px-8">
          <div className="grid items-center gap-12 lg:grid-cols-[1.08fr_0.92fr] lg:gap-20">
            <div>
              <CommercialHeroCopy />
            </div>

            <div className="brand-hero-stage">
              <div className="brand-hero-orbit brand-hero-orbit-one" />
              <div className="brand-hero-orbit brand-hero-orbit-two" />
              <div className="brand-hero-card">
                <div className="brand-hero-card-top"><span>PrivateDAO</span><span className="brand-live-dot"><span /> Ready for your workflow</span></div>
                <div className="brand-hero-logo-wrap"><Image unoptimized src="/assets/privatedao-brand-mark-20260918.jpeg" alt="PrivateDAO" width={560} height={560} priority className="brand-hero-logo" /></div>
                <div className="brand-hero-caption"><span>Private decisions.</span><strong>Verifiable outcomes.</strong></div>
              </div>
            </div>
          </div>
        </section>

        <NetworkMarquee />

        <section className="mx-auto w-full max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
          <div className="grid gap-10 lg:grid-cols-[0.82fr_1.18fr] lg:items-start">
            <div>
              <div className="commercial-eyebrow">Privacy should be normal</div>
              <h2 className="commercial-section-title mt-4">Proof without exposure.</h2>
              <p className="commercial-section-lead mt-5">PrivateDAO makes important organizational work private by default, then makes the outcome easy to trust.</p>
            </div>
            <div className="commercial-concept-grid">
              {[
                ["Your work stays yours", "Salaries, bids, approvals, and internal decisions do not need to become public records."],
                ["Proof without exposure", "Prove that a process was completed correctly without revealing the sensitive information behind it."],
                ["Your organization. Your rules.", "Define who can approve, execute, and verify sensitive operations."],
                ["Infrastructure follows the workflow", "Your process stays consistent while the appropriate execution path remains in the background."],
              ].map(([title, body], index) => (
                <article key={title} className={`commercial-concept ${index === 0 ? "commercial-concept-featured" : ""}`}>
                  <span className="commercial-concept-index">0{index + 1}</span>
                  <h3>{title}</h3>
                  <p>{body}</p>
                </article>
              ))}
            </div>
          </div>
          <div className="commercial-outcome-card mt-8">
            <div>
              <div className="commercial-eyebrow light">Private by default</div>
              <h3>Show the outcome. Keep the sensitive work private.</h3>
            </div>
            <div className="commercial-outcome-example" aria-label="Example of a confidential payroll outcome">
              <div><span>Confidential Payroll</span><strong>Completed privately</strong></div>
              <div><span>Approval</span><strong>Verified</strong></div>
              <div><span>Settlement</span><strong>Verified</strong></div>
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
          <div className="max-w-3xl"><div className="commercial-eyebrow">Privacy without losing proof</div><h2 className="commercial-section-title mt-4">Keep sensitive information private while proving that the right process happened.</h2><p className="commercial-section-lead mt-5">The right people can review and approve the work. Everyone else gets a clear, trustworthy outcome without receiving the information that should remain confidential.</p></div>
          <div className="mt-10 grid gap-4 lg:grid-cols-3">{principles.map(([title, body], index) => <article key={title} className={`commercial-principle ${index === 1 ? "commercial-principle-featured" : ""}`}><div className="commercial-principle-number">0{index + 1}</div><h3>{title}</h3><p>{body}</p></article>)}</div>
        </section>

        <OrganizationFitSelector />

        <section className="mx-auto w-full max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
          <div className="max-w-3xl">
            <div className="commercial-eyebrow">Two ways in</div>
            <h2 className="commercial-section-title mt-4">Meet your organization where it is.</h2>
            <p className="commercial-section-lead mt-5">PrivateDAO is one infrastructure layer for organizations already operating onchain and organizations adding Web3 capability for the first time.</p>
          </div>
          <div className="mt-10 grid gap-5 lg:grid-cols-2">
            <article className="solution-group">
              <div className="solution-group-label">Already in Web3?</div>
              <h3>Add privacy and control to the infrastructure you already use.</h3>
              <p className="mt-4 max-w-xl text-base leading-7 text-[#52647d]">Keep your existing wallets, networks, policies, and operating model while bringing sensitive payroll, treasury, governance, bids, and records into verifiable workflows.</p>
              <Link href="/products" className="commercial-text-link mt-6">Explore the product layer <ArrowUpRight className="h-4 w-4" /></Link>
            </article>
            <article className="solution-group">
              <div className="solution-group-label">Not in Web3 yet?</div>
              <h3>Add Web3 capability without rebuilding around crypto.</h3>
              <p className="mt-4 max-w-xl text-base leading-7 text-[#52647d]">Start with the workflow your organization already understands. Add wallet signing, network execution, digital assets, or verifiable outcomes only where they create business value.</p>
              <Link href="/thesis" className="commercial-text-link mt-6">Read the thesis <ArrowUpRight className="h-4 w-4" /></Link>
            </article>
          </div>
        </section>

        <section className="mx-auto w-full max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
          <div className="max-w-3xl">
            <div className="commercial-eyebrow">What privacy looks like in practice</div>
            <h2 className="commercial-section-title mt-4">Join the digital economy without giving up control.</h2>
            <p className="commercial-section-lead mt-5">PrivateDAO helps an organization use blockchain coordination while keeping its internal decisions, people, and commercial context private. You do not need to become a Web3 or crypto company to add that capability.</p>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-2">
            {realWorldExamples.map(([title, body], index) => (
              <article key={title} className="commercial-concept">
                <span className="commercial-concept-index">0{index + 1}</span>
                <h3>{title}</h3>
                <p>{body}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="solutions" className="mx-auto w-full max-w-7xl scroll-mt-24 px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
          <div className="flex flex-col justify-between gap-6 border-b border-[#dce5f0] pb-8 lg:flex-row lg:items-end"><div className="max-w-3xl"><div className="commercial-eyebrow">What you can do</div><h2 className="commercial-section-title mt-4">Protect the work. Prove the outcome.</h2><p className="commercial-section-lead mt-5">Pay people without publishing salaries. Approve spending without exposing internal decisions. Run sealed procurement without revealing competing bids.</p></div><Link href="/products" className="commercial-text-link">Explore solutions <ArrowUpRight className="h-4 w-4" /></Link></div>
          <div className="mt-10 grid gap-5 lg:grid-cols-3">{solutionGroups.map((group) => <article key={group.label} className="solution-group"><div className="solution-group-label">{group.label}</div><h3>{group.title}</h3><div className="mt-7 grid gap-3">{group.items.map(([title, body, href]) => <Link key={title} href={href} className="solution-item group"><div><h4>{title}</h4><p>{body}</p></div><ArrowUpRight className="mt-1 h-5 w-5 shrink-0 text-[#175cd3] transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5" /></Link>)}</div></article>)}</div>
        </section>

        <section className="mx-auto w-full max-w-7xl px-4 pb-20 sm:px-6 lg:px-8 lg:pb-28">
          <div className="commercial-ecosystem-band">
            <div>
              <div className="commercial-eyebrow">Beyond the workflow</div>
              <h2 className="commercial-section-title mt-4">The same trust model, extended to software and people.</h2>
              <p className="commercial-section-lead mt-5">Agent services remain an independent product, connected by the same ideas: privacy, boundaries, evidence, and coordination.</p>
            </div>
            <div className="commercial-ecosystem-links">
              {ecosystemCommercialProducts.flatMap((group) => group.products).map((product) => {
                const external = product.href.startsWith("http");
                const content = <><div><strong>{product.title}</strong><span>{product.summary}</span></div><ArrowUpRight className="h-5 w-5 shrink-0 text-[#175cd3]" /></>;
                return external ? <a key={product.title} href={product.href} target="_blank" rel="noreferrer" className="solution-item group">{content}</a> : <Link key={product.title} href={product.href} className="solution-item group">{content}</Link>;
              })}
            </div>
          </div>
        </section>

        <section className="commercial-workflow-band"><div className="mx-auto grid w-full max-w-7xl gap-12 px-4 py-20 sm:px-6 lg:grid-cols-[0.8fr_1.2fr] lg:px-8 lg:py-24"><div><div className="commercial-eyebrow light">Your organization. Your rules.</div><h2 className="mt-4 text-4xl font-semibold tracking-[-0.045em] text-white sm:text-5xl">Set the rules for sensitive work. Keep the result clear.</h2><p className="mt-5 max-w-md text-base leading-7 text-[#c5d4e8]">Choose what stays private, who can approve it, and what an auditor, partner, board, or customer is allowed to verify.</p></div><div className="workflow-line">{["Choose the work", "Set your rules", "Run the process", "Approve when ready", "Share the outcome"].map((step, index) => <div key={step} className="workflow-step"><span>{String(index + 1).padStart(2, "0")}</span><div><strong>{step}</strong><p>{index === 0 ? "Start with payroll, spending, decisions, bids, or records." : index === 4 ? "Prove what happened without revealing everything that happened." : "PrivateDAO keeps sensitive details inside the process."}</p></div></div>)}</div></div></section>

        <section className="mx-auto w-full max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28"><div className="grid gap-10 lg:grid-cols-[1fr_1fr] lg:items-center"><div><div className="commercial-eyebrow">Built for your organization</div><h2 className="commercial-section-title mt-4">The same privacy standard, shaped to your scale.</h2><p className="commercial-section-lead mt-5">Start with one workflow for a small team, then extend it across finance, operations, leadership, and external reviewers.</p><Link href="/contact" className="commercial-secondary-cta mt-8">Discuss your workflow <ArrowUpRight className="h-4 w-4" /></Link></div><div className="audience-panel">{audiences.map((audience, index) => <div key={audience} className="audience-row"><span className="audience-index">0{index + 1}</span><span>{audience}</span><span className="audience-arrow">↗</span></div>)}</div></div></section>

        <section className="mx-auto w-full max-w-7xl px-4 pb-20 sm:px-6 lg:px-8 lg:pb-28"><div className="commercial-contact-cta"><div><div className="commercial-eyebrow light">Start with the problem</div><h2 className="mt-4 max-w-2xl text-3xl font-semibold tracking-[-0.04em] text-white sm:text-5xl">Tell us what must stay private.</h2><p className="mt-4 max-w-xl text-base leading-7 text-[#c5d4e8]">We will help you shape the right workflow, controls, and verification path.</p></div><Link href="/contact" className="commercial-light-cta">Talk to PrivateDAO <ArrowUpRight className="h-4 w-4" /></Link></div></section>
      </main>
    </>
  );
}
