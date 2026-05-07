import { CalendarCheck2, CheckCircle2 } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const timeline = [
  {
    week: "Week 1 post-hackathon",
    items: ["Squads multisig (3-of-5) deployment", "Authority transfer to multisig"],
  },
  {
    week: "Week 2",
    items: ["External security audit initiation", "Real-device wallet matrix completion (5/5)"],
  },
  {
    week: "Week 3",
    items: ["Monitoring + alerting deployment", "Mainnet program deployment"],
  },
  {
    week: "Week 4",
    items: ["Public launch with theMiracle wallet placement campaign"],
  },
] as const;

export function MainnetLaunchTimeline() {
  return (
    <Card className="border-emerald-300/18 bg-[radial-gradient(circle_at_top_left,rgba(20,241,149,0.13),transparent_34%),rgba(7,12,20,0.94)]">
      <CardHeader className="space-y-3">
        <div className="text-[11px] uppercase tracking-[0.3em] text-emerald-100/78">Mainnet timeline</div>
        <CardTitle className="flex items-center gap-3 text-2xl">
          <CalendarCheck2 className="h-6 w-6 text-emerald-100" />
          Four-week company launch path after the hackathon
        </CardTitle>
        <p className="max-w-4xl text-sm leading-7 text-white/62">
          The current Testnet product is deliberately staged for production: custody, audit, wallet coverage, monitoring,
          mainnet deployment, and wallet-placement launch are sequenced as one operating plan.
        </p>
      </CardHeader>
      <CardContent className="grid gap-4 lg:grid-cols-4">
        {timeline.map((entry, index) => (
          <div key={entry.week} className="relative rounded-[26px] border border-white/10 bg-white/[0.04] p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="text-sm font-semibold text-white">{entry.week}</div>
              <div className="flex h-8 w-8 items-center justify-center rounded-full border border-emerald-300/20 bg-emerald-300/10 text-sm font-semibold text-emerald-100">
                {index + 1}
              </div>
            </div>
            <div className="space-y-3">
              {entry.items.map((item) => (
                <label key={item} className="flex gap-3 rounded-2xl border border-white/8 bg-black/18 px-3 py-3 text-sm leading-6 text-white/68">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-emerald-300/24 bg-emerald-300/10">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-100" />
                  </span>
                  <span>{item}</span>
                </label>
              ))}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
