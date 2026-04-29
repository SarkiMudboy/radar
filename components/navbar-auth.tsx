"use client";

import type { Session } from "next-auth";
import { signOut } from "next-auth/react";

import { Button } from "@/components/ui/button";

export function NavbarAuth({ session }: { session: Session | null }) {
  if (!session?.user) return null;

  return (
    <div className="hidden items-center gap-1 sm:flex">
      <span className="text-muted-foreground max-w-[12rem] truncate text-xs">
        {session.user.email ?? session.user.name}
      </span>
      <Button
        type="button"
        variant="ghost"
        size="xs"
        className="text-muted-foreground h-7 px-2"
        onClick={() => void signOut({ callbackUrl: "/" })}
      >
        Sign out
      </Button>
    </div>
  );
}
