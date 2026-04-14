import { asc } from "drizzle-orm";
import Link from "next/link";

import { AddOrganizationDialog } from "@/components/organizations/add-organization-dialog";
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
          <p className="text-muted-foreground mt-1 text-sm mt-7">
            Workspaces in Radar. Organizations are used to group workspaces.
          </p>
        </div>
        <AddOrganizationDialog />
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
                    className="flex flex-col gap-0.5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between hover:bg-muted/60"
                  >
                    <span className="font-medium">{org.name}</span>
                    <span className="text-muted-foreground font-mono text-xs">
                      {org.slug}
                    </span>
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
