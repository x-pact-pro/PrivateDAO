import type { Metadata } from "next";
import Link from "next/link";

import { TestnetBillingRehearsal } from "@/components/devnet-billing-rehearsal";
import { EndToEndIntegrationClaimMatrix } from "@/components/end-to-end-integration-claim-matrix";
import { GuidedOperationRail } from "@/components/guided-operation-rail";
import { OperationsShell } from "@/components/operations-shell";
import { PrivatePayrollEncryptionWorkbench } from "@/components/private-payroll-encryption-workbench";
import { PrivateSettlementRailWorkbench } from "@/components/private-settlement-rail-workbench";
import { PrivacyExecutionClaimConsole } from "@/components/privacy-execution-claim-console";
import { ProjectOperatingMap } from "@/components/project-operating-map";
import { VisitorTestnetFastPath } from "@/components/visitor-testnet-fast-path";
import { buildRouteMetadata } from "@/lib/route-metadata";

export const metadata: Metadata = buildRouteMetadata({
  title: "Payroll",
  description:
    "Browser-first confidential payroll lane: encrypt a payroll manifest, run a wallet-signed Testnet payout rehearsal, forward settlement intent, and verify proof continuity.",
  path: "/payroll",
  keywords: ["payroll", "confidential payroll", "encrypted payroll", "testnet payout", "private rewards"],
});

export default function PayrollPage() {
  return (
    <OperationsShell
      eyebrow="Payroll"
      title="Run confidential payroll and reward rehearsals from the browser"
      description="Prepare a private payroll manifest, sign a Testnet payout rehearsal from the visitor wallet, and keep proof continuity attached. This route is built for a normal operator: recipient, amount, memo, encrypt, sign, verify."
      navigationMode="guided"
      badges={[
        { label: "Encrypted manifest", variant: "success" },
        { label: "Wallet-signed Testnet", variant: "cyan" },
        { label: "Proof-linked", variant: "violet" },
      ]}
    >
      <GuidedOperationRail
        current="sign"
        reviewHref="/intelligence"
        verifyHref="/proof"
        pendingNote="Payroll privacy starts with local encryption; payment proof lands through the wallet-signed Testnet rehearsal and settlement receipt lanes."
      />
      <VisitorTestnetFastPath focus="payroll" />
      <section className="rounded-[28px] border border-emerald-300/16 bg-emerald-300/[0.08] p-6">
        <div className="text-[11px] uppercase tracking-[0.26em] text-emerald-100/78">Operator sequence</div>
        <h2 className="mt-3 text-2xl font-semibold text-white">Encrypt → Sign payout rehearsal → Forward private intent → Verify</h2>
        <p className="mt-3 max-w-4xl text-sm leading-7 text-white/66">
          Payroll is sensitive because names, amounts, bonuses, and internal reasons should not be public by default.
          PrivateDAO keeps the sensitive manifest encrypted in the browser, then connects it to a wallet-signed Testnet
          transaction and receipt path. Stablecoin rails upgrade to SPL TransferChecked where mint configuration exists;
          SOL fallback remains available so every visitor can test the flow immediately.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link className="inline-flex h-9 items-center justify-center rounded-md bg-white px-4 text-sm font-medium text-black transition hover:bg-white/90" href="/intelligence">
            Review before signing
          </Link>
          <Link className="inline-flex h-9 items-center justify-center rounded-md border border-white/15 bg-transparent px-4 text-sm font-medium text-white transition hover:bg-white/10" href="/proof?judge=1">
            Open proof route
          </Link>
        </div>
      </section>
      <ProjectOperatingMap
        compact
        title="Payroll is one execution lane inside the PrivateDAO Stack"
        description="Governance approves the payroll policy, intelligence reviews the risk and continuity, encryption protects the sensitive manifest, the wallet signs the Testnet operation, and proof keeps the resulting receipt inspectable."
      />
      <EndToEndIntegrationClaimMatrix />
      <PrivatePayrollEncryptionWorkbench />
      <PrivacyExecutionClaimConsole compact />
      <TestnetBillingRehearsal />
      <PrivateSettlementRailWorkbench initialRail="cloak" lockRail />
    </OperationsShell>
  );
}
