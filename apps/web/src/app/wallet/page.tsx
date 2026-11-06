import type { Metadata } from "next";

import { PdaoWalletDashboard } from "@/components/pdao-wallet-dashboard";
import { PrivyAuthProvider } from "@/components/privy-provider";

export const metadata: Metadata = {
  title: "PDAO Wallet",
  description: "Non-custodial Solana Mainnet wallet for PrivateDAO institutional services, Agent Exchange, and user-controlled assets.",
};

export default function WalletPage() {
  return <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8"><PrivyAuthProvider><PdaoWalletDashboard /></PrivyAuthProvider></main>;
}
