"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ShieldCheck, WalletCards } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CustodyTrustContinuity } from "@/components/custody-trust-continuity";
import { buildCustodyNarrative, custodyEvidenceUpdatedEvent, emptyCustodyEvidence, getCustodyEvidenceCompletion, readCustodyEvidence, type CustodyEvidence } from "@/lib/custody-evidence";
import type { CompetitionTrackWorkspace } from "@/lib/site-data";
import { cn } from "@/lib/utils";

const supportedTracks = new Set(["colosseum-frontier", "privacy-track", "rpc-infrastructure"]);

type TrackCustodyImpactPanelProps = {
  workspace: CompetitionTrackWorkspace;
};

function buildTrackImpact(workspace: CompetitionTrackWorkspace, completionRatio: number) {
  const baseDistance = workspace.slug === "colosseum-frontier" ? "Shorter than most product submissions" : workspace.slug === "privacy-track" ? "Still bounded by custody and trust evidence" : "Commercially attractive, but mainnet posture still needs custody closure";

  if (completionRatio === 0) {
    return {
      submissionTrust:
        "Judges can already see that the custody plan exists, but they still must treat authority transfer as an explicit blocker rather than a completed launch event.",
      buyerCredibility:
        workspace.slug === "rpc-infrastructure"
          ? "The API and diagnostics story remains strong, but enterprise buyers will still ask who controls upgrade and treasury authority."
          : "Buyer confidence stays pilot-grade, not mainnet-grade, until custody evidence begins to appear.",
      mainnetDistance: baseDistance,
    };
  }

  if (completionRatio < 1) {
    return {
      submissionTrust:
        "Submission trust improves because custody is becoming inspectable inside the product. This reads as operational seriousness rather than a hand-wavy blocker list.",
      buyerCredibility:
        workspace.slug === "rpc-infrastructure"
          ? "Hosted-read and infrastructure buyers now see that authority control is being documented, which makes the commercial story more credible."
          : "Commercial credibility improves because the signer split and transfer path are visible, with final signatures treated as an explicit ceremony gate.",
      mainnetDistance: "Closer, but still blocked by missing external signatures or post-transfer readouts",
    };
  }

  return {
    submissionTrust:
      "Submission trust is materially stronger because custody evidence is fully populated in-product and aligns with the trust and blocker surfaces.",
    buyerCredibility:
      workspace.slug === "privacy-track"
        ? "This strengthens the privacy story by proving the product also treats control of execution authority as a first-class trust concern."
        : "This strengthens the buyer story because control over upgrade and treasury paths is no longer implicit or hidden.",
    mainnetDistance: "Operationally much shorter, while final external validation still remains a separate discipline",
  };
}

export function TrackCustodyImpactPanel({ workspace }: TrackCustodyImpactPanelProps) {
  const [evidence, setEvidence] = useState<CustodyEvidence>(emptyCustodyEvidence);

  useEffect(() => {
    const syncEvidence = () => setEvidence(readCustodyEvidence());

    syncEvidence();
    window.addEventListener(custodyEvidenceUpdatedEvent, syncEvidence);
    window.addEventListener("storage", syncEvidence);
    window.addEventListener("focus", syncEvidence);
    window.addEventListener("pageshow", syncEvidence);

    return () => {
      window.removeEventListener(custodyEvidenceUpdatedEvent, syncEvidence);
      window.removeEventListener("storage", syncEvidence);
      window.removeEventListener("focus", syncEvidence);
      window.removeEventListener("pageshow", syncEvidence);
    };
  }, []);

  const completion = useMemo(() => getCustodyEvidenceCompletion(evidence), [evidence]);
  const narrative = useMemo(() => buildCustodyNarrative(evidence), [evidence]);
  const impact = useMemo(() => buildTrackImpact(workspace, completion.ratio), [completion.ratio, workspace]);

  if (!supportedTracks.has(workspace.slug)) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-4">
          <CardTitle>Custody impact on this track</CardTitle>
          <Badge variant={completion.completed === 0 ? "warning" : completion.completed < completion.total ? "cyan" : "success"}>
            {narrative.badge}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="rounded-3xl border border-white/8 bg-white/4 p-4 text-sm leading-7 text-white/60">
          {narrative.summary}
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-3xl border border-white/8 bg-black/20 p-4">
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-4 w-4 text-emerald-200" />
              <div className="text-sm font-medium text-white">Submission trust</div>
            </div>
            <div className="mt-3 text-sm leading-7 text-white/56">{impact.submissionTrust}</div>
          </div>
          <div className="rounded-3xl border border-white/8 bg-black/20 p-4">
            <div className="flex items-center gap-3">
              <WalletCards className="h-4 w-4 text-cyan-200" />
              <div className="text-sm font-medium text-white">Buyer credibility</div>
            </div>
            <div className="mt-3 text-sm leading-7 text-white/56">{impact.buyerCredibility}</div>
          </div>
          <div className="rounded-3xl border border-white/8 bg-black/20 p-4">
            <div className="text-sm font-medium text-white">Mainnet distance</div>
            <div className="mt-3 text-sm leading-7 text-white/56">{impact.mainnetDistance}</div>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link href="/custody" className={cn(buttonVariants({ size: "sm", variant: "secondary" }))}>
            Open custody workspace
          </Link>
          <Link href="/documents/launch-trust-packet" className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>
            Open launch trust packet
          </Link>
          <Button size="sm" variant="outline" disabled>
            Evidence completion {completion.completed}/{completion.total}
          </Button>
        </div>
        <CustodyTrustContinuity mode="track" />
      </CardContent>
    </Card>
  );
}
