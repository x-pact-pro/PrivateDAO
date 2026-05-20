import type { Metadata } from "next";
import Link from "next/link";
import { ArrowDownToLine, ArrowUpRight, Globe2, KeyRound, LockKeyhole, Network, ShieldCheck, Sparkles } from "lucide-react";

import { OperationsShell } from "@/components/operations-shell";
import { JudgeFoundationMessageCard } from "@/components/judge-foundation-message-card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { buildRouteMetadata } from "@/lib/route-metadata";
import { cn } from "@/lib/utils";

export const metadata: Metadata = buildRouteMetadata({
  title: "Whitepaper",
  description:
    "PrivateDAO whitepaper: sovereign infrastructure roadmap for encrypted governance, private settlement, QVAC intelligence, Mainnet review, and cross-chain expansion.",
  path: "/whiteprint",
  keywords: ["Whitepaper", "PrivateDAO roadmap", "Solana governance", "encrypted infrastructure"],
});

const downloadHref = "/assets/private-dao-founder-whiteprint.md";

const languages = [
  {
    code: "EN",
    title: "Whitepaper",
    founder: "Project signature",
    thesis:
      "PrivateDAO treats blockchain as durable civilization infrastructure: governance, payments, supply-chain records, institutional proof, and treaty-grade coordination become credible only when privacy and verification advance together.",
    phase2:
      "After judging, Phase 2 turns every customer request into an encrypted lane: intake, package selection, provider routing, on-chain payment reference, time-bound license key, delivery, renewal, and upgrade controls.",
    mainnet:
      "After Phase 2, PrivateDAO begins Mainnet deployment preparation and external security reviews before sensitive source, policy matrices, and anti-tamper logic move into production.",
    phase3:
      "Phase 3 expands the infrastructure cross-chain while Solana remains the guardian chain, first proof home, and decision layer that anchors the system.",
  },
  {
    code: "AR",
    title: "وثيقة المؤسس التقنية",
    founder: "إمضاء المؤسس",
    thesis:
      "PrivateDAO لا يرى البلوك تشين كأموال رقمية فقط، بل كبنية دائمة لتسجيل الحوكمة، المدفوعات، سلاسل الإمداد، التوثيق الدولي، والمعاهدات عندما تتطور الخصوصية والإثبات معا.",
    phase2:
      "بعد التحكيم، تحول Phase 2 كل طلب عميل إلى مسار مشفر: إدخال المتطلبات، اختيار الباقة، توجيه المزودين، مرجع دفع على السلسلة، مفتاح محدود المدة، التسليم، التجديد، والترقية.",
    mainnet:
      "بعد Phase 2 تبدأ PrivateDAO تجهيز نشر Mainnet والمراجعات الأمنية الخارجية قبل نقل الكود الحساس، مصفوفات السياسات، ومنطق مقاومة العبث إلى الإنتاج.",
    phase3:
      "تفتح Phase 3 التوسع cross-chain مع بقاء Solana سلسلة الحراسة، وبيت الإثبات الأول، وطبقة القرار التي تثبت النظام.",
  },
  {
    code: "ES",
    title: "Whitepaper",
    founder: "Firma del proyecto",
    thesis:
      "PrivateDAO ve blockchain como infraestructura duradera para gobernanza, pagos, registros de suministro, prueba institucional y coordinación internacional cuando privacidad y verificación avanzan juntas.",
    phase2:
      "Después del jurado, Phase 2 convierte cada solicitud del cliente en un carril cifrado con intake, paquete, proveedores, pago on-chain, licencia temporal, entrega, renovación y upgrades.",
    mainnet:
      "Después de Phase 2, PrivateDAO inicia preparación Mainnet y revisiones externas de seguridad antes de producción sensible.",
    phase3:
      "Phase 3 expande la infraestructura cross-chain mientras Solana permanece como guardian chain y hogar inicial de prueba y decisión.",
  },
  {
    code: "KO",
    title: "Whitepaper",
    founder: "Project signature",
    thesis:
      "PrivateDAO는 블록체인을 단순한 디지털 자산이 아니라 거버넌스, 결제, 공급망, 기관 증명, 국제 조정의 지속 가능한 기록 인프라로 봅니다.",
    phase2:
      "심사 이후 Phase 2는 모든 고객 요청을 암호화된 전달 경로로 전환합니다: 입력, 패키지, 제공자 라우팅, 온체인 결제 참조, 기간 제한 키, 전달, 갱신, 업그레이드.",
    mainnet:
      "Phase 2 이후 PrivateDAO는 Mainnet 준비와 외부 보안 리뷰를 시작한 뒤 민감한 소스와 정책 매트릭스를 프로덕션으로 이동합니다.",
    phase3:
      "Phase 3는 cross-chain 확장을 열며 Solana는 guardian chain, 최초 proof home, decision layer로 남습니다.",
  },
];

