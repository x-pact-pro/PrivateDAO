"use client";

import { useMemo, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey, Transaction, TransactionInstruction } from "@solana/web3.js";

import { buttonVariants } from "@/components/ui/button";
import { captureVisitorTransaction } from "@/lib/visitor-transaction-capture";
import { buildSolanaTxUrl, SOLANA_NETWORK_LABEL } from "@/lib/solana-network";
import { cn } from "@/lib/utils";

const MEMO_PROGRAM_ID = new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr");

type PrivacyClaim = {
  id: string;
  label: string;
  route: string;
  proofClass: string;
  claim: string;
};

type EncryptedClaimPacket = {
  version: "pdao-encrypted-claim-v1";
  algorithm: "AES-GCM-256";
  digest: string;
  iv: string;
  key: string;
  ciphertext: string;
  commitmentMemo: string;
  memoProgram: string;
  disclosureMode: "local-selective-disclosure";
  plaintextPreview: {
    rail: string;
    proofClass: string;
    network: string;
    visitor: string;
    createdAt: string;
  };
};

function bytesToBase64(bytes: Uint8Array) {
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return window.btoa(binary);
}

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function base64ToBytes(value: string) {
  const binary = window.atob(value);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

async function buildEncryptedClaimPacket(input: {
  claim: PrivacyClaim;
  visitor: string;
  createdAt: string;
}): Promise<EncryptedClaimPacket> {
  const plaintext = {
    rail: input.claim.id,
    label: input.claim.label,
    proofClass: input.claim.proofClass,
    claim: input.claim.claim,
    route: input.claim.route,
    network: SOLANA_NETWORK_LABEL,
    visitor: input.visitor,
    createdAt: input.createdAt,
  };
  const encoded = new TextEncoder().encode(JSON.stringify(plaintext));
  const key = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt"]);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoded));
  const rawKey = new Uint8Array(await crypto.subtle.exportKey("raw", key));
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", ciphertext));
  const digestHex = bytesToHex(digest);
  const commitmentMemo = [
    "PDAO_ENCRYPTED_CLAIM_V1",
    input.claim.id,
    input.claim.proofClass,
    digestHex.slice(0, 40),
  ].join(":");

  return {
    version: "pdao-encrypted-claim-v1",
    algorithm: "AES-GCM-256",
    digest: digestHex,
    iv: bytesToBase64(iv),
    key: bytesToBase64(rawKey),
    ciphertext: bytesToBase64(ciphertext),
    commitmentMemo,
    memoProgram: MEMO_PROGRAM_ID.toBase58(),
    disclosureMode: "local-selective-disclosure",
    plaintextPreview: {
      rail: input.claim.id,
      proofClass: input.claim.proofClass,
      network: SOLANA_NETWORK_LABEL,
      visitor: `${input.visitor.slice(0, 6)}...${input.visitor.slice(-6)}`,
      createdAt: input.createdAt,
    },
  };
}

async function verifyEncryptedClaimPacket(packet: EncryptedClaimPacket) {
  const ciphertext = base64ToBytes(packet.ciphertext);
  const digest = bytesToHex(new Uint8Array(await crypto.subtle.digest("SHA-256", ciphertext)));
  if (digest !== packet.digest) {
    throw new Error("Encrypted receipt digest mismatch.");
  }

  const key = await crypto.subtle.importKey("raw", base64ToBytes(packet.key), { name: "AES-GCM" }, false, ["decrypt"]);
  const plaintextBytes = await crypto.subtle.decrypt({ name: "AES-GCM", iv: base64ToBytes(packet.iv) }, key, ciphertext);
  return JSON.parse(new TextDecoder().decode(plaintextBytes)) as {
    rail: string;
    label: string;
    proofClass: string;
    claim: string;
    route: string;
    network: string;
    visitor: string;
    createdAt: string;
  };
}

const privacyClaims: PrivacyClaim[] = [
  {
    id: "private-governance",
    label: "Private governance",
    route: "/govern",
    proofClass: "wallet-signed-onchain",
    claim: "Commit/reveal governance with ZK companion proof path.",
  },
  {
    id: "confidential-payroll",
    label: "Confidential payroll",
    route: "/payroll",
    proofClass: "onchain-signature",
    claim: "REFHE envelope plus evidence-gated payout execution.",
  },
  {
    id: "private-payments",
    label: "MagicBlock private payments",
    route: "/services/magicblock-private-payments",
    proofClass: "onchain-signature",
    claim: "Private payment corridor configured and settled on Testnet.",
  },
  {
    id: "umbra-confidential-payout",
    label: "Umbra confidential payout",
    route: "/services/umbra-confidential-payout",
    proofClass: "testnet-intent-receipt",
    claim: "Recipient-private claim intent with relayer health and next claim gate visible.",
  },
  {
    id: "ika-custody-and-interoperability",
    label: "Ika 2PC-MPC custody",
    route: "/services/encrypt-ika-operations",
    proofClass: "readiness-receipt",
    claim: "Ika SDK readiness and Solana pre-alpha approval route.",
  },
  {
    id: "intelligence-and-risk",
    label: "Intelligence and risk",
    route: "/intelligence",
    proofClass: "provider-plus-rpc-receipt",
    claim: "GoldRush, Zerion, QVAC, and QuickNode intelligence before signing.",
  },
  {
    id: "treasury-routing-and-growth",
    label: "Treasury routing and growth",
    route: "/services/jupiter-treasury-route",
    proofClass: "wallet-reviewed-route-plus-ingestion-receipt",
    claim: "Jupiter route preview and Torque growth event around governed execution.",
  },
];

export function PrivacyExecutionClaimConsole({ compact = false }: { compact?: boolean }) {
  const { connection } = useConnection();
  const { connected, publicKey, sendTransaction, wallet } = useWallet();
  const [selectedClaimId, setSelectedClaimId] = useState(privacyClaims[0].id);
  const [status, setStatus] = useState(`Connect a ${SOLANA_NETWORK_LABEL} wallet, pick a privacy rail, and anchor the claim on-chain.`);
  const [signature, setSignature] = useState<string | null>(null);
  const [encryptedPacket, setEncryptedPacket] = useState<EncryptedClaimPacket | null>(null);
  const [receiptStatus, setReceiptStatus] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  const selectedClaim = useMemo(
    () => privacyClaims.find((claim) => claim.id === selectedClaimId) ?? privacyClaims[0],
    [selectedClaimId],
  );

  async function anchorSelectedClaim() {
    if (!connected || !publicKey) {
      setStatus(`Connect a ${SOLANA_NETWORK_LABEL} wallet first. The claim must be signed by the visitor wallet.`);
      return;
    }

    setIsRunning(true);
    setSignature(null);
    setEncryptedPacket(null);
    setReceiptStatus(null);
    setStatus(`Encrypting ${selectedClaim.label} claim locally before anchoring it on ${SOLANA_NETWORK_LABEL}...`);

    try {
      const latestBlockhash = await connection.getLatestBlockhash("confirmed");
      const createdAt = new Date().toISOString();
      const packet = await buildEncryptedClaimPacket({
        claim: selectedClaim,
        visitor: publicKey.toBase58(),
        createdAt,
      });
      setEncryptedPacket(packet);

      const transaction = new Transaction({
        feePayer: publicKey,
        blockhash: latestBlockhash.blockhash,
        lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
      }).add(
        new TransactionInstruction({
          keys: [],
          programId: MEMO_PROGRAM_ID,
          data: Buffer.from(packet.commitmentMemo, "utf8"),
        }),
      );

      setStatus(`Awaiting wallet signature for ${selectedClaim.label} claim attestation...`);
      const nextSignature = await sendTransaction(transaction, connection, {
        maxRetries: 3,
        skipPreflight: false,
      });

      captureVisitorTransaction({
        txSignature: nextSignature,
        walletAddress: publicKey.toBase58(),
        walletName: wallet?.adapter.name,
        action: `privacy-execution-claim:${selectedClaim.id}`,
        status: "submitted",
      });

      setSignature(nextSignature);
      setStatus(`Signature received. Confirming ${selectedClaim.label} claim on ${SOLANA_NETWORK_LABEL}...`);

      await connection.confirmTransaction(
        {
          signature: nextSignature,
          blockhash: latestBlockhash.blockhash,
          lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
        },
        "confirmed",
      );

      setStatus(`${selectedClaim.label} encrypted claim anchored on ${SOLANA_NETWORK_LABEL}. The chain stores the commitment; the encrypted packet remains in this browser session for verification.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Privacy claim attestation failed.");
    } finally {
      setIsRunning(false);
    }
  }

  async function copyEncryptedReceipt() {
    if (!encryptedPacket) return;
    await navigator.clipboard.writeText(JSON.stringify({ signature, packet: encryptedPacket }, null, 2));
    setReceiptStatus("Encrypted receipt copied locally. It is not uploaded by this page.");
  }

  function downloadEncryptedReceipt() {
    if (!encryptedPacket) return;
    const payload = JSON.stringify({ signature, explorerUrl: signature ? buildSolanaTxUrl(signature) : null, packet: encryptedPacket }, null, 2);
    const blob = new Blob([payload], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `privatedao-${encryptedPacket.plaintextPreview.rail}-encrypted-claim.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    setReceiptStatus("Encrypted receipt downloaded from this browser session.");
  }

  async function verifyReceiptLocally() {
    if (!encryptedPacket) return;
    try {
      const plaintext = await verifyEncryptedClaimPacket(encryptedPacket);
      setReceiptStatus(`Local verification passed: ${plaintext.label} / ${plaintext.network} / ${plaintext.createdAt}`);
    } catch (error) {
      setReceiptStatus(error instanceof Error ? error.message : "Local receipt verification failed.");
    }
  }

  return (
    <section className="rounded-[30px] border border-cyan-300/18 bg-cyan-300/[0.07] p-5">
      <div className="text-[11px] uppercase tracking-[0.3em] text-cyan-100/78">On-chain claim console</div>
      <div className={cn("mt-3 grid gap-5", compact ? "lg:grid-cols-[0.95fr_1.05fr]" : "xl:grid-cols-[0.9fr_1.1fr]")}>
        <div>
          <h2 className="text-2xl font-semibold text-white">Anchor any privacy rail as a visitor-signed Testnet claim</h2>
          <p className="mt-3 text-sm leading-7 text-white/64">
            This console makes every privacy and encryption lane end-to-end testable from the browser. The visitor
            selects the rail, encrypts the claim locally, signs a Solana Testnet commitment transaction, then verifies
            the signature on-chain. Stronger rails still keep their native REFHE, MagicBlock, Ika, Umbra, Jupiter, and
            Torque proof paths beside this universal claim layer.
          </p>
          <p className="mt-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-xs leading-6 text-white/60">
            Repeatable means every visitor can run a fresh live attempt. Each click creates a new AES-GCM encrypted
            claim packet and a new wallet-signed Testnet commitment from that visitor wallet, not a replay of an old
            project signature.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {["Encrypt locally", "Anchor digest", "Verify receipt"].map((step, index) => (
              <div key={step} className="rounded-2xl border border-cyan-300/14 bg-black/20 px-4 py-3">
                <div className="text-[10px] uppercase tracking-[0.22em] text-cyan-100/58">Step {index + 1}</div>
                <div className="mt-1 text-sm font-semibold text-white">{step}</div>
              </div>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <a href="https://faucet.solana.com/" target="_blank" rel="noreferrer" className={cn(buttonVariants({ size: "sm" }))}>
              Get Testnet SOL
            </a>
            <a href="https://api.privatedao.org/api/v1/privacy-execution-claims" target="_blank" rel="noreferrer" className={cn(buttonVariants({ size: "sm", variant: "secondary" }))}>
              Claims JSON
            </a>
            <a href="https://api.privatedao.org/api/v1/privacy-execution-matrix" target="_blank" rel="noreferrer" className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>
              Matrix JSON
            </a>
            {signature ? (
              <a href={buildSolanaTxUrl(signature)} target="_blank" rel="noreferrer" className={cn(buttonVariants({ size: "sm" }))}>
                Verify claim on-chain
              </a>
            ) : null}
          </div>
        </div>

        <div className="rounded-[24px] border border-white/10 bg-black/24 p-4">
          <label className="block text-sm text-white/70">
            <span>Privacy rail</span>
            <select
              value={selectedClaimId}
              onChange={(event) => setSelectedClaimId(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-white outline-none"
            >
              {privacyClaims.map((claim) => (
                <option key={claim.id} value={claim.id}>
                  {claim.label}
                </option>
              ))}
            </select>
          </label>
          <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <div className="text-sm font-semibold text-white">{selectedClaim.label}</div>
            <p className="mt-2 text-xs leading-6 text-white/58">{selectedClaim.claim}</p>
            <div className="mt-3 font-mono text-[11px] text-cyan-100/70">{selectedClaim.proofClass}</div>
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <button type="button" onClick={() => void anchorSelectedClaim()} disabled={isRunning} className={cn(buttonVariants({ size: "sm" }))}>
              {isRunning ? "Encrypting + anchoring..." : "Encrypt + anchor on-chain"}
            </button>
            <a href={selectedClaim.route} className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>
              Open service
            </a>
          </div>
          <div className="mt-4 rounded-2xl border border-white/10 bg-black/30 p-3 text-xs leading-6 text-white/62">
            {status}
          </div>
          {signature ? <div className="mt-3 break-all font-mono text-xs text-cyan-100">{signature}</div> : null}
          <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
            <div className="text-[11px] uppercase tracking-[0.22em] text-white/50">Selective disclosure receipt</div>
            <div className="mt-2 text-xs leading-6 text-white/56">
              After anchoring, verify the encrypted packet locally, copy it, or download it without uploading private
              claim context.
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" onClick={() => void verifyReceiptLocally()} disabled={!encryptedPacket} className={cn(buttonVariants({ size: "sm", variant: "secondary" }))}>
                Verify receipt locally
              </button>
              <button type="button" onClick={() => void copyEncryptedReceipt()} disabled={!encryptedPacket} className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>
                Copy encrypted receipt
              </button>
              <button type="button" onClick={downloadEncryptedReceipt} disabled={!encryptedPacket} className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>
                Download receipt
              </button>
            </div>
            {receiptStatus ? <div className="mt-3 rounded-xl border border-white/10 bg-black/20 p-3 text-xs text-white/62">{receiptStatus}</div> : null}
          </div>
          {encryptedPacket ? (
            <div className="mt-4 rounded-2xl border border-cyan-300/16 bg-cyan-300/[0.05] p-3">
              <div className="text-[11px] uppercase tracking-[0.22em] text-cyan-100/68">Local encrypted claim packet</div>
              <div className="mt-2 text-xs leading-6 text-white/58">
                Only the digest is anchored on-chain. The key and ciphertext are shown locally so the visitor can inspect
                what was committed without publishing private claim context.
              </div>
              <pre className="mt-3 max-h-52 overflow-auto rounded-xl border border-white/10 bg-black/30 p-3 text-[11px] leading-5 text-white/66">
                {JSON.stringify(encryptedPacket, null, 2)}
              </pre>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
