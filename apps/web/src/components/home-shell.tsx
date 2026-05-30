"use client";

import Link from "next/link";
import {
  ArrowRight,
  BrainCircuit,
  CheckCircle2,
  Code2,
  Coins,
  Compass,
  FileCheck2,
  Gamepad2,
  Gavel,
  Gauge,
  LifeBuoy,
  MessageSquareHeart,
  PlayCircle,
  ReceiptText,
  Shield,
  Trophy,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrackTechnologyGrid } from "@/components/track-technology-grid";
import { useI18n } from "@/components/i18n-provider";
import type { SupportedLocale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const homeCopyByLocale: Record<
  SupportedLocale,
  {
    eyebrow: string;
    title: string;
    body: string;
    launch: string;
    android: string;
    verify: string;
    judge: string;
    workflow: string;
    startAnywhere: string;
    startAnywhereTitle: string;
    guidedStart: string;
    stackLabel: string;
    thesisTitle: string;
    thesisBody: string;
    thesisPrivate: string;
    thesisVerified: string;
    thesisInformed: string;
    deeperSummary: string;
    deeperTitle: string;
    deeperBody: string;
    allSections: string;
  }
> = {
  en: {
    eyebrow: "Coordination Layer",
    title: "Your DAO votes, payroll, and treasury are public. They shouldn't be.",
    body:
      "Most DAOs expose everything: votes, salaries, treasury activity, and internal operations. PrivateDAO enables organizations to operate privately while remaining cryptographically verifiable on Solana.",
    launch: "Try the 3-minute Testnet flow",
    android: "Install Android APK",
    verify: "Open verification view",
    judge: "Open Judge",
    workflow: "View Workflow",
    startAnywhere: "Try it without code",
    startAnywhereTitle: "Create a DAO, submit a proposal, commit/reveal, execute, and verify from the browser.",
    guidedStart: "Open the guided flow",
    stackLabel: "Powered by the live stack",
    thesisTitle: "Private. Verified. Informed.",
    thesisBody:
      "Privacy is not lack of transparency. PrivateDAO keeps sensitive processes private while making outcomes verifiable through commit-reveal governance, proof receipts, encrypted settlement metadata, and Solana Testnet evidence.",
    thesisPrivate: "Private = commit-reveal first, ZK proofs off-chain today, and Cloak / Umbra settlement lanes.",
    thesisVerified: "Verified = Testnet proof, V3 hardening, and Anchor 1.0.1 evidence.",
    thesisInformed: "Informed = GoldRush, QVAC, and the intelligence layer before signing.",
    deeperSummary: "Detailed architecture",
    deeperTitle: "Problem, solution, and operating proof",
    deeperBody:
      "A concise product entry leads first; the deeper operating narrative remains available for reviewers, investors, and technical partners who want the full system context.",
    allSections: "All product sections",
  },
  ar: {
    eyebrow: "طبقة التنسيق",
    title: "تصويت DAO والرواتب والخزانة عندك مكشوفة. المفروض لا.",
    body:
      "معظم الـ DAOs تكشف كل شيء: التصويت، الرواتب، حركة الخزانة، والعمليات الداخلية. PrivateDAO يمكّن المؤسسات أن تعمل بخصوصية مع بقاء النتائج قابلة للتحقق تشفيرياً على سولانا.",
    launch: "جرّب Testnet في 3 دقائق",
    android: "ثبّت تطبيق أندرويد",
    verify: "افتح التحقق",
    judge: "افتح مسار الحكام",
    workflow: "شاهد المسار",
    startAnywhere: "جرّب بدون كود",
    startAnywhereTitle: "أنشئ DAO، أرسل مقترحاً، نفّذ commit/reveal، ثم افتح إثبات Solscan من المتصفح.",
    guidedStart: "افتح المسار الموجه",
    stackLabel: "مدعوم بالطبقة الحية",
    thesisTitle: "خاص. قابل للتحقق. واعٍ بالسياق.",
    thesisBody:
      "الخصوصية لا تعني غياب الشفافية. PrivateDAO يجعل العمليات الحساسة خاصة، بينما تبقى النتائج قابلة للتحقق عبر commit-reveal governance، وإيصالات proof، وبيانات settlement مشفرة، وإثباتات Solana Testnet.",
    thesisPrivate: "خاص = commit-reveal أولاً، وبراهين ZK خارج السلسلة الآن، ومسارات Cloak وUmbra.",
    thesisVerified: "قابل للتحقق = إثبات Testnet وV3 Hardening وAnchor 1.0.1.",
    thesisInformed: "واعي بالسياق = GoldRush وQVAC وطبقة Intelligence قبل التوقيع.",
    deeperSummary: "تفاصيل أعمق",
    deeperTitle: "المشكلة والحل وإثبات التشغيل",
    deeperBody:
      "تبدأ التجربة بمدخل مباشر للمنتج، وتبقى القصة التشغيلية الكاملة متاحة للمحكمين والمستثمرين والشركاء التقنيين عند الحاجة إلى سياق أعمق.",
    allSections: "كل أقسام المنتج",
  },
  ru: {
    eyebrow: "Coordination Layer",
    title: "Голоса DAO, зарплаты и казна публичны. Так быть не должно.",
    body:
      "Большинство DAO раскрывают все: голоса, зарплаты, активность казны и внутренние операции. PrivateDAO позволяет организациям работать приватно, оставаясь криптографически проверяемыми на Solana.",
    launch: "Try the 3-minute Testnet flow",
    android: "Install Android APK",
    verify: "Открыть proof",
    judge: "Открыть Judge",
    workflow: "Смотреть workflow",
    startAnywhere: "Try it without code",
    startAnywhereTitle: "Create a DAO, submit a proposal, commit/reveal, execute, and verify from the browser.",
    guidedStart: "Open the guided flow",
    stackLabel: "Работает на live stack",
    thesisTitle: "Private. Verified. Informed.",
    thesisBody:
      "Privacy is not lack of transparency. PrivateDAO keeps sensitive processes private while outcomes remain verifiable through commit-reveal governance, proof receipts, encrypted settlement metadata, and Solana Testnet evidence.",
    thesisPrivate: "Private = commit-reveal first, ZK proofs off-chain today, Cloak и Umbra settlement lanes.",
    thesisVerified: "Verified = Testnet proof, V3 hardening и Anchor 1.0.1 evidence.",
    thesisInformed: "Informed = GoldRush, QVAC и intelligence layer before signing.",
    deeperSummary: "Подробная архитектура",
    deeperTitle: "Открывайте proof, architecture и investor narrative только когда это нужно",
    deeperBody: "Первый вход в продукт остается кратким и практичным, а полный операционный контекст доступен для судей, инвесторов и технических партнеров.",
    allSections: "Все разделы продукта",
  },
  uk: {
    eyebrow: "Coordination Layer",
    title: "Голоси DAO, зарплати й казна публічні. Так не має бути.",
    body:
      "Більшість DAO відкривають усе: голоси, зарплати, рух казни та внутрішні операції. PrivateDAO дозволяє організаціям працювати приватно й залишатися криптографічно перевірюваними на Solana.",
    launch: "Try the 3-minute Testnet flow",
    android: "Install Android APK",
    verify: "Відкрити proof",
    judge: "Відкрити Judge",
    workflow: "Переглянути workflow",
    startAnywhere: "Try it without code",
    startAnywhereTitle: "Create a DAO, submit a proposal, commit/reveal, execute, and verify from the browser.",
    guidedStart: "Open the guided flow",
    stackLabel: "Працює на live stack",
    thesisTitle: "Private. Verified. Informed.",
    thesisBody:
      "Privacy is not lack of transparency. PrivateDAO keeps sensitive processes private while outcomes remain verifiable through commit-reveal governance, proof receipts, encrypted settlement metadata, and Solana Testnet evidence.",
    thesisPrivate: "Private = commit-reveal first, ZK proofs off-chain today, Cloak і Umbra settlement lanes.",
    thesisVerified: "Verified = Testnet proof, V3 hardening і Anchor 1.0.1 evidence.",
    thesisInformed: "Informed = GoldRush, QVAC і intelligence layer before signing.",
    deeperSummary: "Детальна архітектура",
    deeperTitle: "Відкривайте proof, architecture та investor narrative лише за потреби",
    deeperBody: "Перший вхід у продукт залишається коротким і практичним, а повний операційний контекст доступний для суддів, інвесторів і технічних партнерів.",
    allSections: "Усі розділи продукту",
  },
  pl: {
    eyebrow: "Coordination Layer",
    title: "Głosy DAO, payroll i treasury są publiczne. Nie powinny być.",
    body:
      "Większość DAO ujawnia wszystko: głosy, pensje, aktywność treasury i operacje wewnętrzne. PrivateDAO pozwala organizacjom działać prywatnie, pozostając kryptograficznie weryfikowalnymi na Solana.",
    launch: "Try the 3-minute Testnet flow",
    android: "Install Android APK",
    verify: "Otwórz proof",
    judge: "Otwórz Judge",
    workflow: "Zobacz workflow",
    startAnywhere: "Try it without code",
    startAnywhereTitle: "Create a DAO, submit a proposal, commit/reveal, execute, and verify from the browser.",
    guidedStart: "Open the guided flow",
    stackLabel: "Powered by live stack",
    thesisTitle: "Private. Verified. Informed.",
    thesisBody:
      "Privacy is not lack of transparency. PrivateDAO keeps sensitive processes private while outcomes remain verifiable through commit-reveal governance, proof receipts, encrypted settlement metadata, and Solana Testnet evidence.",
    thesisPrivate: "Private = commit-reveal first, ZK proofs off-chain today, Cloak i Umbra settlement lanes.",
    thesisVerified: "Verified = Testnet proof, V3 hardening i Anchor 1.0.1 evidence.",
    thesisInformed: "Informed = GoldRush, QVAC i intelligence layer before signing.",
    deeperSummary: "Szczegółowa architektura",
    deeperTitle: "Otwórz proof, architecture i investor narrative tylko gdy są potrzebne",
    deeperBody: "Wejście do produktu pozostaje krótkie i praktyczne, a pełny kontekst operacyjny jest dostępny dla jurorów, inwestorów i partnerów technicznych.",
    allSections: "Wszystkie sekcje produktu",
  },
  hi: {
    eyebrow: "Coordination Layer",
    title: "आपके DAO votes, payroll और treasury public हैं. ऐसा नहीं होना चाहिए.",
    body:
      "Most DAOs सब कुछ expose करते हैं: votes, salaries, treasury activity और internal operations. PrivateDAO organizations को privately operate करने देता है while remaining cryptographically verifiable on Solana.",
    launch: "Try the 3-minute Testnet flow",
    android: "Android APK install करें",
    verify: "Proof खोलें",
    judge: "Judge खोलें",
    workflow: "Workflow देखें",
    startAnywhere: "Try it without code",
    startAnywhereTitle: "Create a DAO, submit a proposal, commit/reveal, execute, and verify from the browser.",
    guidedStart: "Open the guided flow",
    stackLabel: "Live stack द्वारा संचालित",
    thesisTitle: "Private. Verified. Informed.",
    thesisBody:
      "Privacy transparency की कमी नहीं है. PrivateDAO sensitive processes को private रखता है while outcomes commit-reveal governance, proof receipts, encrypted settlement metadata और Solana Testnet evidence से verifiable रहते हैं.",
    thesisPrivate: "Private = commit-reveal first, ZK proofs off-chain today, Cloak और Umbra settlement lanes.",
    thesisVerified: "Verified = Testnet proof, V3 hardening और Anchor 1.0.1 evidence.",
    thesisInformed: "Informed = GoldRush, QVAC और signing से पहले intelligence layer.",
    deeperSummary: "Detailed architecture",
    deeperTitle: "Proof, architecture और investor narrative तभी खोलें जब ज़रूरत हो",
    deeperBody: "Product entry छोटा और practical रहता है, जबकि judges, investors और technical partners के लिए पूरा operating context उपलब्ध रहता है.",
    allSections: "सभी product sections",
  },
  ko: {
    eyebrow: "Coordination Layer",
    title: "DAO 투표, 급여, treasury가 공개되어 있습니다. 그래서는 안 됩니다.",
    body:
      "Most DAOs expose everything: votes, salaries, treasury activity, and internal operations. PrivateDAO enables organizations to operate privately while remaining cryptographically verifiable on Solana.",
    launch: "Try the 3-minute Testnet flow",
    android: "Install Android APK",
    verify: "Proof 열기",
    judge: "Judge 열기",
    workflow: "Workflow 보기",
    startAnywhere: "Try it without code",
    startAnywhereTitle: "Create a DAO, submit a proposal, commit/reveal, execute, and verify from the browser.",
    guidedStart: "Open the guided flow",
    stackLabel: "Live stack 기반",
    thesisTitle: "Private. Verified. Informed.",
    thesisBody:
      "Privacy is not lack of transparency. PrivateDAO keeps sensitive processes private while outcomes remain verifiable through commit-reveal governance, proof receipts, encrypted settlement metadata, and Solana Testnet evidence.",
    thesisPrivate: "Private = commit-reveal first, ZK proofs off-chain today, Cloak, Umbra settlement lanes.",
    thesisVerified: "Verified = Testnet proof, V3 hardening, Anchor 1.0.1 evidence.",
    thesisInformed: "Informed = GoldRush, QVAC, signing 전 intelligence layer.",
    deeperSummary: "Detailed architecture",
    deeperTitle: "필요할 때만 proof, architecture, investor narrative를 여세요",
    deeperBody: "제품 진입은 간결하고 실용적으로 유지되며, 심사위원, 투자자, 기술 파트너를 위한 전체 운영 맥락은 계속 확인할 수 있습니다.",
    allSections: "전체 제품 섹션",
  },
  es: {
    eyebrow: "Coordination Layer",
    title: "Los votos, payroll y treasury de tu DAO son públicos. No deberían serlo.",
    body:
      "La mayoría de DAOs exponen todo: votos, salarios, actividad de treasury y operaciones internas. PrivateDAO permite que las organizaciones operen en privado y sigan siendo criptográficamente verificables en Solana.",
    launch: "Try the 3-minute Testnet flow",
    android: "Instalar Android APK",
    verify: "Abrir proof",
    judge: "Abrir Judge",
    workflow: "Ver workflow",
    startAnywhere: "Try it without code",
    startAnywhereTitle: "Create a DAO, submit a proposal, commit/reveal, execute, and verify from the browser.",
    guidedStart: "Open the guided flow",
    stackLabel: "Impulsado por el live stack",
    thesisTitle: "Private. Verified. Informed.",
    thesisBody:
      "Privacy is not lack of transparency. PrivateDAO keeps sensitive processes private while outcomes remain verifiable through commit-reveal governance, proof receipts, encrypted settlement metadata, and Solana Testnet evidence.",
    thesisPrivate: "Private = commit-reveal first, ZK proofs off-chain today, Cloak y Umbra settlement lanes.",
    thesisVerified: "Verified = Testnet proof, V3 hardening y Anchor 1.0.1 evidence.",
    thesisInformed: "Informed = GoldRush, QVAC e intelligence layer antes de firmar.",
    deeperSummary: "Arquitectura detallada",
    deeperTitle: "Abre proof, architecture e investor narrative solo cuando haga falta",
    deeperBody: "La entrada al producto se mantiene clara y práctica, mientras el contexto operativo completo queda disponible para jueces, inversores y socios técnicos.",
    allSections: "Todas las secciones",
  },
  it: {
    eyebrow: "Coordination Layer",
    title: "I voti, il payroll e la treasury della tua DAO sono pubblici. Non dovrebbero esserlo.",
    body:
      "La maggior parte delle DAO espone tutto: voti, stipendi, attività di treasury e operazioni interne. PrivateDAO consente alle organizzazioni di operare privatamente restando crittograficamente verificabili su Solana.",
    launch: "Try the 3-minute Testnet flow",
    android: "Installa Android APK",
    verify: "Apri proof",
    judge: "Apri Judge",
    workflow: "Vedi workflow",
    startAnywhere: "Try it without code",
    startAnywhereTitle: "Create a DAO, submit a proposal, commit/reveal, execute, and verify from the browser.",
    guidedStart: "Open the guided flow",
    stackLabel: "Basato sul live stack",
    thesisTitle: "Private. Verified. Informed.",
    thesisBody:
      "Privacy is not lack of transparency. PrivateDAO keeps sensitive processes private while outcomes remain verifiable through commit-reveal governance, proof receipts, encrypted settlement metadata, and Solana Testnet evidence.",
    thesisPrivate: "Private = commit-reveal first, ZK proofs off-chain today, Cloak e Umbra settlement lanes.",
    thesisVerified: "Verified = Testnet proof, V3 hardening e Anchor 1.0.1 evidence.",
    thesisInformed: "Informed = GoldRush, QVAC e intelligence layer prima della firma.",
    deeperSummary: "Architettura dettagliata",
    deeperTitle: "Apri proof, architecture e investor narrative solo quando serve",
    deeperBody: "L'ingresso nel prodotto resta chiaro e pratico, mentre il contesto operativo completo rimane disponibile per giudici, investitori e partner tecnici.",
    allSections: "Tutte le sezioni",
  },
};

export function HomeShell() {
  const { locale } = useI18n();
  const homeCopy = homeCopyByLocale[locale] ?? homeCopyByLocale.en;
  const storyCards = [
    {
      title: "Confidential Treasury & Payroll",
      description: "Prepare payroll, choose USDC/PUSD/AUDD context, generate privacy receipts, and keep audit context bounded.",
      href: "/services/refhe-payroll-proof",
      icon: Compass,
    },
    {
      title: "Market Ops DAO",
      description: "Review Covalent GoldRush context, policy limits, and treasury routes before the wallet signs.",
      href: "/treasury",
      icon: Shield,
    },
    {
      title: "GamingDAO & Agentic Rewards",
      description: "Create guilds, tournaments, and inventory proposals with governed reward settlement linked back to proof.",
      href: "/gaming",
      icon: PlayCircle,
    },
  ];
  const fastActionSteps = [
    {
      title: "1. Connect and orient",
      description: "Start from Learn or Start, connect a Testnet wallet, and confirm the right account before any approval flow begins.",
      href: "/learn",
      cta: "Open learn",
    },
    {
      title: "2. Review the decision",
      description: "Use Intelligence to read policy, privacy mode, route quality, and execution risk before the signer sees a wallet prompt.",
      href: "/intelligence",
      cta: "Open intelligence",
    },
    {
      title: "3. Sign and execute",
      description: "Use Govern and Treasury to create the proposal, commit or reveal when needed, then approve the exact wallet action on Testnet.",
      href: "/govern",
      cta: "Open govern",
    },
    {
      title: "4. Verify the receipt",
      description: "Open Proof and Judge to inspect the signature, receipt, runtime logs, and the current blockchain continuity from the same product shell.",
      href: "/proof",
      cta: "Open proof",
    },
  ];
  const commandTabs = [
    {
      title: "Intelligence",
      eyebrow: "AI + data",
      description: "Covalent GoldRush, QVAC, SNS, Zerion policy, counterparty trust, and proposal context before signing.",
      href: "/intelligence",
      icon: BrainCircuit,
      badge: "Review first",
    },
    {
      title: "Govern",
      eyebrow: "DAO lifecycle",
      description: "Create DAO, create proposal, commit/reveal, finalize, execute, and open Solscan from the wallet.",
      href: "/govern",
      icon: Gavel,
      badge: "Core flow",
    },
    {
      title: "Treasury",
      eyebrow: "Risk + policy",
      description: "Health scoring, rebalancing context, solvency posture, and agent policy lanes.",
      href: "/treasury",
      icon: Gauge,
      badge: "Operator",
    },
    {
      title: "Payroll",
      eyebrow: "Private payouts",
      description: "CSV preview, stablecoin selection, Umbra/Cloak receipts, and auditor views.",
      href: "/services/refhe-payroll-proof",
      icon: Coins,
      badge: "Finance",
    },
    {
      title: "Gaming DAO",
      eyebrow: "Guild ops",
      description: "Guild hub, tournament rewards, inventory proposals, and private winner payouts.",
      href: "/gaming",
      icon: Gamepad2,
      badge: "Community",
    },
    {
      title: "Compliance",
      eyebrow: "Audit pack",
      description: "Scoped viewing keys, date-windowed report flow, and dWallet-signed evidence.",
      href: "/security",
      icon: FileCheck2,
      badge: "Trust",
    },
    {
      title: "Proof",
      eyebrow: "Judge view",
      description: "Proof Matrix, ZK badges, viewing-key evidence, Solscan links, and runtime logs.",
      href: "/proof",
      icon: ReceiptText,
      badge: "Verify",
    },
    {
      title: "Developers",
      eyebrow: "API + SDK",
      description: "Integration docs, privacy SDK starter, read-node lanes, and builder entry points.",
      href: "/documents",
      icon: Code2,
      badge: "Docs",
    },
    {
      title: "RPC Services",
      eyebrow: "Hosted reads",
      description: "Read-node health, relayer evidence, QVAC runtime checks, and infrastructure proof.",
      href: "/rpc-services",
      icon: Shield,
      badge: "Infra",
    },
    {
      title: "Command Center",
      eyebrow: "Ops dashboard",
      description: "Live operating status, treasury routes, indexed proposal context, and readiness gates.",
      href: "/judge",
      icon: Compass,
      badge: "Control",
    },
  ];
  const sectionLinks = [
    { label: "Start", href: "/start" },
    { label: "Learn", href: "/learn" },
    { label: "Intelligence", href: "/intelligence" },
    { label: "Govern", href: "/govern" },
    { label: "Treasury", href: "/treasury" },
    { label: "Confidential", href: "/services/refhe-payroll-proof" },
    { label: "Payments", href: "/services/confidential-payments" },
    { label: "Gaming", href: "/gaming" },
    { label: "Tournaments", href: "/gaming/tournaments" },
    { label: "Inventory", href: "/gaming/inventory" },
    { label: "Security", href: "/security" },
    { label: "Proof", href: "/proof" },
    { label: "Trust", href: "/trust" },
    { label: "Security", href: "/security" },
    { label: "Documents", href: "/documents" },
    { label: "RPC", href: "/rpc-services" },
    { label: "Judge", href: "/judge" },
    { label: "Services", href: "/services" },
    { label: "About", href: "/about" },
  ];
  const techBadges = [
    {
      label: "FHE / REFHE",
      badgeClass: "border-emerald-300/25 bg-emerald-300/[0.14] text-emerald-100",
      detail: "Confidential treasury and settlement posture.",
    },
    {
      label: "ZK",
      badgeClass: "border-violet-300/25 bg-violet-300/[0.14] text-violet-100",
      detail: "Verifiable privacy without exposing raw decision data.",
    },
    {
      label: "MagicBlock",
      badgeClass: "border-cyan-300/25 bg-cyan-300/[0.14] text-cyan-100",
      detail: "Responsive execution corridor for wallet-first actions.",
    },
    {
      label: "Read-node telemetry",
      badgeClass: "border-amber-300/25 bg-amber-300/[0.14] text-amber-100",
      detail: "Reliable live reads, signatures, and action logs.",
    },
    {
      label: "QuickNode Streams",
      badgeClass: "border-cyan-300/25 bg-cyan-300/[0.14] text-cyan-100",
      detail: "Authenticated Testnet telemetry feeding readiness, proof freshness, and runtime intelligence.",
    },
    {
      label: "QVAC",
      badgeClass: "border-sky-300/25 bg-sky-300/[0.14] text-sky-100",
      detail: "Local-first AI context without routing sensitive operating data to a cloud model.",
    },
    {
      label: "Anchor 1",
      badgeClass: "border-rose-300/25 bg-rose-300/[0.14] text-rose-100",
      detail: "Latest upgraded Testnet program with reviewer-visible deployment evidence.",
    },
  ];
  const technologyServiceMap = [
    {
      technology: "FHE / REFHE",
      service: "Confidential payout and treasury motion rehearsal",
      outcome: "Used when the product needs to prepare private treasury movement without flattening the whole flow into plain-text operating steps.",
    },
    {
      technology: "ZK",
      service: "Verifiable governance and privacy review",
      outcome: "Used when judges, partners, or operators need proof-linked trust without turning the normal user route into a cryptography lecture.",
    },
    {
      technology: "MagicBlock",
      service: "Responsive action corridor for governance and gaming",
      outcome: "Used where wallet-first actions need a faster execution lane so DAO and game-linked decisions do not feel stuck behind slow runtime behavior.",
    },
    {
      technology: "Read-node telemetry",
      service: "Live state, logs, and signature confirmation",
      outcome: "Used to keep Testnet reads, proposal status, and action feedback visible after a wallet action instead of leaving the user guessing.",
    },
    {
      technology: "QuickNode Streams",
      service: "Readiness aggregate and telemetry intake",
      outcome: "Used to turn Solana Testnet block and program-log flow into reviewer-safe counters, proof freshness, and backend health evidence.",
    },
    {
      technology: "QVAC",
      service: "Sovereign local intelligence",
      outcome: "Used where proposal summaries, compliance context, OCR, translation, and operating guidance should stay on-device or local-first before signing.",
    },
    {
      technology: "Anchor 1",
      service: "Current Testnet protocol base",
      outcome: "Used to keep the Solana program, IDL, web client constants, Android config, and reviewer evidence aligned around the upgraded Testnet deployment.",
    },
  ];
  const whatChangedCards = [
    {
      title: "Anchor 1 upgrade is now documented and deployed",
      detail: "The active Testnet program now runs from the Anchor 1.0.1 migration path, with matching web, Android, IDL, README, and reviewer evidence updates.",
    },
    {
      title: "QVAC is presented as a core intelligence layer",
      detail: "Local-first AI is framed around proposal context, compliance explanation, translation, OCR, and private operating assistance instead of a decorative chatbot.",
    },
    {
      title: "Infrastructure and funding surfaces now align",
      detail: "Payroll, gaming, compliance, developers, RPC, command center, proof, and services routes now tell one Testnet-ready product story with explicit mainnet gates.",
    },
  ];
  const faqItems = [
    {
      question: "What is already live today?",
      answer:
        "It is already a live Solana Testnet product with wallet-first governance, proof, trust, telemetry, and service rails. The current phase is final security hardening, broader device coverage, and release certification ahead of mainnet publication.",
    },
    {
      question: "What does the cryptography actually do here?",
      answer:
        "ZK, REFHE proof receipts, MagicBlock execution receipts, and read-node telemetry each map to a concrete product lane: privacy review, confidential payout proof receipts, responsive execution receipts, and reliable live reads. They are presented as service rails, not badge-only theory.",
    },
    {
      question: "What kind of support helps most right now?",
      answer:
        "Runtime testing, wallet feedback, security review, infrastructure support, and aligned funding all help accelerate the path from strong Testnet operation into a hardened production release.",
    },
  ];
  const convictionStrip = [
    "We build privacy, operational clarity, and trust into one production-oriented product path.",
    "We keep the work verifiable, ship tranche by tranche, and raise the quality bar every cycle.",
    "With real community support, PrivateDAO can mature into infrastructure that helps protect the ecosystem.",
  ];
  const threeMinuteProofPath = [
    {
      label: "Minute 1",
      title: "Understand the problem",
      body: "Public DAO votes, payroll, rewards, and treasury moves expose intent too early. PrivateDAO shows the problem in plain language before asking anyone to sign.",
      href: "/learn",
      cta: "Learn the problem",
    },
    {
      label: "Minute 2",
      title: "Try the product",
      body: "Connect a Testnet wallet, create a DAO, submit a proposal, commit/reveal, finalize, and execute from the same operating shell.",
      href: "/govern#live-dao",
      cta: "Run governance",
    },
    {
      label: "Minute 3",
      title: "Verify the proof",
      body: "Open Judge and Proof to inspect Testnet receipts, Solscan links, encrypted payment evidence, intelligence context, and runtime logs.",
      href: "/judge",
      cta: "Verify evidence",
    },
  ];
  return (
    <main className="pb-20 sm:pb-24">
      <section className="mx-auto w-full max-w-7xl px-4 pt-8 sm:px-6 sm:pt-12 lg:px-8 lg:pt-18">
        <div className="grid items-start gap-8 xl:grid-cols-[1.14fr_0.86fr] xl:gap-10">
          <div className="space-y-6 sm:space-y-8">
            <div className="flex flex-wrap gap-3">
              <Badge variant="cyan">Private governance on Solana</Badge>
              <Badge variant="violet">Anchor 1 Testnet</Badge>
              <Badge variant="violet">QVAC local AI</Badge>
              <Badge variant="cyan">QuickNode live telemetry</Badge>
              <Badge variant="success">Readiness API live</Badge>
              <Badge variant="success">Private by design</Badge>
              <Badge variant="success">Try it now: web + Android</Badge>
            </div>
            <div className="space-y-4 sm:space-y-5">
              <div className="text-[11px] uppercase tracking-[0.34em] text-emerald-300/80">{homeCopy.eyebrow}</div>
              <div className="text-sm font-semibold uppercase tracking-[0.24em] text-cyan-100/82">
                  Privacy, secrecy, and proof for Solana organizations
              </div>
              <div className="max-w-3xl text-3xl font-semibold tracking-[-0.045em] text-white sm:text-5xl lg:text-[4rem] xl:text-[4.35rem]">
                {homeCopy.title}
              </div>
              <p className="max-w-2xl text-sm leading-7 text-white/62 sm:text-lg sm:leading-8">
                {homeCopy.body}
              </p>
              <div className="max-w-3xl rounded-[26px] border border-emerald-300/18 bg-emerald-300/[0.08] p-5 text-sm leading-7 text-white/72">
                <div className="text-[11px] uppercase tracking-[0.28em] text-emerald-100/80">No code operating layer</div>
                <div className="mt-2 text-lg font-semibold text-white">
                  Create a DAO, propose, commit/reveal, execute, and verify. No code. No terminal.
                </div>
                <p className="mt-2">
                  A normal user can learn why public Solana operations expose sensitive work in
                  <Link href="/learn" className="px-1 font-semibold text-cyan-100 underline decoration-cyan-300/50 underline-offset-4">Learn</Link>,
                  connect a wallet, review the plain-English action, sign the exact request, then inspect when intent became visible, where payroll or treasury movement is proven, and how encrypted IKA / REFHE-style payment evidence stays linked to proof.
                </p>
              </div>
              <div className="max-w-3xl rounded-[26px] border border-violet-300/18 bg-[radial-gradient(circle_at_top_right,rgba(153,69,255,0.20),transparent_36%),rgba(153,69,255,0.08)] p-5 text-sm leading-7 text-white/72">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="text-[11px] uppercase tracking-[0.28em] text-violet-100/80">Live mobile proof</div>
                    <div className="mt-2 text-lg font-semibold text-white">The Android APK turns the same web product into a mobile Solana operating app.</div>
                    <p className="mt-2">
                      Judges can install the APK, open the live product routes, connect a Testnet wallet, and participate on-chain from mobile while proof, diagnostics, payroll, encrypted payments, and gaming reward paths stay one tap away.
                    </p>
                  </div>
                  <Link className={cn(buttonVariants({ size: "sm" }))} href="/android">
                    Try Android now
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-100/82">
                      <Trophy className="h-4 w-4" />
                      Innovation one
                    </div>
                    <p className="mt-2 text-xs leading-6 text-white/64">
                      A no-terminal Solana operating system for governance, payroll, payments, rewards, intelligence, and proof.
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-100/82">
                      <PlayCircle className="h-4 w-4" />
                      Innovation two
                    </div>
                    <p className="mt-2 text-xs leading-6 text-white/64">
                      The same Testnet product is promoted as an Android APK path so a normal user can try the live stack immediately.
                    </p>
                  </div>
                </div>
              </div>
              <div className="max-w-3xl rounded-[26px] border border-cyan-300/18 bg-cyan-300/[0.08] p-5 text-sm leading-7 text-white/72">
                <div className="text-[11px] uppercase tracking-[0.28em] text-cyan-100/80">Confidential coordination thesis</div>
                <div className="mt-2 text-xl font-semibold tracking-[-0.03em] text-white">{homeCopy.thesisTitle}</div>
                <p className="mt-2">{homeCopy.thesisBody}</p>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  {[homeCopy.thesisPrivate, homeCopy.thesisVerified, homeCopy.thesisInformed].map((item) => (
                    <div key={item} className="rounded-2xl border border-white/10 bg-black/18 p-3 text-xs leading-6 text-white/68">
                      {item}
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex flex-wrap gap-2 text-[11px] uppercase tracking-[0.24em] text-white/50">
                <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1">Coordinate</span>
                <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1">Review</span>
                <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1">Authorize</span>
                <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1">Verify</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link className={cn(buttonVariants({ size: "lg" }))} href="/govern#live-dao">
                {homeCopy.launch}
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link className={cn(buttonVariants({ size: "lg", variant: "secondary" }))} href="/android">
                {homeCopy.android}
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link className={cn(buttonVariants({ size: "lg", variant: "secondary" }))} href="/proof">
                {homeCopy.verify}
              </Link>
              <Link className={cn(buttonVariants({ size: "lg", variant: "secondary" }))} href="/judge">
                {homeCopy.judge}
              </Link>
              <Link className={cn(buttonVariants({ size: "lg", variant: "outline" }))} href="/rpc-services">
                Live readiness
              </Link>
              <Link className={cn(buttonVariants({ size: "lg", variant: "outline" }))} href="/learn">
                {homeCopy.workflow}
              </Link>
              <a
                className={cn(buttonVariants({ size: "lg", variant: "outline" }))}
                href="https://faucet.solana.com/"
                rel="noreferrer"
                target="_blank"
              >
                Get Testnet SOL
              </a>
            </div>

            <div className="rounded-[28px] border border-cyan-300/14 bg-[linear-gradient(180deg,rgba(8,19,34,0.96),rgba(6,10,22,0.99))] p-4 sm:p-5">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <div className="text-[11px] uppercase tracking-[0.3em] text-cyan-200/78">{homeCopy.startAnywhere}</div>
                  <div className="mt-2 text-xl font-semibold tracking-[-0.03em] text-white">
                    {homeCopy.startAnywhereTitle}
                  </div>
                </div>
                <Link className={cn(buttonVariants({ size: "sm", variant: "outline" }))} href="/start">
                  {homeCopy.guidedStart}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                {commandTabs.map((item) => {
                  const Icon = item.icon;

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="group rounded-[22px] border border-white/8 bg-white/[0.035] p-4 transition hover:-translate-y-0.5 hover:border-cyan-300/24 hover:bg-white/[0.06]"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.045] text-cyan-100">
                          <Icon className="h-5 w-5" />
                        </div>
                        <span className="rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-white/48">
                          {item.badge}
                        </span>
                      </div>
                      <div className="mt-4 text-[10px] uppercase tracking-[0.24em] text-cyan-200/62">{item.eyebrow}</div>
                      <div className="mt-2 text-base font-semibold text-white group-hover:text-cyan-50">{item.title}</div>
                      <p className="mt-2 text-sm leading-6 text-white/56">{item.description}</p>
                    </Link>
                  );
                })}
              </div>
              <div className="mt-5 rounded-[22px] border border-white/8 bg-black/20 p-4">
                <div className="text-[10px] uppercase tracking-[0.28em] text-white/42">{homeCopy.allSections}</div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {sectionLinks.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="rounded-full border border-white/10 bg-white/[0.035] px-3 py-1.5 text-xs font-medium text-white/68 transition hover:border-cyan-300/30 hover:bg-cyan-300/10 hover:text-cyan-50"
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              </div>
            </div>

            <details className="rounded-[28px] border border-white/10 bg-white/[0.03] p-1">
              <summary className="cursor-pointer list-none rounded-[24px] px-5 py-4">
                <div className="text-[11px] uppercase tracking-[0.28em] text-cyan-200/78">{homeCopy.stackLabel}</div>
                <div className="mt-2 text-lg font-semibold text-white">Open the technology and product-lane map</div>
                <p className="mt-2 text-sm leading-7 text-white/56">
                  PrivateDAO maps each sponsor rail to a concrete operating lane: intelligence before signing, private execution after governance, and proof after every action.
                </p>
              </summary>
              <div className="space-y-5 px-4 pb-5 pt-2">
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  {techBadges.map((item) => (
                    <div key={item.label} className="rounded-[20px] border border-white/10 bg-white/[0.03] px-4 py-3">
                      <Badge className={cn("border text-[10px] uppercase tracking-[0.22em]", item.badgeClass)}>
                        {item.label}
                      </Badge>
                      <div className="mt-2 text-sm leading-6 text-white/62">{item.detail}</div>
                    </div>
                  ))}
                </div>

                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  {storyCards.map((item) => {
                    const Icon = item.icon;

                    return (
                      <Link key={item.title} href={item.href} className="group">
                        <div className="h-full rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(10,15,29,0.94),rgba(6,9,20,0.98))] p-5 transition hover:border-cyan-300/22 hover:bg-[linear-gradient(180deg,rgba(15,22,40,0.95),rgba(8,11,24,0.99))]">
                          <div className="flex h-10 w-10 items-center justify-center rounded-[18px] border border-white/10 bg-white/[0.04] text-cyan-200">
                            <Icon className="h-5 w-5" />
                          </div>
                          <div className="mt-4 text-base font-medium text-white">{item.title}</div>
                          <p className="mt-2 text-sm leading-7 text-white/56">{item.description}</p>
                        </div>
                      </Link>
                    );
                  })}
                </div>

                <TrackTechnologyGrid />
              </div>
            </details>
          </div>

          <Card className="overflow-hidden border-white/12 bg-[linear-gradient(180deg,rgba(13,18,34,0.94),rgba(7,10,22,0.98))] xl:mt-1">
            <CardHeader>
              <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-emerald-300/15 bg-emerald-300/10 text-emerald-200">
                    <Shield className="h-5 w-5" />
                  </div>
                  <div>
                  <div className="text-[11px] uppercase tracking-[0.28em] text-white/40">Operator launch path</div>
                  <CardTitle className="mt-2">The fastest path from first visit to a credible on-chain operating flow</CardTitle>
                  </div>
                </div>
              </CardHeader>
            <CardContent className="space-y-6">
              <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-5">
                <div className="text-[11px] uppercase tracking-[0.28em] text-white/42">Current proof</div>
                <div className="mt-2 text-2xl font-semibold text-white">Anchor 1 on Solana Testnet</div>
                <div className="mt-2 text-sm leading-7 text-white/56">
                  Use it when a team, treasury council, on-chain community, or judge needs to see the current program, wallet flow, privacy posture, and proof routes line up in one operating surface.
                </div>
              </div>

              <div className="rounded-[24px] border border-cyan-300/18 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.18),transparent_34%),rgba(34,211,238,0.07)] p-5">
                <div className="text-[11px] uppercase tracking-[0.28em] text-cyan-100/78">3-minute product route</div>
                <div className="mt-2 text-xl font-semibold tracking-[-0.03em] text-white">
                  From zero context to a signed Solana operation and a verifiable receipt.
                </div>
                <div className="mt-4 grid gap-3">
                  {threeMinuteProofPath.map((item) => (
                    <Link
                      key={item.label}
                      href={item.href}
                      className="group rounded-[20px] border border-white/9 bg-black/22 p-4 transition hover:-translate-y-0.5 hover:border-cyan-300/26 hover:bg-black/30"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-[10px] uppercase tracking-[0.24em] text-cyan-100/68">{item.label}</div>
                          <div className="mt-1 text-base font-semibold text-white">{item.title}</div>
                        </div>
                        <ArrowRight className="mt-1 h-4 w-4 text-white/35 transition group-hover:text-cyan-100" />
                      </div>
                      <p className="mt-2 text-sm leading-6 text-white/58">{item.body}</p>
                      <div className="mt-3 text-[10px] uppercase tracking-[0.22em] text-emerald-100/72">{item.cta}</div>
                    </Link>
                  ))}
                </div>
              </div>

              <div className="grid gap-3">
                {fastActionSteps.map((item) => (
                  <div key={item.title} className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="text-base font-medium text-white">{item.title}</div>
                      <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-300" />
                    </div>
                    <p className="mt-2 text-sm leading-7 text-white/58">{item.description}</p>
                    <Link className={cn(buttonVariants({ size: "sm", variant: "secondary" }), "mt-4 w-full justify-between")} href={item.href}>
                      {item.cta}
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                ))}
              </div>

              <div className="rounded-[24px] border border-amber-300/18 bg-[linear-gradient(180deg,rgba(61,46,9,0.92),rgba(26,20,5,0.98))] p-4">
                <div className="flex items-center gap-2 text-amber-100">
                  <Trophy className="h-4 w-4" />
                  <div className="text-[11px] uppercase tracking-[0.28em]">Recognition</div>
                </div>
                <div className="mt-2 text-lg font-semibold text-amber-50">1st Place · Superteam Poland</div>
                <div className="mt-1 text-sm font-medium text-amber-100/85">3rd Place · Superteam UAE Frontier Hackathon</div>
                <div className="mt-2 text-sm leading-7 text-amber-50/70">
                  The product leads with verifiable Testnet operations, then gives judges and investors direct paths into proof, runtime status, and operating evidence.
                </div>
                <div className="mt-3 rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3">
                  <div className="text-[11px] uppercase tracking-[0.24em] text-amber-100/64">Ecosystem signal</div>
                  <div className="mt-1 text-base font-semibold text-white">Top 1% in Solana</div>
                </div>
                <div className="mt-2 text-xs leading-6 text-amber-100/60">
                  The live read-node, hosted APIs, and telemetry surfaces keep PrivateDAO's Testnet evidence inspectable throughout review.
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <details className="mx-auto mt-10 w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <summary className="cursor-pointer list-none rounded-[28px] border border-white/10 bg-white/[0.035] p-5 transition hover:border-cyan-300/20 hover:bg-white/[0.055]">
          <div className="text-[11px] uppercase tracking-[0.3em] text-cyan-200/78">{homeCopy.deeperSummary}</div>
          <div className="mt-2 text-xl font-semibold tracking-[-0.03em] text-white">{homeCopy.deeperTitle}</div>
          <p className="mt-2 max-w-4xl text-sm leading-7 text-white/60">{homeCopy.deeperBody}</p>
        </summary>
        <div className="space-y-14 sm:space-y-16">
      <section className="mt-8 w-full">
        <div className="mb-6 rounded-[24px] border border-cyan-300/14 bg-[linear-gradient(180deg,rgba(9,20,36,0.95),rgba(7,12,22,0.98))] p-5 text-sm leading-7 text-white/70">
	          PrivateDAO is aligned across web and Android: normal users can run advanced DAO operations from mobile with wallet-first steps, privacy-preserving governance, local-first intelligence, encrypted operation lanes, and verifiable on-chain receipts.
        </div>
        <div className="mb-6 rounded-[24px] border border-white/8 bg-white/[0.03] p-5 text-sm leading-7 text-white/68">
          The shortest path from first visit to a real Testnet action stays inside one product shell: connect a wallet, review the policy and risk context, sign the exact action, then verify the resulting receipt and runtime proof.
          <span className="sr-only">The shortest path from landing page to a real Testnet action</span>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-5 text-sm leading-7 text-white/62">
            Wallet-first operations keep signer control clear from governance to settlement.
          </div>
          <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-5 text-sm leading-7 text-white/62">
            Private execution keeps sensitive treasury context hidden while preserving verifiable proof lanes.
          </div>
          <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-5 text-sm leading-7 text-white/62">
            Proof and runtime surfaces remain open for judges, operators, and partners after every action.
          </div>
        </div>
        <div className="mt-6 grid gap-4 xl:grid-cols-3">
          <div className="rounded-[28px] border border-emerald-300/14 bg-[linear-gradient(180deg,rgba(8,22,20,0.96),rgba(8,12,18,0.99))] p-6">
            <div className="text-[11px] uppercase tracking-[0.3em] text-emerald-200/78">Public good</div>
            <div className="mt-3 text-xl font-semibold text-white">Built to help the ecosystem coordinate more safely</div>
            <p className="mt-3 text-sm leading-7 text-white/62">
              PrivateDAO is being built as reusable governance and treasury infrastructure for Solana. The value is not only one product instance. The value is a cleaner pattern for privacy, proof, treasury discipline, and operator trust that other teams can inspect and build on.
            </p>
          </div>
          <div className="rounded-[28px] border border-cyan-300/14 bg-[linear-gradient(180deg,rgba(8,18,28,0.96),rgba(8,11,20,0.99))] p-6">
            <div className="text-[11px] uppercase tracking-[0.3em] text-cyan-200/78">Clear use cases</div>
            <div className="mt-3 text-xl font-semibold text-white">Grant committees, DAOs, councils, and confidential payout operations</div>
            <p className="mt-3 text-sm leading-7 text-white/62">
              The strongest current use cases are easy to explain: private treasury approvals, grant and allocation committees, protocol operating councils, and payout workflows where privacy and execution discipline must stay together.
            </p>
          </div>
          <div className="rounded-[28px] border border-violet-300/14 bg-[linear-gradient(180deg,rgba(20,14,36,0.96),rgba(10,10,20,0.99))] p-6">
            <div className="text-[11px] uppercase tracking-[0.3em] text-violet-200/78">Clear milestones</div>
            <div className="mt-3 text-xl font-semibold text-white">From live Testnet product to stronger production release confidence</div>
            <p className="mt-3 text-sm leading-7 text-white/62">
	          The roadmap is straightforward: simplify first-use verification, strengthen proof and telemetry continuity, complete custody and audit gates, and then publish the strongest possible production release candidate.
            </p>
          </div>
        </div>
        <div className="mt-6 rounded-[28px] border border-cyan-300/14 bg-[linear-gradient(180deg,rgba(10,19,34,0.96),rgba(6,10,22,0.98))] p-6 sm:p-7">
          <div className="text-[11px] uppercase tracking-[0.3em] text-cyan-200/74">Execution conviction</div>
          <div className="mt-3 max-w-4xl text-xl font-semibold tracking-[-0.03em] text-white sm:text-2xl">
            We are building PrivateDAO as production-intent governance infrastructure: private by design, verifiable in operation, and easier to trust with every serious execution tranche.
          </div>
          <p className="mt-3 max-w-4xl text-sm leading-7 text-white/62 sm:text-base">
	            The ambition is straightforward: earn trust through real product quality, visible proof, and operational discipline, then turn ecosystem support into the technical and financial momentum that carries PrivateDAO from upgraded Testnet execution into durable mainnet infrastructure.
          </p>
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {convictionStrip.map((item) => (
              <div key={item} className="rounded-[20px] border border-white/8 bg-white/[0.03] px-4 py-3 text-sm leading-7 text-white/62">
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="w-full">
        <div className="max-w-3xl space-y-4">
          <div className="text-[11px] font-medium uppercase tracking-[0.34em] text-cyan-200/78">Why it works</div>
          <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">Six systems make the product usable, private, intelligent, and verifiable</h2>
          <p className="text-base leading-8 text-white/60 sm:text-lg">
            PrivateDAO is not just a UI shell. It combines privacy, local intelligence, responsive execution, reliable reads, and a current Anchor 1 program so a real Testnet action can move from wallet click to visible result without forcing the user to learn the architecture first.
          </p>
        </div>
        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-5">
            <div className="text-[11px] uppercase tracking-[0.24em] text-emerald-300/80">REFHE</div>
            <div className="mt-3 text-lg font-semibold text-white">Confidential settlement posture</div>
            <p className="mt-3 text-sm leading-7 text-white/58">
              REFHE supports the encrypted payout and settlement path so sensitive treasury actions do not depend on plain-text operating flow alone.
            </p>
          </div>
          <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-5">
            <div className="text-[11px] uppercase tracking-[0.24em] text-violet-200/80">ZK</div>
            <div className="mt-3 text-lg font-semibold text-white">Verifiable privacy proof</div>
            <p className="mt-3 text-sm leading-7 text-white/58">
              Zero-knowledge proof surfaces give judges, partners, and operators a verifiable trust layer without turning the main product route into a proof maze.
            </p>
          </div>
          <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-5">
            <div className="text-[11px] uppercase tracking-[0.24em] text-cyan-200/80">MagicBlock</div>
            <div className="mt-3 text-lg font-semibold text-white">Responsive execution corridor</div>
            <p className="mt-3 text-sm leading-7 text-white/58">
              MagicBlock gives the product a faster action corridor for treasury and governance execution where slow, clumsy wallet UX would otherwise kill momentum.
            </p>
          </div>
	          <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-5">
	            <div className="text-[11px] uppercase tracking-[0.24em] text-amber-200/80">Read-node telemetry</div>
	            <div className="mt-3 text-lg font-semibold text-white">Reliable live state and logs</div>
	            <p className="mt-3 text-sm leading-7 text-white/58">
	              Hosted reads and telemetry keep live state, signatures, proposal progress, and execution logs visible so users can tell what really happened after a wallet action.
	            </p>
	          </div>
	          <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-5">
	            <div className="text-[11px] uppercase tracking-[0.24em] text-sky-200/80">QVAC</div>
	            <div className="mt-3 text-lg font-semibold text-white">Local-first intelligence</div>
	            <p className="mt-3 text-sm leading-7 text-white/58">
	              QVAC frames proposal context, translation, OCR, and operational guidance as sovereign AI that can run near the user instead of centralizing sensitive DAO data.
	            </p>
	          </div>
	          <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-5">
	            <div className="text-[11px] uppercase tracking-[0.24em] text-rose-200/80">Anchor 1</div>
	            <div className="mt-3 text-lg font-semibold text-white">Current deployed program</div>
	            <p className="mt-3 text-sm leading-7 text-white/58">
	              The active Testnet program, ProgramData, deploy signature, web constants, Android config, and reviewer docs now point to the Anchor 1.0.1 migration evidence.
	            </p>
	          </div>
        </div>
      </section>

      <section className="w-full">
        <div className="max-w-3xl space-y-4">
          <div className="text-[11px] font-medium uppercase tracking-[0.34em] text-emerald-300/80">How the stack maps to services</div>
          <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">These technologies are tied to real product lanes, not a theory slide</h2>
          <p className="text-base leading-8 text-white/60 sm:text-lg">
            PrivateDAO uses each rail for a specific user-facing job. The public story should make that obvious: governance runs the DAO, gaming uses the same responsive decision corridor, confidential payout depends on privacy rails, and read-node telemetry keeps the result visible.
          </p>
        </div>
        <div className="mt-8 grid gap-4 xl:grid-cols-2">
          {technologyServiceMap.map((item) => (
            <div key={item.technology} className="rounded-[24px] border border-white/8 bg-white/[0.03] p-5">
              <div className="flex flex-wrap items-center gap-3">
                <Badge variant={item.technology === "ZK" ? "violet" : item.technology === "Read-node telemetry" ? "warning" : item.technology === "MagicBlock" || item.technology === "QVAC" ? "cyan" : "success"}>
                  {item.technology}
                </Badge>
                <div className="text-base font-medium text-white">{item.service}</div>
              </div>
              <p className="mt-3 text-sm leading-7 text-white/60">{item.outcome}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="w-full">
        <div className="max-w-3xl space-y-4">
          <div className="text-[11px] font-medium uppercase tracking-[0.34em] text-violet-200/80">Execution strategy</div>
          <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">Recent development raised the product, the protocol, and the review posture together</h2>
          <p className="text-base leading-8 text-white/60 sm:text-lg">
            The current work is focused on turning PrivateDAO into infrastructure that can be reviewed, tested, funded, and then deployed with confidence. The strategy is to keep shipping real product proof while steadily converting each operational and protocol target into something stronger, clearer, and easier to trust.
          </p>
        </div>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {whatChangedCards.map((item) => (
            <div key={item.title} className="rounded-[24px] border border-white/8 bg-white/[0.03] p-5">
              <div className="text-lg font-semibold text-white">{item.title}</div>
              <p className="mt-3 text-sm leading-7 text-white/60">{item.detail}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="w-full">
        <div className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
          <Card className="border-white/10 bg-[linear-gradient(180deg,rgba(12,18,34,0.94),rgba(7,10,22,0.99))]">
            <CardHeader className="space-y-3">
              <div className="flex items-center gap-3 text-emerald-200">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-emerald-300/15 bg-emerald-300/10">
                  <LifeBuoy className="h-5 w-5" />
                </div>
                <div className="text-[11px] uppercase tracking-[0.28em] text-emerald-200/80">Support the mission</div>
              </div>
              <CardTitle className="text-2xl">We invite the community to help turn PrivateDAO into ecosystem infrastructure through real support, review, and execution</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm leading-7 text-white/62">
                PrivateDAO is being built as governance and treasury infrastructure that can serve the Solana ecosystem broadly. We are working continuously to make it more capable, safer, and more valuable, and that mission moves faster with practical support: testing, technical review, integrations, operator discipline, and serious ecosystem distribution.
              </p>
              <p className="text-sm leading-7 text-white/62">
                What support accelerates most is not vague enthusiasm. It is the kind of help that turns a strong Testnet product into stronger ecosystem infrastructure: wallet testing, security review, operational introductions, integrations, and funding that maps directly to visible milestones.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-[20px] border border-white/8 bg-white/[0.03] p-4 text-sm leading-7 text-white/60">Runtime testing, browser-wallet checks, and real-device validation on Testnet</div>
                <div className="rounded-[20px] border border-white/8 bg-white/[0.03] p-4 text-sm leading-7 text-white/60">Security review, protocol scrutiny, and custody-hardening support</div>
                <div className="rounded-[20px] border border-white/8 bg-white/[0.03] p-4 text-sm leading-7 text-white/60">Infrastructure guidance for API, RPC, telemetry, monitoring, and recovery</div>
                <div className="rounded-[20px] border border-white/8 bg-white/[0.03] p-4 text-sm leading-7 text-white/60">Introductions, amplification, and ecosystem trust that help this become shared infrastructure</div>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link className={cn(buttonVariants({ size: "lg" }))} href="/community">
                  Join the community
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link className={cn(buttonVariants({ size: "lg", variant: "secondary" }))} href="/documents/technical-verification-status-2026">
                  Read technical verification
                </Link>
              </div>
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-[linear-gradient(180deg,rgba(10,15,30,0.92),rgba(6,9,20,0.98))]">
            <CardHeader className="space-y-3">
              <div className="flex items-center gap-3 text-cyan-200">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-cyan-300/15 bg-cyan-300/10">
                  <MessageSquareHeart className="h-5 w-5" />
                </div>
                <div className="text-[11px] uppercase tracking-[0.28em] text-cyan-200/80">FAQ</div>
              </div>
              <CardTitle className="text-2xl">Short answers for normal users, reviewers, and funders</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {faqItems.map((item) => (
                <div key={item.question} className="rounded-[20px] border border-white/8 bg-white/[0.03] p-4">
                  <div className="text-sm font-semibold text-white">{item.question}</div>
                  <p className="mt-2 text-sm leading-7 text-white/60">{item.answer}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="w-full">
        <div className="max-w-3xl space-y-4">
          <div className="text-[11px] font-medium uppercase tracking-[0.34em] text-emerald-300/80">Need more?</div>
          <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">Choose the story behind the action</h2>
          <p className="text-base leading-8 text-white/60 sm:text-lg">
            Each route starts with the user problem, shows the product answer, then opens the exact page where that operation is reviewed, signed, and verified.
          </p>
        </div>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          <Card className="border-white/10 bg-[linear-gradient(180deg,rgba(10,15,30,0.92),rgba(6,9,20,0.98))]">
            <CardHeader><CardTitle className="text-xl">Watch the product story</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm leading-7 text-white/58">See the full problem-to-solution narrative for private governance, treasury, payroll, gaming, and proof.</p>
              <Link className={cn(buttonVariants({ size: "sm", variant: "secondary" }))} href="/story">Open story</Link>
            </CardContent>
          </Card>
          <Card className="border-white/10 bg-[linear-gradient(180deg,rgba(10,15,30,0.92),rgba(6,9,20,0.98))]">
            <CardHeader><CardTitle className="text-xl">Open live state</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm leading-7 text-white/58">Inspect current Testnet state for proposals, treasury actions, receipts, and execution logs.</p>
              <Link className={cn(buttonVariants({ size: "sm", variant: "secondary" }))} href="/live">Open live state</Link>
            </CardContent>
          </Card>
          <Card className="border-white/10 bg-[linear-gradient(180deg,rgba(10,15,30,0.92),rgba(6,9,20,0.98))]">
            <CardHeader><CardTitle className="text-xl">Open trust surfaces</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm leading-7 text-white/58">Verify signatures, receipts, ZK markers, viewing-key lanes, and public evidence after execution.</p>
              <Link className={cn(buttonVariants({ size: "sm", variant: "outline" }))} href="/proof">Open proof</Link>
            </CardContent>
          </Card>
        </div>
      </section>
        </div>
      </details>
    </main>
  );
}
