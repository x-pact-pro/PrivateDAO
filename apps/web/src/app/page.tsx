import type { Metadata } from "next";
import { Suspense } from "react";

import { HomeShell } from "@/components/home-shell";
import { HomeVisitorCounter } from "@/components/home-visitor-counter";
import { LegacyEntryBridge } from "@/components/legacy-entry-bridge";
import { LiveSiteActivityPanel } from "@/components/live-site-activity-panel";
import { ProductCommandCenter } from "@/components/product-command-center";
import { ProjectOperatingMap } from "@/components/project-operating-map";
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
        <ProductCommandCenter />
        <ProjectOperatingMap
          description="PrivateDAO should read as one connected system from the first viewport: private on-chain governance creates decisions, intelligence explains them before signing, treasury and payroll prepare execution, encrypted payment rails move value privately, wallet-first UX keeps the signer in control, and proof makes the result inspectable for normal users, organizations, communities, competitions, and judges."
        />
        <HomeVisitorCounter />
        <LiveSiteActivityPanel />
      </div>
    </>
  );
}
