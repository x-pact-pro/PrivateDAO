import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Geist_Mono, Space_Grotesk } from "next/font/google";
import Script from "next/script";
import "@solana/wallet-adapter-react-ui/styles.css";
import "./globals.css";
import { AppShellProviders } from "@/components/app-shell-providers";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { SiteActivityBeacon } from "@/components/site-activity-beacon";
import {
  buildOrganizationJsonLd,
  buildSoftwareApplicationJsonLd,
  buildWebSiteJsonLd,
  defaultOgImage,
  siteDescription,
  siteKeywords,
  siteName,
  siteTitle,
  siteUrl,
} from "@/lib/site-brand";
import { supportedLocales } from "@/lib/i18n";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: siteTitle,
    template: "%s",
  },
  description: siteDescription,
  keywords: siteKeywords,
  metadataBase: new URL(`${siteUrl}/`),
  alternates: {
    canonical: "/",
  },
  applicationName: siteName,
  category: "technology",
  openGraph: {
    title: siteTitle,
    description: siteDescription,
    siteName,
    type: "website",
    url: "/",
    images: [
      {
        url: defaultOgImage,
        width: 1200,
        height: 630,
        alt: siteName,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: siteTitle,
    description: siteDescription,
    images: [defaultOgImage],
  },
  other: {
    "content-language": supportedLocales.map((locale) => locale.code).join(", "),
    "ai-crawl": "allowed",
    "llms-txt": "/llms.txt",
    "ai-manifest": "/ai.json",
    "evidence-manifest": "/evidence.json",
    "ai-guide": "/judge-ai",
    "reviewer-entry": "/govern#live-dao",
    "wallet-network": "Solana Testnet",
    "product-surface":
      "PrivateDAO lets organizations keep votes, payroll, treasury intent, and private rooms confidential while producing verifiable Solana Testnet receipts.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${spaceGrotesk.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-[#030510] text-white">
        <AppShellProviders>
            <Script
              id="privatedao-domain-redirect"
              strategy="beforeInteractive"
              dangerouslySetInnerHTML={{
                __html: `(function(){var target='https://privatedao.org';var protocol=window.location.protocol;var host=window.location.hostname;var path=window.location.pathname;var search=window.location.search||'';var hash=window.location.hash||'';if(protocol==='http:'&&host==='privatedao.org'){window.location.replace(target+path+search+hash);return;}if(host==='www.privatedao.org'){window.location.replace(target+path+search+hash);return;}if(host==='x-pact.github.io'&&path.indexOf('/PrivateDAO')===0){var nextPath=path.replace(/^\\/PrivateDAO/,'')||'/';window.location.replace(target+nextPath+search+hash);}})();`,
              }}
            />
            <Script
              id="privatedao-next-asset-recovery"
              strategy="beforeInteractive"
              dangerouslySetInnerHTML={{
                __html: `(function(){var PARAM='__pd_reload';var KEY='privatedao-next-asset-recovery:'+(window.location.pathname||'/');function nextAsset(url){return typeof url==='string'&&url.indexOf('/_next/static/')!==-1;}function once(){try{if(window.sessionStorage.getItem(KEY)==='1'){return false;}window.sessionStorage.setItem(KEY,'1');return true;}catch(_){return true;}}function hardReload(){if(!once()){return;}var url=new URL(window.location.href);url.searchParams.set(PARAM,String(Date.now()));window.location.replace(url.toString());}function maybeRecover(value){var message='';if(typeof value==='string'){message=value;}else if(value&&typeof value.message==='string'){message=value.message;}else if(value&&typeof value.reason==='string'){message=value.reason;}if(message.indexOf('ChunkLoadError')!==-1||message.indexOf('Loading CSS chunk')!==-1||message.indexOf('Failed to fetch dynamically imported module')!==-1){hardReload();}}window.addEventListener('error',function(event){var target=event.target;if(target&&nextAsset(target.src||target.href)){hardReload();}},true);window.addEventListener('unhandledrejection',function(event){maybeRecover(event.reason);});if(window.location.search.indexOf(PARAM+'=')!==-1){window.addEventListener('load',function(){var url=new URL(window.location.href);url.searchParams.delete(PARAM);window.history.replaceState(window.history.state,'',url.toString());},{once:true});}})();`,
              }}
            />
            <Script
              id="privatedao-organization-jsonld"
              type="application/ld+json"
              strategy="afterInteractive"
              dangerouslySetInnerHTML={{ __html: JSON.stringify(buildOrganizationJsonLd()) }}
            />
            <Script
              id="privatedao-website-jsonld"
              type="application/ld+json"
              strategy="afterInteractive"
              dangerouslySetInnerHTML={{ __html: JSON.stringify(buildWebSiteJsonLd()) }}
            />
            <Script
              id="privatedao-software-jsonld"
              type="application/ld+json"
              strategy="afterInteractive"
              dangerouslySetInnerHTML={{ __html: JSON.stringify(buildSoftwareApplicationJsonLd()) }}
            />
            <div className="relative flex min-h-full flex-col overflow-x-hidden">
              <div className="pointer-events-none absolute inset-x-0 top-0 h-[420px] bg-[radial-gradient(circle_at_top,rgba(153,69,255,0.28),transparent_44%),radial-gradient(circle_at_20%_20%,rgba(20,241,149,0.2),transparent_26%),radial-gradient(circle_at_80%_0%,rgba(0,194,255,0.18),transparent_28%)]" />
              <SiteActivityBeacon />
              <SiteHeader />
              <div className="relative z-10 flex-1">{children}</div>
              <SiteFooter />
            </div>
        </AppShellProviders>
      </body>
    </html>
  );
}
