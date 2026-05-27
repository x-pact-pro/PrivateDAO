import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";

import { AnalystGradeDataCorridor } from "@/components/analyst-grade-data-corridor";
import { BusinessModelSurface } from "@/components/business-model-surface";
import { CommercialCompareSurface } from "@/components/commercial-compare-surface";
import { CustodyReadinessStrip } from "@/components/custody-readiness-strip";
import { CryptographicExecutionSpine } from "@/components/cryptographic-execution-spine";
import { DataCorridorQuickLinks } from "@/components/data-corridor-quick-links";
import { DevnetServiceMetricsPanel } from "@/components/devnet-service-metrics-panel";
import { EcosystemFocusAlignmentStrip } from "@/components/ecosystem-focus-alignment-strip";
import { EncryptedOperationsWorkbench } from "@/components/encrypted-operations-workbench";
import { ExecutionCommandSurface } from "@/components/execution-command-surface";
import { ExecutionSpineSurface } from "@/components/execution-spine-surface";
import { GuidedOperationRail } from "@/components/guided-operation-rail";
import { HostedReadProofStrip } from "@/components/hosted-read-proof-strip";
import { MetricsStrip } from "@/components/metrics-strip";
import { OperatingJourneyStrip } from "@/components/operating-journey-strip";
import { OperationsShell } from "@/components/operations-shell";
import { PlatformServiceArchitecture } from "@/components/platform-service-architecture";
import { PlatformCapabilityStack } from "@/components/platform-capability-stack";
import { PaymentsTruthStrip } from "@/components/payments-truth-strip";
import { PdaoTokenStrategyStrip } from "@/components/pdao-token-strategy-strip";
import { ProjectOperatingMap } from "@/components/project-operating-map";
import { ReviewerTelemetryTruthStrip } from "@/components/reviewer-telemetry-truth-strip";
import { ReadNodeActivationStrip } from "@/components/read-node-activation-strip";
import { ReadNodeHostReadinessStrip } from "@/components/read-node-host-readiness-strip";
import { JupiterTreasuryRouteSurface } from "@/components/jupiter-treasury-route-surface";
import { LocalizedRouteBrief } from "@/components/localized-route-brief";
import { LocalizedServicesPrimer } from "@/components/localized-services-primer";
import { LocalizedRouteSummary } from "@/components/localized-route-summary";
import { ConfidentialPaymentsSystemSurface } from "@/components/confidential-payments-system-surface";
import { PrivacyPolicySelector } from "@/components/privacy-policy-selector";
import { PrivacyExecutionClaimConsole } from "@/components/privacy-execution-claim-console";
import { PrivacySdkApiStarter } from "@/components/privacy-sdk-api-starter";
import { SectionHeader } from "@/components/section-header";
import { SettlementReceiptSurface } from "@/components/settlement-receipt-surface";
import { SettlementReceiptClosurePanel } from "@/components/settlement-receipt-closure-panel";
import { ServiceOperationalCards } from "@/components/service-operational-cards";
import { ServiceConstellationSurface } from "@/components/service-constellation-surface";
import { ServiceReadinessLadder } from "@/components/service-readiness-ladder";
import { ServiceHandoffStrip } from "@/components/service-handoff-strip";
import { ServicesSurface } from "@/components/services-surface";
import { QvacSovereignAiSurface } from "@/components/qvac-sovereign-ai-surface";
import { SolutionCorridors } from "@/components/solution-corridors";
import { TreasuryReceiveSurface } from "@/components/treasury-receive-surface";
import { TreasuryProfileQuickActions } from "@/components/treasury-profile-quick-actions";
import { buildRouteMetadata } from "@/lib/route-metadata";
import { buttonVariants } from "@/components/ui/button";
import { TreasuryReviewerGradeStrip } from "@/components/treasury-reviewer-grade-strip";
import { WalletFirstServiceActionsStrip } from "@/components/wallet-first-service-actions-strip";
import { AuthoritativeExecutionTrail } from "@/components/authoritative-execution-trail";
import { getJudgeRuntimeLogsSnapshot } from "@/lib/judge-runtime-logs";
import { cn } from "@/lib/utils";

