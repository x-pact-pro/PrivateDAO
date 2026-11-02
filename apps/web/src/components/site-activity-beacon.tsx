"use client";

import { useEffect } from "react";

const API_BASE = process.env.NEXT_PUBLIC_PRIVATE_DAO_API_BASE || "https://api.privatedao.org";
const SESSION_KEY = "privatedao.visitor_session_id.v1";
const PING_TIMEOUT_MS = 8_000;
const RETRY_DELAYS_MS = [5_000, 20_000];

function createSessionId() {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function getSessionId() {
  try {
    const existing = window.localStorage.getItem(SESSION_KEY);
    if (existing) return existing;
    const next = createSessionId();
    window.localStorage.setItem(SESSION_KEY, next);
    return next;
  } catch {
    return "storage-unavailable";
  }
}

export function SiteActivityBeacon() {
  useEffect(() => {
    if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
      return;
    }

    let cancelled = false;
    let finished = false;
    let attempt = 0;
    let inFlight = false;
    let pausedForHiddenTab = false;
    let retryTimer = 0;
    const controllers = new Set<AbortController>();

    async function sendPing() {
      const controller = new AbortController();
      controllers.add(controller);
      const timer = window.setTimeout(() => controller.abort(), PING_TIMEOUT_MS);
      try {
        const response = await fetch(`${API_BASE}/api/v1/visitors/ping`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId: getSessionId(),
            page: window.location.pathname || "/",
            countryHint: Intl.DateTimeFormat().resolvedOptions().timeZone || "unknown",
          }),
          signal: controller.signal,
        });
        // Read the body so the connection can close. Leaving a keepalive
        // response unread kept the page from ever reaching network idle.
        await response.text().catch(() => "");
        return response.ok;
      } catch {
        return false;
      } finally {
        window.clearTimeout(timer);
        controllers.delete(controller);
      }
    }

    function scheduleRetry() {
      const delay = RETRY_DELAYS_MS[attempt];
      if (delay === undefined || cancelled || finished || document.visibilityState === "hidden") return;
      attempt += 1;
      retryTimer = window.setTimeout(() => {
        void run();
      }, delay);
    }

    async function run() {
      if (cancelled || finished || inFlight) return;
      if (document.visibilityState === "hidden") {
        pausedForHiddenTab = true;
        return;
      }
      pausedForHiddenTab = false;
      inFlight = true;
      const ok = await sendPing();
      inFlight = false;
      if (cancelled || finished) return;
      if (document.visibilityState === "hidden") {
        pausedForHiddenTab = true;
        return;
      }
      if (ok) {
        finished = true;
        return;
      }
      scheduleRetry();
    }

    function onVisibilityChange() {
      if (document.visibilityState === "hidden") {
        window.clearTimeout(retryTimer);
        for (const controller of controllers) controller.abort();
        pausedForHiddenTab = true;
        return;
      }
      if (pausedForHiddenTab) void run();
    }

    document.addEventListener("visibilitychange", onVisibilityChange);
    void run();

    return () => {
      cancelled = true;
      window.clearTimeout(retryTimer);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      for (const controller of controllers) controller.abort();
    };
  }, []);

  return null;
}
