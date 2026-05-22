import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, CheckCircle2, Download, Github, PlayCircle, QrCode, ShieldCheck, Smartphone, Trophy, Wallet } from "lucide-react";

import { OperationsShell } from "@/components/operations-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import {
  androidApkDownloadUrl,
  androidApkRepositoryUrl,
  androidApkSha256,
  androidApkSizeLabel,
  androidAppVersion,
  androidBranchName,
  androidGuideUrl,
  androidNetworkLabel,
  androidParityManifestUrl,
  androidProgramId,
  androidRepositoryBaseUrl,
  androidReviewerRunbookUrl,
  androidVersionCode,
  androidWalletAdapterVersion,
} from "@/lib/android-surface";
import { buildRouteMetadata } from "@/lib/route-metadata";
import { cn } from "@/lib/utils";

export const metadata: Metadata = buildRouteMetadata({
  title: "Android App",
  description:
    "Download the PrivateDAO Android APK and try a mobile Solana operating path for wallet-first DAO governance, private execution lanes, and proof-linked on-chain verification.",
  path: "/android",
  keywords: ["android app", "apk", "mobile wallet adapter", "android governance app", "privatedao mobile"],
});

const parityItems = [
  "The Android APK now promotes the live web product as the primary mobile route, while native screens keep wallet-signed governance actions available on Solana Testnet.",
  "The APK points judges and users into the same multilingual live web routes while Mobile Wallet Adapter-compatible native screens keep wallet connection and signing available for Solana Testnet actions.",
  "Create DAO, deposit treasury, create proposal, commit, reveal, finalize, execute, and Testnet billing rehearsals are available from Android.",
  "Wallet-first mobile operations run on the same Solana Testnet program and verification path used by the web surface.",
  "Proof, runtime logs, monitoring, and reviewer routes stay linked so mobile execution remains auditable and easy to validate.",
];

const mobileFlowItems = [
  {
    title: "1. Connect",
    detail: "Open the Android app, connect a Mobile Wallet Adapter-compatible wallet, and keep the current account and Testnet network visible before any action starts.",
    icon: Wallet,
  },
  {
    title: "2. Review",
    detail: "Review the governance or execution intent first. The app should explain what will happen before the wallet prompt appears.",
    icon: Smartphone,
  },
  {
    title: "3. Sign",
    detail: "Approve the wallet action from the mobile wallet layer, then return to the app without losing the operation context.",
    icon: QrCode,
  },
  {
    title: "4. Verify",
    detail: "Open the same proof, explorer, and runtime continuity surfaces used by the web product so the mobile flow stays trustable end to end.",
    icon: ShieldCheck,
  },
];

