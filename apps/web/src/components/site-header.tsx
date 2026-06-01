"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, LockKeyhole, Search, Sparkles } from "lucide-react";

import { LanguageSwitcher } from "@/components/language-switcher";
import { WalletConnectButton } from "@/components/wallet-connect-button";
import { useI18n } from "@/components/i18n-provider";
import { buttonVariants } from "@/components/ui/button";
import { useSiteUrls } from "@/lib/site-urls";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/try", label: "Start", rel: "nofollow" },
  { href: "/value", label: "Why" },
  { href: "/learn", label: "Learn" },
  { href: "/govern", label: "Govern", rel: "nofollow" },
  { href: "/treasury", label: "Treasury", rel: "nofollow" },
  { href: "/proof", label: "Proof" },
  { href: "/android", label: "Android" },
  { href: "/judge", label: "Judge" },
];

const utilityNav = [
  { href: "/intelligence", label: "Intelligence", rel: "nofollow" },
  { href: "/services", label: "Services" },
  { href: "/api-status", label: "API Status", rel: "nofollow" },
  { href: "/rpc-services", label: "RPC" },
  { href: "/documents", label: "Docs" },
  { href: "/whitepaper", label: "Whitepaper" },
  { href: "/story", label: "Story" },
  { href: "/community", label: "Community" },
  { href: "/products", label: "Products" },
  { href: "/network", label: "Network" },
  { href: "/search", label: "Search", rel: "nofollow" },
];

