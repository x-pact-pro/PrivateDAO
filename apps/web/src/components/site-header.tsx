"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Bot, BookOpen, CheckCircle2, ChevronDown, Code2, Coins, FileCheck2, Gavel, Landmark, Menu, Network, ShieldCheck, Users, WalletCards, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { LanguageSwitcher } from "@/components/language-switcher";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type MenuLink = { href: string; label: string; description: string; icon: typeof WalletCards; external?: boolean };
type MenuColumn = { title: string; links: readonly MenuLink[] };

const menus: Record<string, { label: string; columns: readonly MenuColumn[] }> = {
  Use: {
    label: "Use",
    columns: [
      { title: "Run private operations", links: [
        { href: "/payroll", label: "Confidential Payroll", description: "Pay people without publishing salaries.", icon: WalletCards },
        { href: "/treasury", label: "Treasury Coordination", description: "Approve spending without exposing the room.", icon: Landmark },
        { href: "/govern", label: "Private Governance", description: "Make decisions with the right people.", icon: Users },
      ] },
      { title: "Transact privately", links: [
        { href: "/auctions", label: "Confidential Auctions", description: "Keep competing offers private until the result.", icon: Gavel },
        { href: "/payments", label: "Private Settlement", description: "Move an approved transaction through its final step.", icon: WalletCards },
      ] },
      { title: "Verify without revealing", links: [
        { href: "/proof-workflows/blind-policy", label: "Blind Verification", description: "Prove a condition without exposing the source data.", icon: ShieldCheck },
        { href: "/products/record-verification", label: "Record Verification", description: "Give others a simple link to check a record.", icon: FileCheck2 },
      ] },
    ],
  },
  Build: {
    label: "Build",
    columns: [
      { title: "Build with PrivateDAO", links: [
        { href: "/developers", label: "Developers", description: "Connect trusted workflows to your product.", icon: Code2 },
        { href: "/developers/blind-policy-api", label: "API resources", description: "Use verification and receipt surfaces from your system.", icon: Network },
        { href: "/agents", label: "Agent ecosystem", description: "Discover bounded services with checkable results.", icon: Bot },
      ] },
      { title: "Integration resources", links: [
        { href: "/integrations", label: "Integrations", description: "See the paths into existing organizational systems.", icon: Network },
        { href: "/services", label: "Network support", description: "Choose the execution environment behind the workflow.", icon: Landmark },
        { href: "/proof", label: "Evidence and receipts", description: "Inspect what a completed action can prove.", icon: CheckCircle2 },
      ] },
    ],
  },
  Learn: {
    label: "Learn",
    columns: [
      { title: "The idea", links: [
        { href: "/thesis", label: "Why privacy", description: "Why important work should not become public by default.", icon: ShieldCheck },
        { href: "/whitepaper", label: "Whitepaper", description: "The ideas and boundaries behind the products.", icon: BookOpen },
        { href: "/proof-workflows", label: "Verification", description: "See how confidence can exist without exposure.", icon: FileCheck2 },
      ] },
      { title: "For reviewers", links: [
        { href: "/security", label: "Security", description: "Read the public security and privacy boundaries.", icon: ShieldCheck },
        { href: "/documents", label: "Evidence library", description: "Browse product and verification material.", icon: BookOpen },
      ] },
    ],
  },
  PDAO: {
    label: "PDAO",
    columns: [
      { title: "The ecosystem", links: [
        { href: "/token", label: "PDAO", description: "Official token information and current utility.", icon: Coins },
        { href: "https://agents.privatedao.org/", label: "Agent Marketplace", description: "Discover services for autonomous systems.", icon: Bot, external: true },
      ] },
      { title: "Stay connected", links: [
        { href: "/contact", label: "Contact PrivateDAO", description: "Bring us the work that needs to stay private.", icon: Users },
        { href: "/community", label: "Community", description: "Follow the people building the ecosystem.", icon: Users },
      ] },
    ],
  },
};

