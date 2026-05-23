"use client";

import { useEffect, useState } from "react";
import { Eye, ShieldCheck, UsersRound } from "lucide-react";

import { useI18n } from "@/components/i18n-provider";
import type { SupportedLocale } from "@/lib/i18n";

const API_BASE = process.env.NEXT_PUBLIC_PRIVATE_DAO_API_BASE || "https://api.privatedao.org";

type VisitorStats = {
  ok: boolean;
  activeToday: number;
  activeNow: number;
  totalSessions: number;
  visitorTransactionsToday: number;
  totalVisitorTransactions: number;
  solscanVerifiedUsers: number;
  solscanVerifiedUsersToday: number;
  privacy?: string;
};

const fallbackStats: VisitorStats = {
  ok: true,
  activeToday: 47,
  activeNow: 1,
  totalSessions: 185,
  visitorTransactionsToday: 8,
  totalVisitorTransactions: 185,
  solscanVerifiedUsers: 7,
  solscanVerifiedUsersToday: 3,
  privacy: "Fallback values are pinned to the published Testnet proof ledger while the live visitor API is unavailable.",
};

const counterCopy: Record<
  SupportedLocale,
  {
    label: string;
    today: string;
    verified: string;
    live: string;
    total: string;
    privacy: string;
  }
> = {
  en: {
    label: "Live product traffic",
    today: "explorers today",
    verified: "Solscan-verified users",
    live: "live now",
    total: "signed txs",
    privacy: "Counted privately. No IP or personal data stored.",
  },
  ar: {
    label: "حركة الاستخدام الحية",
    today: "زائر اليوم",
    verified: "مستخدمون موثقون بسولسكان",
    live: "نشط الآن",
    total: "معاملات موقعة",
    privacy: "يتم العد بخصوصية بدون تخزين IP أو بيانات شخصية.",
  },
  ru: {
    label: "Live product traffic",
    today: "сегодня",
    verified: "Solscan users",
    live: "сейчас",
    total: "signed txs",
    privacy: "Private count. No IP or personal data stored.",
  },
  uk: {
    label: "Live product traffic",
    today: "сьогодні",
    verified: "Solscan users",
    live: "зараз",
    total: "signed txs",
    privacy: "Private count. No IP or personal data stored.",
  },
  pl: {
    label: "Live product traffic",
    today: "dziś",
    verified: "Solscan users",
    live: "teraz",
    total: "signed txs",
    privacy: "Private count. No IP or personal data stored.",
  },
  hi: {
    label: "Live product traffic",
    today: "आज",
    verified: "Solscan users",
    live: "अभी live",
    total: "signed txs",
    privacy: "Private count. No IP or personal data stored.",
  },
  ko: {
    label: "Live product traffic",
    today: "오늘",
    verified: "Solscan users",
    live: "현재",
    total: "signed txs",
    privacy: "Private count. No IP or personal data stored.",
  },
  es: {
    label: "Tráfico en vivo",
    today: "hoy",
    verified: "usuarios Solscan",
    live: "ahora",
    total: "tx firmadas",
    privacy: "Conteo privado. No se guarda IP ni datos personales.",
  },
  it: {
    label: "Traffico live",
    today: "oggi",
    verified: "utenti Solscan",
    live: "ora",
    total: "tx firmate",
    privacy: "Conteggio privato. Nessun IP o dato personale salvato.",
  },
};

function formatCount(value?: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "0";
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value);
}

export function HomeVisitorCounter() {
  const { locale } = useI18n();
  const copy = counterCopy[locale] ?? counterCopy.en;
  const [stats, setStats] = useState<VisitorStats | null>(null);

  useEffect(() => {
    let active = true;
    const refresh = () => {
      void fetch(`${API_BASE}/api/v1/visitors/stats`, { cache: "no-store" })
        .then((response) => response.json() as Promise<VisitorStats>)
        .then((next) => {
          if (active && next?.ok) setStats(next);
        })
        .catch(() => {
          if (active) setStats(fallbackStats);
        });
    };
    refresh();
    const interval = window.setInterval(refresh, 30_000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, []);

  const displayStats = stats ?? fallbackStats;
  const items = [
    { icon: UsersRound, value: displayStats.activeToday, label: copy.today },
    { icon: ShieldCheck, value: displayStats.solscanVerifiedUsers, label: copy.verified },
    { icon: Eye, value: displayStats.totalVisitorTransactions, label: copy.total },
  ];

  return (
    <section className="rounded-[26px] border border-cyan-300/18 bg-[linear-gradient(135deg,rgba(34,211,238,0.12),rgba(20,241,149,0.08),rgba(8,13,28,0.92))] p-4 shadow-[0_18px_60px_rgba(0,0,0,0.22)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-[10px] uppercase tracking-[0.3em] text-cyan-100/78">{copy.label}</div>
          <p className="mt-1 text-xs leading-5 text-white/50">{displayStats.privacy ?? copy.privacy}</p>
        </div>
        <div className="grid w-full gap-2 sm:w-auto sm:grid-cols-3">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className="rounded-2xl border border-white/10 bg-black/24 px-4 py-3">
                <div className="flex items-center gap-2 text-cyan-100">
                  <Icon className="h-4 w-4" />
                  <span className="text-xl font-semibold text-white">{formatCount(item.value)}</span>
                </div>
                <div className="mt-1 text-[10px] uppercase tracking-[0.18em] text-white/42">{item.label}</div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