export const metadata: Metadata = buildRouteMetadata({
  title: "Services",
  description:
    "Commercial comparison, hosted read API, pilot journey, pricing, SLA framing, and trust surfaces for PrivateDAO as a real product.",
  path: "/services",
  keywords: ["services", "pilot package", "pricing model", "hosted read api"],
});

export default function ServicesPage() {
  const runtimeSnapshot = getJudgeRuntimeLogsSnapshot();
  return (
    <OperationsShell
      eyebrow="Commercial"
      title="Service and pilot surfaces presented like a product, not buried in docs"
      description="PrivateDAO also needs to show what it can deliver: API rails, operator support, pilot onboarding, trust packaging, and pricing language that stays technically grounded."
      navigationMode="guided"
      badges={[
        { label: "Services", variant: "warning" },
        { label: "Hosted Read API + Ops", variant: "cyan" },
        { label: "Pilot-ready", variant: "success" },
      ]}
    >
      <LocalizedRouteSummary routeKey="services" />
      <LocalizedRouteBrief routeKey="servicesCore" />
      <GuidedOperationRail current="verify" reviewHref="/intelligence" verifyHref="/proof" />
      <OperatingJourneyStrip
        snapshot={runtimeSnapshot}
        title="Service buyers should see the same operating truth a signer sees"
        description="Commercial packaging stays grounded only when it reflects the live wallet-first cycle: connect, review, sign, and verify with the same Testnet evidence and proof continuity."
      />
      <ExecutionCommandSurface compact />
      <ExecutionSpineSurface context="services" compact />
      <CryptographicExecutionSpine compact context="services" />
      <PrivacyExecutionClaimConsole />
      <div>
        <ServicesSurface />
      </div>
      <ServiceConstellationSurface />
      <LocalizedServicesPrimer />
      <div className="rounded-[28px] border border-emerald-300/16 bg-emerald-300/[0.07] p-5">
        <div className="text-[11px] uppercase tracking-[0.24em] text-emerald-100/76">Canonical payment lane</div>
        <h2 className="mt-3 text-2xl font-semibold text-white">Encrypted payments, private payroll, and confidential settlement belong in one operating path</h2>
        <p className="mt-2 max-w-4xl text-sm leading-7 text-white/66">
          This is the canonical route family for private value movement. Cloak, Umbra, MagicBlock, Encrypt/IKA, REFHE,
          and payroll receipts are grouped here so visitors do not chase duplicate pages before reaching a wallet-first
          Testnet action and proof route.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link href="/services/confidential-payments" className={cn(buttonVariants({ size: "sm" }))}>
            Open confidential payments
          </Link>
          <Link href="/services/encrypt-ika-operations" className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>
            Open Encrypt / IKA operations
          </Link>
          <Link href="/services/refhe-payroll-proof" className={cn(buttonVariants({ size: "sm", variant: "secondary" }))}>
            Open REFHE payroll proof
          </Link>
        </div>
      </div>
      <ConfidentialPaymentsSystemSurface compact />
      <ProjectOperatingMap
        compact
        description="From the services surface, the system should read clearly: governance creates the decision, intelligence explains it, treasury selects the route, confidential rails execute payouts and payroll privately, and wallet-first UX keeps the final approval simple for operators."
      />
      <div>
        <JupiterTreasuryRouteSurface />
      </div>
      <div>
        <CommercialCompareSurface />
      </div>
      <div>
        <BusinessModelSurface />
      </div>
      <div>
        <WalletFirstServiceActionsStrip context="services" />
      </div>
      <div>
        <PrivacyPolicySelector compact />
      </div>
      <div>
        <PrivacySdkApiStarter compact />
      </div>
      <div>
        <Suspense fallback={null}>
          <TreasuryProfileQuickActions title="Fast commercial treasury routes" />
        </Suspense>
      </div>
      <div>
        <TreasuryReviewerGradeStrip
          context="services"
          description="Collapse treasury professionalism into one product-grade surface before the receive rails: sender discipline, proof links, rail references, commercial fit, and the next readiness gate stay visible together."
        />
      </div>
      <div>
        <EncryptedOperationsWorkbench />
      </div>
      <div>
        <Suspense fallback={null}>
          <TreasuryReceiveSurface />
        </Suspense>
      </div>
      <div id="payout-route-selection">
        <SettlementReceiptSurface />
      </div>
      <div id="settlement-receipt-readiness">
        <SettlementReceiptClosurePanel />
      </div>
      <details className="rounded-[28px] border border-white/10 bg-white/[0.03] p-1">
        <summary className="cursor-pointer list-none rounded-[24px] px-5 py-4 text-sm font-medium text-white/78">
          Advanced buyer and operator detail
        </summary>
        <div className="space-y-8 px-4 pb-5 pt-2">
          <div>
        <PaymentsTruthStrip context="services" />
      </div>
          <div>
            <Suspense fallback={null}>
              <ServiceHandoffStrip context="services" />
            </Suspense>
          </div>
          <div>
            <Suspense fallback={null}>
              <AuthoritativeExecutionTrail context="services" runtimeSnapshot={runtimeSnapshot} />
            </Suspense>
          </div>
          <div>
            <PdaoTokenStrategyStrip context="services" />
          </div>
          <div>
            <ReviewerTelemetryTruthStrip
              id="telemetry-inspection"
              title="Telemetry truth for infrastructure buyers"
              description="Put freshness, hosted-read scale, finalized proof counts, and the telemetry packet above the commercial infrastructure story."
            />
          </div>
          <div>
            <ReadNodeActivationStrip context="services" />
          </div>
          <div>
            <ReadNodeHostReadinessStrip context="services" />
          </div>
          <div>
            <EcosystemFocusAlignmentStrip
              title="Services also close real ecosystem focus areas"
              description="Make the payments, DAO tooling, developer tooling, and decentralisation fit explicit from the services surface instead of leaving it buried in grant notes."
            />
          </div>
          <div>
            <MetricsStrip />
          </div>
          <div>
            <CustodyReadinessStrip context="services" />
          </div>
          <div>
            <DataCorridorQuickLinks
              title="Data-side quick links"
              description="Buyer-safe path into the telemetry packet, diagnostics, analytics, and hosted-read proof so infrastructure reviewers can inspect the data corridor from the services surface."
            />
          </div>
          <div>
            <SolutionCorridors />
          </div>
          <div>
            <Suspense fallback={null}>
              <DevnetServiceMetricsPanel scope="services" />
            </Suspense>
          </div>
          <div>
            <HostedReadProofStrip />
          </div>
          <div>
            <PlatformCapabilityStack
              title="How the visible product routes connect to the real service core"
              description="Use this layer when a reviewer, buyer, or partner needs to see how each public surface maps to a live execution engine, a proof route, and a service lane inside PrivateDAO."
            />
          </div>
          <div>
            <AnalystGradeDataCorridor />
          </div>
          <div>
            <ServiceOperationalCards />
          </div>
          <div>
            <SectionHeader
              eyebrow="AI-powered features"
              title="Operational intelligence is now part of the commercial surface"
              description="Proposal Review AI, Treasury Review AI, Voting Summary, RPC Analyzer, and Gaming AI strengthen how buyers understand PrivateDAO. They are part of the product story because they improve real decisions."
            />
          </div>
          <div>
            <QvacSovereignAiSurface compact />
          </div>
          <div>
            <PlatformServiceArchitecture />
          </div>
          <div>
            <ServiceReadinessLadder />
          </div>
        </div>
      </details>
    </OperationsShell>
  );
}
