import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, CheckCircle2, FileText, Github, Hash, MessageCircle, Send } from "lucide-react";

import { OperationsShell } from "@/components/operations-shell";
import { PrivacyExecutionClaimConsole } from "@/components/privacy-execution-claim-console";
import { buttonVariants } from "@/components/ui/button";
import { buildRouteMetadata } from "@/lib/route-metadata";
import { cn } from "@/lib/utils";

export const metadata: Metadata = buildRouteMetadata({
  title: "MetaDAO Grant Review",
  description:
    "Create a MetaDAO workflow that starts from existing community tools, assigns reviewers, records private reviews, approves treasury execution, and produces proof.",
  path: "/review",
  keywords: ["MetaDAO", "grant review", "coordination room", "private review", "treasury approval"],
});

const coordinationSources = [
  {
    label: "Telegram",
    value: "@privateDAOOS",
    href: "https://t.me/privateDAOOS",
    icon: Send,
    note: "Keep the first conversation where the community already lives.",
  },
  {
    label: "Discord",
    value: "PrivateDAO Discord",
    href: "https://discord.gg/dpD5c7Gfcc",
    icon: MessageCircle,
    note: "Bring reviewers and contributors into a shared coordination channel.",
  },
  {
    label: "Notion",
    value: "Paste review brief",
    href: "/review?claim=confidential-grant-review-request#privacy-claim-console",
    icon: FileText,
    note: "Attach the working brief without turning it into the source of truth.",
  },
  {
    label: "GitHub Issue",
    value: "Paste issue link",
    href: "/review?claim=metadao-grant-review-workflow#privacy-claim-console",
    icon: Github,
    note: "Keep public implementation discussion while review scores stay private.",
  },
  {
    label: "Forum Thread",
    value: "Paste proposal thread",
    href: "/review?claim=metadao-grant-review-workflow#privacy-claim-console",
    icon: Hash,
    note: "Anchor the governance source before moving into approval and proof.",
  },
] as const;

const privateDaoLayer = [
  "Paste MetaDAO proposal link",
  "Create coordination room",
  "Invite reviewers",
  "Record encrypted reviews",
  "Approve treasury request",
  "Execute payout",
  "Publish audit proof",
] as const;

