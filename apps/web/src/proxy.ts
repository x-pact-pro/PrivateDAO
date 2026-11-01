import { NextResponse, type NextRequest } from "next/server";

import { updateSupabaseSession } from "@/lib/supabase/middleware";

const legacyRedirects: Record<string, string> = {
  "/judge": "/whitepaper",
  "/judges": "/whitepaper",
  "/judge-ai": "/whitepaper",
  "/review": "/whitepaper",
  "/reviewer": "/whitepaper",
  "/awards": "/thesis",
  "/colosseum": "/thesis",
  "/frontier": "/products",
  "/submission": "/products",
  "/tracks": "/products",
  "/demo": "/payroll",
  "/dao-ui-template": "/govern",
  "/governance-template": "/govern",
  "/payment-template": "/treasury",
  "/runtime-template": "/whitepaper",
  "/wallet-template": "/wallet",
  "/whiteprint": "/whitepaper",
  "/rpc-services": "/whitepaper",
  "/api-status": "/whitepaper",
  "/diagnostics": "/whitepaper",
  "/command-center": "/treasury",
  "/network": "/whitepaper",
  "/android": "/products",
  "/benefit": "/products",
  "/versus": "/products",
  "/revenue": "/thesis",
  "/services": "/products",
  "/engage": "/contact",
  "/analytics": "/govern",
  "/custody": "/treasury",
  "/live": "/govern",
  "/execute": "/treasury",
  "/txline-settlement": "/treasury",
  "/services/umbra-private-payments": "/treasury",
  "/services/devnet-billing-rehearsal": "/contact",
  "/business-model": "/thesis",
  "/community": "/contact",
  "/compliance": "/whitepaper",
  "/enterprise": "/contact",
  "/futardio": "/products",
  "/inteligence": "/govern",
  "/intelignce": "/govern",
  "/intelligence": "/govern",
  "/inttelignce": "/govern",
  "/matrix": "/products",
  "/onboard": "/contact",
  "/payment-gate": "/contact",
  "/pilots": "/contact",
  "/pricing": "/contact",
  "/start": "/products",
  "/story": "/thesis",
  "/trust": "/whitepaper",
  "/try": "/payroll",
  "/value": "/thesis",
};

export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname.replace(/\/+$/, "") || "/";
  const destination = legacyRedirects[pathname];
  if (destination) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = destination;
    return NextResponse.redirect(redirectUrl, 308);
  }

  return updateSupabaseSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map)$).*)",
  ],
};
