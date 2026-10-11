"use client";

import { Suspense, useEffect, useState, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";

import { KernelWorkflowRunner } from "@/components/kernel-workflow-runner";
import { runtimeCatalog } from "@/lib/runtime-catalog.generated";

type SelectedKernelWorkflowProps = {
  product: string;
  children: ReactNode;
};

/**
 * A selected network must use the Kernel boundary. The legacy product UI is
 * rendered only when a visitor opens the product directly, without a routed
 * workflow selection.
 */
export function SelectedKernelWorkflow({ product, children }: SelectedKernelWorkflowProps) {
  return (
    <Suspense fallback={<>{children}</>}>
      <SelectedKernelWorkflowInner product={product}>{children}</SelectedKernelWorkflowInner>
    </Suspense>
  );
}

function SelectedKernelWorkflowInner({ product, children }: SelectedKernelWorkflowProps) {
  const searchParams = useSearchParams();
  const capability = searchParams.get("action");
  const network = searchParams.get("network");
  const [zcashStatus, setZcashStatus] = useState<"checking" | "ready" | "unavailable">(network === "zcash-testnet" ? "checking" : "ready");

  useEffect(() => {
    if (network !== "zcash-testnet") {
      setZcashStatus("ready");
      return;
    }
    let cancelled = false;
    void fetch("https://api.privatedao.org/healthz", { headers: { Accept: "application/json" } })
      .then((response) => response.ok ? response.json() as Promise<{ networks?: string[]; zcash?: { configured?: boolean; ready?: boolean } }> : null)
      .then((health) => {
        if (!cancelled) setZcashStatus(health?.zcash?.configured && health.zcash.ready && health.networks?.includes("zcash-testnet") ? "ready" : "unavailable");
      })
      .catch(() => { if (!cancelled) setZcashStatus("unavailable"); });
    return () => { cancelled = true; };
  }, [network]);

  if (!capability || !network) return <>{children}</>;
  if (network === "zcash-testnet" && zcashStatus === "checking") return <div className="rounded-[14px] border border-white/10 bg-black/20 p-5 text-sm text-white/65">Checking Zcash Testnet availability...</div>;
  if (network === "zcash-testnet" && zcashStatus === "unavailable") return <div className="rounded-[14px] border border-amber-200/20 bg-amber-200/[0.06] p-5 text-sm leading-6 text-amber-50">Zcash Testnet is not enabled for this deployment yet. Choose another available network.</div>;

  return (
    <KernelWorkflowRunner
      product={product}
      capability={capability}
      network={network}
      networkLabel={runtimeCatalog.networks.find((entry) => entry.id === network)?.label ?? network}
    />
  );
}
