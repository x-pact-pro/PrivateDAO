import type { Metadata } from "next";
import Link from "next/link";

import { GuidedOperationRail } from "@/components/guided-operation-rail";
import { OperationsShell } from "@/components/operations-shell";
import { QvacSovereignAiSurface } from "@/components/qvac-sovereign-ai-surface";
import { buttonVariants } from "@/components/ui/button";
import { buildRouteMetadata } from "@/lib/route-metadata";
import { cn } from "@/lib/utils";

export const metadata: Metadata = buildRouteMetadata({
  title: "QVAC Sovereign AI",
  description:
    "On-device AI layer for private governance and treasury operations: local-first decision support, multilingual operations, and privacy-preserving pre-sign briefing.",
  path: "/services/qvac-sovereign-ai",
  keywords: ["qvac", "tether qvac", "local ai", "on-device inference", "private dao"],
});

export default function QvacSovereignAiPage() {
  return (
    <OperationsShell
      eyebrow="Services"
      title="QVAC for sensitive decisions before signing"
      description="QVAC is the private decision gate: it prepares proposal, payroll, treasury, and compliance context locally before a signer exposes anything to execution."
      navigationMode="guided"
      badges={[
        { label: "QVAC", variant: "cyan" },
        { label: "On-device", variant: "success" },
        { label: "Privacy-first", variant: "violet" },
      ]}
    >
      <GuidedOperationRail current="review" reviewHref="/intelligence" verifyHref="/proof" />
      <section className="rounded-[28px] border border-cyan-300/18 bg-cyan-300/[0.07] p-5 sm:p-6">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.12fr)_minmax(320px,0.88fr)]">
          <div>
            <div className="text-[11px] uppercase tracking-[0.24em] text-cyan-100/78">QVAC Hackathon I submission lane</div>
            <h2 className="mt-3 text-2xl font-semibold text-white">Local governance intelligence before signing</h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-white/70">
              PrivateDAO uses QVAC where a hosted AI model would create a new leak: proposal review, treasury context, payout risk,
              private-room notes, and verification planning before a wallet signs. Hidden vote intent, voter addresses, private room
              transcripts, and partial vote results stay out of the prompt boundary.
            </p>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {[
                "QVAC SDK evidence runner",
                "Local inference command",
                "Public evidence JSON",
                "Branded submission video",
              ].map((item) => (
                <div key={item} className="rounded-2xl border border-white/10 bg-black/24 px-4 py-3 text-sm text-white/72">
                  {item}
                </div>
              ))}
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <a href="/qvac-hackathon-i-evidence.json" className={cn(buttonVariants({ size: "sm" }))}>
                Open evidence JSON
              </a>
              <Link href="/try/" className={cn(buttonVariants({ size: "sm", variant: "secondary" }))}>
                Try governance flow
              </Link>
              <a href="https://api.privatedao.org/api/v1/qvac/runtime-proof" className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>
                Runtime proof
              </a>
            </div>
          </div>
          <div className="overflow-hidden rounded-[22px] border border-white/10 bg-black/30">
            <video
              className="aspect-video w-full bg-black object-cover"
              controls
              preload="metadata"
              poster="/assets/private-dao-qvac-hackathon-brander-poster.png"
            >
              <source src="/assets/private-dao-qvac-hackathon-brander.mp4" type="video/mp4" />
            </video>
            <div className="border-t border-white/10 p-3 text-xs leading-6 text-white/58">
              Brander video for judges: why QVAC belongs in PrivateDAO and how to reproduce the local evidence.
            </div>
          </div>
        </div>
      </section>
      <section className="rounded-[28px] border border-white/10 bg-black/18 p-5 sm:p-6">
        <div className="text-[11px] uppercase tracking-[0.24em] text-white/45">Reproducibility commands</div>
        <div className="mt-3 grid gap-3 lg:grid-cols-2">
          <pre className="overflow-x-auto rounded-2xl border border-white/10 bg-black/40 p-4 text-xs leading-6 text-cyan-50/78">
            <code>{`npm run qvac:hackathon:evidence\nnpm run qvac:hackathon:inference`}</code>
          </pre>
          <div className="rounded-2xl border border-white/10 bg-black/24 p-4 text-sm leading-7 text-white/70">
            The first command proves SDK import, version, exported capabilities, selected model, and privacy prompt boundary.
            The second command performs the local model run on the operator hardware and records the output hash.
          </div>
        </div>
      </section>
      <QvacSovereignAiSurface />
    </OperationsShell>
  );
}
