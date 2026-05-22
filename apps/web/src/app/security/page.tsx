import type { Metadata } from "next";
import Link from "next/link";

import { MetricsStrip } from "@/components/metrics-strip";
import { LocalizedRouteBrief } from "@/components/localized-route-brief";
import { MainnetExecutionScorecardPanel } from "@/components/mainnet-execution-scorecard-panel";
import { MainnetLaunchTimeline } from "@/components/mainnet-launch-timeline";
import { MonitoringDeliveryEvidencePanel } from "@/components/monitoring-delivery-evidence-panel";
import { MonitoringDeliveryClosurePanel } from "@/components/monitoring-delivery-closure-panel";
import { AuthorityHardeningPanel } from "@/components/authority-hardening-panel";
import { ConfidenceEngineSurface } from "@/components/confidence-engine-surface";
import { CustodyReadinessStrip } from "@/components/custody-readiness-strip";
import { CustodyWorkspace } from "@/components/custody-workspace";
import { FrontierSignalBoard } from "@/components/frontier-signal-board";
import { IntelligenceLayerSurface } from "@/components/intelligence-layer-surface";
import { EncryptedOperationsWorkbench } from "@/components/encrypted-operations-workbench";
import { LocalizedSecurityDeepDive } from "@/components/localized-security-deep-dive";
import { OperationsShell } from "@/components/operations-shell";
import { RealDeviceWalletMatrixPanel } from "@/components/real-device-wallet-matrix-panel";
import { RealDeviceCaptureClosurePanel } from "@/components/real-device-capture-closure-panel";
import { RuntimeOperationsReadinessPanel } from "@/components/runtime-operations-readiness-panel";
import { SecurityCenter } from "@/components/security-center";
import { SelectiveDisclosureSurface } from "@/components/selective-disclosure-surface";
import { ZkMatrixSurface } from "@/components/zk-matrix-surface";
import { ConfidentialPayoutEvidenceStrip } from "@/components/confidential-payout-evidence-strip";
import { SettlementReceiptSurface } from "@/components/settlement-receipt-surface";
import { buildRouteMetadata } from "@/lib/route-metadata";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata: Metadata = buildRouteMetadata({
  title: "Security",
  description:
    "Security architecture, additive V3 hardening, integrations, and production-readiness surfaces presented as a first-class product experience.",
  path: "/security",
  keywords: ["security", "governance hardening v3", "settlement hardening v3", "production readiness"],
});

export default function SecurityPage() {
  return (
    <OperationsShell
      eyebrow="Security"
      title="A security surface that keeps hardening, proof, and production readiness together"
      description="The security story stays productized without flattening the truth: additive V3 hardening, integration rails, audit packets, readiness gates, and the cryptographic rails behind the protocol."
      badges={[
        { label: "Security", variant: "violet" },
        { label: "Additive hardening", variant: "success" },
        { label: "ZK + REFHE + MagicBlock", variant: "cyan" },
      ]}
    >
      <div>
        <MetricsStrip />
      </div>
      <div>
        <LocalizedRouteBrief routeKey="security" />
      </div>
      <div className="rounded-[28px] border border-rose-300/18 bg-rose-300/[0.08] p-5">
        <div className="text-[11px] uppercase tracking-[0.28em] text-rose-100/76">Security remediation</div>
        <h2 className="mt-3 text-2xl font-semibold text-white">Browser vote salts are no longer persisted</h2>
        <p className="mt-3 max-w-4xl text-sm leading-7 text-white/66">
          The web commit/reveal lane now redacts persisted governance state, keeps reveal preimages in memory only,
          removes salt rendering from the DOM, and documents the ZK, API, monitoring, and REFHE/FHE claim boundaries.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link href="/documents/security-remediation-2026-05-22" className={cn(buttonVariants({ size: "sm" }))}>
            Open remediation packet
          </Link>
          <Link href="/documents/security-response-capability-2026-05-22" className={cn(buttonVariants({ size: "sm", variant: "secondary" }))}>
            Open response capability
          </Link>
          <Link href="/documents/zk-capability-matrix" className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>
            Open ZK matrix
          </Link>
          <Link href="/api-status" className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>
            Open API status
          </Link>
        </div>
      </div>
      <div className="rounded-[28px] border border-emerald-300/18 bg-emerald-300/[0.08] p-5">
        <div className="text-[11px] uppercase tracking-[0.28em] text-emerald-100/76">Custody hardening</div>
        <h2 className="mt-3 text-2xl font-semibold text-white">Testnet program upgrades now route through Squads 2-of-3</h2>
        <p className="mt-3 max-w-4xl text-sm leading-7 text-white/66">
          The current Testnet program-upgrade authority moved from the deployer key to Squads vault authority
          <span className="font-mono text-emerald-100"> CALHr...PqBv</span>. Judges can verify the multisig creation,
          48-hour timelock, signer roster, and authority-transfer signature directly on Solana Explorer.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link href="/documents/squads-testnet-custody-transfer-2026-05-22" className={cn(buttonVariants({ size: "sm" }))}>
            Open custody transfer proof
          </Link>
          <Link href="/documents/multisig-setup-intake" className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>
            Open multisig intake
          </Link>
          <Link href="/custody" className={cn(buttonVariants({ size: "sm", variant: "secondary" }))}>
            Open custody route
          </Link>
        </div>
      </div>
      <div>
        <CustodyReadinessStrip context="security" />
      </div>
      <div>
        <SecurityCenter />
      </div>
      <div>
        <AuthorityHardeningPanel />
      </div>
      <div>
        <LocalizedSecurityDeepDive section="selectiveDisclosure" />
      </div>
      <div>
        <SelectiveDisclosureSurface />
      </div>
      <div>
        <CustodyWorkspace />
      </div>
      <div>
        <LocalizedSecurityDeepDive section="operatingReality" />
      </div>
      <div>
        <FrontierSignalBoard />
      </div>
      <div>
        <LocalizedSecurityDeepDive section="zkMatrix" />
      </div>
      <div>
        <ZkMatrixSurface />
      </div>
      <div>
        <LocalizedSecurityDeepDive section="confidence" />
      </div>
      <div>
        <ConfidenceEngineSurface />
      </div>
      <div>
        <ConfidentialPayoutEvidenceStrip />
      </div>
      <div>
        <EncryptedOperationsWorkbench />
      </div>
      <div>
        <SettlementReceiptSurface />
      </div>
      <div>
        <RuntimeOperationsReadinessPanel />
      </div>
      <div>
        <RealDeviceWalletMatrixPanel />
      </div>
      <div id="real-device-capture-readiness">
        <RealDeviceCaptureClosurePanel />
      </div>
      <div>
        <MainnetExecutionScorecardPanel />
      </div>
      <div>
        <MainnetLaunchTimeline />
      </div>
      <div id="monitoring-delivery-readiness">
        <MonitoringDeliveryClosurePanel />
      </div>
      <div>
        <MonitoringDeliveryEvidencePanel />
      </div>
      <div>
        <LocalizedSecurityDeepDive section="intelligence" />
      </div>
      <div>
        <IntelligenceLayerSurface />
      </div>
    </OperationsShell>
  );
}
