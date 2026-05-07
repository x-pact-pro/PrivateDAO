"use client";

import { useState } from "react";
import Link from "next/link";
import { Download, MessageSquareMore, Youtube } from "lucide-react";

import { androidApkDownloadUrl } from "@/lib/android-surface";
import { useSiteUrls } from "@/lib/site-urls";
import { useI18n } from "@/components/i18n-provider";

export function SiteFooter() {
  const [showMore, setShowMore] = useState(false);
  const { judgeViewUrl, liveSiteUrl } = useSiteUrls();
  const { copy } = useI18n();

  return (
    <footer className="border-t border-white/8 bg-[#050816]">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-10 text-sm text-white/55 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <div className="max-w-3xl space-y-2">
          <div>
            {copy.chrome.footerSummary}
          </div>
          <div className="text-xs leading-6 text-white/44">
            {copy.chrome.footerSupport}
          </div>
        </div>
        <div className="flex flex-col gap-4 lg:items-end">
          <div className="flex flex-wrap items-center gap-5">
            <Link href="/start" className="hover:text-white">
              {copy.chrome.start}
            </Link>
            <Link href="/learn" className="hover:text-white">
              {copy.chrome.learn}
            </Link>
            <Link href="/services" className="hover:text-white">
              {copy.chrome.apiPricing}
            </Link>
            <Link href="/about" className="hover:text-white">
              About
            </Link>
            <Link href="/intelligence" className="hover:text-white">
              Intelligence
            </Link>
            <Link href="/payroll" className="hover:text-white">
              Payroll
            </Link>
            <Link href="/trust" className="hover:text-white">
              {copy.chrome.trust}
            </Link>
            <Link href="/story" className="hover:text-white">
              {copy.chrome.story}
            </Link>
          </div>
          <button
            type="button"
            className="text-left text-xs uppercase tracking-[0.24em] text-white/44 transition hover:text-white lg:hidden"
            onClick={() => setShowMore((current) => !current)}
          >
            {showMore ? copy.chrome.hideMoreLinks : copy.chrome.showMoreLinks}
          </button>
          <div className={showMore ? "flex flex-wrap items-center gap-5" : "hidden flex-wrap items-center gap-5 lg:flex"}>
          <Link href="/community" className="hover:text-white">
            {copy.chrome.community}
          </Link>
          <Link href="/documents" className="hover:text-white">
            {copy.chrome.docs}
          </Link>
          <Link href="/gaming" className="hover:text-white">
            Gaming
          </Link>
          <Link href="/compliance" className="hover:text-white">
            Compliance
          </Link>
          <Link href="/developers" className="hover:text-white">
            Developers
          </Link>
          <Link href="/rpc-services" className="hover:text-white">
            RPC Services
          </Link>
          <Link href="/command-center" className="hover:text-white">
            Command Center
          </Link>
          <Link href="/awards" className="hover:text-white">
            Awards
          </Link>
          <Link href="/benefit" className="hover:text-white">
            Benefit
          </Link>
          <a href={judgeViewUrl} target="_blank" rel="noreferrer" className="hover:text-white">
            {copy.chrome.verificationView}
          </a>
          <Link href="/documents/reviewer-fast-path" className="hover:text-white">
            {copy.chrome.fastPath}
          </Link>
          <Link href="/documents/reviewer-telemetry-packet" className="hover:text-white">
            {copy.chrome.telemetryPacket}
          </Link>
          <Link href="/documents/ownership-and-contact" className="hover:text-white">
            {copy.chrome.leadershipContact}
          </Link>
          <a href="https://github.com/X-PACT/PrivateDAO" target="_blank" rel="noreferrer" className="hover:text-white">
            {copy.chrome.repository}
          </a>
          <a href={liveSiteUrl} target="_blank" rel="noreferrer" className="hover:text-white">
            {copy.chrome.currentLiveSite}
          </a>
          <a
            href={androidApkDownloadUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-full border border-emerald-400/18 bg-emerald-400/8 px-3 py-1.5 text-white/76 transition hover:border-emerald-300/30 hover:text-white"
          >
            <Download className="h-4 w-4 text-emerald-200" />
            <span>{copy.chrome.androidApk}</span>
          </a>
          <Link
            href="/story"
            className="inline-flex items-center gap-2 rounded-full border border-violet-400/18 bg-violet-400/8 px-3 py-1.5 text-white/76 transition hover:border-violet-300/30 hover:text-white"
          >
            <Youtube className="h-4 w-4 text-violet-200" />
            <span>{copy.chrome.storyVideo}</span>
          </Link>
          <a
            href="https://www.youtube.com/@privatedao"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-full border border-red-400/18 bg-red-400/8 px-3 py-1.5 text-white/76 transition hover:border-red-300/30 hover:text-white"
          >
            <Youtube className="h-4 w-4 text-red-300" />
            <span>{copy.chrome.youtube}</span>
          </a>
          <a
            href="https://discord.gg/PbM8BC2A"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-full border border-cyan-400/18 bg-cyan-400/8 px-3 py-1.5 text-white/76 transition hover:border-cyan-300/30 hover:text-white"
          >
            <MessageSquareMore className="h-4 w-4 text-cyan-200" />
            <span>{copy.chrome.discord}</span>
          </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