export default function ReviewPage() {
  return (
    <OperationsShell
      eyebrow="MetaDAO execution layer"
      title="Create a MetaDAO workflow without forcing the community to leave Telegram or Discord"
      description="PrivateDAO fits around the tools teams already use. Keep discussion in Telegram, Discord, GitHub, Notion, or a forum thread; move into PrivateDAO when review, approval, treasury execution, and proof need privacy plus on-chain verification."
      navigationMode="guided"
      badges={[
        { label: "MetaDAO Grant Review", variant: "success" },
        { label: "Community-native intake", variant: "cyan" },
        { label: "Review -> Approve -> Execute -> Proof", variant: "violet" },
      ]}
    >
      <section className="min-w-0 overflow-hidden rounded-[28px] border border-emerald-300/18 bg-[radial-gradient(circle_at_top_left,rgba(20,241,149,0.18),transparent_34%),radial-gradient(circle_at_92%_0%,rgba(153,69,255,0.18),transparent_32%),linear-gradient(135deg,rgba(7,13,26,0.97),rgba(4,7,18,0.98))] p-5 sm:p-6">
        <div className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] xl:items-center">
          <div className="min-w-0">
            <div className="text-[11px] uppercase tracking-[0.22em] text-emerald-100/78">Create MetaDAO Workflow</div>
            <h2 className="mt-3 max-w-4xl text-2xl font-semibold tracking-[-0.03em] text-white sm:text-3xl">
              Proposal passes in MetaDAO. PrivateDAO turns the next steps into a private, reviewable execution path.
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-white/66">
              The first pain is not voting. The pain starts after a proposal passes: who reviews, who approves, how the
              treasury moves, and what proof the community can inspect without exposing sensitive review material.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link href="/review?claim=metadao-grant-review-workflow#privacy-claim-console" className={cn(buttonVariants({ size: "sm" }))}>
                Start MetaDAO workflow
                <ArrowUpRight className="h-4 w-4" />
              </Link>
              <a
                href="https://api.privatedao.org/api/v1/privacy-execution-claims/prepare?claim=metadao-grant-review-workflow"
                target="_blank"
                rel="noreferrer"
                className={cn(buttonVariants({ size: "sm", variant: "secondary" }))}
              >
                Open live prepare API
              </a>
              <Link href="/proof" className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>
                Verify proof
              </Link>
              <Link href="/judge" className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>
                Open judge path
              </Link>
            </div>
          </div>

          <div className="min-w-0 rounded-[24px] border border-white/10 bg-black/24 p-4">
            <div className="text-[11px] uppercase tracking-[0.2em] text-white/44">Workflow spine</div>
            <div className="mt-4 grid gap-2">
              {privateDaoLayer.map((step, index) => (
                <div key={step} className="flex min-w-0 items-center gap-3 rounded-2xl border border-white/8 bg-white/[0.035] px-3 py-2.5">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl border border-emerald-300/18 bg-emerald-300/10 font-mono text-[11px] text-emerald-100">
                    {index + 1}
                  </span>
                  <span className="min-w-0 text-sm text-white/72">{step}</span>
                  {index >= 3 ? <CheckCircle2 className="ml-auto h-4 w-4 shrink-0 text-cyan-100/76" /> : null}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5">
        <div className="text-[11px] uppercase tracking-[0.22em] text-white/44">Coordination sources</div>
        <h2 className="mt-3 text-2xl font-semibold text-white">Do not replace community tools. Bind them to proof.</h2>
        <p className="mt-3 max-w-4xl text-sm leading-7 text-white/64">
          SrMessi&apos;s point is the adoption path: users should keep Telegram, Discord, GitHub, Notion, and forum
          discussion. PrivateDAO becomes the layer for reviewer assignment, encrypted review, treasury approval,
          execution receipt, and audit proof.
        </p>
        <div className="mt-5 grid gap-3 md:grid-cols-[repeat(2,minmax(0,1fr))] xl:grid-cols-[repeat(5,minmax(0,1fr))]">
          {coordinationSources.map((source) => {
            const Icon = source.icon;
            return (
              <a
                key={source.label}
                href={source.href}
                target={source.href.startsWith("http") ? "_blank" : undefined}
                rel={source.href.startsWith("http") ? "noreferrer" : undefined}
                className="min-w-0 rounded-[22px] border border-white/10 bg-black/20 p-4 transition hover:border-cyan-300/30"
              >
                <Icon className="h-4 w-4 text-cyan-100" />
                <div className="mt-3 text-sm font-semibold text-white">{source.label}</div>
                <div className="mt-1 break-words text-sm text-emerald-100/72">{source.value}</div>
                <div className="mt-3 text-xs leading-6 text-white/56">{source.note}</div>
              </a>
            );
          })}
        </div>
      </section>

      <section className="rounded-[28px] border border-cyan-300/16 bg-cyan-300/[0.07] p-5">
        <div className="text-[11px] uppercase tracking-[0.22em] text-cyan-100/76">PrivateDAO layer</div>
        <div className="mt-3 grid gap-3 md:grid-cols-[repeat(2,minmax(0,1fr))] xl:grid-cols-[repeat(4,minmax(0,1fr))]">
          {[
            ["Reviewer Assignment", "Map reviewers to a passed proposal without exposing every reviewer's full reasoning publicly."],
            ["Encrypted Reviews", "Keep scores, notes, conflicts, and rationale private until the correct disclosure step."],
            ["Approval Proofs", "Generate a wallet-visible proof path before treasury execution."],
            ["Treasury Request", "Move from approved review into governed payout, receipt, and audit continuity."],
          ].map(([title, body]) => (
            <div key={title} className="min-w-0 rounded-2xl border border-white/10 bg-black/22 p-4">
              <div className="text-base font-semibold text-white">{title}</div>
              <p className="mt-2 text-sm leading-6 text-white/60">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="privacy-claim-console" className="scroll-mt-32">
        <PrivacyExecutionClaimConsole compact />
      </section>
    </OperationsShell>
  );
}
