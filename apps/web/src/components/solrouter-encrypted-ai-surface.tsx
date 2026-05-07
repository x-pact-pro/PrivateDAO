"use client";

import { useMemo, useState } from "react";
import { BrainCircuit, Download, LockKeyhole } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { analyzeProposalCard, analyzeTreasuryProposalCard } from "@/lib/operational-intelligence";
import { proposalCards } from "@/lib/site-data";
import { persistOperationReceipt } from "@/lib/supabase/operation-receipts";
import { cn } from "@/lib/utils";

const encoder = new TextEncoder();

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const { buffer, byteOffset, byteLength } = bytes;
  return buffer.slice(byteOffset, byteOffset + byteLength) as ArrayBuffer;
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = "";
  bytes.forEach((value) => {
    binary += String.fromCharCode(value);
  });
  return btoa(binary);
}

async function deriveAesKey(passphrase: string, salt: Uint8Array) {
  const keyMaterial = await crypto.subtle.importKey("raw", toArrayBuffer(encoder.encode(passphrase)), "PBKDF2", false, [
    "deriveKey",
  ]);
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: toArrayBuffer(salt),
      iterations: 120_000,
      hash: "SHA-256",
    },
    keyMaterial,
    {
      name: "AES-GCM",
      length: 256,
    },
    false,
    ["encrypt"],
  );
}

export function SolrouterEncryptedAiSurface() {
  const [proposalId, setProposalId] = useState(proposalCards[0]?.id ?? "");
  const [passphrase, setPassphrase] = useState("");
  const [status, setStatus] = useState("Select proposal, generate deterministic AI brief, then encrypt bundle.");
  const [bundle, setBundle] = useState("");
  const [busy, setBusy] = useState(false);

  const selected = useMemo(
    () => proposalCards.find((proposal) => proposal.id === proposalId) ?? proposalCards[0],
    [proposalId],
  );

  const decisionBrief = useMemo(() => {
    if (!selected) return null;
    const proposalAi = analyzeProposalCard(selected);
    const treasuryAi = analyzeTreasuryProposalCard(selected);
    return {
      createdAt: new Date().toISOString(),
      proposalId: selected.id,
      proposalTitle: selected.title,
      proposalHeadline: proposalAi.headline,
      treasuryHeadline: treasuryAi.headline,
      proposalSummary: proposalAi.summary,
      treasurySummary: treasuryAi.summary,
      recommendation: [
        "Review policy lock and recipient posture before signature.",
        "Route sensitive settlement through private execution rail.",
        "Verify receipts from proof route after execution.",
      ],
      source: "deterministic-private-dao-analysis",
    };
  }, [selected]);

  async function handleEncryptBrief() {
    if (!decisionBrief) {
      setStatus("No proposal found.");
      return;
    }
    if (passphrase.trim().length < 8) {
      setStatus("Passphrase must be at least 8 characters.");
      return;
    }

    setBusy(true);
    setStatus("Encrypting AI brief locally...");
    try {
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const salt = crypto.getRandomValues(new Uint8Array(16));
      const key = await deriveAesKey(passphrase, salt);
      const cipherBuffer = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv: toArrayBuffer(iv) },
        key,
        toArrayBuffer(encoder.encode(JSON.stringify(decisionBrief))),
      );
      const payload = {
        version: "solrouter-encrypted-ai-v1",
        createdAt: new Date().toISOString(),
        proposalId: decisionBrief.proposalId,
        ivBase64: bytesToBase64(iv),
        saltBase64: bytesToBase64(salt),
        cipherBase64: bytesToBase64(new Uint8Array(cipherBuffer)),
      };
      const serialized = JSON.stringify(payload, null, 2);
      setBundle(serialized);
      setStatus("Encrypted AI brief ready. Download bundle and continue to proof.");

      await persistOperationReceipt({
        operationType: "solrouter_encrypted_ai_brief",
        proposalId: decisionBrief.proposalId,
        approvalState: "brief_encrypted",
        executionReference: decisionBrief.proposalHeadline.slice(0, 64),
        privateSettlementRail: "encrypted_ai_brief",
        stablecoinSymbol: selected?.execution.mintSymbol ?? "USDC",
        auditMode: "deterministic_ai",
        recipientVisibility: "private_by_default",
        metadata: {
          proposalTitle: decisionBrief.proposalTitle,
          source: "solrouter-encrypted-ai",
        },
      });
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Encryption failed.");
    } finally {
      setBusy(false);
    }
  }

  function handleDownload() {
    if (!bundle) return;
    const blob = new Blob([bundle], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `solrouter-encrypted-ai-${Date.now()}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  if (!selected || !decisionBrief) {
    return null;
  }

  return (
    <div className="grid gap-4">
      <div className="rounded-[24px] border border-cyan-300/16 bg-cyan-300/[0.08] p-5">
        <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.24em] text-cyan-100/82">
          <BrainCircuit className="h-4 w-4" />
          SolRouter encrypted AI lane
        </div>
        <h3 className="mt-3 text-xl font-semibold text-white">Deterministic governance intelligence + encrypted brief export</h3>
        <p className="mt-2 text-sm leading-7 text-white/68">
        This lane handles general governance and treasury analysis. Sensitive pre-sign decision support belongs to QVAC; SolRouter turns the broader proposal review into a local encrypted bundle for operators and judges.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-5">
          <label className="grid gap-2 text-sm text-white/74">
            Proposal
            <select
              value={proposalId}
              onChange={(event) => setProposalId(event.target.value)}
              className="rounded-xl border border-white/12 bg-[#07111d] px-3 py-2 text-white"
            >
              {proposalCards.map((proposal) => (
                <option key={proposal.id} value={proposal.id}>
                  {proposal.title}
                </option>
              ))}
            </select>
          </label>
          <label className="mt-3 grid gap-2 text-sm text-white/74">
            Encryption passphrase
            <input
              type="password"
              value={passphrase}
              onChange={(event) => setPassphrase(event.target.value)}
              placeholder="Minimum 8 characters"
              className="rounded-xl border border-white/12 bg-[#07111d] px-3 py-2 text-white"
            />
          </label>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void handleEncryptBrief()}
              disabled={busy}
              className={cn(buttonVariants({ size: "sm" }))}
            >
              <LockKeyhole className="mr-2 h-4 w-4" />
              {busy ? "Encrypting..." : "Encrypt AI brief"}
            </button>
            <button type="button" onClick={handleDownload} disabled={!bundle} className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>
              <Download className="mr-2 h-4 w-4" />
              Download bundle
            </button>
          </div>
          <div className="mt-4 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white/66">{status}</div>
        </div>

        <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-5">
          <div className="text-[11px] uppercase tracking-[0.2em] text-white/42">Decision brief preview</div>
          <pre className="mt-3 max-h-[320px] overflow-auto rounded-xl border border-white/10 bg-black/20 p-3 text-xs leading-6 text-white/72">
            {JSON.stringify(decisionBrief, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
}
