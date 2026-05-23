import { NextResponse, type NextRequest } from "next/server";

import { updateSupabaseSession } from "@/lib/supabase/middleware";

const legacyRedirects: Record<string, string> = {
  "/judges": "/judge",
  "/demo": "/start",
  "/dao-ui-template": "/learn/lecture-2-governance-ui",
  "/governance-template": "/learn/lecture-2-governance-ui",
  "/payment-template": "/services/cloak-private-settlement",
  "/runtime-template": "/diagnostics",
  "/wallet-template": "/start",
  "/whiteprint": "/whitepaper",
  "/tracks": "/judge",
  "/services/confidential-payments": "/services/cloak-private-settlement",
  "/services/umbra-private-payments": "/services/umbra-confidential-payout",
  "/services/refhe-payroll-proof": "/payroll",
  "/services/devnet-billing-rehearsal": "/pricing",
  "/services/testnet-billing-rehearsal": "/pricing",
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
