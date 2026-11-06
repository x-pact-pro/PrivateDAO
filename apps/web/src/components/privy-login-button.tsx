"use client";

import { LogIn, LogOut } from "lucide-react";
import { usePrivy } from "@privy-io/react-auth";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID?.trim();

export function PrivyLoginButton({ className }: { className?: string }) {
  if (!appId) return null;
  return <PrivyLoginButtonInner className={className} />;
}

function PrivyLoginButtonInner({ className }: { className?: string }) {
  const { ready, authenticated, login, logout } = usePrivy();
  if (!ready) return null;
  return authenticated ? (
    <button type="button" onClick={() => void logout()} className={cn(buttonVariants({ variant: "secondary" }), "gap-2", className)}>
      <LogOut className="h-4 w-4" />
      Sign out
    </button>
  ) : (
    <button type="button" onClick={login} className={cn(buttonVariants({ variant: "secondary" }), "gap-2", className)}>
      <LogIn className="h-4 w-4" />
      Sign in
    </button>
  );
}
