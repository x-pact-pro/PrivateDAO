"use client";

import { useEffect, useMemo, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey, Transaction, TransactionInstruction } from "@solana/web3.js";

import { buttonVariants } from "@/components/ui/button";
import { captureVisitorTransaction } from "@/lib/visitor-transaction-capture";
import { buildSolanaTxUrl, SOLANA_NETWORK_LABEL } from "@/lib/solana-network";
import { cn } from "@/lib/utils";

const MEMO_PROGRAM_ID = new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr");
const API_BASE = process.env.NEXT_PUBLIC_PRIVATE_DAO_API_BASE || "https://api.privatedao.org";

type PrivacyClaim = {
  id: string;
  label: string;
  route: string;
  nativeProofClass: string;
  claimProofClass: "visitor-wallet-memo-attestation";
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
    proofClass: input.claim.claimProofClass,
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
    input.claim.claimProofClass,
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
      proofClass: input.claim.claimProofClass,
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

function buildPublicAttestation(input: {
  packet: EncryptedClaimPacket;
  signature: string | null;
}) {
  return {
    version: "pdao-public-claim-attestation-v1",
    network: input.packet.plaintextPreview.network,
    rail: input.packet.plaintextPreview.rail,
    proofClass: input.packet.plaintextPreview.proofClass,
    digest: input.packet.digest,
    commitmentMemo: input.packet.commitmentMemo,
    memoProgram: input.packet.memoProgram,
    signature: input.signature,
    explorerUrl: input.signature ? buildSolanaTxUrl(input.signature) : null,
    disclosureBoundary: "No AES key, ciphertext plaintext, or private claim payload is included in this public attestation.",
  };
}

function getVisitorSessionId() {
  try {
    return window.localStorage.getItem("privatedao.visitor_session_id.v1") || "privacy-claim-console";
  } catch {
    return "privacy-claim-console";
  }
}

const privacyClaims: PrivacyClaim[] = [
  {
    id: "private-governance",
    label: "Private governance",
    route: "/govern",
    nativeProofClass: "wallet-signed-onchain",
    claimProofClass: "visitor-wallet-memo-attestation",
    claim: "Commit/reveal governance with ZK companion proof path.",
  },
  {
    id: "zk-commit-reveal-governance",
    label: "ZK commit/reveal",
    route: "/govern",
    nativeProofClass: "zk-receipt-plus-visitor-wallet-memo-attestation",
    claimProofClass: "visitor-wallet-memo-attestation",
    claim: "ZK-backed commit/reveal governance claim with Testnet memo attestation.",
  },
  {
    id: "confidential-payroll",
    label: "Confidential payroll",
    route: "/payroll",
    nativeProofClass: "onchain-signature",
    claimProofClass: "visitor-wallet-memo-attestation",
    claim: "REFHE envelope plus evidence-gated payout execution.",
  },
  {
    id: "refhe-payroll-computation",
    label: "REFHE payroll computation",
    route: "/services/refhe-payroll-proof",
    nativeProofClass: "encrypted-computation-receipt-plus-visitor-wallet-memo-attestation",
    claimProofClass: "visitor-wallet-memo-attestation",
    claim: "REFHE payroll computation receipt plus Testnet encrypted claim.",
  },
  {
    id: "browser-encrypt-manifest",
    label: "Encrypt manifest",
    route: "/services/encrypt-ika-operations",
    nativeProofClass: "client-encrypted-manifest-plus-visitor-wallet-memo-attestation",
    claimProofClass: "visitor-wallet-memo-attestation",
    claim: "Browser AES-GCM encrypted operation manifest with wallet-signed Testnet commitment.",
  },
  {
    id: "private-payments",
    label: "MagicBlock private payments",
    route: "/services/magicblock-private-payments",
    nativeProofClass: "onchain-signature",
    claimProofClass: "visitor-wallet-memo-attestation",
    claim: "Private payment corridor configured and settled on Testnet.",
  },
  {
    id: "magicblock-private-payments",
    label: "MagicBlock private payments",
    route: "/services/magicblock-private-payments",
    nativeProofClass: "magicblock-corridor-receipt-plus-visitor-wallet-memo-attestation",
    claimProofClass: "visitor-wallet-memo-attestation",
    claim: "MagicBlock private payment corridor claim with Testnet on-chain settlement evidence.",
  },
  {
    id: "umbra-confidential-payout",
    label: "Umbra confidential payout",
    route: "/services/umbra-confidential-payout",
    nativeProofClass: "testnet-intent-receipt",
    claimProofClass: "visitor-wallet-memo-attestation",
    claim: "Recipient-private claim intent with relayer health and next claim gate visible.",
  },
  {
    id: "ika-custody-and-interoperability",
    label: "Ika 2PC-MPC custody",
    route: "/services/encrypt-ika-operations",
    nativeProofClass: "readiness-receipt",
    claimProofClass: "visitor-wallet-memo-attestation",
    claim: "Ika SDK readiness and Solana pre-alpha approval route.",
  },
  {
    id: "ika-2pc-mpc-final-approval",
    label: "Ika 2PC-MPC approval",
    route: "/services/encrypt-ika-operations",
    nativeProofClass: "ika-final-approval-plus-visitor-wallet-memo-attestation",
    claimProofClass: "visitor-wallet-memo-attestation",
    claim: "Ika 2PC-MPC custody approval claim with Solana pre-alpha final approval evidence.",
  },
  {
    id: "intelligence-and-risk",
    label: "Intelligence and risk",
    route: "/intelligence",
    nativeProofClass: "provider-plus-rpc-receipt",
    claimProofClass: "visitor-wallet-memo-attestation",
    claim: "GoldRush, Zerion, QVAC, and QuickNode intelligence before signing.",
  },
  {
    id: "treasury-routing-and-growth",
    label: "Treasury routing and growth",
    route: "/services/jupiter-treasury-route",
    nativeProofClass: "wallet-reviewed-route-plus-ingestion-receipt",
    claimProofClass: "visitor-wallet-memo-attestation",
    claim: "Jupiter route preview and Torque growth event around governed execution.",
  },
  {
    id: "torque-mcp-growth-loop",
    label: "Torque MCP growth loop",
    route: "/services/torque-growth-loop",
    nativeProofClass: "torque-ingestion-receipt-plus-visitor-wallet-memo-attestation",
    claimProofClass: "visitor-wallet-memo-attestation",
    claim: "Torque MCP growth-loop event claim tied to governed treasury execution.",
  },
  {
    id: "pusd-stablecoin-treasury",
    label: "PUSD stablecoin treasury",
    route: "/services/pusd-stablecoin",
    nativeProofClass: "wallet-reviewed-stablecoin-utility-plus-visitor-attestation",
    claimProofClass: "visitor-wallet-memo-attestation",
    claim: "PUSD utility layer for private payroll, grants, gaming rewards, and treasury operations.",
  },
];

const privacyClaimIds = new Set(privacyClaims.map((claim) => claim.id));

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

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const requestedClaim = params.get("claim") ?? params.get("rail");
    if (requestedClaim && privacyClaimIds.has(requestedClaim)) {
      setSelectedClaimId(requestedClaim);
    }
  }, []);

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

      captureVisitorTransaction({
        txSignature: nextSignature,
        walletAddress: publicKey.toBase58(),
        walletName: wallet?.adapter.name,
        action: `privacy-execution-claim:${selectedClaim.id}`,
        status: "confirmed",
      });

      void fetch(`${API_BASE}/api/v1/execution-events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        keepalive: true,
        body: JSON.stringify({
          operationId: `privacy-execution-claim:${selectedClaim.id}`,
          operationLabel: `${selectedClaim.label} encrypted claim`,
          sessionId: getVisitorSessionId(),
          page: window.location.pathname || "/",
          status: "success",
          source: "visitor-wallet",
          receiptHash: nextSignature,
          network: SOLANA_NETWORK_LABEL,
          metadata: {
            rail: selectedClaim.id,
            route: selectedClaim.route,
            digest: packet.digest,
            memo: packet.commitmentMemo,
            memoProgram: packet.memoProgram,
            explorerUrl: buildSolanaTxUrl(nextSignature),
            disclosureBoundary: "The API receives the digest and public memo only; the AES key stays in the browser.",
          },
        }),
      }).catch(() => null);

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
    setReceiptStatus("Private disclosure receipt copied locally. It includes the AES key; share it only with a party allowed to decrypt the claim.");
  }

  async function copyPublicAttestation() {
    if (!encryptedPacket) return;
    await navigator.clipboard.writeText(JSON.stringify(buildPublicAttestation({ packet: encryptedPacket, signature }), null, 2));
    setReceiptStatus("Public attestation copied. It proves the digest and on-chain memo without exposing the AES key.");
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

  function downloadPublicAttestation() {
    if (!encryptedPacket) return;
    const payload = JSON.stringify(buildPublicAttestation({ packet: encryptedPacket, signature }), null, 2);
    const blob = new Blob([payload], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `privatedao-${encryptedPacket.plaintextPreview.rail}-public-attestation.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    setReceiptStatus("Public attestation downloaded without the AES key.");
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
    <section id="privacy-claim-console-runtime" className="solana-claim-shell rounded-[30px] p-5">
      <div className="solana-scanline" />
      <div className="relative z-10">
      <div className="inline-flex items-center rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-[11px] uppercase tracking-[0.3em] text-emerald-100">
        On-chain claim console
      </div>
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
          <div className="solana-progress mt-4 grid gap-3 sm:grid-cols-4">
            {["Review rail", "Encrypt locally", "Sign digest", "Verify receipt"].map((step, index) => (
              <div key={step} className="solana-rail-card rounded-2xl px-4 py-3">
                <div className="text-[10px] uppercase tracking-[0.22em] text-cyan-100/58">0{index + 1}</div>
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
            <a
              href={`https://api.privatedao.org/api/v1/privacy-execution-claims/prepare?claim=${encodeURIComponent(selectedClaim.id)}`}
              target="_blank"
              rel="noreferrer"
              className={cn(buttonVariants({ size: "sm", variant: "secondary" }))}
            >
              Prepare on-chain memo
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

        <div className="rounded-[24px] border border-white/10 bg-black/24 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
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
          <div className="solana-rail-card mt-4 rounded-2xl p-4">
            <div className="text-sm font-semibold text-white">{selectedClaim.label}</div>
            <p className="mt-2 text-xs leading-6 text-white/58">{selectedClaim.claim}</p>
            <div className="mt-3 space-y-1 font-mono text-[11px] text-cyan-100/70">
              <div>claim: {selectedClaim.claimProofClass}</div>
              <div className="text-white/45">native: {selectedClaim.nativeProofClass}</div>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <button type="button" onClick={() => void anchorSelectedClaim()} disabled={isRunning} className={cn(buttonVariants({ size: "sm" }))}>
              {isRunning ? "Encrypting + anchoring..." : "Encrypt + anchor on-chain"}
            </button>
            <a href={selectedClaim.route} className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>
              Open service
            </a>
          </div>
          <div className="mt-4 rounded-2xl border border-cyan-300/14 bg-black/30 p-3 text-xs leading-6 text-white/66">
            {status}
          </div>
          {signature ? <div className="mt-3 break-all font-mono text-xs text-cyan-100">{signature}</div> : null}
          <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
            <div className="text-[11px] uppercase tracking-[0.22em] text-white/50">Selective disclosure receipt</div>
            <div className="mt-2 text-xs leading-6 text-white/56">
              After anchoring, verify the encrypted packet locally, export a public attestation without the AES key, or
              export a private disclosure receipt for an allowed reviewer.
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" onClick={() => void verifyReceiptLocally()} disabled={!encryptedPacket} className={cn(buttonVariants({ size: "sm", variant: "secondary" }))}>
                Verify receipt locally
              </button>
              <button type="button" onClick={() => void copyPublicAttestation()} disabled={!encryptedPacket} className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>
                Copy public attestation
              </button>
              <button type="button" onClick={downloadPublicAttestation} disabled={!encryptedPacket} className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>
                Download public attestation
              </button>
              <button type="button" onClick={() => void copyEncryptedReceipt()} disabled={!encryptedPacket} className={cn(buttonVariants({ size: "sm", variant: "ghost" }))}>
                Copy private disclosure
              </button>
              <button type="button" onClick={downloadEncryptedReceipt} disabled={!encryptedPacket} className={cn(buttonVariants({ size: "sm", variant: "ghost" }))}>
                Download private disclosure
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
      </div>
    </section>
  );
}
