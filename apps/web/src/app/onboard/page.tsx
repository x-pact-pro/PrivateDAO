"use client";

import { FormEvent, Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowRight,
  Bot,
  Building2,
  CheckCircle2,
  Code2,
  Gamepad2,
  Landmark,
  LockKeyhole,
  Network,
  ShieldCheck,
  UserRound,
  UsersRound,
} from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const API_BASE = process.env.NEXT_PUBLIC_PRIVATE_DAO_API_BASE || "https://api.privatedao.org";

const profiles = [
  ["individual", "Individual / Developer", UserRound],
  ["dao", "DAO / Community", UsersRound],
  ["company", "Company / Startup", Building2],
  ["institution", "Institution / Fund", Landmark],
  ["protocol", "Protocol / Enterprise", Network],
] as const;

const challenges = [
  "Private voting",
  "Treasury exposure",
  "Confidential payroll",
  "Gaming rewards disputes",
  "Grant committee privacy",
  "Compliance reporting",
  "Multisig complexity",
  "API integration",
] as const;

const setups = ["Realms / SPL Governance", "Squads", "Snapshot", "Building from scratch", "Not sure yet"] as const;
const tiers = ["open", "collective", "institution", "sovereign", "api", "sdk", "protocol"] as const;

type FormState = {
  tier: string;
  profile: string;
  challenges: string[];
  otherChallenge: string;
  treasurySize: string;
  votingMembers: string;
  monthlyDecisions: string;
  currentSetup: string[];
  preferredChain: string;
  developerContext: string;
  name: string;
  email: string;
  organization: string;
  website: string;
  telegram: string;
  timeline: string;
  source: string;
  notes: string;
};

function toggle(list: string[], value: string) {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}

function FieldShell({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-[0.2em] text-white/44">{label}</span>
      <div className="mt-2">{children}</div>
    </label>
  );
}

const inputClass =
  "w-full rounded-2xl border border-white/10 bg-black/24 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/28 focus:border-cyan-300/45";

export default function OnboardPage() {
  return (
    <Suspense fallback={<main className="mx-auto w-full max-w-7xl px-4 py-10 text-white sm:px-6 lg:px-8">Loading onboarding form...</main>}>
      <OnboardForm />
    </Suspense>
  );
}

