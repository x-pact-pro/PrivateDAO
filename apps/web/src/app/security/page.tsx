import type { Metadata } from "next";

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
