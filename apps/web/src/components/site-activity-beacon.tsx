"use client";

import { useEffect } from "react";

const API_BASE = process.env.NEXT_PUBLIC_PRIVATE_DAO_API_BASE || "https://api.privatedao.org";
const SESSION_KEY = "privatedao.visitor_session_id.v1";
const FRESHNESS_KEY = "privatedao.freshness.last_ping_at.v1";
const FIVE_MINUTES_MS = 5 * 60_000;

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
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  }
}

function postJson(path: string, body: Record<string, string>) {
  void fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    keepalive: true,
  }).catch(() => null);
}

export function SiteActivityBeacon() {
  useEffect(() => {
    const sessionId = getSessionId();
    const page = window.location.pathname || "/";
    const countryHint = Intl.DateTimeFormat().resolvedOptions().timeZone || "unknown";
    postJson("/api/v1/visitors/ping", { sessionId, page, countryHint });

    try {
      const last = Number(window.localStorage.getItem(FRESHNESS_KEY) || "0");
      if (Date.now() - last >= FIVE_MINUTES_MS) {
        window.localStorage.setItem(FRESHNESS_KEY, String(Date.now()));
        postJson("/api/v1/freshness/ping", {
          visitorUa: window.navigator.userAgent.slice(0, 180),
        });
      }
    } catch {
      postJson("/api/v1/freshness/ping", {
        visitorUa: "storage-unavailable",
      });
    }
  }, []);

  return null;
}