function OnboardForm() {
  const params = useSearchParams();
  const router = useRouter();
  const initialTier = params.get("tier") || "collective";
  const [step, setStep] = useState(1);
  const [status, setStatus] = useState<"idle" | "submitting" | "error">("idle");
  const [error, setError] = useState("");
  const [form, setForm] = useState<FormState>({
    tier: tiers.includes(initialTier as (typeof tiers)[number]) ? initialTier : "collective",
    profile: "dao",
    challenges: ["Private voting", "Treasury exposure"],
    otherChallenge: "",
    treasurySize: "100k-1m",
    votingMembers: "11-50",
    monthlyDecisions: "6-20",
    currentSetup: ["Not sure yet"],
    preferredChain: "solana",
    developerContext: "need-support",
    name: "",
    email: "",
    organization: "",
    website: "",
    telegram: "",
    timeline: "testnet-now",
    source: "PrivateDAO website",
    notes: "",
  });

  const progress = useMemo(() => Math.round((step / 6) * 100), [step]);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((current) => ({ ...current, [key]: value }));

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!form.name.trim() || !form.email.trim()) {
      setStep(5);
      setError("Name and email are required before sending the brief.");
      return;
    }
    setStatus("submitting");
    const response = await fetch(`${API_BASE}/api/v1/onboard/request`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        utmSource: params.get("utm_source") || params.get("source") || "direct",
      }),
    }).catch(() => null);
    if (!response?.ok) {
      setStatus("error");
      setError("The request could not be stored. Keep the form open and try once more.");
      return;
    }
    router.push(`/onboard/confirmed/?tier=${encodeURIComponent(form.tier)}`);
  }

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <form onSubmit={submit} className="space-y-8">
        <section className="rounded-[34px] border border-cyan-300/18 bg-[radial-gradient(circle_at_10%_0%,rgba(20,241,149,0.18),transparent_32%),radial-gradient(circle_at_88%_12%,rgba(0,194,255,0.16),transparent_30%),linear-gradient(180deg,rgba(7,12,24,0.98),rgba(4,7,16,0.99))] p-6 sm:p-8">
          <div className="grid gap-7 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            <div>
              <Badge variant="cyan">Onboarding brief</Badge>
              <h1 className="mt-5 max-w-4xl text-4xl font-semibold tracking-[-0.055em] text-white sm:text-6xl">
                Tell us what your governance system needs to keep private.
              </h1>
              <p className="mt-5 max-w-3xl text-base leading-8 text-white/66">
                Five minutes is enough to map the right path: DAO setup, confidential payroll, gaming rewards,
                treasury intelligence, API access, or a managed enterprise package.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link href="/pricing/" className={cn(buttonVariants({ variant: "outline" }))}>Back to pricing</Link>
                <Link href="/proof/" className={cn(buttonVariants({ variant: "secondary" }))}>Review proof first</Link>
              </div>
            </div>
            <Card className="border-white/12 bg-black/22">
              <CardHeader>
                <CardTitle>Step {step} of 6</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-3 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full rounded-full bg-[linear-gradient(135deg,#14f195,#00c2ff)]" style={{ width: `${progress}%` }} />
                </div>
                <div className="mt-5 grid gap-3 text-sm text-white/62">
                  {[
                    [ShieldCheck, "Private governance"],
                    [LockKeyhole, "Confidential settlement"],
                    [Bot, "QVAC local AI"],
                    [Gamepad2, "Gaming DAO rewards"],
                    [Code2, "API and SDK access"],
                  ].map(([Icon, label]) => {
                    const TypedIcon = Icon as typeof ShieldCheck;
                    return (
                      <div key={label as string} className="flex items-center gap-3 rounded-2xl border border-white/8 bg-white/[0.04] px-4 py-3">
                        <TypedIcon className="h-4 w-4 text-cyan-100" />
                        {label as string}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="grid gap-5 lg:grid-cols-[0.28fr_1fr]">
          <aside className="space-y-2">
            {["Who", "Challenge", "Scale", "Stack", "Contact", "Plan"].map((label, index) => (
              <button
                key={label}
                type="button"
                onClick={() => setStep(index + 1)}
                className={cn(
                  "flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left text-sm transition",
                  step === index + 1 ? "border-cyan-300/35 bg-cyan-300/[0.1] text-white" : "border-white/10 bg-white/[0.03] text-white/55",
                )}
              >
                {label}
                {step > index + 1 ? <CheckCircle2 className="h-4 w-4 text-emerald-200" /> : null}
              </button>
            ))}
          </aside>

          <Card className="border-white/10 bg-white/[0.035]">
            <CardContent className="space-y-6 p-6">
              {step === 1 ? (
                <div className="space-y-5">
                  <h2 className="text-2xl font-semibold text-white">Who are you?</h2>
                  <div className="grid gap-3 md:grid-cols-2">
                    {profiles.map(([value, label, Icon]) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => update("profile", value)}
                        className={cn("rounded-2xl border p-4 text-left transition", form.profile === value ? "border-cyan-300/40 bg-cyan-300/[0.1]" : "border-white/10 bg-black/20")}
                      >
                        <Icon className="h-5 w-5 text-cyan-100" />
                        <div className="mt-3 font-medium text-white">{label}</div>
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              {step === 2 ? (
                <div className="space-y-5">
                  <h2 className="text-2xl font-semibold text-white">Your governance challenge</h2>
                  <div className="grid gap-3 md:grid-cols-2">
                    {challenges.map((challenge) => (
                      <button key={challenge} type="button" onClick={() => update("challenges", toggle(form.challenges, challenge))} className={cn("rounded-2xl border px-4 py-3 text-left text-sm", form.challenges.includes(challenge) ? "border-emerald-300/35 bg-emerald-300/[0.09] text-white" : "border-white/10 bg-black/20 text-white/62")}>
                        {challenge}
                      </button>
                    ))}
                  </div>
                  <FieldShell label="Other challenge">
                    <input className={inputClass} value={form.otherChallenge} onChange={(event) => update("otherChallenge", event.target.value)} placeholder="Describe any specific edge case" />
                  </FieldShell>
                </div>
              ) : null}

              {step === 3 ? (
                <div className="grid gap-5 md:grid-cols-3">
                  <FieldShell label="Treasury size">
                    <select className={inputClass} value={form.treasurySize} onChange={(event) => update("treasurySize", event.target.value)}>
                      <option value="under-100k">Under $100k</option>
                      <option value="100k-1m">$100k - $1M</option>
                      <option value="1m-10m">$1M - $10M</option>
                      <option value="10m-plus">$10M+</option>
                      <option value="prefer-not-to-say">Prefer not to say</option>
                    </select>
                  </FieldShell>
                  <FieldShell label="Voting members">
                    <select className={inputClass} value={form.votingMembers} onChange={(event) => update("votingMembers", event.target.value)}>
                      <option value="1-10">1-10</option>
                      <option value="11-50">11-50</option>
                      <option value="51-200">51-200</option>
                      <option value="200-plus">200+</option>
                    </select>
                  </FieldShell>
                  <FieldShell label="Monthly decisions">
                    <select className={inputClass} value={form.monthlyDecisions} onChange={(event) => update("monthlyDecisions", event.target.value)}>
                      <option value="1-5">1-5</option>
                      <option value="6-20">6-20</option>
                      <option value="20-plus">20+</option>
                    </select>
                  </FieldShell>
                </div>
              ) : null}

              {step === 4 ? (
                <div className="space-y-5">
                  <h2 className="text-2xl font-semibold text-white">Technical context</h2>
                  <div className="grid gap-3 md:grid-cols-2">
                    {setups.map((setup) => (
                      <button key={setup} type="button" onClick={() => update("currentSetup", toggle(form.currentSetup, setup))} className={cn("rounded-2xl border px-4 py-3 text-left text-sm", form.currentSetup.includes(setup) ? "border-cyan-300/35 bg-cyan-300/[0.09] text-white" : "border-white/10 bg-black/20 text-white/62")}>
                        {setup}
                      </button>
                    ))}
                  </div>
                  <div className="grid gap-5 md:grid-cols-2">
                    <FieldShell label="Preferred chain">
                      <select className={inputClass} value={form.preferredChain} onChange={(event) => update("preferredChain", event.target.value)}>
                        <option value="solana">Solana</option>
                        <option value="multi-chain">Multi-chain</option>
                        <option value="chain-agnostic">Chain-agnostic</option>
                      </select>
                    </FieldShell>
                    <FieldShell label="Developer context">
                      <select className={inputClass} value={form.developerContext} onChange={(event) => update("developerContext", event.target.value)}>
                        <option value="in-house">Yes, in-house team</option>
                        <option value="contractors">Yes, contractors</option>
                        <option value="need-support">No, we need support</option>
                        <option value="i-am-developer">I am the developer</option>
                      </select>
                    </FieldShell>
                  </div>
                </div>
              ) : null}

              {step === 5 ? (
                <div className="grid gap-5 md:grid-cols-2">
                  <FieldShell label="Name"><input className={inputClass} value={form.name} onChange={(event) => update("name", event.target.value)} required /></FieldShell>
                  <FieldShell label="Email"><input className={inputClass} type="email" value={form.email} onChange={(event) => update("email", event.target.value)} required /></FieldShell>
                  <FieldShell label="Organization"><input className={inputClass} value={form.organization} onChange={(event) => update("organization", event.target.value)} /></FieldShell>
                  <FieldShell label="Website / X"><input className={inputClass} value={form.website} onChange={(event) => update("website", event.target.value)} /></FieldShell>
                  <FieldShell label="Telegram"><input className={inputClass} value={form.telegram} onChange={(event) => update("telegram", event.target.value)} /></FieldShell>
                  <FieldShell label="Timeline">
                    <select className={inputClass} value={form.timeline} onChange={(event) => update("timeline", event.target.value)}>
                      <option value="testnet-now">Immediately: Testnet exploration</option>
                      <option value="30-days">Within 30 days</option>
                      <option value="90-days">Within 90 days</option>
                      <option value="planning">Planning phase</option>
                    </select>
                  </FieldShell>
                  <FieldShell label="How did you find us?"><input className={inputClass} value={form.source} onChange={(event) => update("source", event.target.value)} /></FieldShell>
                  <FieldShell label="Anything else?"><textarea className={cn(inputClass, "min-h-28")} value={form.notes} onChange={(event) => update("notes", event.target.value)} /></FieldShell>
                </div>
              ) : null}

              {step === 6 ? (
                <div className="space-y-5">
                  <h2 className="text-2xl font-semibold text-white">Plan selection</h2>
                  <div className="grid gap-3 md:grid-cols-3">
                    {tiers.map((tier) => (
                      <button key={tier} type="button" onClick={() => update("tier", tier)} className={cn("rounded-2xl border px-4 py-3 text-left text-sm uppercase tracking-[0.18em]", form.tier === tier ? "border-emerald-300/35 bg-emerald-300/[0.09] text-white" : "border-white/10 bg-black/20 text-white/62")}>
                        {tier}
                      </button>
                    ))}
                  </div>
                  <p className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm leading-7 text-white/62">
                    We use this brief to recommend a Testnet path first: the smallest real workflow that proves value before any managed package starts.
                  </p>
                </div>
              ) : null}

              {error ? <div className="rounded-2xl border border-red-300/25 bg-red-300/[0.08] p-4 text-sm text-red-100">{error}</div> : null}

              <div className="flex flex-wrap justify-between gap-3 border-t border-white/8 pt-5">
                <Button type="button" variant="outline" disabled={step === 1} onClick={() => setStep((current) => Math.max(1, current - 1))}>Back</Button>
                {step < 6 ? (
                  <Button type="button" onClick={() => setStep((current) => Math.min(6, current + 1))}>
                    Continue
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button type="submit" disabled={status === "submitting"}>
                    {status === "submitting" ? "Sending..." : "Send My Governance Brief"}
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </section>
      </form>
    </main>
  );
}
