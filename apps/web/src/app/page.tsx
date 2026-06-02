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
