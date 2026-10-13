"use client";

import { useState } from "react";
import { ArrowRight, CheckCircle2 } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const pilotRequestApi = "https://api.privatedao.org/api/v1/pilot-requests";

type PilotProduct = "Proof Workflows" | "Private Governance" | "Treasury Coordination";
type DeploymentPreference = "Cloud" | "Self-hosted" | "Enterprise";

type PilotResponse = {
  ok: boolean;
  requestId?: string;
  source?: string;
  message?: string;
  error?: string;
};

export function PilotRequestForm({ defaultProduct = "Proof Workflows" as PilotProduct }: { defaultProduct?: PilotProduct }) {
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [email, setEmail] = useState("");
  const [organizationSize, setOrganizationSize] = useState("1-10");
  const [productInterest, setProductInterest] = useState<PilotProduct>(defaultProduct);
  const [deploymentPreference, setDeploymentPreference] = useState<DeploymentPreference>("Cloud");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PilotResponse>();
  const [error, setError] = useState("");

  async function submitPilotRequest() {
    setLoading(true);
    setError("");
    setResult(undefined);
    try {
      const response = await fetch(pilotRequestApi, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          company,
          role,
          email,
          organizationSize,
          productInterest,
          deploymentPreference,
          message,
          source: "commercial-product-ui",
        }),
      });
      const payload = (await response.json()) as PilotResponse;
      if (!response.ok || !payload.ok) throw new Error(payload.error || "Pilot request failed.");
      setResult(payload);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Pilot request failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-[28px] border border-emerald-300/16 bg-emerald-300/[0.06] p-5 sm:p-6">
      <div className="text-[11px] uppercase tracking-[0.25em] text-emerald-100/76">Request pilot</div>
      <h2 className="mt-3 text-2xl font-semibold text-white">Map one real workflow and prove it.</h2>
      <p className="mt-3 max-w-4xl text-sm leading-7 text-white/64">
        Tell us which product line you want to pilot. We will map the workflow, configure the proof path, and define the
        private values that should not appear in public verification.
      </p>

      <div className="mt-6 grid gap-3 md:grid-cols-2">
        <label className="grid gap-2 text-sm text-white/72">
          Name
          <input value={name} onChange={(event) => setName(event.target.value)} className="rounded-2xl border border-white/10 bg-black/28 px-3 py-3 text-sm text-white outline-none focus:border-emerald-200/60" />
        </label>
        <label className="grid gap-2 text-sm text-white/72">
          Company
          <input value={company} onChange={(event) => setCompany(event.target.value)} className="rounded-2xl border border-white/10 bg-black/28 px-3 py-3 text-sm text-white outline-none focus:border-emerald-200/60" />
        </label>
        <label className="grid gap-2 text-sm text-white/72">
          Role
          <input value={role} onChange={(event) => setRole(event.target.value)} className="rounded-2xl border border-white/10 bg-black/28 px-3 py-3 text-sm text-white outline-none focus:border-emerald-200/60" />
        </label>
        <label className="grid gap-2 text-sm text-white/72">
          Email
          <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" className="rounded-2xl border border-white/10 bg-black/28 px-3 py-3 text-sm text-white outline-none focus:border-emerald-200/60" />
        </label>
        <label className="grid gap-2 text-sm text-white/72">
          Organization size
          <select value={organizationSize} onChange={(event) => setOrganizationSize(event.target.value)} className="rounded-2xl border border-white/10 bg-black/28 px-3 py-3 text-sm text-white outline-none focus:border-emerald-200/60">
            {["1-10", "11-50", "51-200", "201-1000", "1000+"].map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </label>
        <label className="grid gap-2 text-sm text-white/72">
          Product of interest
          <select value={productInterest} onChange={(event) => setProductInterest(event.target.value as PilotProduct)} className="rounded-2xl border border-white/10 bg-black/28 px-3 py-3 text-sm text-white outline-none focus:border-emerald-200/60">
            {["Proof Workflows", "Private Governance", "Treasury Coordination"].map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </label>
        <label className="grid gap-2 text-sm text-white/72">
          Deployment preference
          <select value={deploymentPreference} onChange={(event) => setDeploymentPreference(event.target.value as DeploymentPreference)} className="rounded-2xl border border-white/10 bg-black/28 px-3 py-3 text-sm text-white outline-none focus:border-emerald-200/60">
            {["Cloud", "Self-hosted", "Enterprise"].map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </label>
        <label className="grid gap-2 text-sm text-white/72 md:col-span-2">
          What workflow should we prove?
          <textarea value={message} onChange={(event) => setMessage(event.target.value)} rows={4} className="rounded-2xl border border-white/10 bg-black/28 px-3 py-3 text-sm text-white outline-none focus:border-emerald-200/60" />
        </label>
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <button type="button" onClick={submitPilotRequest} disabled={loading} className={cn(buttonVariants({ size: "sm" }))}>
          {loading ? "Sending..." : "Request Pilot"}
          <ArrowRight className="h-4 w-4" />
        </button>
        <a href="mailto:fahd@privatedao.org?subject=PrivateDAO%20Pilot" className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>
          Email instead
        </a>
      </div>

      {result?.ok ? (
        <div className="mt-5 flex gap-3 rounded-2xl border border-emerald-300/20 bg-black/22 p-4 text-sm leading-6 text-white/72">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-100" />
          <span>{result.message ?? "Pilot request received."} Request ID: {result.requestId}</span>
        </div>
      ) : null}
      {error ? <div className="mt-5 rounded-2xl border border-red-300/20 bg-red-400/10 p-4 text-sm text-red-100">{error}</div> : null}
    </section>
  );
}
