import { asc } from "drizzle-orm";
import Link from "next/link";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { db, organizations } from "@/db";

export const dynamic = "force-dynamic";

export default async function QaLandingPage() {
  const rows = await db
    .select({ id: organizations.id, name: organizations.name, slug: organizations.slug })
    .from(organizations)
    .orderBy(asc(organizations.name));

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-10">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">QA dashboard</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Select an organization to review ready-to-test work and manage issues.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Organizations</CardTitle>
          <CardDescription>
            {rows.length === 0
              ? "No organizations yet."
              : `${rows.length} organization${rows.length === 1 ? "" : "s"}.`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? null : (
            <ul className="divide-y rounded-lg border">
              {rows.map((org) => (
                <li key={org.id}>
                  <Link
                    href={`/organizations/${org.slug}/qa`}
                    className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-muted/60"
                  >
                    <div className="min-w-0">
                      <div className="truncate font-medium leading-5">{org.name}</div>
                      <div className="text-muted-foreground font-mono text-xs">
                        {org.slug}
                      </div>
                    </div>
                    <span className="text-muted-foreground text-sm">Open →</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

