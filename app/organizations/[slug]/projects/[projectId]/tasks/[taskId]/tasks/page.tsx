import { and, asc, count, eq, inArray, isNull } from "drizzle-orm";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { TasksBoard, type TaskBoardRow } from "@/components/projects/tasks-board";
import {
  db,
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
  params: Promise<{ slug: string; projectId: string; taskId: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug, projectId, taskId } = await params;
  const org = await db.query.organizations.findFirst({
    where: eq(organizations.slug, slug),
  });
  if (!org) return { title: "Subtasks · Radar" };

  const project = await db.query.projects.findFirst({
    where: and(eq(projects.id, projectId), eq(projects.organizationId, org.id)),
  });
  if (!project) return { title: "Subtasks · Radar" };

  const parent = await db.query.tasks.findFirst({
    where: and(eq(tasks.id, taskId), eq(tasks.projectId, project.id), isNull(tasks.archivedAt)),
    columns: { title: true },
  });

  return {
    title: parent?.title
      ? `Subtasks · ${parent.title} · ${project.name} · ${org.name} · Radar`
      : `Subtasks · ${project.name} · ${org.name} · Radar`,
  };
}

export default async function TaskSubtasksPage({ params }: PageProps) {
  const { slug, projectId, taskId } = await params;

  const org = await db.query.organizations.findFirst({
    where: eq(organizations.slug, slug),
  });
  if (!org) notFound();

  const project = await db.query.projects.findFirst({
    where: and(eq(projects.id, projectId), eq(projects.organizationId, org.id)),
  });
  if (!project) notFound();

  const parentTask = await db.query.tasks.findFirst({
    where: and(eq(tasks.id, taskId), eq(tasks.projectId, project.id), isNull(tasks.archivedAt)),
    columns: { id: true, title: true },
  });
  if (!parentTask) notFound();

  const orgUsersForTasks = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
    })
    .from(users)
    .where(eq(users.organizationId, org.id))
    .orderBy(asc(users.name));

  const subtaskRows = await db
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
        eq(tasks.parentTaskId, parentTask.id),
        isNull(tasks.archivedAt),
      ),
    )
    .orderBy(asc(tasks.createdAt));

  const subtaskIds = subtaskRows.map((t) => t.id);

  const assigneeByTask: Record<
    string,
    { id: string; name: string; profileImageUrl: string | null }[]
  > = {};
  if (subtaskIds.length > 0) {
    const assigneeRows = await db
      .select({
        taskId: taskAssignees.taskId,
        id: users.id,
        name: users.name,
        profileImageUrl: users.profileImageUrl,
      })
      .from(taskAssignees)
      .innerJoin(users, eq(taskAssignees.userId, users.id))
      .where(inArray(taskAssignees.taskId, subtaskIds));
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
  if (subtaskIds.length > 0) {
    const blockerRows = await db
      .select({ taskId: taskBlockers.taskId, n: count() })
      .from(taskBlockers)
      .where(inArray(taskBlockers.taskId, subtaskIds))
      .groupBy(taskBlockers.taskId);
    for (const b of blockerRows) {
      blockerByTask[b.taskId] = Number(b.n);
    }
  }

  const subtaskByTask: Record<string, number> = {};
  if (subtaskIds.length > 0) {
    const subRows = await db
      .select({ parentTaskId: tasks.parentTaskId, n: count() })
      .from(tasks)
      .where(
        and(
          eq(tasks.projectId, project.id),
          isNull(tasks.archivedAt),
          inArray(tasks.parentTaskId, subtaskIds),
        ),
      )
      .groupBy(tasks.parentTaskId);
    for (const s of subRows) {
      if (s.parentTaskId) {
        subtaskByTask[s.parentTaskId] = Number(s.n);
      }
    }
  }

  const taskBoardRows: TaskBoardRow[] = subtaskRows.map((t) => ({
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

  const projectHref = `/organizations/${org.slug}/projects/${project.id}`;
  const taskHref = `${projectHref}/tasks/${parentTask.id}`;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href={taskHref} className="text-muted-foreground text-sm hover:underline">
          ← {parentTask.title}
        </Link>
        <Link href={`${projectHref}/tasks`} className="text-muted-foreground text-sm hover:underline">
          Project tasks
        </Link>
      </div>

      <header className="mt-6">
        <h1 className="text-2xl font-semibold tracking-tight">Subtasks</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          {parentTask.title} · {project.name} · {org.name}
        </p>
      </header>

      <div className="mt-8">
        <TasksBoard
          organizationSlug={org.slug}
          projectId={project.id}
          tasks={taskBoardRows}
          users={orgUsersForTasks}
          parentTaskOptions={[]}
          createUnderTaskId={parentTask.id}
          createUnderTaskTitle={parentTask.title}
        />
      </div>
    </div>
  );
}

