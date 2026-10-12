"use client";

/* eslint-disable @next/next/no-img-element -- tiny third-party brand marks stay unoptimized to keep the ticker lightweight. */

const networks = [
  ["Solana", "https://solana.com/", "/assets/networks/solana.svg"],
  ["Ethereum", "https://ethereum.org/", "/assets/networks/ethereum.svg"],
  ["Arbitrum", "https://arbitrum.io/", "/assets/networks/arbitrum.ico"],
  ["Base", "https://www.base.org/", "/assets/networks/base.ico"],
  ["Tempo", "https://docs.tempo.xyz/", "/assets/networks/tempo.svg"],
  ["Zcash", "https://zcash.readthedocs.io/", "/assets/networks/zcash.svg"],
  ["Hyperliquid", "https://hyperliquid.gitbook.io/hyperliquid-docs/", "/assets/networks/hyperliquid.png"],
  ["Robinhood Chain", "https://docs.robinhood.com/chain/", "/assets/networks/robinhood.svg"],
  ["BNB Chain", "https://www.bnbchain.org/", "/assets/networks/bnb.svg"],
] as const;

function NetworkSet() {
  return (
    <div className="flex shrink-0 items-center gap-3 px-2">
      {networks.map(([name, href, logo]) => (
        <a
          key={name}
          href={href}
          target="_blank"
          rel="noreferrer"
          aria-label={name}
          title={name}
          className="inline-flex h-16 w-24 items-center justify-center rounded-[18px] border border-[#dce5f0] bg-white px-4 shadow-[0_4px_16px_rgba(16,35,63,0.04)] transition hover:-translate-y-0.5 hover:border-[#175cd3] hover:shadow-[0_8px_20px_rgba(23,92,211,0.12)]"
        >
          <img
            src={logo}
            alt=""
            aria-hidden="true"
            className="h-9 w-9 object-contain"
            loading="eager"
            decoding="async"
            onLoad={(event) => {
              if (event.currentTarget.naturalWidth === 0) {
                event.currentTarget.src = "/assets/brand/privatedao-avatar-128.png";
              }
            }}
            onError={(event) => {
              event.currentTarget.onerror = null;
              event.currentTarget.src = "/assets/brand/privatedao-avatar-128.png";
            }}
          />
        </a>
      ))}
    </div>
  );
}

export function NetworkMarquee() {
  return (
    <section aria-label="Supported networks" className="border-y border-[#dce5f0] bg-[#fbfcfe] py-6">
      <div className="mx-auto flex max-w-7xl items-center gap-4 overflow-hidden px-4 sm:px-6 lg:px-8">
        <div className="hidden shrink-0 text-[10px] font-bold uppercase tracking-[0.2em] text-[#7a8ba0] sm:block">
          Supported networks
        </div>
        <div className="network-marquee min-w-0 overflow-hidden">
          <div className="network-marquee-track">
            <NetworkSet />
            <NetworkSet />
          </div>
        </div>
      </div>
      <p className="mx-auto mt-2 max-w-7xl px-4 text-[11px] text-[#7a8ba0] sm:px-6 lg:px-8">
        Availability depends on the selected solution and deployment.
      </p>
    </section>
  );
}
