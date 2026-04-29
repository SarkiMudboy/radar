import { and, asc, count, eq, inArray, isNull } from "drizzle-orm";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { TasksBoard, type TaskBoardRow } from "@/components/projects/tasks-board";
import {
  db,
  milestones,
  organizations,
  projects,
  taskAssignees,
  taskBlockers,
  tasks,
  users,
} from "@/db";
import type { MilestoneStatus } from "@/lib/milestone-status";
import type { TaskSeverity } from "@/lib/task-severity";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ slug: string; projectId: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug, projectId } = await params;
  const org = await db.query.organizations.findFirst({
    where: eq(organizations.slug, slug),
  });
  if (!org) return { title: "Tasks · Radar" };

  const project = await db.query.projects.findFirst({
    where: and(eq(projects.id, projectId), eq(projects.organizationId, org.id)),
  });

  return {
    title: project
      ? `Tasks · ${project.name} · ${org.name} · Radar`
      : "Tasks · Radar",
  };
}

export default async function ProjectTasksPage({ params }: PageProps) {
  const { slug, projectId } = await params;

  const org = await db.query.organizations.findFirst({
    where: eq(organizations.slug, slug),
  });
  if (!org) notFound();

  const project = await db.query.projects.findFirst({
    where: and(eq(projects.id, projectId), eq(projects.organizationId, org.id)),
  });
  if (!project) notFound();

  const orgUsersForTasks = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
    })
    .from(users)
    .where(eq(users.organizationId, org.id))
    .orderBy(asc(users.name));

  const topTaskRows = await db
    .select({
      id: tasks.id,
      title: tasks.title,
      description: tasks.description,
      status: tasks.status,
      severity: tasks.severity,
      tags: tasks.tags,
      dueDate: tasks.dueDate,
      progressPct: tasks.progressPct,
    })
    .from(tasks)
    .where(
      and(
        eq(tasks.projectId, project.id),
        isNull(tasks.parentTaskId),
        isNull(tasks.archivedAt),
      ),
    )
    .orderBy(asc(tasks.createdAt));

  const taskIds = topTaskRows.map((t) => t.id);

  const assigneeByTask: Record<
    string,
    { id: string; name: string; profileImageUrl: string | null }[]
  > = {};
  if (taskIds.length > 0) {
    const assigneeRows = await db
      .select({
        taskId: taskAssignees.taskId,
        id: users.id,
        name: users.name,
        profileImageUrl: users.profileImageUrl,
      })
      .from(taskAssignees)
      .innerJoin(users, eq(taskAssignees.userId, users.id))
      .where(inArray(taskAssignees.taskId, taskIds));
    for (const r of assigneeRows) {
      if (!assigneeByTask[r.taskId]) assigneeByTask[r.taskId] = [];
      assigneeByTask[r.taskId].push({
        id: r.id,
        name: r.name,
        profileImageUrl: r.profileImageUrl,
      });
    }
  }

  const blockerByTask: Record<string, number> = {};
  if (taskIds.length > 0) {
    const blockerRows = await db
      .select({ taskId: taskBlockers.taskId, n: count() })
      .from(taskBlockers)
      .where(inArray(taskBlockers.taskId, taskIds))
      .groupBy(taskBlockers.taskId);
    for (const b of blockerRows) {
      blockerByTask[b.taskId] = Number(b.n);
    }
  }

  const subtaskByTask: Record<string, number> = {};
  if (taskIds.length > 0) {
    const subRows = await db
      .select({ parentTaskId: tasks.parentTaskId, n: count() })
      .from(tasks)
      .where(
        and(
          eq(tasks.projectId, project.id),
          isNull(tasks.archivedAt),
          inArray(tasks.parentTaskId, taskIds),
        ),
      )
      .groupBy(tasks.parentTaskId);
    for (const s of subRows) {
      if (s.parentTaskId) {
        subtaskByTask[s.parentTaskId] = Number(s.n);
      }
    }
  }

  const taskBoardRows: TaskBoardRow[] = topTaskRows.map((t) => ({
    id: t.id,
    title: t.title,
    description: t.description,
    status: t.status as MilestoneStatus,
    severity: t.severity as TaskSeverity,
    tags: t.tags,
    dueDate:
      t.dueDate == null
        ? null
        : t.dueDate instanceof Date
          ? t.dueDate
          : new Date(String(t.dueDate)),
    progressPct: t.progressPct ?? 0,
    assignees: assigneeByTask[t.id] ?? [],
    blockerCount: blockerByTask[t.id] ?? 0,
    subtaskCount: subtaskByTask[t.id] ?? 0,
  }));

  const parentTaskOptions = topTaskRows.map((t) => ({
    id: t.id,
    title: t.title,
  }));

  const milestoneRows = await db
    .select({ id: milestones.id, name: milestones.name })
    .from(milestones)
    .where(
      and(
        eq(milestones.projectId, project.id),
        isNull(milestones.archivedAt),
      ),
    )
    .orderBy(asc(milestones.name));

  const projectHref = `/organizations/${org.slug}/projects/${project.id}`;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10">
      <Link
        href={projectHref}
        className="text-muted-foreground text-sm hover:underline"
      >
        ← {project.name}
      </Link>

      <header className="mt-6">
        <h1 className="text-2xl font-semibold tracking-tight">Tasks</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          {project.name} · {org.name}
        </p>
      </header>

      <div className="mt-8">
        <TasksBoard
          organizationSlug={org.slug}
          projectId={project.id}
          tasks={taskBoardRows}
          users={orgUsersForTasks}
          parentTaskOptions={parentTaskOptions}
          milestoneOptions={milestoneRows}
        />
      </div>
    </div>
  );
}
