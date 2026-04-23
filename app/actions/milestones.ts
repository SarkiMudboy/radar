"use server";

import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db, milestones, organizations, projects } from "@/db";
import { isMilestoneStatus } from "@/lib/milestone-status";

export type MilestoneActionState = {
  error?: string;
  success?: boolean;
} | null;

function revalidateMilestonePaths(
  organizationSlug: string,
  projectId: string,
  milestoneId?: string,
) {
  const base = `/organizations/${organizationSlug}/projects/${projectId}`;
  revalidatePath(base);
  if (milestoneId) {
    revalidatePath(`${base}/milestones/${milestoneId}`);
  }
}

export async function createMilestone(
  _prev: MilestoneActionState,
  formData: FormData,
): Promise<MilestoneActionState> {
  const organizationSlug =
    formData.get("organizationSlug")?.toString().trim() ?? "";
  const projectId = formData.get("projectId")?.toString().trim() ?? "";
  const name = formData.get("name")?.toString().trim() ?? "";
  const description =
    formData.get("description")?.toString().trim() || null;
  const timeline = formData.get("timeline")?.toString().trim() || null;
  const statusRaw = formData.get("status")?.toString().trim() ?? "";

  if (!organizationSlug || !projectId) {
    return { error: "Missing project context." };
  }
  if (!name) {
    return { error: "Milestone name is required." };
  }
  if (!isMilestoneStatus(statusRaw)) {
    return { error: "Invalid status." };
  }

  const projectRow = await db
    .select({ orgSlug: organizations.slug })
    .from(projects)
    .innerJoin(organizations, eq(projects.organizationId, organizations.id))
    .where(eq(projects.id, projectId))
    .limit(1);

  const pr = projectRow[0];
  if (!pr || pr.orgSlug !== organizationSlug) {
    return { error: "Project not found." };
  }

  try {
    await db.insert(milestones).values({
      projectId,
      name,
      description,
      timeline,
      status: statusRaw,
    });
  } catch (err) {
    const code =
      err && typeof err === "object" && "code" in err
        ? String((err as { code: unknown }).code)
        : "";
    if (code === "23505") {
      return {
        error:
          "A milestone with that name already exists in this project.",
      };
    }
    console.error(err);
    return { error: "Could not create the milestone." };
  }

  revalidateMilestonePaths(organizationSlug, projectId);
  return { success: true };
}

export async function updateMilestone(
  _prev: MilestoneActionState,
  formData: FormData,
): Promise<MilestoneActionState> {
  const organizationSlug =
    formData.get("organizationSlug")?.toString().trim() ?? "";
  const projectId = formData.get("projectId")?.toString().trim() ?? "";
  const milestoneId = formData.get("milestoneId")?.toString().trim() ?? "";
  const name = formData.get("name")?.toString().trim() ?? "";
  const description =
    formData.get("description")?.toString().trim() || null;
  const timeline = formData.get("timeline")?.toString().trim() || null;
  const statusRaw = formData.get("status")?.toString().trim() ?? "";

  if (!organizationSlug || !projectId || !milestoneId) {
    return { error: "Missing milestone context." };
  }
  if (!name) {
    return { error: "Milestone name is required." };
  }
  if (!isMilestoneStatus(statusRaw)) {
    return { error: "Invalid status." };
  }

  const existingRow = await db
    .select({
      id: milestones.id,
      archivedAt: milestones.archivedAt,
      orgSlug: organizations.slug,
    })
    .from(milestones)
    .innerJoin(projects, eq(milestones.projectId, projects.id))
    .innerJoin(organizations, eq(projects.organizationId, organizations.id))
    .where(
      and(
        eq(milestones.id, milestoneId),
        eq(milestones.projectId, projectId),
      ),
    )
    .limit(1);

  const existing = existingRow[0];
  if (
    !existing ||
    existing.orgSlug !== organizationSlug ||
    existing.archivedAt
  ) {
    return { error: "Milestone not found or archived." };
  }

  try {
    await db
      .update(milestones)
      .set({
        name,
        description,
        timeline,
        status: statusRaw,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(milestones.id, milestoneId),
          eq(milestones.projectId, projectId),
          isNull(milestones.archivedAt),
        ),
      );
  } catch (err) {
    const code =
      err && typeof err === "object" && "code" in err
        ? String((err as { code: unknown }).code)
        : "";
    if (code === "23505") {
      return {
        error:
          "A milestone with that name already exists in this project.",
      };
    }
    console.error(err);
    return { error: "Could not update the milestone." };
  }

  revalidateMilestonePaths(organizationSlug, projectId, milestoneId);
  return { success: true };
}

export async function archiveMilestone(
  _prev: MilestoneActionState,
  formData: FormData,
): Promise<MilestoneActionState> {
  const organizationSlug =
    formData.get("organizationSlug")?.toString().trim() ?? "";
  const projectId = formData.get("projectId")?.toString().trim() ?? "";
  const milestoneId = formData.get("milestoneId")?.toString().trim() ?? "";

  if (!organizationSlug || !projectId || !milestoneId) {
    return { error: "Missing milestone context." };
  }

  const existingRow = await db
    .select({
      id: milestones.id,
      archivedAt: milestones.archivedAt,
      orgSlug: organizations.slug,
    })
    .from(milestones)
    .innerJoin(projects, eq(milestones.projectId, projects.id))
    .innerJoin(organizations, eq(projects.organizationId, organizations.id))
    .where(
      and(
        eq(milestones.id, milestoneId),
        eq(milestones.projectId, projectId),
      ),
    )
    .limit(1);

  const existing = existingRow[0];
  if (!existing || existing.orgSlug !== organizationSlug) {
    return { error: "Milestone not found." };
  }
  if (existing.archivedAt) {
    return { success: true };
  }

  try {
    await db
      .update(milestones)
      .set({
        archivedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(milestones.id, milestoneId),
          eq(milestones.projectId, projectId),
          isNull(milestones.archivedAt),
        ),
      );
  } catch (err) {
    console.error(err);
    return { error: "Could not archive the milestone." };
  }

  revalidateMilestonePaths(organizationSlug, projectId, milestoneId);
  return { success: true };
}
