"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { ArrowUpRight, ShieldCheck, Sparkles } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const PrivacyExecutionClaimConsole = dynamic(
  () => import("@/components/privacy-execution-claim-console").then((mod) => mod.PrivacyExecutionClaimConsole),
  {
    ssr: false,
    loading: () => (
      <section className="solana-claim-shell rounded-[30px] p-5">
        <div className="relative z-10 text-sm text-white/64">Loading wallet claim runtime...</div>
      </section>
    ),
  },
);

export function PrivacyExecutionClaimConsoleLazy({ compact = false }: { compact?: boolean }) {
  const [active, setActive] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.has("claim") || params.has("rail") || window.location.hash === "#privacy-claim-console") {
      setActive(true);
      window.setTimeout(() => {
        document.getElementById("privacy-claim-console")?.scrollIntoView({ block: "start" });
      }, 120);
    }
  }, []);

  if (active) {
    return (
      <section id="privacy-claim-console" className="scroll-mt-32">
        <PrivacyExecutionClaimConsole compact={compact} />
      </section>
    );
  }

  return (
    <section id="privacy-claim-console" className="solana-claim-shell scroll-mt-32 rounded-[30px] p-5">
      <div className="solana-scanline" />
      <div className="relative z-10 grid gap-5 lg:grid-cols-[0.92fr_1.08fr] lg:items-center">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-[11px] uppercase tracking-[0.24em] text-emerald-100">
            <Sparkles className="h-3.5 w-3.5" />
            Solana claim runtime
          </div>
          <h2 className="mt-4 text-2xl font-semibold tracking-[-0.03em] text-white md:text-3xl">
            Load the wallet runtime only when the visitor is ready to claim
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-white/66">
            The page stays fast first. When a visitor starts, PrivateDAO loads the encrypted claim console, builds the
            AES-GCM packet locally, and anchors a digest through a Solana Testnet Memo transaction.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <button type="button" onClick={() => setActive(true)} className={cn(buttonVariants({ size: "sm" }))}>
              Launch claim console
              <ArrowUpRight className="h-4 w-4" />
            </button>
            <a href="https://api.privatedao.org/api/v1/privacy-execution-claims" target="_blank" rel="noreferrer" className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>
              Claims API
            </a>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {["Review", "Encrypt", "Sign", "Verify"].map((step, index) => (
            <div key={step} className="solana-rail-card rounded-[22px] p-4">
              <div className="flex items-center justify-between gap-3">
                <span className="font-mono text-xs text-cyan-100/72">0{index + 1}</span>
                <ShieldCheck className="h-4 w-4 text-emerald-100" />
              </div>
              <div className="mt-3 text-base font-semibold text-white">{step}</div>
              <div className="mt-2 text-xs leading-6 text-white/56">
                {index === 0
                  ? "Choose the integration rail."
                  : index === 1
                    ? "Create local ciphertext."
                    : index === 2
                      ? "Approve from wallet."
                      : "Open public proof."}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