const architectureCards = [
  ["Encrypted intake", "Every service starts from an encrypted requirement form tied to package, duration, delivery method, and customer-selected integrations.", LockKeyhole],
  ["Payment-bound access", "The on-chain transaction hash can become the activation reference after settlement confirmation and license issuance.", KeyRound],
  ["Intelligence routing", "QVAC handles local private briefs; Covalent GoldRush, Zerion, SNS, and related rails add external context when selected.", Sparkles],
  ["Security boundary", "Sensitive source, cryptographic matrices, and anti-tamper details are reserved for auditors and selected partners.", ShieldCheck],
  ["Mainnet review", "Production deployment follows the active judging phase and external security review, not unreviewed claims.", Globe2],
  ["Phase 3 cross-chain", "The infrastructure expands beyond Solana while Solana remains the guardian chain and first decision home.", Network],
] as const;

const documentStack = [
  ["Whitepaper", "How the system works: encryption layers, QVAC/local intelligence, ZK direction, treasury logic, emergency continuity, wallet-first execution, and threat-aware operations."],
  ["Vision Paper", "Why the system exists: privacy as the condition for honest coordination, blockchain as civilization record, and Solana as the first guardian chain."],
  ["Roadmap", "How execution unfolds: Phase 1 core proof, Phase 2 encrypted customer infrastructure, Mainnet/security reviews, then Phase 3 cross-chain expansion."],
  ["Project Letter", "A quiet project signature on an ecosystem-first commitment: the delivered core was the hardest psychological and technical part; the remaining work is a continuously improving protection matrix."],
] as const;

const programLineage = [
  ["Legacy Devnet program", "5AhUsbQ4mJ8Xh7QJEomuS85qGgmK9iNvFqzF669Y7Psx", "Preserved evidence baseline before the Anchor 1.0.1 migration."],
  ["Current Anchor 1.0.1 Testnet program", "EP9xE8MJZ6FfyEwLqns6HDdUZBknEa7WGYs1Jzsecuva", "Current reviewer-facing deployment, web constants, Android constants, IDL posture, and read-node checks."],
] as const;

