import type { Metadata } from "next";
import Link from "next/link";
import { ArrowDownToLine, ArrowUpRight, BadgeCheck, Layers3, ShieldCheck } from "lucide-react";

import { OperationsShell } from "@/components/operations-shell";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { buildRouteMetadata } from "@/lib/route-metadata";
import { cn } from "@/lib/utils";

export const metadata: Metadata = buildRouteMetadata({
  title: "PrivateDAO Whitepaper Version 2.0",
  description:
    "PrivateDAO whitepaper: confidential coordination infrastructure for onchain organizations, with privacy, accountability, verifiable execution, selective disclosure, and operational continuity.",
  path: "/whiteprint",
  keywords: [
    "PrivateDAO whitepaper",
    "confidential coordination infrastructure",
    "onchain organizations",
    "Solana organizations",
    "selective disclosure",
    "verifiable execution",
  ],
});

const downloadHref = "/assets/private-dao-founder-whiteprint.md";

const coordinationActivity = [
  "Treasury planning",
  "Contributor evaluation",
  "Reviewer assignment",
  "Payroll workflows",
  "Sensitive discussions",
  "Emergency response",
  "Operational approvals",
] as const;

const beforeAfter = [
  [
    "Before a proposal appears",
    ["Research happens.", "Discussions happen.", "Reviews happen.", "Treasury analysis happens.", "Stakeholder alignment happens."],
  ],
  [
    "After a proposal passes",
    ["Execution happens.", "Resource allocation happens.", "Reporting happens.", "Accountability happens."],
  ],
] as const;

const governanceLimits = [
  "Confidential operations",
  "Treasury workflows",
  "Sensitive contributor data",
  "Internal organizational processes",
  "Private approvals",
  "Selective disclosure",
  "Recovery procedures",
  "Operational continuity",
] as const;

const corePrinciples = [
  ["Privacy by Default", "Sensitive information should not become public simply because an organization operates onchain."],
  ["Verifiable Execution", "Actions should be provably executed according to organizational rules."],
  ["Selective Disclosure", "Organizations should reveal outcomes without exposing unnecessary operational details."],
  ["Operational Continuity", "Coordination systems must continue through leadership changes, contributor turnover, and organizational stress."],
  ["Composability", "PrivateDAO should integrate naturally with the broader Solana ecosystem."],
] as const;

const architectureLayers = [
  ["Governance Layer", "Proposal creation, voting mechanisms, quorum enforcement, and approval logic."],
  ["Treasury Layer", "Treasury authorization, delegated execution, and operational accountability."],
  ["Coordination Layer", "Confidential approvals, reviewer workflows, and contributor coordination."],
  ["Intelligence Layer", "Operational visibility, organizational analytics, and governance intelligence."],
  ["Execution Layer", "Integration with treasury systems and downstream infrastructure."],
] as const;

const initialUseCases = [
  ["Confidential Governance", "Private organizational decisions with verifiable outcomes."],
  ["Treasury Coordination", "Managing treasury operations without exposing sensitive strategy."],
  ["Reviewer Networks", "Coordinating reviewers, evaluators, and committees."],
  ["Contributor Operations", "Managing contributor activity and accountability workflows."],
  ["Grant Committees", "Evaluating applications while preserving reviewer independence."],
  ["Emergency Coordination", "Maintaining operational continuity during crises."],
] as const;

const ecosystemStrategy = [
  ["Phantom", "Wallet onboarding"],
  ["Squads and Altitude", "Treasury coordination"],
  ["Arcium", "Encrypted computation research"],
  ["World ID", "Proof-of-human coordination"],
  ["Vanish", "Privacy-preserving execution"],
  ["Helius, Triton, and FluxRPC", "Infrastructure resilience"],
] as const;

const whyNow = [
  "Organizations are moving onchain.",
  "Treasuries are growing.",
  "Global contributor networks are expanding.",
  "AI agents are beginning to participate in workflows.",
  "Privacy requirements are increasing.",
] as const;

const longTermCapabilities = [
  "Coordinating humans",
  "Coordinating AI agents",
  "Managing treasury operations",
  "Preserving confidentiality",
  "Maintaining accountability",
  "Producing verifiable outcomes",
  "Expanding cross-chain only after proving the operating model on Solana",
] as const;

function BulletList({ items }: { items: readonly string[] }) {
  return (
    <div className="grid gap-2">
      {items.map((item) => (
        <div key={item} className="flex gap-3 rounded-2xl border border-white/8 bg-black/20 px-4 py-3">
          <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-100/78" />
          <p className="text-sm leading-6 text-white/66">{item}</p>
        </div>
      ))}
    </div>
  );
}

