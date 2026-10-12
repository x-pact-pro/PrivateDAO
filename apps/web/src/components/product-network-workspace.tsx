"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, CheckCircle2 } from "lucide-react";

import { runtimeCatalog } from "@/lib/runtime-catalog.generated";

const productRoutes: Record<string, string> = {
  "blind-verification": "/blind-verification",
  "record-verification": "/products/record-verification",
  payroll: "/confidential-payroll",
  treasury: "/private-treasury",
  governance: "/private-governance",
  auction: "/sealed-auctions",
  agent: "https://agents.privatedao.org/",
};

const actionLabels: Record<string, string> = {
  "verification.blind.prove": "Prove a private condition",
  "verification.record.create": "Create a verified record",
  "verification.record.verify": "Check a verified record",
  "payroll.calculate": "Calculate payroll",
  "payroll.approve": "Approve payroll",
  "payroll.settle": "Settle payroll privately",
  "treasury.policy.check": "Run a treasury policy",
  "governance.proposal.execute": "Complete an approved decision",
  "auction.bid.commit": "Submit a sealed offer",
  "auction.settle": "Close a confidential auction",
  "agent.discover": "Find an agent service",
  "agent.invoke": "Request agent work",
};

// A product selector is an execution surface, not a roadmap view. Keep
// policy-ready and planned rows in the machine-readable catalog, but expose
// only independently evidenced execution paths here.
const verifiedStates = new Set(["devnet_verified", "testnet_verified", "mainnet_live"]);

type WorkflowOption = {
  id: string;
  label: string;
  networks: readonly { id: string; label: string }[];
};

type ProductOption = {
  id: string;
  name: string;
  workflows: readonly WorkflowOption[];
};

const networkLabels = new Map(runtimeCatalog.networks.map((network) => [network.id, network.label]));

const productOptions: readonly ProductOption[] = runtimeCatalog.products
  .map((product) => ({
    id: product.id,
    name: product.name,
    workflows: product.capabilities
      .map((capability) => ({
        id: capability.id,
        label: actionLabels[capability.id] ?? capability.id,
        networks: capability.applicationBindings
          .filter((binding) => binding.mode === "kernel-gateway" && binding.supportsExecution && verifiedStates.has(binding.evidenceStatus))
          .map((binding) => ({ id: binding.network, label: networkLabels.get(binding.network) ?? binding.network })),
      }))
      .filter((workflow) => workflow.networks.length > 0),
  }))
  .filter((product) => product.workflows.length > 0);

