"use server";

import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import {
  db,
  milestones,
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

async function revalidateProjectTaskViews(
  organizationSlug: string,
  projectId: string,
) {
  revalidatePath(`/organizations/${organizationSlug}/projects/${projectId}`);
  revalidatePath(
    `/organizations/${organizationSlug}/projects/${projectId}/tasks`,
  );

  const rows = await db
    .select({ id: milestones.id })
    .from(milestones)
    .where(eq(milestones.projectId, projectId));

  for (const r of rows) {
    revalidatePath(
      `/organizations/${organizationSlug}/projects/${projectId}/milestones/${r.id}/tasks`,
    );
  }
}

function revalidateTaskDetail(
  organizationSlug: string,
  projectId: string,
  taskId: string,
) {
  revalidatePath(
    `/organizations/${organizationSlug}/projects/${projectId}/tasks/${taskId}`,
  );
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

async function assertMilestoneInProject(
  projectId: string,
  milestoneId: string,
) {
  const row = await db.query.milestones.findFirst({
    where: and(
      eq(milestones.id, milestoneId),
      eq(milestones.projectId, projectId),
      isNull(milestones.archivedAt),
    ),
    columns: { id: true },
  });
  return row?.id ?? null;
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
  const milestoneIdRaw =
    formData.get("milestoneId")?.toString().trim() || "";
  const milestoneId = milestoneIdRaw || null;
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

  if (milestoneId) {
    const ok = await assertMilestoneInProject(projectId, milestoneId);
    if (!ok) {
      return { error: "Milestone not found." };
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
          milestoneId,
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

  await revalidateProjectTaskViews(organizationSlug, projectId);
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
    columns: { id: true, qaStatus: true },
  });
  if (!existing) {
    return { error: "Task not found." };
  }

  try {
    const nextQaStatus =
      statusRaw === "completed"
        ? existing.qaStatus === "tested"
          ? "tested"
          : "to_test"
        : "not_required";
    await db
      .update(tasks)
      .set({ status: statusRaw, qaStatus: nextQaStatus, updatedAt: new Date() })
      .where(eq(tasks.id, taskId));
  } catch (err) {
    console.error(err);
    return { error: "Could not update status." };
  }

  await revalidateProjectTaskViews(organizationSlug, projectId);
  revalidateTaskDetail(organizationSlug, projectId, taskId);
  return { success: true };
}

export async function updateTask(
  _prev: TaskActionState,
  formData: FormData,
): Promise<TaskActionState> {
  const organizationSlug =
    formData.get("organizationSlug")?.toString().trim() ?? "";
  const projectId = formData.get("projectId")?.toString().trim() ?? "";
  const taskId = formData.get("taskId")?.toString().trim() ?? "";
  const title = formData.get("title")?.toString().trim() ?? "";
  const description =
    formData.get("description")?.toString().trim() || null;
  const statusRaw = formData.get("status")?.toString().trim() ?? "";
  const severityRaw = formData.get("severity")?.toString().trim() ?? "medium";
  const tagsRaw = formData.get("tags")?.toString().trim() ?? "";
  const blockersRaw = formData.get("blockers")?.toString() ?? "";
  const parentTaskIdRaw =
    formData.get("parentTaskId")?.toString().trim() || "";
  const parentTaskId = parentTaskIdRaw || null;
  const milestoneIdRaw =
    formData.get("milestoneId")?.toString().trim() || "";
  const milestoneId = milestoneIdRaw || null;
  const assigneeIds = [
    ...new Set(
      formData
        .getAll("assigneeIds")
        .map((v) => v.toString().trim())
        .filter(Boolean),
    ),
  ];

  if (!organizationSlug || !projectId || !taskId) {
    return { error: "Missing task context." };
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

  if (parentTaskId) {
    if (parentTaskId === taskId) {
      return { error: "Task cannot be its own parent." };
    }
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

  if (milestoneId) {
    const ok = await assertMilestoneInProject(projectId, milestoneId);
    if (!ok) {
      return { error: "Milestone not found." };
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
  const progressPctRaw = formData.get("progressPct")?.toString().trim() ?? "";
  const progressPct =
    progressPctRaw === ""
      ? null
      : Math.min(100, Math.max(0, Number.parseInt(progressPctRaw, 10) || 0));

  try {
    await db.transaction(async (tx) => {
      await tx
        .update(tasks)
        .set({
          title,
          description,
          status: statusRaw,
          severity: severityRaw,
          tags: tags.length > 0 ? tags : null,
          dueDate,
          milestoneId,
          parentTaskId,
          ...(progressPct == null ? {} : { progressPct }),
          updatedAt: new Date(),
        })
        .where(eq(tasks.id, taskId));

      await tx.delete(taskAssignees).where(eq(taskAssignees.taskId, taskId));
      if (assigneeIds.length > 0) {
        await tx.insert(taskAssignees).values(
          assigneeIds.map((userId) => ({ taskId, userId })),
        );
      }

      await tx.delete(taskBlockers).where(eq(taskBlockers.taskId, taskId));
      if (blockerLines.length > 0) {
        await tx.insert(taskBlockers).values(
          blockerLines.map((note) => ({ taskId, note })),
        );
      }
    });
  } catch (err) {
    console.error(err);
    return { error: "Could not update the task." };
  }

  await revalidateProjectTaskViews(organizationSlug, projectId);
  revalidateTaskDetail(organizationSlug, projectId, taskId);
  return { success: true };
}

export async function deleteTask(
  _prev: TaskActionState,
  formData: FormData,
): Promise<TaskActionState> {
  const organizationSlug =
    formData.get("organizationSlug")?.toString().trim() ?? "";
  const projectId = formData.get("projectId")?.toString().trim() ?? "";
  const taskId = formData.get("taskId")?.toString().trim() ?? "";

  if (!organizationSlug || !projectId || !taskId) {
    return { error: "Missing task context." };
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
    await db.transaction(async (tx) => {
      // Delete direct subtasks too (keeps behavior predictable vs FK set null).
      await tx
        .delete(tasks)
        .where(and(eq(tasks.projectId, projectId), eq(tasks.parentTaskId, taskId)));
      await tx.delete(tasks).where(eq(tasks.id, taskId));
    });
  } catch (err) {
    console.error(err);
    return { error: "Could not delete the task." };
  }

  await revalidateProjectTaskViews(organizationSlug, projectId);
  revalidateTaskDetail(organizationSlug, projectId, taskId);
  return { success: true };
}
