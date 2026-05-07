"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  ArrowUpRight,
  BarChart3,
  BrainCircuit,
  BriefcaseBusiness,
  Code2,
  Coins,
  Compass,
  FileCheck2,
  FileSearch,
  FileText,
  Gamepad2,
  Gauge,
  Gift,
  KeyRound,
  LayoutDashboard,
  MessageSquareMore,
  PlayCircle,
  Rocket,
  Router,
  ShieldCheck,
  Smartphone,
  Sparkles,
  SquareTerminal,
} from "lucide-react";

import { useI18n } from "@/components/i18n-provider";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const operationsNav = [
  { href: "/start", label: "Start", icon: Compass, summary: "Guided onboarding and wallet-first flow" },
  { href: "/learn", label: "Learn", icon: FileText, summary: "Workflow-first onboarding and product operating guide" },
  { href: "/assistant", label: "AI Assistant", icon: Sparkles, summary: "Product guide across routes, docs, and proof" },
  { href: "/govern", label: "Govern", icon: SquareTerminal, summary: "Create, vote, and execute on Solana Testnet" },
  { href: "/intelligence", label: "Intelligence", icon: BrainCircuit, summary: "Risk scoring, market context, and signer decision support" },
  { href: "/treasury", label: "Treasury", icon: Gauge, summary: "Treasury health, solvency context, and agent policy routes" },
  { href: "/payroll", label: "Payroll", icon: Coins, summary: "Private payroll CSV, stablecoin choice, and auditor receipt flow" },
  { href: "/gaming", label: "Gaming", icon: Gamepad2, summary: "Guilds, tournaments, inventory proposals, and reward operations" },
  { href: "/compliance", label: "Compliance", icon: FileCheck2, summary: "Scoped compliance packs and bounded viewing-key evidence" },
  { href: "/execute", label: "Execute", icon: Rocket, summary: "Private payroll, vendor settlement, and treasury actions" },
  { href: "/proof", label: "Proof", icon: Sparkles, summary: "Operation receipts, runtime logs, and verification routes" },
  { href: "/developers", label: "Developers", icon: Code2, summary: "API docs, SDK starters, and integration surfaces" },
  { href: "/rpc-services", label: "RPC Services", icon: Router, summary: "Hosted reads, relayer checks, QVAC status, and runtime endpoints" },
  { href: "/command-center", label: "Command Center", icon: LayoutDashboard, summary: "Ops dashboard, indexed proposals, and readiness gates" },
  { href: "/live", label: "Live State", icon: LayoutDashboard, summary: "Proposals, treasury, and action logs" },
  { href: "/story", label: "Story", icon: PlayCircle, summary: "Live product story and fast explanation" },
  { href: "/community", label: "Community", icon: MessageSquareMore, summary: "Join, updates, pilot interest, and support routing" },
  { href: "/benefit", label: "Benefit", icon: Gift, summary: "theMiracle wallet-placement benefit and Founding Governor access" },
  { href: "/android", label: "Android", icon: Smartphone, summary: "Mobile app, APK download, parity plan" },
  { href: "/trust", label: "Trust", icon: ShieldCheck, summary: "Security, proof, and operating boundaries" },
  { href: "/diagnostics", label: "Health", icon: Activity, summary: "Runtime status and verification health" },
  { href: "/custody", label: "Custody", icon: KeyRound, summary: "Multisig, authority transfer, and custody evidence" },
  { href: "/analytics", label: "Analytics", icon: BarChart3, summary: "Votes, proposals, actions" },
  { href: "/services", label: "Services", icon: BriefcaseBusiness, summary: "Pilot, API, commercial packs" },
  { href: "/engage", label: "Engage", icon: ArrowUpRight, summary: "Buyer path, pilot motion, mainnet trajectory" },
  { href: "/search", label: "Search", icon: FileSearch, summary: "Search routes, docs, tracks, and proof" },
  { href: "/documents", label: "Documents", icon: FileText, summary: "Curated reviewer and trust docs" },
];

const guidedNav = [
  { href: "/start", label: "Start", icon: Compass, summary: "Connect a wallet and understand the first move" },
  { href: "/learn", label: "Learn", icon: FileText, summary: "Pick the right workflow before signing anything" },
  { href: "/govern", label: "Govern", icon: SquareTerminal, summary: "Create a DAO, propose, vote, and execute" },
  { href: "/intelligence", label: "Intelligence", icon: BrainCircuit, summary: "Review proposal and treasury risk context" },
  { href: "/treasury", label: "Treasury", icon: Gauge, summary: "Read treasury health and agent policy context" },
  { href: "/payroll", label: "Payroll", icon: Coins, summary: "Prepare private payroll and audit receipts" },
  { href: "/execute", label: "Execute", icon: Rocket, summary: "Run private and market-linked operations" },
  { href: "/proof", label: "Proof", icon: Sparkles, summary: "Verify receipt, signature, and runtime continuity" },
];