export function ProductNetworkWorkspace() {
  const [readyNetworks, setReadyNetworks] = useState<Set<string>>(() => new Set(runtimeCatalog.networks.map((network) => String(network.id)).filter((network) => network !== "zcash-testnet")));
  useEffect(() => {
    let cancelled = false;
    void fetch("https://api.privatedao.org/healthz", { headers: { Accept: "application/json" } })
      .then((response) => response.ok ? response.json() as Promise<{ networks?: string[]; zcash?: { policyReady?: boolean } }> : null)
      .then((health) => {
        if (cancelled) return;
        const next = new Set(runtimeCatalog.networks.map((network) => String(network.id)).filter((network) => network !== "zcash-testnet"));
        if (health?.zcash?.policyReady && health.networks?.includes("zcash-testnet")) next.add("zcash-testnet");
        setReadyNetworks(next);
      })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, []);
  const availableProductOptions = useMemo(() => productOptions.map((product) => ({
    ...product,
    workflows: product.workflows.map((workflow) => ({
      ...workflow,
      networks: workflow.networks.filter((network) => readyNetworks.has(network.id)),
    })).filter((workflow) => workflow.networks.length > 0),
  })).filter((product) => product.workflows.length > 0), [readyNetworks]);
  const [productId, setProductId] = useState(productOptions[0]?.id ?? "");
  const product = useMemo(() => availableProductOptions.find((entry) => entry.id === productId) ?? availableProductOptions[0], [availableProductOptions, productId]);
  const [workflowId, setWorkflowId] = useState(product?.workflows[0]?.id ?? "");
  const workflow = product?.workflows.find((entry) => entry.id === workflowId) ?? product?.workflows[0];
  const [networkId, setNetworkId] = useState(workflow?.networks[0]?.id ?? "");
  const network = workflow?.networks.find((entry) => entry.id === networkId) ?? workflow?.networks[0];

  function chooseProduct(nextProductId: string) {
    const nextProduct = availableProductOptions.find((entry) => entry.id === nextProductId) ?? availableProductOptions[0];
    const nextWorkflow = nextProduct?.workflows[0];
    setProductId(nextProduct?.id ?? "");
    setWorkflowId(nextWorkflow?.id ?? "");
    setNetworkId(nextWorkflow?.networks[0]?.id ?? "");
  }

  function chooseWorkflow(nextWorkflowId: string) {
    const nextWorkflow = product?.workflows.find((entry) => entry.id === nextWorkflowId) ?? product?.workflows[0];
    setWorkflowId(nextWorkflow?.id ?? "");
    setNetworkId(nextWorkflow?.networks[0]?.id ?? "");
  }

  if (!product || !workflow || !network) return null;

  const destination = productRoutes[product.id] ?? "/products";
  const query = new URLSearchParams({ action: workflow.id, network: network.id });
  const href = destination.startsWith("http") ? destination : `${destination}?${query.toString()}`;
  const controlClass = "min-h-12 w-full rounded-[10px] border border-[#cfdbea] bg-white px-3 py-3 text-sm font-semibold text-[#10233f] outline-none focus:border-[#175cd3]";

  return (
    <section className="border-y border-[#dce5f0] py-8 sm:py-10" aria-labelledby="workflow-start-title">
      <div className="grid gap-7 lg:grid-cols-[0.75fr_1.25fr] lg:items-end">
        <div>
          <div className="commercial-eyebrow">Start with the work</div>
          <h2 id="workflow-start-title" className="mt-3 text-3xl font-semibold text-[#10233f]">Choose the outcome. PrivateDAO handles the route.</h2>
          <p className="mt-4 max-w-xl text-sm leading-7 text-[#5d6d82]">Select what your organization needs and where it should run. Available paths are routed through the Kernel and labeled by their verified execution status.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="text-xs font-semibold text-[#5d6d82]">Product
            <select className={`${controlClass} mt-2`} value={product.id} onChange={(event) => chooseProduct(event.target.value)}>
              {availableProductOptions.map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}
            </select>
          </label>
          <label className="text-xs font-semibold text-[#5d6d82]">What you want to do
            <select className={`${controlClass} mt-2`} value={workflow.id} onChange={(event) => chooseWorkflow(event.target.value)}>
              {product.workflows.map((entry) => <option key={entry.id} value={entry.id}>{entry.label}</option>)}
            </select>
          </label>
          <label className="text-xs font-semibold text-[#5d6d82]">Preferred network
            <select className={`${controlClass} mt-2`} value={network.id} onChange={(event) => setNetworkId(event.target.value)}>
              {workflow.networks.map((entry) => <option key={entry.id} value={entry.id}>{entry.label}</option>)}
            </select>
          </label>
        </div>
      </div>
      <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-[14px] bg-[#f3f7fc] px-4 py-4 sm:px-5">
        <div className="flex items-center gap-3 text-sm text-[#40536d]"><CheckCircle2 className="h-5 w-5 shrink-0 text-[#1a7f5a]" /><span><strong className="text-[#10233f]">{workflow.label}</strong> is available through {network.label}.</span></div>
        <Link href={href} className="inline-flex min-h-11 items-center gap-2 rounded-[10px] bg-[#175cd3] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#124daf]">Open workflow <ArrowRight className="h-4 w-4" /></Link>
      </div>
    </section>
  );
}
