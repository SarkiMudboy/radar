import { and, asc, eq, inArray } from "drizzle-orm";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { IssuesBoard, type IssueRow } from "@/components/issues/issues-board";
import { db, issues, organizations, projects, tasks, users } from "@/db";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const org = await db.query.organizations.findFirst({
    where: eq(organizations.slug, slug),
  });
  return {
    title: org ? `Issues · ${org.name} · Radar` : "Issues · Radar",
  };
}

export default async function OrganizationIssuesPage({ params }: PageProps) {
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
  const projectNameById = new Map(projectRows.map((p) => [p.id, p.name]));

  const userRows = await db
    .select({ id: users.id, name: users.name })
    .from(users)
    .where(eq(users.organizationId, org.id))
    .orderBy(asc(users.name));
  const userNameById = new Map(userRows.map((u) => [u.id, u.name]));

  const taskRows =
    projectIds.length === 0
      ? []
      : await db
          .select({ id: tasks.id, title: tasks.title, projectId: tasks.projectId })
          .from(tasks)
          .where(inArray(tasks.projectId, projectIds))
          .orderBy(asc(tasks.createdAt));

  const taskTitleById = new Map(taskRows.map((t) => [t.id, t.title]));

  const issueDbRows =
    projectIds.length === 0
      ? []
      : await db
          .select({
            id: issues.id,
            projectId: issues.projectId,
            name: issues.name,
            description: issues.description,
            affectedTaskId: issues.affectedTaskId,
            assigneeUserId: issues.assigneeUserId,
            severity: issues.severity,
            reporterUserId: issues.reporterUserId,
            status: issues.status,
            createdAt: issues.createdAt,
          })
          .from(issues)
          .where(inArray(issues.projectId, projectIds))
          .orderBy(asc(issues.createdAt));

  const issueRows: IssueRow[] = issueDbRows.map((r) => ({
    id: r.id,
    projectId: r.projectId,
    projectName: projectNameById.get(r.projectId) ?? "Project",
    name: r.name,
    description: r.description,
    affectedTaskId: r.affectedTaskId,
    affectedTaskTitle: r.affectedTaskId ? taskTitleById.get(r.affectedTaskId) ?? null : null,
    assigneeName: r.assigneeUserId ? userNameById.get(r.assigneeUserId) ?? null : null,
    severity: r.severity as IssueRow["severity"],
    reporterName: r.reporterUserId ? userNameById.get(r.reporterUserId) ?? null : null,
    status: r.status as IssueRow["status"],
    createdAt: r.createdAt,
  }));

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10">
      <Link href={`/organizations/${org.slug}/qa`} className="text-muted-foreground text-sm hover:underline">
        ← QA
      </Link>

      <header className="mt-6">
        <h1 className="text-2xl font-semibold tracking-tight">Issues</h1>
        <p className="text-muted-foreground mt-1 text-sm">{org.name}</p>
      </header>

      <div className="mt-8">
        <IssuesBoard
          organizationSlug={org.slug}
          issues={issueRows}
          onCreateIssueClick={() => {
            // Org-level create can be added later; for now use per-project create.
          }}
        />
      </div>
    </div>
  );
}

