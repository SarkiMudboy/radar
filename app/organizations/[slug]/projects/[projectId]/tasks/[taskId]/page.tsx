import { and, asc, count, desc, eq, inArray, isNull } from "drizzle-orm";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { CreateBranchDialog } from "@/components/projects/create-branch-dialog";
import { DeleteTaskDialog } from "@/components/projects/delete-task-dialog";
import { EditTaskDialog, type EditableTask } from "@/components/projects/edit-task-dialog";
import { CreateTaskIssueButton } from "@/components/issues/create-task-issue-button";
import { MilestoneStatusBadge } from "@/components/milestones/milestone-status-badge";
import { TaskSeverityBadge } from "@/components/projects/task-severity-badge";
import { Button } from "@/components/ui/button";
import {
  db,
  milestones,
  organizations,
  projects,
  taskAssignees,
  taskBlockers,
  taskGithubBranches,
  tasks,
  users,
} from "@/db";
import { getAppSession } from "@/lib/auth";
import type { MilestoneStatus } from "@/lib/milestone-status";
import type { TaskSeverity } from "@/lib/task-severity";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ slug: string; projectId: string; taskId: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug, projectId, taskId } = await params;
  const org = await db.query.organizations.findFirst({
    where: eq(organizations.slug, slug),
  });
  if (!org) return { title: "Task · Radar" };

  const project = await db.query.projects.findFirst({
    where: and(eq(projects.id, projectId), eq(projects.organizationId, org.id)),
  });
  if (!project) return { title: "Task · Radar" };

  const task = await db.query.tasks.findFirst({
    where: and(eq(tasks.id, taskId), eq(tasks.projectId, project.id), isNull(tasks.archivedAt)),
    columns: { title: true },
  });

  return {
    title: task?.title
      ? `${task.title} · Tasks · ${project.name} · ${org.name} · Radar`
      : `Task · Tasks · ${project.name} · ${org.name} · Radar`,
  };
}

function formatDue(d: Date | null): string {
  if (!d) return "—";
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(d);
}

