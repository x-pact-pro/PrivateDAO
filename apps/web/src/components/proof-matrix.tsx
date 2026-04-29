"use client";

import { useState } from "react";
import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { buildSolanaTxUrl } from "@/lib/solana-network";
import { cn } from "@/lib/utils";

type MatrixRow = {
  id: string;
  createdAt: string;
  operationType: string;
  zk: boolean;
  viewingKey: boolean;
  signature: string;
  source: "operation_receipt" | "browser_governance_session";
};

type LocalReceipt = {
  id?: string;
  created_at?: string;
  operation_type?: string;
  execution_reference?: string;
};

type GovernanceRuntime = {
  address?: string;
  signature?: string;
};

type VoteRuntime = {
  commitSignature?: string;
  revealSignature?: string;
  finalizeSignature?: string;
  executeSignature?: string;
};

type GovernanceSession = {
  liveDaoRuntime?: GovernanceRuntime;
  liveProposalRuntime?: GovernanceRuntime;
  liveVoteRuntime?: VoteRuntime;
  liveExecutionRuntime?: GovernanceRuntime;
  proposalExecuted?: boolean;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readString(record: Record<string, unknown>, key: string) {
  const value = record[key];
  return typeof value === "string" ? value : undefined;
}

function normalizeReceipt(item: unknown, index: number): MatrixRow | null {
  if (!isRecord(item)) return null;
  const receipt: LocalReceipt = {
    id: readString(item, "id"),
    created_at: readString(item, "created_at"),
    operation_type: readString(item, "operation_type"),
    execution_reference: readString(item, "execution_reference"),
  };
  if (!receipt.execution_reference) return null;
  return {
    id: receipt.id ?? `receipt-${index}`,
    createdAt: receipt.created_at ?? new Date().toISOString(),
    operationType: receipt.operation_type ?? "operation receipt",
    zk: true,
    viewingKey: receipt.operation_type?.toLowerCase().includes("private") ?? false,
    signature: receipt.execution_reference,
    source: "operation_receipt",
  };
}

function normalizeGovernanceSession(raw: string | null): MatrixRow[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as GovernanceSession;
    const createdAt = new Date().toISOString();
    const candidates: Array<[string, string | undefined, boolean]> = [
      ["Create DAO", parsed.liveDaoRuntime?.signature, false],
      ["Create Proposal", parsed.liveProposalRuntime?.signature, false],
      ["Commit Vote", parsed.liveVoteRuntime?.commitSignature, true],
      ["Reveal Vote", parsed.liveVoteRuntime?.revealSignature, true],
      ["Finalize Proposal", parsed.liveVoteRuntime?.finalizeSignature, false],
      [
        parsed.proposalExecuted ? "Execute Proposal" : "Execute Proposal",
        parsed.liveExecutionRuntime?.signature ?? parsed.liveVoteRuntime?.executeSignature,
        false,
      ],
    ];

    return candidates.flatMap(([operationType, signature, zk], index) =>
      signature
        ? [
            {
              id: `browser-governance-${index}-${signature.slice(0, 8)}`,
              createdAt,
              operationType,
              zk,
              viewingKey: false,
              signature,
              source: "browser_governance_session" as const,
            },
          ]
        : [],
    );
  } catch {
    return [];
  }
}

function dedupeRows(rows: MatrixRow[]) {
  const seen = new Set<string>();
  return rows.filter((row) => {
    if (seen.has(row.signature)) return false;
    seen.add(row.signature);
    return true;
  });
}

export function ProofMatrix() {
  const [rows] = useState<MatrixRow[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const receiptRaw = window.localStorage.getItem("pdao.operation_receipts.v1");
      const receiptRows = receiptRaw
        ? (JSON.parse(receiptRaw) as unknown[]).map(normalizeReceipt).filter((row): row is MatrixRow => Boolean(row))
        : [];
      const governanceRows = normalizeGovernanceSession(window.localStorage.getItem("privatedao-governance-session"));
      return dedupeRows([...governanceRows, ...receiptRows]);
    } catch {
      return [];
    }
  });

  return (
    <Card className="border-white/10 bg-white/[0.03] text-white">
      <CardHeader>
        <CardTitle>Proof Matrix</CardTitle>
        <p className="text-sm text-white/60">
          Browser-run governance signatures and operation receipts are shown together so reviewers can move from wallet
          action to Testnet evidence without leaving the product.
        </p>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-white/15 bg-black/20 p-6 text-sm text-white/60">
            No local proof rows are available yet. Run a signed Testnet operation from Execute, then return here.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[840px] text-left text-sm">
              <thead className="text-white/50">
                <tr>
                  <th className="py-2">Operation</th>
                  <th className="py-2">Source</th>
                  <th className="py-2">Time</th>
                  <th className="py-2">ZK</th>
                  <th className="py-2">Viewing Key</th>
                  <th className="py-2">TX Signature</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-t border-white/10">
                    <td className="py-3 text-white/85">{row.operationType}</td>
                    <td className="py-3 text-white/60">{row.source === "browser_governance_session" ? "Browser run" : "Receipt ledger"}</td>
                    <td className="py-3 text-white/60">{new Date(row.createdAt).toLocaleString()}</td>
                    <td className="py-3">
                      <span className={cn("rounded-full px-2 py-1 text-xs", row.zk ? "bg-emerald-400/15 text-emerald-200" : "bg-white/10 text-white/55")}>
                        {row.zk ? "Verified" : "Not required"}
                      </span>
                    </td>
                    <td className="py-3">
                      <span className={cn("rounded-full px-2 py-1 text-xs", row.viewingKey ? "bg-cyan-400/15 text-cyan-200" : "bg-white/10 text-white/55")}>
                        {row.viewingKey ? "Scoped" : "N/A"}
                      </span>
                    </td>
                    <td className="py-3">
                      <Link
                        className={cn(buttonVariants({ variant: "outline", size: "sm" }), "border-white/15 bg-white/5 text-white hover:bg-white/10")}
                        href={buildSolanaTxUrl(row.signature)}
                        target="_blank"
                      >
                        {row.signature.slice(0, 8)}...{row.signature.slice(-8)}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
