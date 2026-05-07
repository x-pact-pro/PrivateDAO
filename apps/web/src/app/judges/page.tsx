import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Award, Github, Mail, PlayCircle, ShieldCheck, Sparkles } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { buildRouteMetadata } from "@/lib/route-metadata";
import { cn } from "@/lib/utils";

export const metadata: Metadata = buildRouteMetadata({
  title: "Judges Fast Path",
  description:
    "One 60-second PrivateDAO review surface with live demo, GitHub, ZK proof links, REFHE, runtime closure, video, Colosseum, awards, and contact.",
  path: "/judges",
  keywords: ["judges", "fast path", "Colosseum", "ZK proof", "REFHE", "PrivateDAO"],
});

const eitherwayPreview = "https://preview.eitherway.ai/169057d4-cf4e-4a3e-88e5-2fe436eac112/";
const githubHref = "https://github.com/X-PACT/PrivateDAO";
const videoHref = "https://youtu.be/iFTUe4CTWP0";
const colosseumHref = "https://arena.colosseum.org/projects/explore/praivatedao";

const zkProofs = [
  {
    label: "Vote anchor",
    href: "https://explorer.solana.com/tx/3Cwj9z3DgFJcSb5pwSKYQjUpszRoH4Zoog5UAMpXnmgiuq6RUE6LSjG18iXzmVabA8QJaBf6LvNtow75UBGQZsPr?cluster=testnet",
  },
  {
    label: "Delegation anchor",
    href: "https://explorer.solana.com/tx/tuHLbEMZm4pgGdrxgCZxUtxxoQjvYMpoGPpoua6g7n7oUkjhapnesbSD5pt4haF4uod5oJ3hH5WQ2HXcN7cvkPC?cluster=testnet",
  },
  {
    label: "Tally anchor",
    href: "https://explorer.solana.com/tx/5rLNpwLmm2oTL1XzkLTGjbRu2AWWYfKo3yyEkJ4iECry9cqAf1G6mHzDka2jzjj9qGYT6s3gh5dXxdb9kPYN8C48?cluster=testnet",
  },
  {
    label: "Vote receipt",
    href: "https://explorer.solana.com/tx/LtFyNrnYzZ8Re2bpYnHZLK5dyzeheY1fJpztLfwweDHKAYezegJLLqDe8s47xqGUVgR2HuJ6hxrWqK9EucGd9Dy?cluster=testnet",
  },
  {
    label: "Delegation receipt",
    href: "https://explorer.solana.com/tx/hPr44WmAqnnpf9wPbge3iFrv9BryCfdFBygPiZz8xkaws2FQRk7RtCVMiddTncW4wVSyY2UyGtn7rUV61cY2CPA?cluster=testnet",
  },
  {
    label: "Tally receipt",
    href: "https://explorer.solana.com/tx/4574GkTH8f9BCoJTcLKprEegsyeBomDzZubXdTfsaJFyPyH88eQugotpid2LVuqhy2YeMTXjmsNZXLthPyAaYsGC?cluster=testnet",
  },
];

const judgeLinks = [
  { label: "REFHE / Encrypt / IKA doc", href: "/documents/testnet-refhe-encrypt-ika-commitment-2026-05-07" },
  { label: "ZK verification receipts", href: "/documents/testnet-zk-verification-receipts-2026-05-07" },
  { label: "Runtime closure packet", href: "/documents/testnet-integration-runtime-closure-2026-05-07" },
  { label: "Awards: 1st Place Superteam Poland", href: "/awards" },
];

export default function JudgesPage() {
  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <section className="rounded-[34px] border border-cyan-300/18 bg-[radial-gradient(circle_at_8%_0%,rgba(34,211,238,0.18),transparent_34%),radial-gradient(circle_at_92%_10%,rgba(20,241,149,0.16),transparent_30%),linear-gradient(180deg,rgba(7,12,24,0.96),rgba(4,7,16,0.99))] p-5 shadow-[0_30px_120px_rgba(0,0,0,0.35)] sm:p-7">
        <div className="mb-5 flex flex-wrap items-center gap-2">
          {["60-second review", "Testnet proof", "Anchor 1.0.1"].map((label) => (
            <span key={label} className="rounded-full border border-cyan-300/18 bg-cyan-300/10 px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-cyan-100">
              {label}
            </span>
          ))}
        </div>

        <div className="grid gap-5 xl:grid-cols-[0.9fr_0.74fr_0.78fr]">
          <div className="space-y-4">
            <div className="text-[11px] uppercase tracking-[0.32em] text-emerald-100/78">Judges fast path</div>
            <h1 className="text-3xl font-semibold tracking-[-0.04em] text-white sm:text-5xl">
              Everything needed to review PrivateDAO in 60 seconds.
            </h1>
            <p className="text-sm leading-7 text-white/66">
              PrivateDAO combines ZK privacy, REFHE confidential execution, MagicBlock speed, and GoldRush intelligence into one governance OS where every decision is private, verified, and informed.
            </p>
            <div className="flex flex-wrap gap-3">
              <a href={eitherwayPreview} target="_blank" rel="noreferrer" className={cn(buttonVariants({ size: "lg" }))}>
                Live demo
                <ArrowUpRight className="h-4 w-4" />
              </a>
              <a href={githubHref} target="_blank" rel="noreferrer" className={cn(buttonVariants({ size: "lg", variant: "outline" }))}>
                GitHub
                <Github className="h-4 w-4" />
              </a>
              <a href={videoHref} target="_blank" rel="noreferrer" className={cn(buttonVariants({ size: "lg", variant: "secondary" }))}>
                Video
                <PlayCircle className="h-4 w-4" />
              </a>
            </div>
          </div>

          <Card className="border-violet-300/16 bg-violet-300/[0.055]">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-3 text-lg">
                <Sparkles className="h-5 w-5 text-violet-100" />
                6 ZK Testnet tx links
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2 text-sm">
              {zkProofs.map((proof) => (
                <a
                  key={proof.href}
                  href={proof.href}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/20 px-3 py-2.5 text-white/74 transition hover:border-violet-300/30 hover:text-white"
                >
                  {proof.label}
                  <ArrowUpRight className="h-4 w-4 shrink-0" />
                </a>
              ))}
            </CardContent>
          </Card>

          <Card className="border-emerald-300/18 bg-emerald-300/[0.07]">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-3 text-lg">
                <ShieldCheck className="h-5 w-5 text-emerald-100" />
                Proof packet
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2 text-sm">
              {judgeLinks.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/20 px-3 py-2.5 text-white/76 transition hover:border-emerald-300/30 hover:text-white"
                >
                  {item.label}
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
              ))}
            </CardContent>
          </Card>
        </div>
      </section>

      <Card className="mt-5 border-white/10 bg-white/[0.035]">
        <CardContent className="grid gap-3 p-5 text-sm leading-7 text-white/64 md:grid-cols-3">
          <a href={colosseumHref} target="_blank" rel="noreferrer" className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white/76 transition hover:border-cyan-300/30 hover:text-white">
            Colosseum project profile
            <ArrowUpRight className="h-4 w-4" />
          </a>
          <div className="flex items-center gap-3 rounded-2xl border border-amber-300/16 bg-amber-300/[0.07] px-4 py-3 text-amber-50">
            <Award className="h-4 w-4" />
            1st Place · Superteam Poland
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
            <div className="flex items-center gap-2 text-white">
              <Mail className="h-4 w-4 text-cyan-100" />
              Fahd Kotb · Founder · Telegram
            </div>
            <div className="mt-1 text-white/54">Founder contact for reviewer follow-up and pilot coordination.</div>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
