"use client";

import Link from "next/link";
import { useState } from "react";

import { OperationsShell } from "@/components/operations-shell";
import { buttonVariants } from "@/components/ui/button";
import { saveUserProviderConfig, encodeBrowserOnlyKey, type UserProviderMode } from "@/lib/intelligence/user-provider-config";
import { cn } from "@/lib/utils";

export default function IntelligenceSettingsPage() {
  const [mode, setMode] = useState<UserProviderMode>("private-dao-default");
  const [providerId, setProviderId] = useState("qvac-local");
  const [baseUrl, setBaseUrl] = useState("http://localhost:11434/v1");
  const [apiKey, setApiKey] = useState("");
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    await saveUserProviderConfig({
      mode,
      providerId,
      baseUrl: mode === "bring-own-key" ? baseUrl : undefined,
      encryptedApiKey: apiKey ? await encodeBrowserOnlyKey(apiKey) : undefined,
    });
    setSaved(true);
  }

  return (
    <OperationsShell
      eyebrow="Settings"
      title="Intelligence providers"
      description="Use PrivateDAO defaults, bring your own provider key for browser-only test mode, or disable optional providers. Hidden vote data is never sent."
      navigationMode="guided"
    >
      <section className="rounded-[30px] border border-white/10 bg-white/[0.035] p-5 md:p-6">
        <div className="grid gap-4 lg:grid-cols-3">
          {[
            ["private-dao-default", "Use PrivateDAO default", "Safe local/default intelligence works with zero external API keys."],
            ["bring-own-key", "Bring my own key", "Store a browser-only test key locally for your own provider endpoint."],
            ["disabled", "Disable provider", "Turn off optional external providers and keep default product flow simple."],
          ].map(([value, label, body]) => (
            <button
              key={value}
              type="button"
              className={cn(
                "rounded-[22px] border p-4 text-left transition",
                mode === value ? "border-cyan-300/40 bg-cyan-300/[0.10]" : "border-white/10 bg-black/22 hover:border-cyan-300/26",
              )}
              onClick={() => setMode(value as UserProviderMode)}
            >
              <div className="text-base font-semibold text-white">{label}</div>
              <p className="mt-2 text-sm leading-6 text-white/58">{body}</p>
            </button>
          ))}
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <label className="grid gap-2 text-sm text-white/70">
            Provider type
            <select className="rounded-2xl border border-white/10 bg-black/30 px-3 py-3 text-white" value={providerId} onChange={(event) => setProviderId(event.target.value)}>
              <option value="qvac-local">QVAC local</option>
              <option value="qvac-hosted">QVAC hosted</option>
              <option value="custom-openai-compatible">Custom OpenAI-compatible</option>
              <option value="custom-ollama-compatible">Custom Ollama-compatible</option>
              <option value="disabled">Disabled</option>
            </select>
          </label>
          <label className="grid gap-2 text-sm text-white/70">
            Base URL
            <input className="rounded-2xl border border-white/10 bg-black/30 px-3 py-3 text-white" value={baseUrl} onChange={(event) => setBaseUrl(event.target.value)} />
          </label>
          <label className="grid gap-2 text-sm text-white/70">
            API key optional
            <input className="rounded-2xl border border-white/10 bg-black/30 px-3 py-3 text-white" type="password" value={apiKey} onChange={(event) => setApiKey(event.target.value)} />
          </label>
        </div>
        <div className="mt-5 rounded-2xl border border-emerald-300/16 bg-emerald-300/[0.08] p-4 text-sm leading-7 text-white/70">
          Data sent to providers: proposal public metadata, treasury address only if enabled, counterparty address only if enabled. Hidden vote intent, encrypted vote contents, private voter identities, and private room transcripts stay out by default.
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {[
            ["Asset context", "Checks whether a proposal token looks verified, has price context, or needs review before voting."],
            ["Price context", "Adds treasury valuation, payout USD equivalent, and vesting preview context only when relevant."],
            ["Private payout / vesting", "Keeps recipient details out of coordination while preserving a public proof route after completion."],
          ].map(([title, body]) => (
            <div key={title} className="rounded-[22px] border border-white/10 bg-black/22 p-4">
              <div className="text-base font-semibold text-white">{title}</div>
              <p className="mt-2 text-sm leading-6 text-white/58">{body}</p>
            </div>
          ))}
        </div>
        <div className="mt-5 flex flex-wrap gap-3">
          <button type="button" className={cn(buttonVariants({ size: "sm" }))} onClick={() => void handleSave()}>Save provider settings</button>
          <Link href="/intelligence" className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>Back to intelligence</Link>
        </div>
        {saved ? <div className="mt-4 text-sm text-emerald-100">Settings saved locally for this browser.</div> : null}
      </section>
    </OperationsShell>
  );
}
