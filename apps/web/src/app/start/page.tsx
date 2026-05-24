import type { Metadata } from "next";
import Link from "next/link";

import { GettingStartedWorkspace } from "@/components/getting-started-workspace";
import { ExecutionSpineSurface } from "@/components/execution-spine-surface";
import { LocalizedStartGuidanceSurface } from "@/components/localized-start-guidance-surface";
import { LocalizedRouteSummary } from "@/components/localized-route-summary";
import { NormalUserOperationPath } from "@/components/normal-user-operation-path";
import { OperationsShell } from "@/components/operations-shell";
import { PrivacyPolicySelector } from "@/components/privacy-policy-selector";
import { ProductCommandCenter } from "@/components/product-command-center";
import { buttonVariants } from "@/components/ui/button";
import { getExecutionSurfaceSnapshot } from "@/lib/devnet-service-metrics";
import { buildRouteMetadata } from "@/lib/route-metadata";
import { cn } from "@/lib/utils";

export const metadata: Metadata = buildRouteMetadata({
  title: "Get Started",
  description:
    "The easiest first-run path into PrivateDAO: connect a Testnet wallet, get test SOL, try the web or Android flow, sign a governed action, and verify the receipt.",
  path: "/start",
  keywords: ["getting started", "wallet onboarding", "testnet faucet", "android app", "proof path"],
});

export default function StartPage() {
  const executionSnapshot = getExecutionSurfaceSnapshot();

  return (
    <OperationsShell
      eyebrow="Quick start"
      title="Connect a wallet and start the full Testnet flow without learning the product architecture first"
      description="This page is the easy on-ramp. Connect a Testnet wallet, run the real governance flow yourself, and keep proof and trust surfaces one layer away when you want to inspect how the product stays private, fast, and verifiable. The goal is simple: a normal user can complete the flow, then open the blockchain evidence and understand what happened."
      navigationMode="guided"
      badges={[
        { label: "Consumer-first shell", variant: "success" },
        { label: "Wallet-ready", variant: "cyan" },
        { label: "Proof still connected", variant: "violet" },
      ]}
    >
      <LocalizedRouteSummary routeKey="start" />
      <ProductCommandCenter compact />
      <section className="rounded-[30px] border border-emerald-300/18 bg-[radial-gradient(circle_at_12%_0%,rgba(20,241,149,0.20),transparent_34%),radial-gradient(circle_at_92%_10%,rgba(0,194,255,0.16),transparent_30%),linear-gradient(180deg,rgba(7,14,27,0.96),rgba(4,7,16,0.98))] p-5 md:p-6">
        <div className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div>
            <div className="text-[11px] uppercase tracking-[0.28em] text-emerald-100/78">Try it now</div>
            <h2 className="mt-2 max-w-3xl text-2xl font-semibold tracking-[-0.035em] text-white md:text-3xl">
              Four clicks from zero context to a signed Testnet operation
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-white/66">
              Connect a Solana Testnet wallet, get test SOL, run the governed action path on web or Android, then open proof to inspect the receipt and on-chain continuity. The product is designed for users who do not want code, terminal steps, or a separate demo script.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              ["1", "Connect wallet", "Use the header wallet button or the wallet sandbox.", "/wallet-template", "Open wallet path"],
              ["2", "Get Testnet SOL", "Fund the same wallet before creating or executing.", "https://faucet.solana.com/", "Open faucet"],
              ["3", "Run governance", "Create, vote, or execute from the same wallet-first product shell.", "/govern", "Open govern"],
              ["4", "Check readiness", "Open live QuickNode-backed API health, counters, and proof freshness.", "/rpc-services", "Live readiness"],
              ["5", "Try Android", "Install the APK and use the same Testnet route language.", "/android", "Open Android"],
              ["6", "Verify proof", "Inspect signatures, logs, receipts, and proof packets.", "/proof/?judge=1", "Open proof"],
            ].map(([step, title, detail, href, cta]) => {
              const isExternal = href.startsWith("https://");

              return (
                <Link
                  key={title}
                  href={href}
                  target={isExternal ? "_blank" : undefined}
                  rel={isExternal ? "noreferrer" : undefined}
                  className="group rounded-[22px] border border-white/10 bg-black/22 p-4 transition hover:-translate-y-0.5 hover:border-emerald-300/28 hover:bg-white/[0.055]"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="rounded-full border border-emerald-300/18 bg-emerald-300/10 px-2.5 py-1 text-[10px] uppercase tracking-[0.22em] text-emerald-100">
                      {step}
                    </span>
                    <span className="text-[10px] uppercase tracking-[0.18em] text-cyan-100/72">{cta}</span>
                  </div>
                  <div className="mt-3 text-base font-semibold text-white">{title}</div>
                  <p className="mt-2 text-sm leading-6 text-white/58">{detail}</p>
                </Link>
              );
            })}
          </div>
        </div>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link href="/govern" className={cn(buttonVariants({ size: "sm" }))}>
            Start governance flow
          </Link>
          <Link href="/android" className={cn(buttonVariants({ size: "sm", variant: "secondary" }))}>
            Install Android APK
          </Link>
          <a href="https://faucet.solana.com/" rel="noreferrer" target="_blank" className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>
            Get Testnet SOL
          </a>
        </div>
      </section>
      <NormalUserOperationPath />
      <ExecutionSpineSurface context="start" />
      <GettingStartedWorkspace executionSnapshot={executionSnapshot} />
      <PrivacyPolicySelector compact />
      <LocalizedStartGuidanceSurface />
    </OperationsShell>
  );
}
