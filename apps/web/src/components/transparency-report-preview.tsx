import Link from "next/link";

import { buildTransparencyReport, sampleTransparencyReports } from "@/lib/reports/transparency-report";

export function TransparencyReportPreview({ compact = false }: { compact?: boolean }) {
  const reports = sampleTransparencyReports.map(buildTransparencyReport);

  return (
    <section className="rounded-[30px] border border-cyan-300/18 bg-cyan-300/[0.07] p-5 md:p-6">
      <div className="text-[11px] uppercase tracking-[0.28em] text-cyan-100/78">Transparency report</div>
      <h2 className="mt-2 text-2xl font-semibold tracking-[-0.035em] text-white md:text-3xl">
        Public accountability. Private coordination. Verifiable execution.
      </h2>
      <p className="mt-3 max-w-3xl text-sm leading-7 text-white/64">
        PrivateDAO keeps coordination private while a decision is active, then publishes a simple report with the final outcome, execution status, proof hash, and audit trail.
      </p>
      <div className={`mt-5 grid gap-3 ${compact ? "md:grid-cols-2" : "md:grid-cols-4"}`}>
        {reports.map((report) => (
          <Link key={report.id} href={`/proof/?report=${report.id}`} className="rounded-[22px] border border-white/10 bg-black/22 p-4 transition hover:border-cyan-300/28 hover:bg-white/[0.055]">
            <div className="text-base font-semibold text-white">{report.proposalTitle}</div>
            <p className="mt-2 text-sm leading-6 text-white/58">{report.publicSummary}</p>
            <div className="mt-3 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-cyan-100/70">
              {report.proofHash}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
