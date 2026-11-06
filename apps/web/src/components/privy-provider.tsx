"use client";

import type { ReactNode } from "react";
import { PrivyProvider } from "@privy-io/react-auth";

const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID?.trim();

export function PrivyAuthProvider({ children }: { children: ReactNode }) {
  if (!appId) return <>{children}</>;
  return <PrivyProvider appId={appId}>{children}</PrivyProvider>;
}
