import { and, asc, count, eq, inArray, isNull } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { db, organizations, projects, tasks } from "@/db";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export default async function OrganizationQaPage({ params }: PageProps) {
  const { slug } = await params;

  const org = await db.query.organizations.findFirst({
    where: eq(organizations.slug, slug),
    columns: { id: true, name: true, slug: true },
  });
  if (!org) notFound();

  const projectRows = await db
    .select({ id: projects.id, name: projects.name })
    .from(projects)
    .where(eq(projects.organizationId, org.id))
    .orderBy(asc(projects.name));

  const projectIds = projectRows.map((p) => p.id);

  const counts =
    projectIds.length === 0
      ? { completed: 0, pending: 0, toTest: 0 }
      : (
          await db
            .select({
              completed: count(tasks.id).mapWith(Number),
            })
            .from(tasks)
            .where(
              and(
                inArray(tasks.projectId, projectIds),
                isNull(tasks.archivedAt),
                inArray(tasks.status, ["completed", "closed"]),
              ),
            )
        )[0] ?? { completed: 0 };

  const pendingCount =
    projectIds.length === 0
      ? 0
      : (
          await db
            .select({ n: count(tasks.id).mapWith(Number) })
            .from(tasks)
            .where(
              and(
                inArray(tasks.projectId, projectIds),
                isNull(tasks.archivedAt),
                inArray(tasks.status, ["not_started", "in_progress"]),
              ),
            )
        )[0]?.n ?? 0;

  const toTestCount =
    projectIds.length === 0
      ? 0
      : (
          await db
            .select({ n: count(tasks.id).mapWith(Number) })
            .from(tasks)
            .where(
              and(
                inArray(tasks.projectId, projectIds),
                isNull(tasks.archivedAt),
                eq(tasks.status, "completed"),
              ),
            )
        )[0]?.n ?? 0;

  const readyRows =
    projectIds.length === 0
      ? []
      : await db
          .select({
            id: tasks.id,
            title: tasks.title,
            projectId: tasks.projectId,
            projectName: projects.name,
            updatedAt: tasks.updatedAt,
          })
          .from(tasks)
          .innerJoin(projects, eq(tasks.projectId, projects.id))
          .where(
            and(
              inArray(tasks.projectId, projectIds),
              isNull(tasks.archivedAt),
              eq(tasks.status, "completed"),
              isNull(tasks.parentTaskId),
            ),
          )
          .orderBy(asc(projects.name), asc(tasks.updatedAt));

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10">
      <Link href="/qa" className="text-muted-foreground text-sm hover:underline">
        ← QA
      </Link>

      <header className="mt-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">QA · {org.name}</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Stats and ready-to-test tasks across projects.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            render={<Link href={`/organizations/${org.slug}/issues`} />}
          >
            Issues
          </Button>
        </div>
      </header>

      <section className="mt-8 grid gap-3 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Completed tasks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold tabular-nums">{counts.completed}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Pending tasks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold tabular-nums">{pendingCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Tasks to be tested</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold tabular-nums">{toTestCount}</div>
          </CardContent>
        </Card>
      </section>

      <section className="mt-8 overflow-hidden rounded-lg border border-border bg-card/30 ring-1 ring-foreground/6">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-muted/15 px-3 py-2.5">
          <div className="min-w-0">
            <h2 className="truncate text-sm font-semibold tracking-tight">
              Ready to be tested
            </h2>
            <p className="text-muted-foreground mt-0.5 text-xs tabular-nums">
              {readyRows.length} task{readyRows.length === 1 ? "" : "s"}
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/10">
                <th className="text-muted-foreground w-[40%] px-3 py-2 text-left font-medium">
                  Task
                </th>
                <th className="text-muted-foreground w-[30%] px-3 py-2 text-left font-medium">
                  Project
                </th>
                <th className="text-muted-foreground w-[30%] px-3 py-2 text-left font-medium">
                  Updated
                </th>
              </tr>
            </thead>
            <tbody>
              {readyRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={3}
                    className="text-muted-foreground px-3 py-8 text-center text-sm"
                  >
                    No completed tasks yet.
                  </td>
                </tr>
              ) : (
                readyRows.map((r) => (
                  <tr
                    key={r.id}
                    className="border-b border-border/80 transition-colors hover:bg-muted/20"
                  >
                    <td className="px-3 py-2.5 align-middle">
                      <Link
                        href={`/organizations/${org.slug}/projects/${r.projectId}/tasks/${r.id}`}
                        className="truncate font-medium text-foreground hover:underline"
                      >
                        {r.title}
                      </Link>
                    </td>
                    <td className="text-muted-foreground px-3 py-2.5 align-middle text-xs">
                      <Link
                        href={`/organizations/${org.slug}/projects/${r.projectId}`}
                        className="hover:underline"
                      >
                        {r.projectName}
                      </Link>
                    </td>
                    <td className="text-muted-foreground whitespace-nowrap px-3 py-2.5 align-middle text-xs tabular-nums">
                      {r.updatedAt.toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

