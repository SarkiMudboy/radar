import { and, asc, eq, isNull } from "drizzle-orm";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ProjectIssuesPageClient } from "@/components/issues/project-issues-page-client";
import { type IssueRow } from "@/components/issues/issues-board";
import { db, issues, organizations, projects, tasks, users } from "@/db";
import { getAppSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ slug: string; projectId: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug, projectId } = await params;
  const org = await db.query.organizations.findFirst({
    where: eq(organizations.slug, slug),
  });
  if (!org) return { title: "Issues · Radar" };

  const project = await db.query.projects.findFirst({
    where: and(eq(projects.id, projectId), eq(projects.organizationId, org.id)),
  });

  return {
    title: project
      ? `Issues · ${project.name} · ${org.name} · Radar`
      : "Issues · Radar",
  };
}

export default async function ProjectIssuesPage({ params }: PageProps) {
  const { slug, projectId } = await params;

  const org = await db.query.organizations.findFirst({
    where: eq(organizations.slug, slug),
    columns: { id: true, name: true, slug: true },
  });
  if (!org) notFound();

  const project = await db.query.projects.findFirst({
    where: and(eq(projects.id, projectId), eq(projects.organizationId, org.id)),
    columns: { id: true, name: true },
  });
  if (!project) notFound();

  const userRows = await db
    .select({ id: users.id, name: users.name, email: users.email })
    .from(users)
    .where(eq(users.organizationId, org.id))
    .orderBy(asc(users.name));

  const taskRows = await db
    .select({ id: tasks.id, title: tasks.title })
    .from(tasks)
    .where(and(eq(tasks.projectId, project.id), isNull(tasks.archivedAt)))
    .orderBy(asc(tasks.createdAt));

  const issueDbRows = await db
    .select({
      id: issues.id,
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
    .where(eq(issues.projectId, project.id))
    .orderBy(asc(issues.createdAt));

  const taskTitleById = new Map(taskRows.map((t) => [t.id, t.title]));
  const userNameById = new Map(userRows.map((u) => [u.id, u.name]));

  const issueRows: IssueRow[] = issueDbRows.map((r) => ({
    id: r.id,
    projectId: project.id,
    projectName: project.name,
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

  const session = await getAppSession();
  const reporterUserId =
    session?.user?.email
      ? userRows.find((u) => u.email === session.user.email)?.id ?? null
      : null;

  const projectHref = `/organizations/${org.slug}/projects/${project.id}`;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10">
      <Link href={projectHref} className="text-muted-foreground text-sm hover:underline">
        ← {project.name}
      </Link>

      <header className="mt-6">
        <h1 className="text-2xl font-semibold tracking-tight">Issues</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          {project.name} · {org.name}
        </p>
      </header>

      <div className="mt-8">
        <ProjectIssuesPageClient
          organizationSlug={org.slug}
          projectId={project.id}
          issueRows={issueRows}
          taskOptions={taskRows}
          userOptions={userRows}
          reporterUserId={reporterUserId}
        />
      </div>
    </div>
  );
}

