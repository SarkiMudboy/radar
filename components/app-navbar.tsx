import Link from "next/link";
import type { Session } from "next-auth";

import { NavbarAuth } from "@/components/navbar-auth";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";

const navLinkClass = cn(
  "text-sm text-muted-foreground transition-colors hover:text-foreground",
);

export function AppNavbar({ session }: { session: Session | null }) {
  return (
    <header className="sticky top-0 z-40 flex items-center justify-between gap-3 border-b border-border bg-background/85 px-4 py-2.5 backdrop-blur-sm supports-backdrop-filter:bg-background/70">
      <div className="flex min-w-0 flex-1 items-center gap-6">
        <Link
          href="/"
          className="shrink-0 text-sm font-semibold tracking-tight text-foreground hover:underline"
        >
          Radar
        </Link>
        <nav className="flex items-center gap-5" aria-label="Main">
          <Link href="/integrations" className={navLinkClass}>
            Integrations
          </Link>
        </nav>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <NavbarAuth session={session} />
        <ThemeToggle />
      </div>
    </header>
  );
}