export default function AndroidPage() {
  return (
    <OperationsShell
      eyebrow="Android"
      title="PrivateDAO Android: premium mobile DAO operations with privacy, proof, and wallet-first execution"
      description="This APK turns PrivateDAO from a web app into a mobile Solana product: ordinary users can open the same live web experience, then continue into native wallet-signed governance, confidential operations, service lanes, and on-chain proof without terminal complexity."
      badges={[
        { label: "Updated APK live", variant: "success" },
        { label: "Try it now", variant: "success" },
        { label: "Mobile-first execution", variant: "cyan" },
        { label: "Live web + native signing", variant: "violet" },
      ]}
    >
      <Card className="border-emerald-300/16 bg-[radial-gradient(circle_at_top_left,rgba(20,241,149,0.16),transparent_34%),rgba(255,255,255,0.04)]">
        <CardContent className="grid gap-5 p-5 lg:grid-cols-[0.75fr_1.25fr_auto] lg:items-center">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-300/20 bg-emerald-300/10 text-emerald-100">
              <PlayCircle className="h-6 w-6" />
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-[0.28em] text-emerald-100/78">Try it now</div>
              <div className="mt-1 text-xl font-semibold text-white">A live mobile Solana operating path, not a screenshot.</div>
            </div>
          </div>
          <div className="grid gap-3 text-sm leading-7 text-white/68 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/8 bg-black/18 p-4">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-violet-100/82">
                <Trophy className="h-4 w-4" />
                Innovation one
              </div>
              <p className="mt-2">A sovereign encrypted web operating system for governance, payroll, payments, rewards, intelligence, and proof.</p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-black/18 p-4">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-100/82">
                <Smartphone className="h-4 w-4" />
                Innovation two
              </div>
              <p className="mt-2">An Android APK path that lets judges and users enter the same live Testnet product from mobile.</p>
            </div>
          </div>
          <a href={androidApkDownloadUrl} target="_blank" rel="noreferrer" className={cn(buttonVariants(), "w-full justify-between lg:w-auto")}>
            Download APK
            <Download className="h-4 w-4" />
          </a>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Card>
          <CardHeader>
            <CardTitle>Android download surface</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="rounded-3xl border border-emerald-300/16 bg-emerald-300/[0.08] p-4 text-sm leading-7 text-white/72">
              Android is now the mobile proof of the full PrivateDAO thesis: the same live web product for normal users,
              plus native Solana Testnet execution for governance, services, confidential payroll, encrypted payments,
              gaming rewards, diagnostics, multilingual routing, wallet connection, and proof continuity.
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-3xl border border-white/8 bg-white/4 p-4">
                <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.28em] text-emerald-200/76">
                  <Download className="h-3.5 w-3.5" />
                  Download
                </div>
                <div className="mt-3 space-y-2 text-sm leading-7 text-white/68">
                  <div>Artifact: <span className="text-white">PrivateDAO Android debug APK</span></div>
                  <div>Version: <span className="text-white">{androidAppVersion}</span> / code <span className="text-white">{androidVersionCode}</span></div>
                  <div>Size: <span className="text-white">{androidApkSizeLabel}</span></div>
                  <div>SHA-256: <span className="break-all text-white">{androidApkSha256}</span></div>
                </div>
              </div>
              <div className="rounded-3xl border border-white/8 bg-white/4 p-4">
                <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.28em] text-violet-200/76">
                  <Github className="h-3.5 w-3.5" />
                  Branch
                </div>
                <div className="mt-3 space-y-2 text-sm leading-7 text-white/68">
                  <div>Working branch: <span className="text-white">{androidBranchName}</span></div>
                  <div>Network: <span className="text-white">{androidNetworkLabel}</span></div>
                  <div>Program ID: <span className="break-all text-white">{androidProgramId}</span></div>
                  <div>Mobile wallet layer: <span className="text-white">Solana Mobile Wallet Adapter {androidWalletAdapterVersion}</span></div>
                  <div>Product scope: <span className="text-white">multilingual live web parity, native wallet signing, services, proof-linked verification</span></div>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <a href={androidApkDownloadUrl} target="_blank" rel="noreferrer" className={cn(buttonVariants(), "justify-between")}>
                Download Android APK
                <Download className="h-4 w-4" />
              </a>
              <a href={androidApkRepositoryUrl} target="_blank" rel="noreferrer" className={cn(buttonVariants({ variant: "outline" }), "justify-between")}>
                Verify APK in repo
                <Github className="h-4 w-4" />
              </a>
              <a href={androidGuideUrl} target="_blank" rel="noreferrer" className={cn(buttonVariants({ variant: "secondary" }), "justify-between")}>
                Open Android guide
                <ArrowUpRight className="h-4 w-4" />
              </a>
              <a href={androidReviewerRunbookUrl} target="_blank" rel="noreferrer" className={cn(buttonVariants({ variant: "outline" }), "justify-between")}>
                Open reviewer runbook
                <ShieldCheck className="h-4 w-4" />
              </a>
              <a href={androidParityManifestUrl} target="_blank" rel="noreferrer" className={cn(buttonVariants({ variant: "outline" }), "justify-between")}>
                Open parity manifest
                <ShieldCheck className="h-4 w-4" />
              </a>
              <a href={androidRepositoryBaseUrl} target="_blank" rel="noreferrer" className={cn(buttonVariants({ variant: "outline" }), "justify-between")}>
                Open Android branch
                <Github className="h-4 w-4" />
              </a>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Parity status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {parityItems.map((item) => (
              <div key={item} className="flex items-start gap-3 rounded-3xl border border-white/8 bg-white/4 p-4 text-sm leading-7 text-white/68">
                <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-emerald-200" />
                <div>{item}</div>
              </div>
            ))}
            <div className="rounded-3xl border border-cyan-300/16 bg-cyan-300/[0.08] p-4 text-sm leading-7 text-white/72">
              This Android surface is designed to feel like a category shift: the judge can see a live web-grade product,
              then see the same project become a mobile app that participates on-chain through guided wallet actions.
              Privacy, service value, cryptographic guarantees, and verification stay visible to operators, partners, and reviewers.
            </div>
            <div className="rounded-3xl border border-amber-300/16 bg-amber-300/[0.08] p-4 text-sm leading-7 text-white/72">
              The APK is a <span className="text-white">debug-signed Testnet reviewer build</span>. It is intended for judging, wallet-path validation, and public product review before Play Store production signing.
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recommended mobile wallet flow</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-2">
          {mobileFlowItems.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.title} className="rounded-3xl border border-white/8 bg-white/4 p-4 text-sm leading-7 text-white/68">
                <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.28em] text-cyan-200/76">
                  <Icon className="h-3.5 w-3.5" />
                  {item.title}
                </div>
                <div className="mt-3">{item.detail}</div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Android product positioning</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm leading-7 text-white/68">
          <div className="rounded-3xl border border-white/8 bg-white/4 p-4">
            PrivateDAO Android is positioned as a category shift for DAO operations: privacy-preserving governance and treasury execution from mobile, with cryptographic trust and on-chain verification accessible to ordinary users.
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/proof" className={cn(buttonVariants({ variant: "secondary" }), "justify-between")}>
              Open proof
              <ArrowUpRight className="h-4 w-4" />
            </Link>
            <Link href="/documents/real-device-runtime" className={cn(buttonVariants({ variant: "outline" }), "justify-between")}>
              Open runtime evidence
              <ArrowUpRight className="h-4 w-4" />
            </Link>
            <Link href="/documents/monitoring-alert-rules" className={cn(buttonVariants({ variant: "outline" }), "justify-between")}>
              Open monitoring rules
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
        </CardContent>
      </Card>
    </OperationsShell>
  );
}
