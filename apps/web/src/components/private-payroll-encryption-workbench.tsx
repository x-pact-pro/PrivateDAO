"use client";

import { useMemo, useState } from "react";
import { LockKeyhole, ShieldCheck } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { persistOperationReceipt } from "@/lib/supabase/operation-receipts";
import { cn } from "@/lib/utils";

const encoder = new TextEncoder();
const samplePayrollPayload = JSON.stringify(
  {
    operation: "confidential-payroll-reward",
    recipient: "B3STL1akxLGLvPpKd6Grz19jjVySkWrGgHFwGNK8yEZ",
    amount: "0.004 SOL rehearsal / 1 PUSD target",
    reason: "Contributor reward after approved DAO proposal",
    visibility: "encrypt sensitive payroll reason and internal notes before settlement",
    proofPath: "commitment hash + wallet-signed Testnet receipt + PrivateDAO proof route",
  },
  null,
  2,
);

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

async function sha256Hex(input: Uint8Array) {
  const digest = await crypto.subtle.digest("SHA-256", toArrayBuffer(input));
  return Array.from(new Uint8Array(digest), (value) => value.toString(16).padStart(2, "0")).join("");
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

export function PrivatePayrollEncryptionWorkbench() {
  const [plainText, setPlainText] = useState("");
  const [passphrase, setPassphrase] = useState("");
  const [asset, setAsset] = useState<"PUSD" | "AUDD" | "USDC" | "USDT" | "SOL">("PUSD");
  const [status, setStatus] = useState("Prepare a payroll/vendor payload, encrypt locally, then run the wallet-signed payment rehearsal below.");
  const [encrypting, setEncrypting] = useState(false);
  const [encryptedBundle, setEncryptedBundle] = useState<string>("");
  const [commitmentHash, setCommitmentHash] = useState<string>("");

  const canEncrypt = useMemo(() => plainText.trim().length > 0 && passphrase.trim().length >= 8, [passphrase, plainText]);

  async function handleEncrypt() {
    if (!canEncrypt) return;
    setEncrypting(true);
    setStatus("Encrypting locally in browser...");
    try {
      const salt = crypto.getRandomValues(new Uint8Array(16));
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const key = await deriveAesKey(passphrase, salt);
      const cipherBuffer = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv: toArrayBuffer(iv) },
        key,
        toArrayBuffer(encoder.encode(plainText)),
      );
      const cipherBytes = new Uint8Array(cipherBuffer);
      const commitment = await sha256Hex(cipherBytes);

      const bundle = {
        version: "pdao-aesgcm-v1",
        createdAt: new Date().toISOString(),
        assetMode: asset,
        algorithm: "AES-GCM-256",
        kdf: "PBKDF2-SHA256",
        iterations: 120000,
        ivBase64: bytesToBase64(iv),
        saltBase64: bytesToBase64(salt),
        ciphertextBase64: bytesToBase64(cipherBytes),
        commitmentSha256: commitment,
      };

      const serialized = JSON.stringify(bundle, null, 2);
      setEncryptedBundle(serialized);
      setCommitmentHash(commitment);
      setStatus("Encrypted bundle ready. Use this commitment as the private payroll manifest reference, then run the wallet-signed Testnet payment rehearsal below.");

      void persistOperationReceipt({
        operationType: "encrypted_payload_prepare",
        proposalId: "private-payroll:encrypted-manifest",
        approvalState: "prepared",
        executionReference: commitment,
        privateSettlementRail: "refhe-envelope",
        stablecoinSymbol: asset,
        auditMode: "commitment-only",
        recipientVisibility: "private-by-design",
        metadata: {
          algorithm: "AES-GCM-256",
          kdf: "PBKDF2-SHA256",
          iterations: 120000,
        },
      });
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Encryption step did not complete. Try again.");
    } finally {
      setEncrypting(false);
    }
  }

  function handleDownload() {
    if (!encryptedBundle) return;
    const blob = new Blob([encryptedBundle], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `privatedao-encrypted-payload-${Date.now()}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="rounded-[24px] border border-emerald-300/18 bg-emerald-300/[0.08] p-5">
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.24em] text-emerald-100/80">
        <LockKeyhole className="h-4 w-4" />
        Private encryption workbench
      </div>
      <h3 className="mt-3 text-xl font-semibold text-white">Client-side encrypted payroll/vendor payload</h3>
      <p className="mt-2 text-sm leading-7 text-white/70">
        This step runs encryption in-browser before execution. Only encrypted payload + commitment moves forward to receipts and audit flow; the payment proof is produced by the wallet-signed Testnet rehearsal below.
      </p>

      <div className="mt-4 grid gap-3">
        <select
          className="rounded-xl border border-white/12 bg-black/30 px-3 py-2 text-sm text-white outline-none"
          value={asset}
          onChange={(event) => setAsset(event.target.value as "PUSD" | "AUDD" | "USDC" | "USDT" | "SOL")}
        >
          <option value="PUSD">PUSD mode</option>
          <option value="AUDD">AUDD mode</option>
          <option value="USDC">USDC mode</option>
          <option value="USDT">USDT mode</option>
          <option value="SOL">SOL mode</option>
        </select>
        <textarea
          className="min-h-[120px] rounded-xl border border-white/12 bg-black/30 px-3 py-2 text-sm text-white outline-none"
          placeholder="Paste payroll/vendor payload JSON (recipients, amounts, memo, tags...)"
          value={plainText}
          onChange={(event) => setPlainText(event.target.value)}
        />
        <input
          className="rounded-xl border border-white/12 bg-black/30 px-3 py-2 text-sm text-white outline-none"
          type="password"
          placeholder="Encryption passphrase (min 8 chars)"
          value={passphrase}
          onChange={(event) => setPassphrase(event.target.value)}
        />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          className={cn(buttonVariants({ size: "sm", variant: "secondary" }))}
          onClick={() => {
            setPlainText(samplePayrollPayload);
            setPassphrase((current) => current || "privatedao-testnet");
            setStatus("Sample payroll payload loaded. Encrypt it, then run the Testnet payment rehearsal below.");
          }}
        >
          Use sample payroll payload
        </button>
        <button
          type="button"
          className={cn(buttonVariants({ size: "sm" }))}
          disabled={!canEncrypt || encrypting}
          onClick={() => void handleEncrypt()}
        >
          {encrypting ? "Encrypting..." : "Encrypt payload"}
        </button>
        <button
          type="button"
          className={cn(buttonVariants({ size: "sm", variant: "outline" }))}
          disabled={!encryptedBundle}
          onClick={handleDownload}
        >
          Download encrypted bundle
        </button>
      </div>

      <div className="mt-4 rounded-xl border border-white/12 bg-black/20 px-3 py-2 text-sm text-white/74">{status}</div>

      {commitmentHash ? (
        <div className="mt-3 rounded-xl border border-cyan-300/20 bg-cyan-300/[0.08] px-3 py-2 text-xs text-white/78">
          <div className="inline-flex items-center gap-2 uppercase tracking-[0.2em] text-cyan-100/84">
            <ShieldCheck className="h-3.5 w-3.5" />
            Commitment hash
          </div>
          <div className="mt-2 break-all">{commitmentHash}</div>
        </div>
      ) : null}
    </section>
  );
}
