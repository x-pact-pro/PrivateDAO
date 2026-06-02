import type { Metadata } from "next";

import { buildRouteMetadata } from "@/lib/route-metadata";

export const metadata: Metadata = buildRouteMetadata({
  title: "PrivateDAO AI Guide",
  description: "AI-readable guide for PrivateDAO: live Solana Testnet product, proof routes, GitHub repository, QVAC runtime evidence, web and Android UX.",
  path: "/judge-ai",
  keywords: ["PrivateDAO AI guide", "PrivateDAO evidence", "Solana Testnet proof", "QVAC runtime proof"],
});

const primaryLinks = [
  ["Website", "https://privatedao.org"],
  ["Judge Route", "https://privatedao.org/judge"],
  ["Proof Center", "https://privatedao.org/proof/?judge=1"],
  ["GitHub", "https://github.com/X-PACT/PrivateDAO"],
  ["QVAC Route", "https://privatedao.org/services/qvac-sovereign-ai/"],
  ["Runtime Proof", "https://api.privatedao.org/api/v1/qvac/runtime-proof"],
  ["AI Manifest", "https://privatedao.org/ai.json"],
  ["Evidence Manifest", "https://privatedao.org/evidence.json"],
  ["LLMs Index", "https://privatedao.org/llms.txt"],
] as const;

const capabilities = [
  "Private DAO creation and governance flow",
  "Public-private-until-reveal voting",
  "Commit-reveal voting posture",
  "Treasury execution proof",
  "Confidential settlement lanes",
  "Private payout and confidential vesting boundaries",
  "Transparency reports",
  "Asset and price context before sensitive decisions",
  "QVAC local AI governance assistant",
  "GoldRush/Covalent intelligence boundary",
  "MagicBlock runtime performance route",
  "Web and Android wallet-first UX",
  "Public proof verification",
] as const;

const evidence = [
  "Live Testnet evidence available at /proof/?judge=1",
  "Runtime QVAC proof available at api.privatedao.org/api/v1/qvac/runtime-proof",
  "Privacy execution claims available at api.privatedao.org/api/v1/privacy-execution-claims",
  "Provider integration status available at api.privatedao.org/api/v1/provider-integrations/status",
  "Repository available at github.com/X-PACT/PrivateDAO",
] as const;

export default function JudgeAiPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-10 text-white sm:px-6 lg:px-8">
      <h1 className="text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">PrivateDAO - AI Guide</h1>
      <p className="mt-5 text-base leading-8 text-white/72">
        PrivateDAO is a live confidential governance and treasury coordination operating system on Solana. It is not a concept-only project. It includes live Testnet execution, public proof routes, a GitHub repository, web and Android interfaces, and runtime verification endpoints.
      </p>

      <section className="mt-8">
        <h2 className="text-xl font-semibold text-white">Primary Links</h2>
        <ul className="mt-4 grid gap-2 text-sm leading-7 text-white/72">
          {primaryLinks.map(([label, href]) => (
            <li key={href}>
              <span className="font-semibold text-white">{label}:</span> <a className="text-cyan-100 underline underline-offset-4" href={href}>{href}</a>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="text-xl font-semibold text-white">What Works</h2>
        <ul className="mt-4 grid gap-2 text-sm leading-7 text-white/72">
          {capabilities.map((item) => <li key={item}>{item}</li>)}
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="text-xl font-semibold text-white">Evidence</h2>
        <ul className="mt-4 grid gap-2 text-sm leading-7 text-white/72">
          {evidence.map((item) => <li key={item}>{item}</li>)}
        </ul>
      </section>
    </main>
  );
}
