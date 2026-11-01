"use client";

import { type ReactNode, useEffect, useMemo, useState } from "react";
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { BackpackWalletAdapter } from "@solana/wallet-adapter-backpack";
import { GlowWalletAdapter } from "@solana/wallet-adapter-glow";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-phantom";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { SolflareWalletAdapter } from "@solana/wallet-adapter-solflare";
import { useStandardWalletAdapters } from "@solana/wallet-standard-wallet-adapter-react";

import {
  getSolanaRpcEndpoint,
  SOLANA_NETWORK,
} from "@/lib/solana-network";

type WalletProviderShellProps = {
  children: ReactNode;
};

export function WalletProviderShell({ children }: WalletProviderShellProps) {
  const endpoint = getSolanaRpcEndpoint();
  const network =
    SOLANA_NETWORK === "mainnet-beta"
      ? WalletAdapterNetwork.Mainnet
      : SOLANA_NETWORK === "devnet"
        ? WalletAdapterNetwork.Devnet
        : WalletAdapterNetwork.Testnet;
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    queueMicrotask(() => setIsMounted(true));
  }, []);

  const configuredWallets = useMemo(() => {
    if (!isMounted) {
      return [];
    }
    return [
      new SolflareWalletAdapter({ network }),
      new PhantomWalletAdapter(),
      new GlowWalletAdapter({ network }),
      new BackpackWalletAdapter(),
    ];
  }, [isMounted, network]);
  const standardWallets = useStandardWalletAdapters(configuredWallets);
  const wallets = useMemo(() => {
    const unique = new Map<string, (typeof standardWallets)[number]>();
    for (const entry of standardWallets) {
      const name = entry.adapter.name;
      if (!unique.has(name)) unique.set(name, entry);
    }
    return [...unique.values()];
  }, [standardWallets]);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect={isMounted}>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