export default async function TaskDetailPage({ params }: PageProps) {
  const { slug, projectId, taskId } = await params;

  const org = await db.query.organizations.findFirst({
    where: eq(organizations.slug, slug),
  });
  if (!org) notFound();

  const project = await db.query.projects.findFirst({
    where: and(eq(projects.id, projectId), eq(projects.organizationId, org.id)),
  });
  if (!project) notFound();

  const taskRow = await db.query.tasks.findFirst({
    where: and(eq(tasks.id, taskId), eq(tasks.projectId, project.id), isNull(tasks.archivedAt)),
  });
  if (!taskRow) notFound();

  const orgUsersForTasks = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
    })
    .from(users)
    .where(eq(users.organizationId, org.id))
    .orderBy(asc(users.name));

  const session = await getAppSession();
  const reporterUserId =
    session?.user?.email
      ? orgUsersForTasks.find((u) => u.email === session.user.email)?.id ?? null
      : null;

  const assigneeRows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      profileImageUrl: users.profileImageUrl,
    })
    .from(taskAssignees)
    .innerJoin(users, eq(taskAssignees.userId, users.id))
    .where(eq(taskAssignees.taskId, taskRow.id))
    .orderBy(asc(users.name));

  const blockers = await db
    .select({ note: taskBlockers.note })
    .from(taskBlockers)
    .where(eq(taskBlockers.taskId, taskRow.id))
    .orderBy(asc(taskBlockers.createdAt));

  const subtaskCountRow = await db
    .select({ n: count() })
    .from(tasks)
    .where(
      and(
        eq(tasks.projectId, project.id),
        eq(tasks.parentTaskId, taskRow.id),
        isNull(tasks.archivedAt),
      ),
    );
  const subtaskCount = Number(subtaskCountRow[0]?.n ?? 0);

  const githubBranchRows = await db
    .select({
      id: taskGithubBranches.id,
      branchName: taskGithubBranches.branchName,
      branchUrl: taskGithubBranches.branchUrl,
      repoFullName: taskGithubBranches.repoFullName,
      baseBranch: taskGithubBranches.baseBranch,
      createdAt: taskGithubBranches.createdAt,
    })
    .from(taskGithubBranches)
    .where(eq(taskGithubBranches.taskId, taskRow.id))
    .orderBy(desc(taskGithubBranches.createdAt));

  const topTaskRows = await db
    .select({ id: tasks.id, title: tasks.title })
    .from(tasks)
    .where(
      and(
        eq(tasks.projectId, project.id),
        isNull(tasks.parentTaskId),
        isNull(tasks.archivedAt),
      ),
    )
    .orderBy(asc(tasks.createdAt));

  const milestoneOptions = await db
    .select({ id: milestones.id, name: milestones.name })
    .from(milestones)
    .where(
      and(
        eq(milestones.projectId, project.id),
        isNull(milestones.archivedAt),
      ),
    )
    .orderBy(asc(milestones.name));

  const linkedMilestone =
    taskRow.milestoneId == null
      ? null
      : await db.query.milestones.findFirst({
          where: and(
            eq(milestones.id, taskRow.milestoneId),
            eq(milestones.projectId, project.id),
          ),
          columns: { id: true, name: true, archivedAt: true },
        });

  const editable: EditableTask = {
    id: taskRow.id,
    title: taskRow.title,
    description: taskRow.description ?? null,
    status: taskRow.status as MilestoneStatus,
    severity: taskRow.severity as TaskSeverity,
    tags: taskRow.tags ?? null,
    dueDate:
      taskRow.dueDate == null
        ? null
        : taskRow.dueDate instanceof Date
          ? taskRow.dueDate
          : new Date(String(taskRow.dueDate)),
    progressPct: taskRow.progressPct ?? 0,
    milestoneId: taskRow.milestoneId ?? null,
    parentTaskId: taskRow.parentTaskId ?? null,
    assigneeIds: assigneeRows.map((a) => a.id),
    blockers: blockers.map((b) => b.note),
  };

  const projectHref = `/organizations/${org.slug}/projects/${project.id}`;
  const tasksHref = `${projectHref}/tasks`;
  const subtasksHref = `${projectHref}/tasks/${taskRow.id}/tasks`;

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href={tasksHref} className="text-muted-foreground text-sm hover:underline">
          ← Tasks
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <CreateBranchDialog
            organizationSlug={org.slug}
            projectId={project.id}
            taskId={taskRow.id}
            taskTitle={taskRow.title}
            tags={taskRow.tags ?? null}
            repositories={
              project.githubRepoFullName ? [project.githubRepoFullName] : []
            }
          />
          <CreateTaskIssueButton
            organizationSlug={org.slug}
            projectId={project.id}
            taskId={taskRow.id}
            taskTitle={taskRow.title}
            tasks={topTaskRows}
            users={orgUsersForTasks}
            reporterUserId={reporterUserId}
          />
          <Button type="button" variant="outline" render={<Link href={subtasksHref} />}>
            Tasks
            <span className="text-muted-foreground ml-1 text-xs tabular-nums">
              ({subtaskCount})
            </span>
          </Button>
          <EditTaskDialog
            organizationSlug={org.slug}
            projectId={project.id}
            task={editable}
            users={orgUsersForTasks}
            parentTaskOptions={topTaskRows}
            milestoneOptions={milestoneOptions}
          />
          <DeleteTaskDialog
            organizationSlug={org.slug}
            projectId={project.id}
            taskId={taskRow.id}
            taskTitle={taskRow.title}
            onDeletedHref={tasksHref}
          />
        </div>
      </div>

      <header className="mt-6">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">{taskRow.title}</h1>
          <MilestoneStatusBadge status={taskRow.status as MilestoneStatus} />
          <TaskSeverityBadge severity={taskRow.severity as TaskSeverity} />
        </div>
        <p className="text-muted-foreground mt-1 text-sm">
          {project.name} · {org.name}
        </p>
      </header>

      <div className="mt-8 space-y-6">
        <section className="rounded-lg border border-border bg-card/30 p-4 ring-1 ring-foreground/6">
          <h2 className="text-sm font-semibold tracking-tight">Details</h2>
          <dl className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground text-xs">Milestone</dt>
              <dd className="mt-1 text-sm">
                {linkedMilestone && !linkedMilestone.archivedAt ? (
                  <Link
                    href={`/organizations/${org.slug}/projects/${project.id}/milestones/${linkedMilestone.id}`}
                    className="text-primary underline-offset-4 hover:underline"
                  >
                    {linkedMilestone.name}
                  </Link>
                ) : linkedMilestone ? (
                  <span>{linkedMilestone.name} (archived)</span>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground text-xs">Due date</dt>
              <dd className="mt-1 text-sm">{formatDue(editable.dueDate)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground text-xs">Progress</dt>
              <dd className="mt-1 text-sm tabular-nums">{editable.progressPct}%</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-muted-foreground text-xs">Description</dt>
              <dd className="mt-1 whitespace-pre-wrap text-sm">
                {taskRow.description || "—"}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-muted-foreground text-xs">Tags</dt>
              <dd className="mt-1 flex flex-wrap gap-1.5">
                {taskRow.tags && taskRow.tags.length > 0 ? (
                  taskRow.tags.map((t) => (
                    <span
                      key={t}
                      className="inline-flex items-center rounded-full border border-border bg-background px-2 py-0.5 text-xs"
                    >
                      {t}
                    </span>
                  ))
                ) : (
                  <span className="text-muted-foreground text-sm">—</span>
                )}
              </dd>
            </div>
          </dl>
        </section>

        <section className="rounded-lg border border-border bg-card/30 p-4 ring-1 ring-foreground/6">
          <h2 className="text-sm font-semibold tracking-tight">Git branches</h2>
          <div className="mt-3">
            {githubBranchRows.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                No branches created from Radar yet. Use Create Branch above when
                this project has a linked repository.
              </p>
            ) : (
              <ul className="space-y-3">
                {githubBranchRows.map((b) => (
                  <li
                    key={b.id}
                    className="flex flex-col gap-1 rounded-md border border-border/80 bg-background/40 px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <code className="text-sm font-medium break-all">
                        {b.branchName}
                      </code>
                      <p className="text-muted-foreground mt-0.5 text-xs">
                        {b.repoFullName}
                        {b.baseBranch ? ` · from ${b.baseBranch}` : null}
                      </p>
                    </div>
                    <a
                      href={b.branchUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary shrink-0 text-sm underline-offset-4 hover:underline"
                    >
                      View on GitHub
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <section className="rounded-lg border border-border bg-card/30 p-4 ring-1 ring-foreground/6">
          <h2 className="text-sm font-semibold tracking-tight">Assignees</h2>
          <div className="mt-3">
            {assigneeRows.length === 0 ? (
              <p className="text-muted-foreground text-sm">—</p>
            ) : (
              <ul className="space-y-2">
                {assigneeRows.map((a) => (
                  <li key={a.id} className="flex items-center justify-between gap-3">
                    <span className="text-sm font-medium">{a.name}</span>
                    <span className="text-muted-foreground text-xs">{a.email}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <section className="rounded-lg border border-border bg-card/30 p-4 ring-1 ring-foreground/6">
          <h2 className="text-sm font-semibold tracking-tight">Blockers</h2>
          <div className="mt-3">
            {blockers.length === 0 ? (
              <p className="text-muted-foreground text-sm">—</p>
            ) : (
              <ul className="list-disc space-y-1 pl-5 text-sm">
                {blockers.map((b, idx) => (
                  <li key={`${idx}-${b.note}`}>{b.note}</li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

