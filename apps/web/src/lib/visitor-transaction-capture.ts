"use client";

const API_BASE = process.env.NEXT_PUBLIC_PRIVATE_DAO_API_BASE || "https://api.privatedao.org";
const SESSION_KEY = "privatedao.visitor_session_id.v1";

function getSessionId() {
  try {
    const existing = window.localStorage.getItem(SESSION_KEY);
    if (existing) return existing;
    const next =
      typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
    window.localStorage.setItem(SESSION_KEY, next);
    return next;
  } catch {
    return "storage-unavailable";
  }
}

export type VisitorTransactionCaptureInput = {
  txSignature: string;
  walletAddress?: string;
  walletName?: string;
  action: string;
  status?: "submitted" | "confirmed" | "finalized";
  slot?: number;
};

export function captureVisitorTransaction(input: VisitorTransactionCaptureInput) {
  if (typeof window === "undefined") return;
  const payload = {
    ...input,
    sessionId: getSessionId(),
    page: window.location.pathname || "/",
    status: input.status || "confirmed",
  };
  void fetch(`${API_BASE}/api/v1/transactions/receipt`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    keepalive: true,
  }).catch(() => null);
}
