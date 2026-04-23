"use server";

import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import {
  db,
  organizations,
  projects,
  taskAssignees,
  taskBlockers,
  tasks,
} from "@/db";
import { isMilestoneStatus } from "@/lib/milestone-status";
import { isTaskSeverity } from "@/lib/task-severity";

export type TaskActionState = {
  error?: string;
  success?: boolean;
} | null;

function revalidateProjectTasks(organizationSlug: string, projectId: string) {
  revalidatePath(`/organizations/${organizationSlug}/projects/${projectId}`);
}

async function assertProjectInOrg(
  organizationSlug: string,
  projectId: string,
) {
  const row = await db
    .select({ id: projects.id })
    .from(projects)
    .innerJoin(organizations, eq(projects.organizationId, organizations.id))
    .where(
      and(
        eq(projects.id, projectId),
        eq(organizations.slug, organizationSlug),
      ),
    )
    .limit(1);
  return row[0]?.id ?? null;
}

export async function createTask(
  _prev: TaskActionState,
  formData: FormData,
): Promise<TaskActionState> {
  const organizationSlug =
    formData.get("organizationSlug")?.toString().trim() ?? "";
  const projectId = formData.get("projectId")?.toString().trim() ?? "";
  const title = formData.get("title")?.toString().trim() ?? "";
  const description =
    formData.get("description")?.toString().trim() || null;
  const statusRaw = formData.get("status")?.toString().trim() ?? "not_started";
  const severityRaw = formData.get("severity")?.toString().trim() ?? "medium";
  const tagsRaw = formData.get("tags")?.toString().trim() ?? "";
  const blockersRaw = formData.get("blockers")?.toString() ?? "";
  const parentTaskIdRaw =
    formData.get("parentTaskId")?.toString().trim() || "";
  const parentTaskId = parentTaskIdRaw || null;
  const assigneeIds = [
    ...new Set(
      formData
        .getAll("assigneeIds")
        .map((v) => v.toString().trim())
        .filter(Boolean),
    ),
  ];

  if (!organizationSlug || !projectId) {
    return { error: "Missing project context." };
  }
  if (!title) {
    return { error: "Task title is required." };
  }
  if (!isMilestoneStatus(statusRaw)) {
    return { error: "Invalid status." };
  }
  if (!isTaskSeverity(severityRaw)) {
    return { error: "Invalid severity." };
  }

  const projectOk = await assertProjectInOrg(organizationSlug, projectId);
  if (!projectOk) {
    return { error: "Project not found." };
  }

  if (parentTaskId) {
    const parent = await db.query.tasks.findFirst({
      where: and(
        eq(tasks.id, parentTaskId),
        eq(tasks.projectId, projectId),
        isNull(tasks.parentTaskId),
        isNull(tasks.archivedAt),
      ),
      columns: { id: true },
    });
    if (!parent) {
      return { error: "Parent task is invalid or is already a sub-task." };
    }
  }

  const tags = tagsRaw
    .split(/[,]+/)
    .map((t) => t.trim())
    .filter(Boolean);
  const blockerLines = blockersRaw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const dueDateRaw = formData.get("dueDate")?.toString().trim() ?? "";
  const dueDate = dueDateRaw ? new Date(dueDateRaw) : null;
  const progressPctRaw = formData.get("progressPct")?.toString().trim() ?? "0";
  const progressPct = Math.min(
    100,
    Math.max(0, Number.parseInt(progressPctRaw, 10) || 0),
  );

  try {
    await db.transaction(async (tx) => {
      const [row] = await tx
        .insert(tasks)
        .values({
          projectId,
          title,
          description,
          status: statusRaw,
          severity: severityRaw,
          tags: tags.length > 0 ? tags : null,
          dueDate,
          progressPct,
          parentTaskId,
        })
        .returning({ id: tasks.id });

      const taskId = row?.id;
      if (!taskId) {
        throw new Error("Insert failed");
      }

      if (assigneeIds.length > 0) {
        await tx.insert(taskAssignees).values(
          assigneeIds.map((userId) => ({ taskId, userId })),
        );
      }

      if (blockerLines.length > 0) {
        await tx.insert(taskBlockers).values(
          blockerLines.map((note) => ({ taskId, note })),
        );
      }
    });
  } catch (err) {
    console.error(err);
    return { error: "Could not create the task." };
  }

  revalidateProjectTasks(organizationSlug, projectId);
  return { success: true };
}

export async function updateTaskStatus(
  _prev: TaskActionState,
  formData: FormData,
): Promise<TaskActionState> {
  const organizationSlug =
    formData.get("organizationSlug")?.toString().trim() ?? "";
  const projectId = formData.get("projectId")?.toString().trim() ?? "";
  const taskId = formData.get("taskId")?.toString().trim() ?? "";
  const statusRaw = formData.get("status")?.toString().trim() ?? "";

  if (!organizationSlug || !projectId || !taskId) {
    return { error: "Missing task context." };
  }
  if (!isMilestoneStatus(statusRaw)) {
    return { error: "Invalid status." };
  }

  const projectOk = await assertProjectInOrg(organizationSlug, projectId);
  if (!projectOk) {
    return { error: "Project not found." };
  }

  const existing = await db.query.tasks.findFirst({
    where: and(
      eq(tasks.id, taskId),
      eq(tasks.projectId, projectId),
      isNull(tasks.archivedAt),
    ),
    columns: { id: true },
  });
  if (!existing) {
    return { error: "Task not found." };
  }

  try {
    await db
      .update(tasks)
      .set({ status: statusRaw, updatedAt: new Date() })
      .where(eq(tasks.id, taskId));
  } catch (err) {
    console.error(err);
    return { error: "Could not update status." };
  }

  revalidateProjectTasks(organizationSlug, projectId);
  return { success: true };
}
