import Link from "next/link";
import { ArrowUpRight, KeyRound, LockKeyhole, ShieldCheck, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const phaseTwoRails = [
  "Encrypted intake from the first form field through service delivery.",
  "Time-bound license keys issued from on-chain payment and service terms.",
  "Client-selected intelligence rails across QVAC local models, Covalent GoldRush, Zerion, SNS, and recovery prompts.",
  "Auditor-visible security review before sensitive source, policy matrices, and partner-only integration bundles are closed.",
  "Mainnet deployment begins after the current judging phase and the required external security reviews.",
  "Phase 3 expands the infrastructure cross-chain while Solana remains the guardian chain and first governance home.",
];

export function PhaseTwoSovereignRoadmap() {
  return (
    <section className="rounded-[28px] border border-amber-300/18 bg-amber-300/[0.07] p-6">
      <div className="flex flex-wrap gap-2">
        <Badge variant="warning">Phase 2 after judging</Badge>
        <Badge variant="cyan">Encrypted customer delivery</Badge>
        <Badge variant="violet">Auditor-gated source</Badge>
        <Badge variant="success">Mainnet review path</Badge>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
        <div>
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.28em] text-amber-100/78">
            <LockKeyhole className="h-4 w-4" />
            Post-judging roadmap
          </div>
          <h2 className="mt-3 text-2xl font-semibold text-white">
            Phase 2 turns every service request into an encrypted delivery lane
          </h2>
          <p className="mt-3 max-w-4xl text-sm leading-7 text-white/66">
            After the active judging window, PrivateDAO will move the commercial service flow into a fully encrypted
            client lane: intake, package selection, provider routing, on-chain payment reference, time-limited access,
            delivery, renewal, and upgrade decisions will be bound to the customer&apos;s selected privacy and intelligence
            requirements.
          </p>
          <p className="mt-3 max-w-4xl text-sm leading-7 text-white/58">
            The defensive license layer is designed to revoke access, erase locally sealed service material, and stop
            execution when tampering is detected. It is not designed to damage user devices or third-party systems.
          </p>
          <p className="mt-3 max-w-4xl text-sm leading-7 text-white/58">
            After Phase 2, the roadmap moves into Mainnet deployment preparation and external security review. Phase 3
            opens the same protected infrastructure cross-chain so sensitive institutions can use broader blockchain
            rails while Solana remains the guardian chain, first proof home, and decision layer that anchors the system.
          </p>
        </div>

        <div className="grid gap-3">
          {phaseTwoRails.map((item) => (
            <div key={item} className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm leading-6 text-white/68">
              {item}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <KeyRound className="h-5 w-5 text-amber-100" />
          <div className="mt-3 text-sm font-medium text-white">Payment-bound access</div>
          <p className="mt-2 text-sm leading-6 text-white/58">
            The payment transaction hash can become the customer&apos;s activation reference after settlement confirmation.
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <Sparkles className="h-5 w-5 text-cyan-100" />
          <div className="mt-3 text-sm font-medium text-white">Intelligence routing</div>
          <p className="mt-2 text-sm leading-6 text-white/58">
            QVAC handles local emergency and private briefs; external rails add wallet, market, identity, and simulation context.
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <ShieldCheck className="h-5 w-5 text-emerald-100" />
          <div className="mt-3 text-sm font-medium text-white">Security review boundary</div>
          <p className="mt-2 text-sm leading-6 text-white/58">
            Sensitive source, policy matrices, and anti-tamper logic move behind auditor and partner review after the public judging phase.
          </p>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <Link href="/onboard" className={cn(buttonVariants({ size: "sm" }))}>
          Start encrypted intake
        </Link>
        <Link href="/services/qvac-sovereign-ai" className={cn(buttonVariants({ size: "sm", variant: "secondary" }))}>
          Review QVAC lane
        </Link>
        <Link href="/proof" className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>
          Open proof
          <ArrowUpRight className="h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}
