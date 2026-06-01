import Link from "next/link";

import { getConfidentialVestingProvider } from "@/lib/providers/confidential-vesting-provider";

const payoutModes = [
  {
    title: "Public payout",
    body: "Use when the DAO wants a normal public payment receipt after approval.",
  },
  {
    title: "Private payout",
    body: "Recipient hidden during coordination. Execution proof becomes public after completion.",
  },
  {
    title: "Confidential vesting",
    body: "Contributor allocation stays private during review, then exports a proof report after approval.",
  },
] as const;

export async function PrivatePayoutModes() {
  const provider = getConfidentialVestingProvider();
  const receipt = await provider.prepare({
    daoId: "try-dao",
    proposalId: "private-payout-preview",
    recipientAddress: "recipient-hidden-in-preview",
    asset: "USDC",
    amount: "3500",
    mode: "confidential-vesting",
    vestingMonths: 12,
  });

  return (
    <section className="rounded-[30px] border border-violet-300/18 bg-violet-300/[0.07] p-5 md:p-6">
      <div className="text-[11px] uppercase tracking-[0.28em] text-violet-100/78">Private payout workflow</div>
      <h2 className="mt-2 text-2xl font-semibold tracking-[-0.035em] text-white md:text-3xl">
        Pay contributors without exposing recipient identity during coordination.
      </h2>
      <p className="mt-3 max-w-3xl text-sm leading-7 text-white/64">
        Create payout, hide the recipient while members coordinate, then reveal a public proof after execution. The same flow supports grants, reviewer payments, payroll, and vesting.
      </p>
      <div className="mt-5 grid gap-3 md:grid-cols-3">
        {payoutModes.map((mode) => (
          <Link key={mode.title} href={receipt.proofUrl} className="rounded-[22px] border border-white/10 bg-black/22 p-4 transition hover:border-violet-300/28 hover:bg-white/[0.055]">
            <div className="text-base font-semibold text-white">{mode.title}</div>
            <p className="mt-2 text-sm leading-6 text-white/58">{mode.body}</p>
          </Link>
        ))}
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        {receipt.labels.map((label) => (
          <span key={label} className="rounded-full border border-white/10 bg-black/24 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-white/58">
            {label}
          </span>
        ))}
      </div>
    </section>
  );
}
