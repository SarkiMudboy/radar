"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db, issues, organizations, projects, users } from "@/db";
import { getAppSession } from "@/lib/auth";
import { isTaskSeverity } from "@/lib/task-severity";

export type IssueActionState = {
  error?: string;
  success?: boolean;
} | null;

async function assertProjectInOrg(organizationSlug: string, projectId: string) {
  const row = await db
    .select({ id: projects.id, organizationId: organizations.id })
    .from(projects)
    .innerJoin(organizations, eq(projects.organizationId, organizations.id))
    .where(
      and(eq(projects.id, projectId), eq(organizations.slug, organizationSlug)),
    )
    .limit(1);
  return row[0] ?? null;
}

async function resolveReporterUserId(organizationId: string) {
  const session = await getAppSession();
  const email = session?.user?.email ?? null;
  if (!email) return null;

  const row = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.organizationId, organizationId), eq(users.email, email)))
    .limit(1);
  return row[0]?.id ?? null;
}

export async function createIssue(
  _prev: IssueActionState,
  formData: FormData,
): Promise<IssueActionState> {
  const organizationSlug =
    formData.get("organizationSlug")?.toString().trim() ?? "";
  const projectId = formData.get("projectId")?.toString().trim() ?? "";

  const name = formData.get("name")?.toString().trim() ?? "";
  const description = formData.get("description")?.toString().trim() || null;
  const affectedTaskIdRaw =
    formData.get("affectedTaskId")?.toString().trim() || "";
  const affectedTaskId = affectedTaskIdRaw || null;
  const assigneeUserIdRaw =
    formData.get("assigneeUserId")?.toString().trim() || "";
  const assigneeUserId = assigneeUserIdRaw || null;
  const severityRaw = formData.get("severity")?.toString().trim() ?? "medium";
  const reporterUserIdRaw =
    formData.get("reporterUserId")?.toString().trim() || "";
  const reporterUserIdFromForm = reporterUserIdRaw || null;

  if (!organizationSlug || !projectId) return { error: "Missing project context." };
  if (!name) return { error: "Issue name is required." };
  if (!isTaskSeverity(severityRaw)) return { error: "Invalid severity." };

  const ctx = await assertProjectInOrg(organizationSlug, projectId);
  if (!ctx) return { error: "Project not found." };

  const reporterUserId =
    reporterUserIdFromForm ?? (await resolveReporterUserId(ctx.organizationId));

  try {
    await db.insert(issues).values({
      projectId,
      name,
      description,
      affectedTaskId,
      assigneeUserId,
      severity: severityRaw,
      reporterUserId,
      status: "pending",
    });
  } catch (err) {
    console.error(err);
    return { error: "Could not create issue." };
  }

  revalidatePath(`/organizations/${organizationSlug}/projects/${projectId}`);
  revalidatePath(`/organizations/${organizationSlug}/projects/${projectId}/issues`);
  return { success: true };
}

export async function updateIssueStatus(
  _prev: IssueActionState,
  formData: FormData,
): Promise<IssueActionState> {
  const organizationSlug =
    formData.get("organizationSlug")?.toString().trim() ?? "";
  const projectId = formData.get("projectId")?.toString().trim() ?? "";
  const issueId = formData.get("issueId")?.toString().trim() ?? "";
  const statusRaw = formData.get("status")?.toString().trim() ?? "";

  if (!organizationSlug || !projectId || !issueId) {
    return { error: "Missing issue context." };
  }
  if (statusRaw !== "pending" && statusRaw !== "resolved") {
    return { error: "Invalid status." };
  }

  const ctx = await assertProjectInOrg(organizationSlug, projectId);
  if (!ctx) return { error: "Project not found." };

  const existing = await db.query.issues.findFirst({
    where: and(eq(issues.id, issueId), eq(issues.projectId, projectId)),
    columns: { id: true },
  });
  if (!existing) return { error: "Issue not found." };

  try {
    await db
      .update(issues)
      .set({ status: statusRaw, updatedAt: new Date() })
      .where(and(eq(issues.id, issueId), eq(issues.projectId, projectId)));
  } catch (err) {
    console.error(err);
    return { error: "Could not update issue." };
  }

  revalidatePath(`/organizations/${organizationSlug}/projects/${projectId}`);
  revalidatePath(`/organizations/${organizationSlug}/projects/${projectId}/issues`);
  return { success: true };
}

