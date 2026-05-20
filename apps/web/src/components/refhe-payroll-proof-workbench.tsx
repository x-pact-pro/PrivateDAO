"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
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

async function sha256Hex(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", toArrayBuffer(encoder.encode(value)));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function encryptJson(value: unknown) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt"]);
  const rawKey = new Uint8Array(await crypto.subtle.exportKey("raw", key));
  const plaintext = JSON.stringify(value);
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: toArrayBuffer(iv) }, key, toArrayBuffer(encoder.encode(plaintext))));
  return {
    algorithm: "AES-GCM-256",
    iv: bytesToBase64(iv),
    encryptedKeyHash: await sha256Hex(bytesToBase64(rawKey)),
    ciphertext: bytesToBase64(ciphertext),
  };
}

const defaultPayroll = `[
  { "recipient": "contractor-01.sol", "amount": 1250, "asset": "USDC", "role": "engineering" },
  { "recipient": "contractor-02.sol", "amount": 950, "asset": "USDC", "role": "design" },
  { "recipient": "ops-lead.sol", "amount": 700, "asset": "USDC", "role": "operations" }
]`;

export function RefhePayrollProofWorkbench() {
  const [payrollJson, setPayrollJson] = useState(defaultPayroll);
  const [status, setStatus] = useState("Build an encrypted payroll computation proof packet.");
  const [preview, setPreview] = useState("");
  const [running, setRunning] = useState(false);

  const parsed = useMemo(() => {
    try {
      const value = JSON.parse(payrollJson) as Array<{ amount?: number; asset?: string }>;
      return Array.isArray(value) ? value : [];
    } catch {
      return [];
    }
  }, [payrollJson]);
  const total = parsed.reduce((sum, item) => sum + (typeof item.amount === "number" ? item.amount : 0), 0);

  async function handleBuildProof() {
    if (parsed.length === 0) {
      setStatus("Enter a valid payroll JSON array first.");
      return;
    }
    setRunning(true);
    setStatus("Encrypting payroll locally and generating REFHE-style computation commitments...");
    try {
      const policy = {
        product: "PrivateDAO confidential payroll",
        computation: "sum encrypted payroll amount commitments",
        privacy: "recipient and amount details stay encrypted in the browser packet",
        settlementRails: ["Ika custody", "Umbra", "Cloak", "MagicBlock"],
      };
      const encrypted = await encryptJson({ payroll: parsed, policy, generatedAt: new Date().toISOString() });
      const inputCommitment = await sha256Hex(payrollJson);
      const policyHash = await sha256Hex(JSON.stringify(policy));
      const computationCommitment = await sha256Hex(`sum:${total}:count:${parsed.length}:policy:${policyHash}`);
      const totalAmountCommitment = await sha256Hex(String(total));
      const response = await fetch("https://api.privatedao.org/api/v1/refhe/payroll/proof", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ciphertext: encrypted.ciphertext,
          inputCommitment,
          computationCommitment,
          totalAmountCommitment,
          policyHash,
          recipientCount: parsed.length,
        }),
      });
      const body = await response.json().catch(() => null);
      setPreview(JSON.stringify({ encryptedPacket: encrypted, proofReceipt: body }, null, 2));
      setStatus(response.ok ? "Encrypted payroll computation receipt generated and anchored to the read-node." : `REFHE proof route responded ${response.status}.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "REFHE payroll proof failed.");
    } finally {
      setRunning(false);
    }
  }

  return (
    <section className="rounded-[28px] border border-cyan-300/16 bg-cyan-300/[0.08] p-6">
      <div className="text-[11px] uppercase tracking-[0.28em] text-cyan-100/78">REFHE payroll proof route</div>
      <h2 className="mt-3 text-2xl font-semibold text-white">Encrypted computation receipt for confidential payroll</h2>
      <p className="mt-3 max-w-4xl text-sm leading-7 text-white/66">
        The browser encrypts the payroll packet, creates commitments for the encrypted input and computed aggregate,
        then sends only ciphertext and hashes to the backend proof route.
      </p>

      <div className="mt-5 grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-4">
          <textarea
            value={payrollJson}
            onChange={(event) => setPayrollJson(event.target.value)}
            rows={10}
            className="w-full rounded-[24px] border border-white/10 bg-black/25 p-4 font-mono text-xs leading-6 text-white outline-none"
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <div className="text-[11px] uppercase tracking-[0.22em] text-white/44">Recipients</div>
              <div className="mt-2 text-xl font-semibold text-white">{parsed.length}</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <div className="text-[11px] uppercase tracking-[0.22em] text-white/44">Local aggregate</div>
              <div className="mt-2 text-xl font-semibold text-white">{total.toLocaleString()} USDC</div>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={() => void handleBuildProof()} disabled={running} className={cn(buttonVariants({ size: "sm" }))}>
              {running ? "Building..." : "Build encrypted proof"}
            </button>
            <Link href="/services/encrypt-ika-operations" className={cn(buttonVariants({ size: "sm", variant: "secondary" }))}>
              Open Encrypt / Ika
            </Link>
            <Link href="/proof" className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>
              Open proof
            </Link>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-[24px] border border-emerald-300/16 bg-emerald-300/[0.08] p-4 text-sm leading-7 text-white/72">
            {status}
          </div>
          <pre className="max-h-[560px] overflow-auto rounded-[24px] border border-white/10 bg-black/30 p-4 text-xs leading-6 text-cyan-100/82">
            {preview || "Encrypted packet and proof receipt will appear here."}
          </pre>
        </div>
      </div>
    </section>
  );
}