export default function WhitepaperPage() {
  return (
    <OperationsShell
      eyebrow="Whitepaper"
      title="PrivateDAO Sovereign Infrastructure Roadmap"
      description="A technical whitepaper for reviewers, partners, and ecosystem decision makers: why PrivateDAO exists, what is live now, and how the encrypted customer delivery, Mainnet review, and cross-chain roadmap will unfold."
      badges={[
        { label: "Ecosystem-first", variant: "cyan" },
        { label: "Solana guardian chain", variant: "success" },
        { label: "Phase 2 + Phase 3", variant: "violet" },
      ]}
    >
      <section className="rounded-[30px] border border-cyan-300/18 bg-cyan-300/[0.07] p-6">
        <div className="flex flex-wrap gap-2">
          <Badge variant="cyan">Project signature</Badge>
          <Badge variant="warning">Whitepaper, not marketing copy</Badge>
          <Badge variant="success">Reviewer-downloadable</Badge>
        </div>
        <h2 className="mt-5 max-w-4xl text-3xl font-semibold tracking-tight text-white">
          Blockchain is a record layer for civilization only if privacy becomes a first-class primitive.
        </h2>
        <p className="mt-4 max-w-5xl text-sm leading-7 text-white/68">
          PrivateDAO is built for the hardest adoption gap in the ecosystem: governments, institutions, supply chains,
          builders, and governance users need public verification without exposing sensitive operational data. The first
          proof lives on Solana Testnet; the next phases move into encrypted customer delivery, Mainnet security review,
          and cross-chain infrastructure anchored by Solana as the guardian chain.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <a href={downloadHref} download className={cn(buttonVariants({ size: "sm" }))}>
            Download whitepaper
            <ArrowDownToLine className="h-4 w-4" />
          </a>
          <Link href="/trust#whitepaper" className={cn(buttonVariants({ size: "sm", variant: "secondary" }))}>
            Open trust route
          </Link>
          <Link href="/intelligence" className={cn(buttonVariants({ size: "sm", variant: "secondary" }))}>
            Open intelligence
          </Link>
          <Link href="/services/qvac-sovereign-ai" className={cn(buttonVariants({ size: "sm", variant: "secondary" }))}>
            Open QVAC proof
          </Link>
          <Link href="/proof" className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>
            Open runtime proof
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <JudgeFoundationMessageCard />

      <section id="phase-roadmap" className="rounded-[30px] border border-emerald-300/18 bg-emerald-300/[0.07] p-6">
        <div className="text-[11px] uppercase tracking-[0.28em] text-emerald-100/78">Connected roadmap</div>
        <h2 className="mt-3 text-2xl font-semibold text-white">Each roadmap phase already maps to a live section of the product</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {[
            ["Phase 1: governance and proof", "/govern", "Wallet-first governance, execution continuity, and reviewer-visible proof already define the current system core."],
            ["Phase 2: encrypted customer delivery", "/services/confidential-payments", "Confidential payroll, recipient-private payouts, and protected settlement rails express the customer delivery path."],
            ["Mainnet and external review", "/trust", "Trust, security, proof, and reviewer routes keep the release boundaries and audit posture explicit."],
            ["Phase 3: cross-chain expansion", "/services/encrypt-ika-operations", "Encrypted coordination, 2PC-MPC, and protected execution prep show how the system expands without losing Solana as the decision home."],
          ].map(([title, href, body]) => (
            <Link key={title} href={href} className="rounded-[22px] border border-white/10 bg-black/20 p-4 transition hover:border-emerald-200/30">
              <div className="text-base font-medium text-white">{title}</div>
              <div className="mt-2 text-sm leading-6 text-white/62">{body}</div>
            </Link>
          ))}
        </div>
      </section>

      <section className="rounded-[30px] border border-violet-300/18 bg-violet-300/[0.07] p-6">
        <div className="text-[11px] uppercase tracking-[0.28em] text-violet-100/78">Project letter</div>
        <h2 className="mt-3 text-2xl font-semibold text-white">PrivateDAO is a privacy protocol civilization narrative, not only an app</h2>
        <div className="mt-4 space-y-3 text-sm leading-7 text-white/66">
          <p>
            Blockchain is not only a rail for trading value. It can become the strongest civilizational record we have:
            governance, agreements, payroll, supply-chain truth, institutional decisions, treaties, and public memory
            that cannot be quietly erased, altered, or stolen when the privacy layer is strong enough.
          </p>
          <p>
            Private governance lets people decide without pressure. The right to reveal intent should belong to the
            governed participants, not to the infrastructure around them. This protects vote tokens, treasuries,
            payroll, rewards, and sensitive institutional decisions with the same seriousness.
          </p>
          <p>
            The core shipped today is the hardest part: psychologically first, then technically. The remaining phases are
            not a dream; they are a protection matrix that can evolve forever: encrypted intake, local QVAC emergency
            intelligence, external data rails when selected, security reviews, license continuity, and proof that expired
            or non-renewed packages are actually disabled and locally sealed material is erased.
          </p>
          <p>
            PrivateDAO is treated as a public-good system before a personal asset. The mission is to serve the
            Solana ecosystem with a privacy product strong enough for developers, startups, organizations, governments,
            sensitive institutions, and future cross-chain infrastructure. This is a quiet signature on a larger duty:
            help the ecosystem repair a hidden structural gap before it becomes harder and more expensive to correct.
            When the current mission is complete, PrivateDAO should be able to protect itself through its
            community, review process, protocol rules, and guardian-chain proof.
          </p>
          <p className="text-right text-sm text-white/52">PrivateDAO Project Signature</p>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {documentStack.map(([title, body]) => (
          <article key={title} className="rounded-[24px] border border-white/10 bg-white/[0.035] p-5">
            <h3 className="text-lg font-semibold text-white">{title}</h3>
            <p className="mt-3 text-sm leading-7 text-white/62">{body}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        {languages.map((item) => (
          <article key={item.code} className="rounded-[26px] border border-white/10 bg-white/[0.035] p-5">
            <div className="flex items-center justify-between gap-3">
              <Badge variant={item.code === "AR" ? "success" : "cyan"}>{item.code}</Badge>
              <div className="text-xs text-white/42">{item.founder}</div>
            </div>
            <h3 className="mt-4 text-xl font-semibold text-white">{item.title}</h3>
            <div className="mt-4 space-y-3 text-sm leading-7 text-white/66">
              <p>{item.thesis}</p>
              <p>{item.phase2}</p>
              <p>{item.mainnet}</p>
              <p>{item.phase3}</p>
            </div>
          </article>
        ))}
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {architectureCards.map(([title, body, Icon]) => (
          <div key={title} className="rounded-[24px] border border-white/10 bg-black/20 p-5">
            <Icon className="h-5 w-5 text-cyan-100" />
            <h3 className="mt-4 text-lg font-semibold text-white">{title}</h3>
            <p className="mt-2 text-sm leading-7 text-white/62">{body}</p>
          </div>
        ))}
      </section>

      <section className="rounded-[28px] border border-emerald-300/16 bg-emerald-300/[0.07] p-6">
        <div className="text-[11px] uppercase tracking-[0.28em] text-emerald-100/78">Program ID lineage</div>
        <h2 className="mt-3 text-2xl font-semibold text-white">The program ID change is part of the migration evidence</h2>
        <p className="mt-3 max-w-4xl text-sm leading-7 text-white/64">
          PrivateDAO preserves the older Devnet proof path and the current Anchor 1.0.1 Testnet deployment as a documented
          lineage, not as a contradiction. The new program ID came with the Anchor 1.0.1 migration and clean Testnet deploy target.
        </p>
        <div className="mt-5 grid gap-3 lg:grid-cols-2">
          {programLineage.map(([label, value, body]) => (
            <div key={value} className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <div className="text-sm font-medium text-white">{label}</div>
              <div className="mt-2 break-all font-mono text-xs leading-6 text-cyan-100">{value}</div>
              <div className="mt-2 text-sm leading-6 text-white/58">{body}</div>
            </div>
          ))}
        </div>
        <Link href="/documents/anchor-1-migration-evidence-2026-04-30" className={cn(buttonVariants({ size: "sm", variant: "outline" }), "mt-5")}>
          Open Anchor 1 migration evidence
        </Link>
      </section>
    </OperationsShell>
  );
}
