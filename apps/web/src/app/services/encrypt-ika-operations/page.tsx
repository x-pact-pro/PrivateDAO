import type { Metadata } from "next";
import Link from "next/link";

import { CryptographicExecutionSpine } from "@/components/cryptographic-execution-spine";
import { EncryptIkaDesktopProofWorkbench } from "@/components/encrypt-ika-desktop-proof-workbench";
import { EncryptedOperationsWorkbench } from "@/components/encrypted-operations-workbench";
import { ConfidentialPaymentsSystemSurface } from "@/components/confidential-payments-system-surface";
import { IkaDwalletCustodyWorkbench } from "@/components/ika-dwallet-custody-workbench";
import { IkaUserShareOpsGuardrail } from "@/components/ika-user-share-ops-guardrail";
import { LocalizedRouteBrief } from "@/components/localized-route-brief";
import { LocalizedRouteSummary } from "@/components/localized-route-summary";
import { OperationStateLegend } from "@/components/operation-state-legend";
import { OperationsShell } from "@/components/operations-shell";
import { ProjectOperatingMap } from "@/components/project-operating-map";
import { PrivatePayrollEncryptionWorkbench } from "@/components/private-payroll-encryption-workbench";
import { RefhePayrollProofWorkbench } from "@/components/refhe-payroll-proof-workbench";
import { buttonVariants } from "@/components/ui/button";
import { buildRouteMetadata } from "@/lib/route-metadata";
import { cn } from "@/lib/utils";

export const metadata: Metadata = buildRouteMetadata({
  title: "Encrypt / IKA Testnet Operations",
  description:
    "Runnable Encrypt, Ika, REFHE, and 2PC-MPC readiness route for PrivateDAO encrypted operations on Solana Testnet.",
  path: "/services/encrypt-ika-operations",
  keywords: ["encrypt", "ika", "2pc-mpc", "encrypted operations", "private payroll", "refhe", "solana testnet"],
});

const executionRails = [
  {
    title: "REFHE payroll proof",
    status: "Runnable now",
    description: "Encrypt a payroll payload in the browser, submit commitment-safe proof data, and receive a backend receipt hash.",
    action: "#refhe-payroll-proof",
    proof: "/documents/testnet-encrypted-integrations-activation-2026-05-23",
  },
  {
    title: "Ika / 2PC-MPC custody preparation",
    status: "Live custody route",
    description:
      "Read the Ika SDK network route, Solana pre-alpha executable program, funded operator boundary, approval-preparation path, and custody-preparation route.",
    action: "#ika-readiness",
    proof: "https://api.privatedao.org/api/v1/ika/custody/prepare",
  },
  {
    title: "Browser encrypted manifest",
    status: "Runnable now",
    description: "Create an AES-GCM encrypted operation manifest locally before anything enters a shared review or execution lane.",
    action: "#client-encryption",
    proof: "/documents/privacy-and-encryption-proof-guide",
  },
  {
    title: "One-click Testnet truth board",
    status: "Runnable now",
    description: "Run browser encryption, REFHE receipt, Ika Sui read, Ika Solana read, approval preparation, and custody preparation from one page.",
    action: "#execution-truth-board",
    proof: "/proof/encrypted-capital-markets",
  },
];