type OperationsShellProps = {
  eyebrow: string;
  title: string;
  description: string;
  navigationMode?: "full" | "guided";
  badges?: Array<{
    label: string;
    variant?: "cyan" | "violet" | "success" | "warning";
  }>;
  children: ReactNode;
};

export function OperationsShell({
  eyebrow,
  title,
  description,
  navigationMode = "full",
  badges = [],
  children,
}: OperationsShellProps) {
  const pathname = usePathname();
  const { copy } = useI18n();
  const navItems = navigationMode === "guided" ? guidedNav : operationsNav;
  const getNavLabel = (href: string, fallback: string) => {
    switch (href) {
      case "/start":
        return copy.chrome.start;
      case "/learn":
        return copy.chrome.learn;
      case "/govern":
        return copy.chrome.govern;
      case "/intelligence":
        return "Intelligence";
      case "/treasury":
        return "Treasury";
      case "/payroll":
        return "Payroll";
      case "/gaming":
        return "Gaming";
      case "/compliance":
        return "Compliance";
      case "/execute":
        return "Execute";
      case "/proof":
        return "Proof";
      case "/developers":
        return "Developers";
      case "/rpc-services":
        return "RPC Services";
      case "/command-center":
        return "Command Center";
      case "/live":
        return copy.chrome.liveState;
      case "/story":
        return copy.chrome.story;
      case "/trust":
        return copy.chrome.trust;
      case "/services":
        return copy.chrome.apiPricing;
      case "/benefit":
        return "Benefit";
      case "/products":
        return copy.chrome.products;
      case "/network":
        return copy.chrome.network;
      case "/documents":
        return copy.chrome.docs;
      case "/community":
        return copy.chrome.community;
      case "/assistant":
        return copy.chrome.help;
      case "/search":
        return copy.chrome.search;
      default:
        return fallback;
    }
  };
  const useMinimalGuidedChrome = navigationMode === "guided";
  const isGovernRoute = pathname === "/govern" || pathname.startsWith("/govern/");
  const isGuidedRoute = navigationMode === "guided";
  const heroTitleClass = useMinimalGuidedChrome
    ? "max-w-4xl text-2xl font-semibold tracking-[-0.03em] text-white sm:text-4xl lg:text-[2.8rem]"
    : "max-w-4xl text-3xl font-semibold tracking-[-0.035em] text-white sm:text-5xl";
  const heroDescriptionClass = useMinimalGuidedChrome
    ? "max-w-2xl text-sm leading-7 text-white/60 sm:text-base sm:leading-7"
    : "max-w-3xl text-sm leading-7 text-white/60 sm:text-lg sm:leading-8";

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      {!useMinimalGuidedChrome ? <div className="mb-6 xl:hidden">
        <Card className="border-white/10 bg-[#07101d]/88">
          <CardHeader className="space-y-3">
            <div className="text-[11px] uppercase tracking-[0.34em] text-cyan-200/78">{copy.shell.explore}</div>
            <CardTitle className="text-lg">{copy.shell.productNavigation}</CardTitle>
          </CardHeader>
          <CardContent className="no-scrollbar flex gap-3 overflow-x-auto pb-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex min-w-[170px] shrink-0 items-center gap-3 rounded-2xl border px-4 py-3 transition",
                    active
                      ? "border-cyan-300/25 bg-cyan-300/10 text-white"
                      : "border-white/8 bg-white/[0.03] text-white/68",
                  )}
                >
                  <div
                    className={cn(
                      "flex h-9 w-9 items-center justify-center rounded-xl border",
                      active ? "border-cyan-300/20 bg-cyan-300/14 text-cyan-100" : "border-white/8 bg-black/20 text-white/72",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium">{getNavLabel(item.href, item.label)}</div>
                    <div className="mt-1 line-clamp-2 text-xs leading-5 text-white/45">{item.summary}</div>
                  </div>
                </Link>
              );
            })}
          </CardContent>
        </Card>
      </div> : null}

      <div
        className={cn(
          "grid gap-6 xl:gap-8",
          !useMinimalGuidedChrome && "xl:grid-cols-[280px_minmax(0,1fr)]",
        )}
      >
        {!useMinimalGuidedChrome ? <aside className="hidden xl:sticky xl:top-28 xl:block xl:self-start">
          <Card className="border-white/10 bg-[#07101d]/88">
            <CardHeader className="space-y-4">
              <div className="space-y-2">
                <div className="text-[11px] uppercase tracking-[0.34em] text-cyan-200/78">{copy.shell.explore}</div>
                <CardTitle className="text-xl">{copy.shell.productNavigation}</CardTitle>
              </div>
              <p className="text-sm leading-7 text-white/56">
                {copy.shell.userFirstRoutes}
              </p>
            </CardHeader>
            <CardContent className="space-y-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-start gap-3 rounded-2xl border px-4 py-3 transition",
                      active
                        ? "border-cyan-300/25 bg-cyan-300/10 text-white"
                        : "border-white/8 bg-white/[0.03] text-white/68 hover:border-white/12 hover:bg-white/[0.05] hover:text-white",
                    )}
                  >
                    <div
                      className={cn(
                        "mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl border",
                        active ? "border-cyan-300/20 bg-cyan-300/14 text-cyan-100" : "border-white/8 bg-black/20 text-white/72",
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium">{getNavLabel(item.href, item.label)}</div>
                      <div className="mt-1 text-xs leading-6 text-white/45">{item.summary}</div>
                    </div>
                  </Link>
                );
              })}
            </CardContent>
          </Card>

          <Card className="mt-4 border-white/10 bg-white/[0.03]">
            <CardHeader>
              <CardTitle className="text-base">{copy.shell.systemRails}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-white/58">
              <div className="rounded-2xl border border-white/8 bg-black/20 px-4 py-3">ZK: privacy review and proof anchors</div>
              <div className="rounded-2xl border border-white/8 bg-black/20 px-4 py-3">REFHE: confidential settlement and payout posture</div>
              <div className="rounded-2xl border border-white/8 bg-black/20 px-4 py-3">MagicBlock: execution corridor for responsive paths</div>
              <div className="rounded-2xl border border-white/8 bg-black/20 px-4 py-3">Fast RPC: operational speed, diagnostics, and runtime readiness</div>
              <div className="rounded-2xl border border-white/8 bg-black/20 px-4 py-3">QVAC: local-first intelligence before signing</div>
              <div className="rounded-2xl border border-white/8 bg-black/20 px-4 py-3">Anchor 1: current Testnet program and IDL posture</div>
            </CardContent>
          </Card>
        </aside> : null}

        <div className="space-y-8">
          <Card className="border-white/10 bg-[linear-gradient(180deg,rgba(10,16,32,0.94),rgba(7,11,23,0.98))]">
            <CardContent className={cn("p-6", useMinimalGuidedChrome ? "sm:p-6" : "sm:p-8")}>
              {badges.length > 0 ? (
                <div className="flex flex-wrap gap-3">
                  {badges.map((badge) => (
                    <Badge key={badge.label} variant={badge.variant ?? "cyan"}>
                      {badge.label}
                    </Badge>
                  ))}
                </div>
              ) : null}

              <div className={cn("space-y-5", badges.length > 0 ? "mt-6" : "")}>
                <div className="text-[11px] uppercase tracking-[0.34em] text-emerald-300/80">{eyebrow}</div>
                <div className={heroTitleClass}>{title}</div>
                <p className={heroDescriptionClass}>{description}</p>
                {isGuidedRoute ? (
                  <div className="flex flex-wrap gap-2 text-[11px] uppercase tracking-[0.22em] text-white/48">
                    <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1">Connect</span>
                    <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1">Review</span>
                    <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1">Sign</span>
                    <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1">Verify</span>
                  </div>
                ) : null}
              </div>

              <div className={cn("flex flex-wrap gap-3", useMinimalGuidedChrome ? "mt-6" : "mt-8")}>
                {isGovernRoute ? (
                  <>
                    <a className={buttonVariants({ size: "sm" })} href="#proposal-review-action">
                      {copy.shell.startTheFlow}
                    </a>
                    <Link className={buttonVariants({ size: "sm", variant: "secondary" })} href="/execute">
                      Open execute
                    </Link>
                    <Link className={buttonVariants({ size: "sm", variant: "outline" })} href="/proof">
                      <span className="hidden sm:inline">Open proof</span>
                      <span className="sm:hidden">Proof</span>
                    </Link>
                  </>
                ) : (
                  <>
                    <Link className={buttonVariants({ size: "sm" })} href="/govern">
                      {copy.shell.openGovern}
                    </Link>
                    <Link className={buttonVariants({ size: "sm", variant: "secondary" })} href="/execute">
                      Open execute
                    </Link>
                    {isGuidedRoute ? (
                      <Link className={cn(buttonVariants({ size: "sm", variant: "outline" }), "hidden sm:inline-flex")} href="/proof">
                        Open proof
                      </Link>
                    ) : (
                      <Link className={buttonVariants({ size: "sm", variant: "outline" })} href="/documents">
                        {copy.shell.openCuratedDocs}
                      </Link>
                    )}
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="space-y-8">{children}</div>
        </div>
      </div>
    </main>
  );
}