function MenuPanel({ menu, onNavigate }: { menu: (typeof menus)[string]; onNavigate: () => void }) {
  return (
    <div className="commercial-mega-panel" role="region" aria-label={`${menu.label} menu`}>
      <div className="commercial-mega-grid">
        {menu.columns.map((column) => <div key={column.title} className="commercial-mega-column">
          <div className="commercial-mega-column-title">{column.title}</div>
          <div className="mt-3 grid gap-1">
            {column.links.map((link) => { const Icon = link.icon; const content = <><span className="commercial-mega-icon"><Icon className="h-4 w-4" /></span><span><strong>{link.label}</strong><small>{link.description}</small></span><ArrowUpRight className="commercial-mega-arrow h-4 w-4" /></>; return link.external ? <a key={link.label} href={link.href} target="_blank" rel="noreferrer" onClick={onNavigate} className="commercial-mega-link">{content}</a> : <Link key={link.label} href={link.href} onClick={onNavigate} className="commercial-mega-link">{content}</Link>; })}
          </div>
        </div>)}
      </div>
    </div>
  );
}

export function SiteHeader() {
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    function closeOnOutside(event: MouseEvent) {
      if (headerRef.current && !headerRef.current.contains(event.target as Node)) {
        setOpenMenu(null);
        setMobileMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", closeOnOutside);
    return () => document.removeEventListener("mousedown", closeOnOutside);
  }, []);

  return (
    <header ref={headerRef} className="commercial-header sticky top-0 z-40 border-b border-[#dce5f0] bg-white/95 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-4 py-3.5 sm:px-6 lg:px-8">
        <Link href="/" className="min-w-0 shrink-0" onClick={() => setOpenMenu(null)}><div className="flex items-center gap-3"><Image unoptimized src="/assets/privatedao-brand-mark-20260918.jpeg" alt="PrivateDAO" width={42} height={42} className="header-brand-mark h-10 w-10 rounded-full object-cover ring-1 ring-[#b9d8f2]" /><div className="whitespace-nowrap text-lg font-semibold tracking-[-0.03em] text-[#10233f] sm:text-xl">Private<span className="text-[#175cd3]">DAO</span></div></div></Link>

        <nav aria-label="Primary navigation" className="commercial-primary-nav flex min-w-0 items-center justify-center gap-1">
          {Object.entries(menus).map(([key, menu]) => { const isOpen = openMenu === key; return <div key={key} className="commercial-menu-wrap"><button type="button" aria-expanded={isOpen} aria-haspopup="true" onClick={() => setOpenMenu(isOpen ? null : key)} className={cn(buttonVariants({ size: "sm", variant: "ghost" }), "commercial-menu-trigger gap-1 px-2 text-[11px] text-[#425570] sm:px-3 sm:text-sm", isOpen && "commercial-menu-trigger-open")}>{menu.label}<ChevronDown className={cn("h-3.5 w-3.5 transition-transform", isOpen && "rotate-180")} /></button>{isOpen ? <MenuPanel menu={menu} onNavigate={() => setOpenMenu(null)} /> : null}</div>; })}
        </nav>

        <div className="flex shrink-0 items-center gap-2"><button type="button" aria-label={mobileMenuOpen ? "Close navigation" : "Open navigation"} aria-expanded={mobileMenuOpen} onClick={() => setMobileMenuOpen((open) => !open)} className="commercial-mobile-trigger" title={mobileMenuOpen ? "Close navigation" : "Open navigation"}>{mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}</button><div className="hidden sm:block"><LanguageSwitcher /></div><div className="sm:hidden"><LanguageSwitcher compact /></div><Link href="/contact" className={cn(buttonVariants({ size: "sm" }), "gap-1.5")}>Talk to us <ArrowUpRight className="h-3.5 w-3.5" /></Link></div>
      </div>
      {mobileMenuOpen ? <div className="commercial-mobile-panel">{Object.entries(menus).map(([key, menu]) => <MenuPanel key={key} menu={menu} onNavigate={() => setMobileMenuOpen(false)} />)}</div> : null}
    </header>
  );
}
