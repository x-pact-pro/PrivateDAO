import type { Metadata } from "next";
import { Suspense } from "react";

import { LegacyEntryBridge } from "@/components/legacy-entry-bridge";
import { BusinessValueSurface } from "@/components/business-value-surface";
import { ServiceLauncher } from "@/components/service-launcher";
import { SimpleHomeHero } from "@/components/simple-home-hero";
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
      <SimpleHomeHero />
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
        <BusinessValueSurface />
        <ServiceLauncher compact />
      </div>
    </>
  );
}
