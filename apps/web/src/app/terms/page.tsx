import type { Metadata } from "next";
import Link from "next/link";

import { OperationsShell } from "@/components/operations-shell";
import { buildRouteMetadata } from "@/lib/route-metadata";
import { contactEmails } from "@/lib/site-brand";

export const metadata: Metadata = buildRouteMetadata({
  title: "Terms",
  description: "General terms for using PrivateDAO public software surfaces, product demonstrations, and verification links.",
  path: "/terms",
  keywords: ["PrivateDAO terms", "software terms", "verification terms"],
});

const sections = [
  ["Acceptance and scope", "These terms apply to the public PrivateDAO website, product interfaces, documentation, Agent Exchange, MCP endpoint, verification links, and related software surfaces. A signed order, statement of work, or partner agreement may add terms for a specific engagement."],
  ["PrivateDAO services", "PrivateDAO provides workflow, privacy, execution, verification, and agent infrastructure. Product capabilities, network support, and service limits are described by the relevant live surface and may differ by configuration."],
  ["Accounts and authorized access", "You are responsible for the accuracy of information you provide, the security of your credentials, and the actions performed through an account, wallet, API key, or authorized agent. Do not share credentials or access data you are not authorized to share."],
  ["Agent Exchange and external sellers", "The Agent Exchange may list services operated by PrivateDAO or external providers. A listing does not make PrivateDAO responsible for an external provider's independent service, output, availability, or terms. Providers must describe their capabilities accurately and users must review the requested scope before execution."],
  ["MCP and integrations", "MCP, API, wallet, network, hosting, identity, and data-provider integrations may change or become unavailable. You remain responsible for reviewing tool names, inputs, outputs, permissions, and destinations before allowing an external agent to act."],
  ["Payments and digital assets", "Paid services may require a confirmed payment through the method shown at checkout. Blockchain transfers can be irreversible, network-dependent, and subject to fees. A payment is not complete until the applicable service confirms it. PrivateDAO does not promise a token price, investment return, or transaction reversal."],
  ["Verification results", "A verification result is limited to the claims, scope, timestamp, and evidence shown on its verification page. It is not a general warranty of the underlying organization, person, asset, or transaction."],
  ["Acceptable use and security", "Do not use PrivateDAO to break the law, impersonate another party, bypass access controls, upload malicious code, expose another person's confidential data, manipulate verification evidence, or interfere with service operation. Report suspected security issues to fahd@privatedao.org."],
  ["External services and wallets", "External wallets, networks, hosting providers, AI systems, and protocols operate under their own terms and availability. Confirm the network, destination, permissions, and information before authorizing an external action."],
  ["Availability and changes", "PrivateDAO may add, remove, suspend, or modify a route, integration, or service to maintain security, reliability, or product direction. Public pages and evidence may be updated as the underlying service changes."],
  ["Disclaimers and liability", "PrivateDAO surfaces are provided on an availability basis and without promises that every workflow will meet a particular business, legal, tax, accounting, investment, or compliance outcome. To the extent permitted by applicable law, PrivateDAO is not responsible for indirect losses, third-party outages, network conditions, or actions authorized by the user."],
  ["Indemnification", "Where permitted by applicable law, you are responsible for claims, losses, or costs arising from your unlawful use of PrivateDAO, your breach of these terms, your unauthorized use of another party's data or credentials, or actions you authorize through an external wallet, agent, or integration."],
  ["Governing framework", "These general terms are intended as a neutral operational framework for the public software surfaces. A signed commercial agreement may specify the applicable contracting parties, governing law, venue, service levels, and dispute process for that engagement."],
  ["Intellectual property and contact", "PrivateDAO branding, product presentation, and project materials are maintained by Fahd Kotb unless a specific license or notice says otherwise. Questions about permitted use or these terms should be sent to fahd@privatedao.org."],
  ["Changes and termination", "Access may be limited or terminated where necessary for security, misuse, non-payment, or service changes. Updated terms will be published on this route with an updated effective date when appropriate."],
] as const;

export default function TermsPage() {
  return (
    <OperationsShell
      eyebrow="Terms"
      title="Clear boundaries for using PrivateDAO."
      description="These general terms describe the public website, software interfaces, Agent Exchange, product demonstrations, payments, and verification links. They do not replace a signed commercial agreement for a specific engagement."
      navigationMode="focused"
      badges={[{ label: "Public software surfaces", variant: "cyan" }, { label: "Read before use", variant: "warning" }]}
    >
      <section className="grid gap-4 md:grid-cols-2">
        {sections.map(([title, body]) => (
          <article key={title} className="enterprise-card rounded-[20px] p-5">
            <h2 className="text-base font-semibold text-[#10233f]">{title}</h2>
            <p className="mt-3 text-sm leading-7 text-[#5d6d82]">{body}</p>
          </article>
        ))}
      </section>
      <section className="enterprise-card rounded-[24px] p-6 sm:p-8">
        <div className="text-[11px] font-bold uppercase tracking-[0.24em] text-[#175cd3]">Questions</div>
        <h2 className="mt-3 text-2xl font-semibold text-[#10233f]">Need terms for a specific workflow?</h2>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-[#5d6d82]">Contact the project owner before relying on a product flow for an organization or external audience.</p>
        <div className="mt-5 flex flex-wrap gap-3">
          <a href={`mailto:${contactEmails.legal}?subject=PrivateDAO%20terms`} className="inline-flex rounded-full bg-[#175cd3] px-5 py-3 text-sm font-semibold text-white">Email {contactEmails.legal}</a>
          <Link href="/privacy" className="inline-flex rounded-full border border-[#c8d7e8] px-5 py-3 text-sm font-semibold text-[#175cd3]">Read privacy</Link>
        </div>
      </section>
    </OperationsShell>
  );
}
