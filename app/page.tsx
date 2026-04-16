import { asc } from "drizzle-orm";
import Link from "next/link";
import Image from "next/image";

import { AddOrganizationDialog } from "@/components/organizations/add-organization-dialog";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { db, organizations } from "@/db";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const rows = await db
    .select()
    .from(organizations)
    .orderBy(asc(organizations.name));

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-10">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Organizations</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Workspaces in Radar. Organizations are used to group workspaces.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <AddOrganizationDialog />
        </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>All organizations</CardTitle>
          <CardDescription>
            {rows.length === 0
              ? "No organizations yet. Use Add organization to create one."
              : `${rows.length} organization${rows.length === 1 ? "" : "s"}.`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? null : (
            <ul className="divide-y rounded-lg border">
              {rows.map((org) => (
                <li key={org.id}>
                  <Link
                    href={`/organizations/${org.slug}`}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-muted/60"
                  >
                    {org.logoUrl ? (
                      <Image
                        src={org.logoUrl}
                        alt={`${org.name} logo`}
                        width={32}
                        height={32}
                        className="size-8 rounded-md border object-cover"
                      />
                    ) : (
                      <div className="size-8 rounded-md border bg-muted" />
                    )}
                    <div className="flex min-w-0 flex-col">
                      <span className="font-medium leading-5">{org.name}</span>
                      <span className="text-muted-foreground font-mono text-xs">
                        {org.slug}
                      </span>
                    </div>
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
