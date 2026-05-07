import type { Metadata } from "next";
import type { ReactNode } from "react";

import { buildRouteMetadata } from "@/lib/route-metadata";

export const metadata: Metadata = buildRouteMetadata({
  title: "Compliance Hub",
  description:
    "PrivateDAO compliance hub for scoped audit packs, bounded viewing-key evidence, date-windowed reporting, dWallet signatures, and proof-linked reviewer exports.",
  path: "/compliance",
  keywords: ["compliance", "viewing keys", "audit pack", "dWallet", "selective disclosure", "audit readiness"],
});

export default function ComplianceLayout({ children }: { children: ReactNode }) {
  return children;
}
