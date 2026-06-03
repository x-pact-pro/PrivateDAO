import type { Metadata } from "next";
import { Suspense } from "react";

import { HomeShell } from "@/components/home-shell";
import { HomeVisitorCounter } from "@/components/home-visitor-counter";
import { LegacyEntryBridge } from "@/components/legacy-entry-bridge";
import { LiveSiteActivityPanel } from "@/components/live-site-activity-panel";
import { ProductCommandCenter } from "@/components/product-command-center";
import { ProjectOperatingMap } from "@/components/project-operating-map";
import { PrivateDaoStackSurface } from "@/components/private-dao-stack-surface";
import { ServiceLauncher } from "@/components/service-launcher";
import { buildBrandHomeMetadata } from "@/lib/route-metadata";

export const metadata: Metadata = buildBrandHomeMetadata();

const whyNowPoints = [
  "DAO treasuries are growing faster than governance infrastructure.",
  "Sensitive coordination still happens in private chats and spreadsheets.",
  "Solana organizations increasingly need privacy without sacrificing verifiability.",
] as const;

export default function HomePage() {
  return (
    <>
      <Suspense
        fallback={null}
      >
        <LegacyEntryBridge />
      </Suspense>
      <HomeShell />
      <div className="mx-auto w-full max-w-7xl space-y-5 px-4 pb-12 sm:px-6 lg:px-8">
        <section className="border-y border-white/10 py-6 sm:py-8">
          <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-100/78">Why now?</div>
          <div className="mt-4 grid gap-3 lg:grid-cols-3">
            {whyNowPoints.map((point) => (
              <div key={point} className="border-l border-emerald-300/32 pl-4 text-sm leading-7 text-white/68">
                {point}
              </div>
            ))}
          </div>
        </section>
        <ServiceLauncher compact />
        <PrivateDaoStackSurface />
        <ProductCommandCenter />
        <ProjectOperatingMap
          description="PrivateDAO should read from the first viewport as relief from a real pain: your votes, salaries, treasury activity, and internal operations are public by default. PrivateDAO makes the process private and the outcome verifiable through governance, payroll, treasury, payments, intelligence, and proof-linked execution lanes."
        />
        <HomeVisitorCounter />
        <LiveSiteActivityPanel />
      </div>
    </>
  );
}