export function SiteHeader() {
  const { liveSiteUrl } = useSiteUrls();
  const { copy } = useI18n();
  const pathname = usePathname();
  const resolvePrimaryLabel = (href: string, fallback: string) => {
    switch (href) {
      case "/start":
      case "/govern#live-dao":
      case "/try":
        return copy.chrome.start;
      case "/learn":
        return copy.chrome.learn;
      case "/govern":
        return copy.chrome.govern;
      case "/intelligence":
        return "Intelligence";
      case "/treasury":
        return "Treasury";
      case "/android":
        return "Android";
      case "/proof":
        return "Proof";
      case "/judge":
        return "Judge";
      default:
        return fallback;
    }
  };
  const resolveUtilityLabel = (href: string, fallback: string) => {
    switch (href) {
      case "/rpc-services":
        return "RPC";
      case "/api-status":
        return "API Status";
      case "/services":
        return copy.chrome.apiPricing;
      case "/documents":
        return copy.chrome.docs;
      case "/whitepaper":
        return "Whitepaper";
      case "/search":
        return copy.chrome.search;
      default:
        return fallback;
    }
  };
  const operationSteps = [
    { label: "Try Testnet Vote", href: "/try" },
    { label: "Review", href: "/intelligence" },
    { label: "Vote", href: "/govern#commit-vote-action" },
    { label: "Verify", href: "/proof" },
  ] as const;
  const isStepActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <header className="sticky top-0 z-40 border-b border-white/8 bg-[#050816]/75 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4 lg:items-center">
          <div className="group flex min-w-0 flex-col gap-0">
            <Link href="/" className="min-w-0">
              <div className="flex flex-nowrap items-center gap-0.5 whitespace-nowrap text-lg font-semibold tracking-tight text-white sm:text-2xl">
                <span>PrivateD</span>
                <span className="inline-block bg-[linear-gradient(135deg,#14f195,#00c2ff,#9945ff)] bg-clip-text text-[1.3rem] font-black text-transparent drop-shadow-[0_0_20px_rgba(20,241,149,0.42)] animate-pulse sm:text-[1.7rem]">
                  △
                </span>
                <span>O</span>
              </div>
              <div className="mt-1 hidden items-center gap-2 text-[11px] uppercase tracking-[0.24em] text-white/42 lg:flex">
                <LockKeyhole className="h-3.5 w-3.5 text-cyan-200/80" />
                <span>{copy.chrome.createPrivateDaoTagline}</span>
              </div>
            </Link>
            <div className="mt-2 hidden flex-wrap gap-2 xl:flex">
              {operationSteps.map((step) => (
                <Link
                  key={step.label}
                  href={step.href}
                  className={cn(
                    "rounded-full border px-3 py-1 text-[10px] uppercase tracking-[0.22em] transition",
                    isStepActive(step.href)
                      ? "border-cyan-300/26 bg-cyan-300/[0.12] text-cyan-100"
                      : "border-white/10 bg-white/[0.04] text-white/48 hover:text-white/72",
                  )}
                >
                  {step.label}
                </Link>
              ))}
            </div>
          </div>

          <div className="flex w-full shrink-0 flex-wrap items-center gap-1.5 sm:w-auto sm:flex-nowrap sm:gap-2">
            <LanguageSwitcher />
            <Link
              href="/search"
              className={cn(buttonVariants({ size: "sm", variant: "ghost" }), "hidden h-10 w-10 rounded-full p-0 text-white/72 sm:inline-flex")}
              aria-label={copy.chrome.search}
            >
              <Search className="h-4 w-4" />
            </Link>
            <Link
              href="/assistant"
              className={cn(buttonVariants({ size: "sm", variant: "ghost" }), "hidden h-10 w-10 rounded-full p-0 text-white/72 sm:inline-flex")}
              aria-label={copy.chrome.help}
            >
              <Sparkles className="h-4 w-4" />
            </Link>
            <a
              className={cn(buttonVariants({ size: "sm", variant: "secondary" }), "hidden xl:inline-flex")}
              href={liveSiteUrl}
              rel="noreferrer"
              target="_blank"
            >
              {copy.chrome.openApp}
            </a>
            <Link
              href="/try"
              className={cn(buttonVariants({ size: "sm" }), "hidden whitespace-nowrap xl:inline-flex")}
            >
              Try Testnet Vote
              <ArrowRight className="h-4 w-4" />
            </Link>
            <WalletConnectButton className="max-w-full flex-1 px-3 sm:flex-none" />
          </div>
        </div>

          <nav className="no-scrollbar flex min-w-0 items-center justify-between gap-1 overflow-x-auto border-t border-white/6 pt-3 pb-1 sm:justify-start sm:gap-1.5">
            {navItems.map((item) => {
              return (
              <Link
                className={cn(buttonVariants({ size: "sm", variant: "ghost" }), "shrink-0 px-1.5 text-[11px] text-white/72 sm:px-3 sm:text-sm")}
                href={item.href}
                key={item.href}
                rel={item.rel}
              >
                {resolvePrimaryLabel(item.href, item.label)}
              </Link>
              );
            })}
        </nav>

        <div className="flex flex-wrap items-center gap-2 border-t border-white/6 pt-3 text-[10px] uppercase tracking-[0.22em] text-white/46 xl:hidden">
          {operationSteps.map((step) => (
            <Link
              key={step.label}
              href={step.href}
              className={cn(
                "rounded-full border px-3 py-1 transition",
                isStepActive(step.href)
                  ? "border-cyan-300/26 bg-cyan-300/[0.12] text-cyan-100"
                  : "border-white/10 bg-white/[0.04] text-white/50",
              )}
            >
              {step.label}
            </Link>
          ))}
        </div>

        <div className="hidden border-t border-white/6 pt-3 lg:flex lg:flex-row lg:items-center lg:justify-between lg:gap-3">
          <div className="flex min-w-0 items-center gap-2 rounded-full border border-white/10 bg-white/4 px-4 py-2 text-sm text-white/62">
            <Search className="h-4 w-4 text-cyan-200" />
            <Link href="/search" className="truncate">
              {copy.chrome.searchSite}
            </Link>
            <span className="ml-auto hidden rounded-full border border-white/10 bg-black/20 px-2 py-0.5 text-[11px] uppercase tracking-[0.18em] text-white/38 sm:inline-flex">
              ⌘K
            </span>
          </div>

          <nav className="no-scrollbar flex items-center gap-1.5 overflow-x-auto pb-1">
            {utilityNav.map((item) => {
              return (
              <Link
                className={cn(buttonVariants({ size: "sm", variant: "ghost" }), "shrink-0 px-3 text-white/68")}
                href={item.href}
                key={item.href}
                rel={item.rel}
              >
                {resolveUtilityLabel(item.href, item.label)}
              </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </header>
  );
}