export default function EncryptIkaOperationsPage() {
  return (
    <OperationsShell
      eyebrow="Encrypted operations on Solana Testnet"
      title="Run the encrypted operations stack from one Testnet page"
      description="This is the canonical Encrypt / Ika route: a visitor can run browser encryption, REFHE payroll proof receipts, Ika readiness reads, 2PC-MPC approval preparation, Ika custody preparation, and proof-linked confidential operation flows without a terminal."
      badges={[
        { label: "Encrypt / IKA", variant: "cyan" },
        { label: "REFHE receipts", variant: "success" },
        { label: "2PC-MPC readiness", variant: "violet" },
        { label: "Testnet runnable", variant: "warning" },
      ]}
    >
      <LocalizedRouteSummary routeKey="services" />
      <LocalizedRouteBrief routeKey="servicesCore" />
      <section className="rounded-[28px] border border-emerald-300/18 bg-emerald-300/[0.055] p-5">
        <div className="text-[11px] uppercase tracking-[0.28em] text-emerald-100/72">Frontier protocol spine</div>
        <h2 className="mt-3 text-2xl font-semibold text-white">REFHE, MagicBlock, and Ika are tracked as protocol-native rails</h2>
        <p className="mt-3 max-w-4xl text-sm leading-7 text-white/66">
          The live read-node now exposes one spine for the Frontier privacy stack: REFHE finalized Testnet receipts,
          MagicBlock private corridor receipts, Ika SDK and pre-alpha custody readiness, and the visitor-repeatable
          Solana Memo claim that every reviewer can create fresh from their own wallet. Building and development continue without interruption while each rail moves toward deeper native execution.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <a href="https://api.privatedao.org/api/v1/frontier/privacy-protocol-spine" target="_blank" rel="noreferrer" className={cn(buttonVariants({ size: "sm" }))}>
            Verify protocol spine
          </a>
          <a href="https://api.privatedao.org/api/v1/privacy-execution-claims/prepare?claim=ika-custody-and-interoperability" target="_blank" rel="noreferrer" className={cn(buttonVariants({ size: "sm", variant: "secondary" }))}>
            Prepare Ika claim
          </a>
          <a href="https://api.privatedao.org/api/v1/privacy-execution-claims/prepare?claim=confidential-payroll" target="_blank" rel="noreferrer" className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>
            Prepare REFHE claim
          </a>
        </div>
      </section>
      <OperationStateLegend
        description="This route separates what is runnable today from the final production gates: REFHE and client encryption execute now; Ika/2PC-MPC is a live readiness, approval-preparation, and custody-preparation lane until funded dWallet DKG and final 2PC-MPC signatures are recorded."
      />
      <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5 text-sm leading-7 text-white/68">
        The product value here is direct: sensitive DAO operations are encrypted before execution, receipts are generated
        with commitment-safe data, and every claim routes to a visible Testnet action or readiness endpoint. This page is
        intentionally built as a judge and partner entry point, not a passive explainer.
        <div className="mt-4 flex flex-wrap gap-3">
          <a href="#execution-truth-board" className={cn(buttonVariants({ size: "sm" }))}>
            Run one-click proof
          </a>
          <Link href="/services/confidential-payments" className={cn(buttonVariants({ size: "sm" }))}>
            Open confidential payments
          </Link>
          <Link href="/services/refhe-payroll-proof" className={cn(buttonVariants({ size: "sm", variant: "secondary" }))}>
            Open REFHE payroll proof
          </Link>
          <a href="https://api.privatedao.org/api/v1/ika/solana-prealpha/readiness" target="_blank" rel="noreferrer" className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>
            Open Ika readiness JSON
          </a>
          <a href="https://api.privatedao.org/api/v1/ika/custody/prepare" target="_blank" rel="noreferrer" className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>
            Open Ika custody JSON
          </a>
          <Link href="/services/magicblock-private-payments" className={cn(buttonVariants({ size: "sm", variant: "secondary" }))}>
            Open MagicBlock lane
          </Link>
          <Link href="/services/cloak-private-settlement" className={cn(buttonVariants({ size: "sm" }))}>
            Open private settlement
          </Link>
          <Link href="/proof/encrypted-capital-markets" className={cn(buttonVariants({ size: "sm", variant: "secondary" }))}>
            Open encrypted capital markets proof
          </Link>
          <Link href="/proof" className={cn(buttonVariants({ size: "sm", variant: "secondary" }))}>
            Open proof
          </Link>
          <Link href="/judge" className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>
            Open judge
          </Link>
        </div>
      </div>
      <section className="rounded-[30px] border border-cyan-300/18 bg-[linear-gradient(135deg,rgba(34,211,238,0.12),rgba(20,241,149,0.07),rgba(5,10,20,0.96))] p-5">
        <div className="text-[11px] uppercase tracking-[0.3em] text-cyan-100/78">Start here</div>
        <h2 className="mt-3 text-2xl font-semibold text-white">Four concrete execution rails, one truth boundary</h2>
        <p className="mt-3 max-w-4xl text-sm leading-7 text-white/64">
          REFHE, browser encryption, and receipt generation are runnable from the page. Ika/2PC-MPC is exposed as a live
          readiness, approval-preparation, and custody-preparation rail: executable program and funded operator checks are
          visible, while final funded dWallet DKG and final 2PC-MPC signing remain the named production gate instead of
          being overclaimed.
        </p>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {executionRails.map((rail) => (
            <div key={rail.title} className="rounded-[24px] border border-white/10 bg-black/24 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-lg font-semibold text-white">{rail.title}</h3>
                <span className="rounded-full border border-emerald-300/20 bg-emerald-300/[0.08] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-100">
                  {rail.status}
                </span>
              </div>
              <p className="mt-3 text-sm leading-6 text-white/62">{rail.description}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {rail.action.startsWith("#") ? (
                  <a href={rail.action} className={cn(buttonVariants({ size: "sm", variant: "secondary" }))}>
                    Run rail
                  </a>
                ) : (
                  <Link href={rail.action} className={cn(buttonVariants({ size: "sm", variant: "secondary" }))}>
                    Run rail
                  </Link>
                )}
                {rail.proof.startsWith("http") ? (
                  <a href={rail.proof} target="_blank" rel="noreferrer" className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>
                    Verify proof
                  </a>
                ) : (
                  <Link href={rail.proof} className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>
                    Verify proof
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>
      <div id="execution-truth-board" className="scroll-mt-24">
        <EncryptIkaDesktopProofWorkbench />
      </div>
      <ProjectOperatingMap
        compact
        title="How encrypted operations feed the rest of the product"
        description="Encrypt / IKA is the privacy preparation layer. It protects payroll instructions, sensitive treasury operations, and confidential governance payloads before Cloak, Umbra, or MagicBlock take over as execution rails. Intelligence still feeds this lane by narrowing what should be signed and what must remain encrypted."
      />
      <CryptographicExecutionSpine compact context="encrypt-ika" />
      <div id="refhe-payroll-proof" className="scroll-mt-24">
        <RefhePayrollProofWorkbench />
      </div>
      <div id="ika-readiness" className="scroll-mt-24">
        <IkaDwalletCustodyWorkbench />
      </div>
      <div id="client-encryption" className="scroll-mt-24">
        <PrivatePayrollEncryptionWorkbench />
      </div>
      <EncryptedOperationsWorkbench />
      <IkaUserShareOpsGuardrail />
      <ConfidentialPaymentsSystemSurface compact />
    </OperationsShell>
  );
}
