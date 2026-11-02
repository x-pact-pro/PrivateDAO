"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { type WalletName, WalletReadyState } from "@solana/wallet-adapter-base";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { Check, ChevronDown, Copy, ExternalLink, LogOut, QrCode, ShieldCheck, Wallet } from "lucide-react";

import { type ButtonProps, buttonVariants } from "@/components/ui/button";
import { SOLANA_NETWORK_LABEL } from "@/lib/solana-network";
import { cn } from "@/lib/utils";

type WalletConnectButtonProps = {
  className?: string;
  connectLabel?: string;
  connectedLabelPrefix?: string;
} & Pick<ButtonProps, "size" | "variant">;

export function WalletConnectButton({
  className,
  connectLabel = "Connect Wallet",
  connectedLabelPrefix,
  size = "sm",
  variant = "default",
}: WalletConnectButtonProps) {
  const {
    wallets,
    wallet,
    publicKey,
    connected,
    connecting,
    disconnecting,
    select,
    connect,
    disconnect,
  } = useWallet();
  const { setVisible: setWalletModalVisible } = useWalletModal();
  const [isMounted, setIsMounted] = useState(false);
  const [isWalletPickerOpen, setIsWalletPickerOpen] = useState(false);
  const [isActionsOpen, setIsActionsOpen] = useState(false);
  const [selectedWalletName, setSelectedWalletName] = useState<WalletName | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [sessionUrl, setSessionUrl] = useState("");
  const [sessionOrigin, setSessionOrigin] = useState("");
  const [isMobileViewport, setIsMobileViewport] = useState(false);

  useEffect(() => {
    window.setTimeout(() => {
      setIsMounted(true);
      setSessionUrl(window.location.href);
      setSessionOrigin(window.location.origin);
      setIsMobileViewport(window.matchMedia("(max-width: 768px)").matches);
    }, 0);
  }, []);

  useEffect(() => {
    if (!isWalletPickerOpen) return;

    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsWalletPickerOpen(false);
      }
    };

    window.addEventListener("keydown", onEscape);
    return () => window.removeEventListener("keydown", onEscape);
  }, [isWalletPickerOpen]);

  useEffect(() => {
    if (!selectedWalletName || !wallet || wallet.adapter.name !== selectedWalletName || connected || connecting) {
      return;
    }

    let isCancelled = false;
    void connect()
      .then(() => {
        if (!isCancelled) {
          setFeedback(null);
          setSelectedWalletName(null);
        }
      })
      .catch((error) => {
        if (!isCancelled) {
          setFeedback(error instanceof Error ? error.message : "Wallet connection was interrupted.");
          setSelectedWalletName(null);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [connect, connected, connecting, selectedWalletName, wallet]);

  const label = useMemo(() => {
    if (!isMounted) return connectLabel;
    if (connecting) return "Connecting...";
    if (disconnecting) return "Disconnecting...";
    if (connected && publicKey) {
      const address = publicKey.toBase58();
      if (connectedLabelPrefix) {
        return `${connectedLabelPrefix} · ${address.slice(0, 4)}…${address.slice(-4)}`;
      }
      return `${wallet?.adapter.name ?? "Wallet"} · ${address.slice(0, 4)}…${address.slice(-4)}`;
    }
    return connectLabel;
  }, [connectLabel, connected, connectedLabelPrefix, connecting, disconnecting, isMounted, publicKey, wallet]);

  const availableWallets = useMemo(() => wallets.filter((entry) => entry.readyState !== WalletReadyState.Unsupported), [wallets]);
  const detectedWallets = useMemo(
    () => availableWallets.filter((entry) => entry.readyState !== WalletReadyState.NotDetected),
    [availableWallets],
  );
  const installableWallets = useMemo(
    () => availableWallets.filter((entry) => entry.readyState === WalletReadyState.NotDetected),
    [availableWallets],
  );

  const walletInstallLinks = useMemo<Record<string, string>>(
    () => ({
      Phantom: "https://phantom.app/download",
      Solflare: "https://solflare.com/download",
      Backpack: "https://backpack.app/download",
      Glow: "https://glow.app/download",
    }),
    [],
  );

  const mobileDeepLinks = useMemo(
    () => ({
      phantom: sessionUrl
        ? `https://phantom.app/ul/browse/${encodeURIComponent(sessionUrl)}${sessionOrigin ? `?ref=${encodeURIComponent(sessionOrigin)}` : ""}`
        : "https://phantom.app/",
      solflare: sessionUrl
        ? `https://solflare.com/ul/v1/browse/${encodeURIComponent(sessionUrl)}`
        : "https://solflare.com/",
    }),
    [sessionOrigin, sessionUrl],
  );

  const connectedAddress = publicKey?.toBase58() ?? null;
  const connectedAccountLabel = connectedAddress ? `${connectedAddress.slice(0, 4)}…${connectedAddress.slice(-4)}` : "No wallet connected";
  const connectedWalletName = wallet?.adapter.name ?? "No wallet selected";

  function describeReadyState(state: WalletReadyState) {
    switch (state) {
      case WalletReadyState.Installed:
        return "Installed";
      case WalletReadyState.Loadable:
        return "Loadable in browser";
      case WalletReadyState.NotDetected:
        return "Extension not detected";
      case WalletReadyState.Unsupported:
        return "Unsupported in this browser";
      default:
        return "Available";
    }
  }

  function getWalletInstallUrl(name: string) {
    return walletInstallLinks[name] ?? "https://solana.com/ecosystem?categories=wallet";
  }

  async function handleWalletSelection(walletName: WalletName) {
    setFeedback(null);
    setIsWalletPickerOpen(false);
    setIsActionsOpen(false);

    if (wallet?.adapter.name === walletName) {
      try {
        await connect();
      } catch (error) {
        setFeedback(error instanceof Error ? error.message : "Wallet connection failed.");
      }
      return;
    }

    setSelectedWalletName(walletName);
    select(walletName);
  }

  async function handleCopyAddress() {
    if (!publicKey) {
      return;
    }
    try {
      await navigator.clipboard.writeText(publicKey.toBase58());
      setFeedback("Wallet address copied.");
      setIsActionsOpen(false);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Unable to copy the wallet address.");
    }
  }

  async function handleDisconnect() {
    try {
      await disconnect();
      setFeedback("Wallet disconnected.");
      setIsActionsOpen(false);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Wallet disconnect failed.");
    }
  }

  return (
    <div className="wallet-adapter-shell relative inline-flex flex-col">
      <button
        type="button"
        data-wallet-connect-trigger="true"
        className={cn(
          "wallet-adapter-button wallet-adapter-button-trigger",
          buttonVariants({ size, variant }),
          className,
        )}
        onClick={() => {
          setFeedback(null);
          if (connected) {
            setIsActionsOpen((current) => !current);
            return;
          }
          if (!isMounted) {
            return;
          }
          setIsActionsOpen(false);
          setIsWalletPickerOpen(true);
        }}
      >
        <Wallet className="h-4 w-4" />
        {label}
        <ChevronDown className="h-4 w-4 opacity-80" />
      </button>

      {isActionsOpen && connected ? (
        <div className="absolute z-[70] mt-2 min-w-[220px] rounded-[20px] border border-white/10 bg-[#07111d] p-2 shadow-2xl">
          <div className="mb-2 rounded-2xl border border-white/8 bg-black/20 px-3 py-3 text-xs leading-6 text-white/66">
            <div>
              Wallet: <span className="text-white">{connectedWalletName}</span>
            </div>
            <div>
              Account: <span className="text-white">{connectedAccountLabel}</span>
            </div>
            <div>
              Network: <span className="text-white">Solana {SOLANA_NETWORK_LABEL}</span>
            </div>
          </div>
          <button
            type="button"
            className="flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-left text-sm text-white/78 transition hover:bg-white/6 hover:text-white"
            onClick={() => setIsWalletPickerOpen(true)}
          >
            <Wallet className="h-4 w-4" />
            Change wallet
          </button>
          <button
            type="button"
            className="flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-left text-sm text-white/78 transition hover:bg-white/6 hover:text-white"
            onClick={() => void handleCopyAddress()}
          >
            <Copy className="h-4 w-4" />
            Copy address
          </button>
          <button
            type="button"
            className="flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-left text-sm text-rose-200/82 transition hover:bg-rose-400/10 hover:text-white"
            onClick={() => void handleDisconnect()}
          >
            <LogOut className="h-4 w-4" />
            Disconnect
          </button>
        </div>
      ) : null}

      {isWalletPickerOpen ? (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/72 px-4 backdrop-blur-md"
          onClick={() => setIsWalletPickerOpen(false)}
        >
          <div
            className="w-full max-w-xl rounded-[32px] border border-white/10 bg-[#060d18] p-6 shadow-[0_32px_120px_rgba(0,0,0,0.55)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-[11px] uppercase tracking-[0.24em] text-white/44">Wallet-first connect</div>
                <h3 className="mt-3 text-2xl font-semibold text-white">Choose a supported wallet</h3>
                <p className="mt-3 text-sm leading-7 text-white/62">
                  Wallets are auto-detected in this browser. Select any detected wallet, open the full Solana wallet modal, or open this page inside a mobile wallet. The flow is always review first, sign second, verify third.
                </p>
              </div>
              <button
                type="button"
                className="rounded-full border border-white/10 px-3 py-1 text-sm text-white/70 transition hover:border-white/20 hover:text-white"
                onClick={() => setIsWalletPickerOpen(false)}
              >
                Close
              </button>
            </div>
            <div className="mt-6">
              <div className="rounded-[20px] border border-white/10 bg-black/20 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="text-[11px] uppercase tracking-[0.2em] text-white/44">Wallet-orchestrated flow</div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300/18 bg-emerald-300/10 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-emerald-100">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Wallet signing ready
                  </div>
                </div>
                <div className="mt-3 grid gap-2 text-sm text-white/72 sm:grid-cols-2">
                  <div>1. Pick a wallet or open the page on mobile.</div>
                  <div>2. Confirm the wallet is on Solana {SOLANA_NETWORK_LABEL}.</div>
                  <div>3. Review DAO action, privacy policy, and proof route.</div>
                  <div>4. Sign, return, and verify the receipt from the app.</div>
                </div>
                <div className="mt-3 grid gap-2 text-xs text-white/60 sm:grid-cols-2">
                  <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
                    Desktop: detected extension wallets appear first with direct browser connect.
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
                    Mobile: use a wallet deep link or scan the page QR, then return to the app flow.
                  </div>
                  <div className="rounded-xl border border-emerald-300/15 bg-emerald-300/[0.07] px-3 py-2">
                    PrivateDAO never asks for a seed phrase or private key.
                  </div>
                  <div className="rounded-xl border border-cyan-300/15 bg-cyan-300/[0.07] px-3 py-2">
                    Wallet warnings should show a normal connection/sign request for this domain and Solana {SOLANA_NETWORK_LABEL}.
                  </div>
                </div>
                <div className="mt-3 grid gap-2 text-xs text-white/60 sm:grid-cols-3">
                  <div className="rounded-xl border border-emerald-300/15 bg-emerald-300/[0.08] px-3 py-2">
                    Active network: <span className="text-white">Solana {SOLANA_NETWORK_LABEL}</span>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
                    Device mode: <span className="text-white">{isMobileViewport ? "Mobile browser" : "Desktop browser"}</span>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
                    Proof route: <span className="text-white">/proof</span>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    className={cn(buttonVariants({ size: "sm", variant: "secondary" }))}
                    onClick={() => {
                      setIsWalletPickerOpen(false);
                      setWalletModalVisible(true);
                    }}
                  >
                    Open all wallet options
                  </button>
                  <a
                    href="/start"
                    className={cn(buttonVariants({ size: "sm", variant: "outline" }))}
                  >
                    Open start path
                  </a>
                </div>
              </div>
              <div className="mt-4 text-[11px] uppercase tracking-[0.2em] text-white/44">Available on this device</div>
            </div>
            <div className="mt-3 grid gap-3">
              {(detectedWallets.length > 0 ? detectedWallets : availableWallets).map((entry) => {
                const isCurrent = wallet?.adapter.name === entry.adapter.name;
                return (
                  <button
                    key={entry.adapter.name}
                    type="button"
                    data-wallet-option={entry.adapter.name}
                    className="flex items-center justify-between gap-3 rounded-[24px] border border-white/10 bg-white/[0.04] px-4 py-4 text-left transition hover:border-cyan-300/25 hover:bg-white/[0.07]"
                    onClick={() => void handleWalletSelection(entry.adapter.name)}
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      {entry.adapter.icon ? (
                        <Image
                          src={entry.adapter.icon}
                          alt={`${entry.adapter.name} icon`}
                          width={40}
                          height={40}
                          unoptimized
                          className="h-10 w-10 rounded-xl border border-white/10 bg-black/20 object-contain p-1"
                        />
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-black/20 text-white/60">
                          <Wallet className="h-4 w-4" />
                        </div>
                      )}
                      <div className="text-base font-medium text-white">{entry.adapter.name}</div>
                      <div className="mt-1 text-xs uppercase tracking-[0.2em] text-white/42">
                        {describeReadyState(entry.readyState)}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2 text-sm text-white/64">
                      {isCurrent ? <Check className="h-4 w-4 text-emerald-300" /> : null}
                      {isCurrent ? "Selected" : "Use wallet"}
                    </div>
                  </button>
                );
              })}
            </div>
            {installableWallets.length > 0 ? (
              <>
                <div className="mt-6 text-[11px] uppercase tracking-[0.2em] text-white/44">More supported wallets</div>
                <div className="mt-3 grid gap-3">
                  {installableWallets.map((entry) => (
                    <a
                      key={`install-${entry.adapter.name}`}
                      href={getWalletInstallUrl(entry.adapter.name)}
                      data-wallet-option={entry.adapter.name}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-between rounded-[24px] border border-white/10 bg-black/20 px-4 py-4 text-left transition hover:border-cyan-300/25 hover:bg-white/[0.07]"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        {entry.adapter.icon ? (
                          <Image
                            src={entry.adapter.icon}
                            alt={`${entry.adapter.name} icon`}
                            width={40}
                            height={40}
                            unoptimized
                            className="h-10 w-10 rounded-xl border border-white/10 bg-black/20 object-contain p-1"
                          />
                        ) : (
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-black/20 text-white/60">
                            <Wallet className="h-4 w-4" />
                          </div>
                        )}
                        <div>
                          <div className="text-base font-medium text-white">{entry.adapter.name}</div>
                          <div className="mt-1 text-xs uppercase tracking-[0.2em] text-white/42">Install or open</div>
                        </div>
                      </div>
                      <div className="inline-flex items-center gap-2 text-sm text-cyan-100">
                        Open
                        <ExternalLink className="h-4 w-4" />
                      </div>
                    </a>
                  ))}
                </div>
              </>
            ) : null}

            <div className="mt-6 rounded-[24px] border border-cyan-300/16 bg-cyan-300/[0.08] p-4">
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-cyan-100/82">
                <QrCode className="h-4 w-4" />
                Mobile QR connect
              </div>
              <div className="mt-2 text-sm leading-7 text-white/72">
                Scan or open this page inside a mobile wallet browser, then connect on Solana {SOLANA_NETWORK_LABEL} and sign the same review-first flow.
              </div>
              {sessionUrl ? (
                <div className="mt-3 flex flex-wrap items-center gap-4">
                  <Image
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(sessionUrl)}`}
                    alt="Session QR code"
                    width={140}
                    height={140}
                    unoptimized
                    className="h-[140px] w-[140px] rounded-xl border border-white/12 bg-white p-2"
                  />
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs text-white/68 break-all">
                      {sessionUrl}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        className={cn(buttonVariants({ size: "sm", variant: "outline" }))}
                        onClick={() => {
                          void navigator.clipboard.writeText(sessionUrl);
                          setFeedback("Session link copied.");
                        }}
                      >
                        Copy session link
                      </button>
                      <a
                        href={mobileDeepLinks.phantom}
                        target="_blank"
                        rel="noreferrer"
                        className={cn(buttonVariants({ size: "sm", variant: "outline" }))}
                      >
                        Open Phantom
                      </a>
                      <a
                        href={mobileDeepLinks.solflare}
                        target="_blank"
                        rel="noreferrer"
                        className={cn(buttonVariants({ size: "sm", variant: "outline" }))}
                      >
                        Open Solflare
                      </a>
                      <button
                        type="button"
                        className={cn(buttonVariants({ size: "sm", variant: "outline" }))}
                        onClick={() => {
                          setIsWalletPickerOpen(false);
                          setWalletModalVisible(true);
                        }}
                      >
                        More wallets
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
            <div className="mt-5 rounded-[24px] border border-emerald-300/15 bg-emerald-300/[0.08] p-4 text-sm leading-7 text-white/72">
              Solflare is the recommended first path for guided wallet execution. Phantom, Glow, and Backpack are
              available as real adapters, and wallet-standard support lets compatible wallets such as Jupiter surface
              in the same production wallet layer when installed.
            </div>
            <div className="mt-4 rounded-[24px] border border-white/10 bg-white/[0.03] p-4 text-sm leading-7 text-white/68">
              After connect, the product should feel simple: review the operation, approve the wallet request, then verify the result from the same surface without hunting for explorer links manually.
            </div>
          </div>
        </div>
      ) : null}

      {feedback ? (
        <div className="mt-2 max-w-sm rounded-2xl border border-white/8 bg-black/30 px-4 py-3 text-xs leading-6 text-white/68">
          {feedback}
        </div>
      ) : null}
    </div>
  );
}
