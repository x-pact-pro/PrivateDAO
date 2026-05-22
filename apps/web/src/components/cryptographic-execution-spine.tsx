import Link from "next/link";
import { ArrowRight, BrainCircuit, DatabaseZap, KeyRound, LockKeyhole, ShieldCheck, WalletCards } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type CryptographicExecutionSpineProps = {
  compact?: boolean;
  context?: "intelligence" | "services" | "execute" | "encrypt-ika";
};

const steps = [
  {
    label: "1. Provider",
    title: "GoldRush + RPC context",
    body: "Wallet history, stablecoin movement, counterparty posture, and read-node health are checked before a signer approves risk.",
    href: "/services/goldrush-decision-intelligence",
    icon: DatabaseZap,
  },
  {
    label: "2. Decide",
    title: "Local-first intelligence",
    body: "QVAC and deterministic analysis compress proposal, treasury, gaming, and RPC context into a clear pre-sign decision.",
    href: "/intelligence",
    icon: BrainCircuit,
  },
  {
    label: "3. Encrypt",
    title: "REFHE / Encrypt / IKA",
    body: "Sensitive payroll, vendor, and treasury intent becomes an encrypted manifest, commitment, custody route, or proof packet.",
    href: "/services/encrypt-ika-operations",
    icon: LockKeyhole,
  },
  {
    label: "4. Execute",
    title: "Wallet-first operation",
    body: "The connected wallet remains the execution boundary for Testnet governance, settlement rehearsal, and treasury motions.",
    href: "/execute",
    icon: WalletCards,
  },
  {
    label: "5. Verify",
    title: "Proof continuity",
    body: "Receipts, runtime logs, documents, and Solana explorer evidence keep the result inspectable without exposing private payloads.",
    href: "/proof",
    icon: ShieldCheck,
  },
] as const;

const contextCopy = {
  intelligence: {
    eyebrow: "Decision-to-execution spine",
    title: "GoldRush does not stop at analytics; it feeds the encrypted execution path",
    description:
      "Use this sequence when a judge asks how intelligence becomes action: provider data informs a decision, the sensitive part is encrypted, the wallet signs, and the proof path remains visible.",
  },
  services: {
    eyebrow: "Service architecture",
    title: "One commercial corridor from provider data to encrypted execution",
    description:
      "This is the buyer-readable architecture: hosted reads and decision support lead into Encrypt/IKA, confidential payments, execution, and proof without scattering the service story.",
  },
  execute: {
    eyebrow: "Execution architecture",
    title: "Execution stays clean because review and encryption happen before signing",
    description:
      "The execute route should never feel like a blind button. It receives context from GoldRush and intelligence, encrypted payloads from the confidential lane, and sends receipts to proof.",
  },
  "encrypt-ika": {
    eyebrow: "Cryptographic handoff",
    title: "Ika and encryption sit in the middle of the operating system, not at the edge",
    description:
      "This lane turns sensitive intent into commitment-safe artifacts before final wallet execution, while preserving the reviewer path through proof and documents.",
  },
} satisfies Record<NonNullable<CryptographicExecutionSpineProps["context"]>, { eyebrow: string; title: string; description: string }>;

export function CryptographicExecutionSpine({ compact = false, context = "services" }: CryptographicExecutionSpineProps) {
  const copy = contextCopy[context];

  return (
    <section className="overflow-hidden rounded-[32px] border border-cyan-300/18 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.16),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(139,92,246,0.16),transparent_36%),linear-gradient(135deg,rgba(8,13,27,0.98),rgba(2,6,23,0.98))] p-5 shadow-2xl shadow-cyan-950/24">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.28em] text-cyan-100/72">
            <KeyRound className="h-4 w-4" />
            {copy.eyebrow}
          </div>
          <h2 className="mt-3 max-w-4xl text-2xl font-semibold tracking-[-0.03em] text-white md:text-3xl">
            {copy.title}
          </h2>
          <p className="mt-3 max-w-5xl text-sm leading-7 text-white/66">{copy.description}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link href="/services/goldrush-decision-intelligence" className={cn(buttonVariants({ size: "sm" }))}>
            Open decision intelligence
          </Link>
          <Link href="/services/encrypt-ika-operations" className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>
            Open Encrypt / IKA
          </Link>
        </div>
      </div>

      <div className={cn("mt-6 grid gap-3", compact ? "lg:grid-cols-5" : "md:grid-cols-2 xl:grid-cols-5")}>
        {steps.map((step) => {
          const Icon = step.icon;
          return (
            <Link
              key={step.label}
              href={step.href}
              className="group rounded-[24px] border border-white/10 bg-black/22 p-4 transition hover:border-cyan-200/30 hover:bg-white/[0.055]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-cyan-200/20 bg-cyan-300/[0.10] text-cyan-100">
                  <Icon className="h-5 w-5" />
                </div>
                <ArrowRight className="mt-2 h-4 w-4 text-cyan-200 transition group-hover:translate-x-0.5" />
              </div>
              <div className="mt-4 text-[10px] uppercase tracking-[0.24em] text-white/42">{step.label}</div>
              <div className="mt-2 text-base font-semibold text-white">{step.title}</div>
              <p className="mt-2 text-sm leading-6 text-white/58">{step.body}</p>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
