import type { CompetitionTrackWorkspace } from "@/lib/site-data";
import { getTrackMainnetGatePlan } from "@/lib/track-mainnet-gates";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type TrackMainnetGatesPanelProps = {
  workspace: CompetitionTrackWorkspace;
};

export function TrackMainnetGatesPanel({
  workspace,
}: TrackMainnetGatesPanelProps) {
  const plan = getTrackMainnetGatePlan(workspace);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Mainnet launch gates</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-3xl border border-white/8 bg-white/4 p-4">
            <div className="text-[11px] uppercase tracking-[0.28em] text-emerald-300/76">
              Required before mainnet
            </div>
            <div className="mt-4 grid gap-3">
              {plan.beforeMainnet.map((item, index) => (
                <div
                  key={`${workspace.slug}-before-${index}`}
                  className="rounded-2xl border border-white/8 bg-black/20 px-4 py-3 text-sm leading-7 text-white/68"
                >
                  {item}
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-3xl border border-amber-300/16 bg-amber-300/8 p-4">
            <div className="text-[11px] uppercase tracking-[0.28em] text-amber-100/76">
              Testnet-proven boundary today
            </div>
            <div className="mt-4 grid gap-3">
              {plan.devnetOnly.map((item, index) => (
                <div
                  key={`${workspace.slug}-devnet-${index}`}
                  className="rounded-2xl border border-amber-300/14 bg-black/20 px-4 py-3 text-sm leading-7 text-white/72"
                >
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-white/8 bg-black/20 p-4">
          <div className="text-[11px] uppercase tracking-[0.28em] text-white/46">
            Release discipline
          </div>
          <div className="mt-3 text-sm leading-7 text-white/72">
            {plan.releaseDiscipline}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
