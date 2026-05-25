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

const encryptedIntegrationStatus = [
  {
    label: "REFHE",
    status: "On-chain active",
    tx: "3fygnmHzFpRQEbHq9q6u3djBnkTEcYz9y1TSwxDmbnuemshrMwLmy9CqpjifjRb7SmW3DbmXrkyq35cnjU7mMSPi",
    note: "envelope configured + settled on Testnet 2026-05-23",
  },
  {
    label: "MagicBlock",
    status: "On-chain active",
    tx: "4UiUumtuGeDciojDA26PkQby7RFiTNb12UG4ACcvGMGfQj24PUPxK5Apeno7EY8mbCvq8nR6h6nfxDcBpjPvGvPj",
    note: "corridor configured + settled on Testnet 2026-05-23",
  },
  {
    label: "V3 token execution",
    status: "Token moved",
    tx: "2a8sHWgiVCZkstybMff2M9R6DVU4Y96Rfsg8mqYs7K3xcYSEG1zMcq2iSTNwLD6FgfXvxxxWpwEP9Tbyin47RXvE",
    note: "treasury 60M -> 10M, recipient 0 -> 50M",
  },
];

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
      <div className="rounded-[28px] border border-cyan-300/22 bg-[linear-gradient(135deg,rgba(34,211,238,0.13),rgba(20,241,149,0.08),rgba(8,13,28,0.94))] p-5">
        <div className="text-[11px] uppercase tracking-[0.28em] text-cyan-100/78">Encrypted integrations active</div>
        <h2 className="mt-3 text-2xl font-semibold text-white">REFHE and MagicBlock are now on-chain settlement gates, not posture-only claims</h2>
        <p className="mt-3 max-w-4xl text-sm leading-7 text-white/66">
          The 2026-05-23 Testnet run configured and settled a REFHE envelope, configured and settled a MagicBlock
          private payment corridor, consumed settlement evidence, and executed the V3 token payout. The IKA lane remains
          truthfully scoped to SDK/Sui readiness and Solana pre-alpha approval preparation until a funded dWallet DKG is recorded.
        </p>
        <div className="mt-4 grid gap-3 lg:grid-cols-3">
          {encryptedIntegrationStatus.map((item) => (
            <a
              key={item.label}
              href={`https://solscan.io/tx/${item.tx}?cluster=testnet`}
              target="_blank"
              rel="noreferrer"
              className={cn(
                "rounded-2xl border bg-black/22 p-4 transition hover:bg-black/30",
                item.status === "Token moved" ? "border-emerald-300/38" : "border-white/10 hover:border-cyan-300/28",
              )}
            >
              <div className="text-[10px] uppercase tracking-[0.22em] text-cyan-100/66">{item.status}</div>
              <div className="mt-2 text-base font-semibold text-white">{item.label}</div>
              <div className="mt-2 text-sm leading-6 text-white/58">{item.note}</div>
              <div className="mt-3 break-all font-mono text-[11px] leading-5 text-white/48">{item.tx}</div>
            </a>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link href="/documents/testnet-encrypted-integrations-activation-2026-05-23" className={cn(buttonVariants({ size: "sm" }))}>
            Open activation packet
          </Link>
          <Link href="/documents/live-proof-v3" className={cn(buttonVariants({ size: "sm", variant: "secondary" }))}>
            Open live proof V3
          </Link>
          <Link href="/judge" className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>
            Open judge proof panel
          </Link>
        </div>
      </div>
      <div className="rounded-[28px] border border-emerald-300/22 bg-[linear-gradient(135deg,rgba(20,241,149,0.12),rgba(0,194,255,0.07),rgba(8,13,28,0.94))] p-5">
        <div className="text-[11px] uppercase tracking-[0.28em] text-emerald-100/78">Custody evidence corrected</div>
        <h2 className="mt-3 text-2xl font-semibold text-white">Squads custody now shows 4/6 gates passed on Testnet</h2>
        <p className="mt-3 max-w-4xl text-sm leading-7 text-white/66">
          The security route now reflects the actual public evidence: Squads vault authority, 2-of-3 threshold,
          signer roster, canonical program-upgrade authority transfer, ZK verifier authority transfer, and enforced
          timelock behavior. DAO and treasury authority transfers remain the two post-unlock gates after the Squads
          execution window opens.
        </p>
        <div className="mt-4 grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
          {[
            ["Passed", "Multisig vault", "CALHrBqx6jbzcPn2NVcinqSAHeod65v9LcDuTxsdPqBv"],
            ["Passed", "Threshold", "2-of-3 with 48h timelock"],
            ["Passed", "Signer roster", "4Mm5... · BBBP... · 2Kp..."],
            ["Passed", "Upgrade authority", "Canonical program authority transferred to Squads vault"],
            ["Pending", "DAO authority", "Scheduled after Squads proposal index 3 unlocks on 2026-05-27T02:25:39Z"],
            ["Pending", "Treasury authority", "Scheduled after proposal index 3 execution and post-transfer readouts"],
          ].map(([state, label, detail]) => (
            <div key={label} className="rounded-2xl border border-white/10 bg-black/22 p-4">
              <div className={cn("text-[10px] uppercase tracking-[0.22em]", state === "Passed" ? "text-emerald-100/76" : "text-amber-100/76")}>
                {state}
              </div>
              <div className="mt-2 text-base font-semibold text-white">{label}</div>
              <div className="mt-2 break-words text-sm leading-6 text-white/58">{detail}</div>
            </div>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link href="/documents/timelock-enforcement-proof-2026-05-23" className={cn(buttonVariants({ size: "sm" }))}>
            Open timelock proof
          </Link>
          <Link href="/documents/squads-current-binary-upgrade-proposal-2026-05-25" className={cn(buttonVariants({ size: "sm", variant: "secondary" }))}>
            Open Squads proposal proof
          </Link>
          <Link href="/documents/zk-standalone-verifier-testnet-2026-05-23" className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>
            Open ZK verifier proof
          </Link>
        </div>
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
          <Link href="/documents/timelock-enforcement-proof-2026-05-23" className={cn(buttonVariants({ size: "sm", variant: "secondary" }))}>
            Open timelock enforcement proof
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
