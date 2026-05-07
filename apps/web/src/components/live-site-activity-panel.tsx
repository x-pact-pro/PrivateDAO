"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Activity, Eye, RadioTower, ShieldCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const API_BASE = process.env.NEXT_PUBLIC_PRIVATE_DAO_API_BASE || "https://api.privatedao.org";

type FreshnessLatest = {
  ok: boolean;
  latest: null | {
    tx: string;
    slot: number;
    time: string;
    explorer: string;
  };
};

type VisitorStats = {
  ok: boolean;
  privacy: string;
  activeToday: number;
  activeNow: number;
  totalSessions: number;
  byDay: { date: string; sessions: number }[];
  topPages: { page: string; visits: number }[];
  generatedAt: string;
};

type ActivityState = {
  freshness: FreshnessLatest | null;
  visitors: VisitorStats | null;
};

function minutesAgo(iso?: string) {
  if (!iso) return "waiting for first auto-refresh";
  const diff = Math.max(0, Date.now() - new Date(iso).getTime());
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "less than 1 minute ago";
  if (minutes === 1) return "1 minute ago";
  if (minutes < 60) return `${minutes} minutes ago`;
  const hours = Math.floor(minutes / 60);
  return hours === 1 ? "1 hour ago" : `${hours} hours ago`;
}

async function fetchActivity(): Promise<ActivityState> {
  const [freshness, visitors] = await Promise.all([
    fetch(`${API_BASE}/api/v1/freshness/latest`, { cache: "no-store" })
      .then((response) => response.json() as Promise<FreshnessLatest>)
      .catch(() => null),
    fetch(`${API_BASE}/api/v1/visitors/stats`, { cache: "no-store" })
      .then((response) => response.json() as Promise<VisitorStats>)
      .catch(() => null),
  ]);
  return { freshness, visitors };
}

export function LiveSiteActivityPanel({ variant = "compact" }: { variant?: "compact" | "analytics" }) {
  const [state, setState] = useState<ActivityState>({ freshness: null, visitors: null });

  useEffect(() => {
    let active = true;
    const refresh = () => {
      void fetchActivity().then((next) => {
        if (active) setState(next);
      });
    };
    refresh();
    const interval = window.setInterval(refresh, 30_000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, []);

  const latest = state.freshness?.latest;
  const visitors = state.visitors;
  const peak = Math.max(1, ...(visitors?.byDay.map((day) => day.sessions) || [1]));

  return (
    <section className="rounded-[30px] border border-cyan-300/18 bg-[linear-gradient(135deg,rgba(34,211,238,0.12),rgba(15,23,42,0.78))] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.26)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Badge variant="cyan">Living proof</Badge>
          <h2 className="mt-3 text-2xl font-semibold text-white">Live Testnet freshness and private visitor signal</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-white/68">
            Every visit pings the read node without storing personal data. Freshness is backed by a throttled Solana Testnet memo transaction, and usage is counted by hashed browser session only.
          </p>
        </div>
        {latest ? (
          <Link href={latest.explorer} target="_blank" className={cn(buttonVariants({ variant: "outline" }))}>
            Open latest tx
          </Link>
        ) : null}
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-4">
        <div className="rounded-[22px] border border-white/10 bg-black/25 p-4">
          <RadioTower className="h-5 w-5 text-cyan-200" />
          <div className="mt-3 text-xs uppercase tracking-[0.22em] text-white/42">Last proof</div>
          <div className="mt-1 text-lg font-semibold text-white">{minutesAgo(latest?.time)}</div>
          <div className="mt-1 text-xs text-white/48">{latest ? `slot ${latest.slot}` : "auto-refresh will create the first ping"}</div>
        </div>
        <div className="rounded-[22px] border border-white/10 bg-black/25 p-4">
          <Activity className="h-5 w-5 text-emerald-200" />
          <div className="mt-3 text-xs uppercase tracking-[0.22em] text-white/42">Active today</div>
          <div className="mt-1 text-lg font-semibold text-white">{visitors?.activeToday ?? "..."}</div>
          <div className="mt-1 text-xs text-white/48">governance explorers</div>
        </div>
        <div className="rounded-[22px] border border-white/10 bg-black/25 p-4">
          <Eye className="h-5 w-5 text-violet-200" />
          <div className="mt-3 text-xs uppercase tracking-[0.22em] text-white/42">Live sessions</div>
          <div className="mt-1 text-lg font-semibold text-white">{visitors?.activeNow ?? "..."}</div>
          <div className="mt-1 text-xs text-white/48">last 30 minutes</div>
        </div>
        <div className="rounded-[22px] border border-white/10 bg-black/25 p-4">
          <ShieldCheck className="h-5 w-5 text-amber-100" />
          <div className="mt-3 text-xs uppercase tracking-[0.22em] text-white/42">Since launch</div>
          <div className="mt-1 text-lg font-semibold text-white">{visitors?.totalSessions ?? "..."}</div>
          <div className="mt-1 text-xs text-white/48">hashed sessions</div>
        </div>
      </div>

      {variant === "analytics" ? (
        <div className="mt-5 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
            <div className="text-sm font-semibold text-white">Last 7 days</div>
            <div className="mt-4 flex h-36 items-end gap-2">
              {(visitors?.byDay || []).map((day) => (
                <div key={day.date} className="flex flex-1 flex-col items-center gap-2">
                  <div
                    className="w-full rounded-t-xl bg-cyan-300/70"
                    style={{ height: `${Math.max(8, (day.sessions / peak) * 128)}px` }}
                  />
                  <div className="text-[10px] text-white/45">{day.date.slice(5)}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
            <div className="text-sm font-semibold text-white">Top pages</div>
            <div className="mt-3 space-y-2">
              {(visitors?.topPages || []).map((page) => (
                <div key={page.page} className="flex items-center justify-between rounded-2xl bg-white/5 px-3 py-2 text-sm">
                  <span className="max-w-[220px] truncate text-white/72">{page.page}</span>
                  <span className="font-semibold text-white">{page.visits}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      <p className="mt-4 text-xs leading-5 text-white/48">
        {visitors?.privacy || "Counted privately — no personal data stored."}
      </p>
    </section>
  );
}