export default function WhitepaperPage() {
  return (
    <OperationsShell
      eyebrow="Whitepaper · Version 2.0"
      title="Confidential Coordination Infrastructure for Onchain Organizations"
      description="PrivateDAO enables organizations to coordinate, approve, execute, audit, and evolve while preserving confidentiality and maintaining verifiability."
      badges={[
        { label: "Version 2.0", variant: "cyan" },
        { label: "Onchain organizations", variant: "success" },
        { label: "Governance is first", variant: "violet" },
      ]}
    >
      <section className="rounded-[30px] border border-emerald-300/18 bg-[radial-gradient(circle_at_top_left,rgba(20,241,149,0.16),transparent_34%),linear-gradient(135deg,rgba(7,13,26,0.98),rgba(4,7,18,0.98))] p-5 sm:p-7">
        <div className="flex flex-wrap gap-2">
          <Badge variant="cyan">PrivateDAO</Badge>
          <Badge variant="success">Confidential coordination</Badge>
          <Badge variant="violet">Public verification</Badge>
        </div>
        <h1 className="mt-5 max-w-5xl text-3xl font-semibold tracking-[-0.045em] text-white sm:text-5xl">
          Governance is the first application. Coordination is the destination.
        </h1>
        <p className="mt-4 max-w-4xl text-base leading-8 text-white/68">
          Onchain organizations have solved ownership. They have partially solved governance. They have not solved
          coordination.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <a href={downloadHref} download className={cn(buttonVariants({ size: "sm" }))}>
            Download whitepaper
            <ArrowDownToLine className="h-4 w-4" />
          </a>
          <Link href="/thesis" className={cn(buttonVariants({ size: "sm", variant: "secondary" }))}>
            Read coordination thesis
          </Link>
          <Link href="/deck" className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>
            Open pitch deck
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <section className="rounded-[28px] border border-cyan-300/16 bg-cyan-300/[0.06] p-5 sm:p-6">
        <div className="text-[11px] uppercase tracking-[0.25em] text-cyan-100/76">Abstract</div>
        <h2 className="mt-3 text-2xl font-semibold text-white">The coordination gap is becoming the limiting layer.</h2>
        <div className="mt-4 max-w-5xl space-y-3 text-sm leading-7 text-white/66">
          <p>
            Critical organizational activity still happens outside governance systems. As organizations grow, an
            increasing percentage of important decisions migrate into private chats, spreadsheets, informal processes,
            and trusted operators.
          </p>
          <p>
            Governance becomes visible. Operations remain invisible. PrivateDAO is building confidential coordination
            infrastructure for organizations operating on Solana.
          </p>
          <p>
            The objective is not simply enabling voting. The objective is enabling organizations to coordinate, approve,
            execute, audit, and evolve while preserving confidentiality and maintaining verifiability.
          </p>
        </div>
        <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {coordinationActivity.map((item) => (
            <div key={item} className="rounded-2xl border border-white/10 bg-black/22 px-4 py-3 text-sm text-white/68">
              {item}
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-[28px] border border-white/10 bg-white/[0.035] p-5 sm:p-6">
        <div className="text-[11px] uppercase tracking-[0.25em] text-white/46">The Coordination Problem</div>
        <h2 className="mt-3 text-2xl font-semibold text-white">Organizations spend most of their time outside voting.</h2>
        <p className="mt-3 max-w-5xl text-sm leading-7 text-white/64">
          Most governance systems focus on a single event: a vote. Operational processes before and after that event are
          frequently disconnected from governance systems. The result is hidden centralization.
        </p>
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          {beforeAfter.map(([title, items]) => (
            <article key={title} className="rounded-[24px] border border-white/10 bg-black/22 p-5">
              <h3 className="text-lg font-semibold text-white">{title}</h3>
              <div className="mt-4">
                <BulletList items={items} />
              </div>
            </article>
          ))}
        </div>
        <p className="mt-5 text-sm leading-7 text-white/66">
          Organizations may appear decentralized while depending on invisible coordination structures. PrivateDAO is
          designed to make coordination itself a first-class organizational primitive.
        </p>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-[28px] border border-amber-300/16 bg-amber-300/[0.06] p-5 sm:p-6">
          <div className="text-[11px] uppercase tracking-[0.25em] text-amber-100/76">Why Existing Governance Is Not Enough</div>
          <h2 className="mt-3 text-2xl font-semibold text-white">The future challenge is not voting.</h2>
          <p className="mt-3 text-sm leading-7 text-white/64">
            Current governance tools generally optimize for proposal creation, voting, and result publication. As
            treasury sizes and organizational complexity grow, the missing operational layers become critical.
          </p>
          <div className="mt-5">
            <BulletList items={governanceLimits} />
          </div>
        </article>

        <article className="rounded-[28px] border border-emerald-300/16 bg-emerald-300/[0.06] p-5 sm:p-6">
          <div className="text-[11px] uppercase tracking-[0.25em] text-emerald-100/76">The PrivateDAO Thesis</div>
          <h2 className="mt-3 text-2xl font-semibold text-white">Selective disclosure, not complete secrecy.</h2>
          <p className="mt-3 text-sm leading-7 text-white/64">
            Organizations require infrastructure capable of balancing privacy, accountability, verifiability, and
            operational efficiency. Historically these objectives conflicted.
          </p>
          <p className="mt-4 text-sm leading-7 text-white/64">
            PrivateDAO introduces a framework where organizations can preserve sensitive operational information while
            still proving that processes occurred correctly.
          </p>
        </article>
      </section>

      <section className="rounded-[28px] border border-violet-300/16 bg-violet-300/[0.06] p-5 sm:p-6">
        <div className="flex items-center gap-3 text-violet-100">
          <ShieldCheck className="h-5 w-5" />
          <div className="text-[11px] uppercase tracking-[0.25em]">Core Principles</div>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {corePrinciples.map(([title, body]) => (
            <article key={title} className="rounded-2xl border border-white/10 bg-black/22 p-4">
              <h3 className="text-base font-semibold text-white">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-white/62">{body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-[28px] border border-cyan-300/16 bg-cyan-300/[0.06] p-5 sm:p-6">
        <div className="flex items-center gap-3 text-cyan-100">
          <Layers3 className="h-5 w-5" />
          <div className="text-[11px] uppercase tracking-[0.25em]">Architecture Overview</div>
        </div>
        <h2 className="mt-3 text-2xl font-semibold text-white">Several coordination layers, one organizational workflow.</h2>
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {architectureLayers.map(([title, body]) => (
            <article key={title} className="rounded-2xl border border-white/10 bg-black/22 p-4">
              <h3 className="text-base font-semibold text-white">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-white/62">{body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-[28px] border border-white/10 bg-white/[0.035] p-5 sm:p-6">
        <div className="text-[11px] uppercase tracking-[0.25em] text-white/46">Initial Use Cases</div>
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {initialUseCases.map(([title, body]) => (
            <article key={title} className="rounded-2xl border border-white/10 bg-black/22 p-4">
              <h3 className="text-base font-semibold text-white">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-white/62">{body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-[28px] border border-emerald-300/16 bg-emerald-300/[0.06] p-5 sm:p-6">
        <div className="text-[11px] uppercase tracking-[0.25em] text-emerald-100/76">Ecosystem Integration Strategy</div>
        <h2 className="mt-3 text-2xl font-semibold text-white">PrivateDAO does not attempt to replace ecosystem infrastructure. It coordinates it.</h2>
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {ecosystemStrategy.map(([tool, role]) => (
            <div key={tool} className="rounded-2xl border border-white/10 bg-black/22 p-4">
              <div className="text-base font-semibold text-white">{tool}</div>
              <div className="mt-2 text-sm leading-6 text-white/62">{role}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-[28px] border border-cyan-300/16 bg-cyan-300/[0.06] p-5 sm:p-6">
          <div className="text-[11px] uppercase tracking-[0.25em] text-cyan-100/76">Why Now</div>
          <h2 className="mt-3 text-2xl font-semibold text-white">A new organizational coordination layer is becoming necessary infrastructure.</h2>
          <div className="mt-5">
            <BulletList items={whyNow} />
          </div>
        </article>

        <article className="rounded-[28px] border border-violet-300/16 bg-violet-300/[0.06] p-5 sm:p-6">
          <div className="text-[11px] uppercase tracking-[0.25em] text-violet-100/76">Long-Term Vision</div>
          <h2 className="mt-3 text-2xl font-semibold text-white">The coordination operating layer for onchain organizations.</h2>
          <p className="mt-3 text-sm leading-7 text-white/64">
            Future organizations will require infrastructure capable of coordinating humans and AI agents while
            preserving confidentiality, maintaining accountability, and producing verifiable outcomes.
          </p>
          <p className="mt-3 text-sm leading-7 text-white/64">
            PrivateDAO is Solana-first. Cross-chain expansion is a future direction only after the coordination,
            execution, and proof model has been demonstrated through real operating use on Solana.
          </p>
          <div className="mt-5">
            <BulletList items={longTermCapabilities} />
          </div>
        </article>
      </section>

      <section className="rounded-[30px] border border-emerald-300/18 bg-[linear-gradient(135deg,rgba(20,241,149,0.12),rgba(0,194,255,0.08),rgba(153,69,255,0.10))] p-5 sm:p-7">
        <div className="text-[11px] uppercase tracking-[0.25em] text-emerald-100/76">Conclusion</div>
        <h2 className="mt-3 max-w-5xl text-3xl font-semibold tracking-[-0.04em] text-white">
          The next generation of organizations will not be limited by ownership systems. They will be limited by coordination systems.
        </h2>
        <div className="mt-4 max-w-4xl space-y-3 text-sm leading-7 text-white/66">
          <p>The organizations that coordinate effectively will outperform those that merely govern effectively.</p>
          <p>PrivateDAO exists to provide the infrastructure required for that transition.</p>
          <p className="font-semibold text-white">Not a governance application. Not a voting interface. A confidential coordination layer for the future of onchain organizations.</p>
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/try" className={cn(buttonVariants({ size: "sm" }))}>Try the live flow</Link>
          <Link href="/proof/?judge=1" className={cn(buttonVariants({ size: "sm", variant: "secondary" }))}>Verify proof</Link>
          <Link href="/investors" className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>Investor page</Link>
        </div>
      </section>
    </OperationsShell>
  );
}
