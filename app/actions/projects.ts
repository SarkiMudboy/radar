"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import {
  db,
  organizations,
  projectCollaborators,
  projects,
} from "@/db";

export type ProjectActionState = {
  error?: string;
  success?: boolean;
} | null;

export async function createProject(
  _prev: ProjectActionState,
  formData: FormData,
): Promise<ProjectActionState> {
  const organizationId =
    formData.get("organizationId")?.toString().trim() ?? "";
  const organizationSlug =
    formData.get("organizationSlug")?.toString().trim() ?? "";
  const name = formData.get("name")?.toString().trim() ?? "";
  const description = formData.get("description")?.toString().trim() || null;
  const boardUrl = formData.get("boardUrl")?.toString().trim() || null;
  const prdPdfUrl = formData.get("prdPdfUrl")?.toString().trim() || null;
  const ownerUserIdRaw = formData.get("ownerUserId")?.toString().trim() || "";
  const ownerUserId = ownerUserIdRaw || null;
  const collaboratorIds = formData
    .getAll("collaboratorIds")
    .map((v) => v.toString().trim())
    .filter(Boolean);
  const startDateRaw = formData.get("startDate")?.toString().trim() || "";
  const endDateRaw = formData.get("endDate")?.toString().trim() || "";
  const startDate = startDateRaw ? new Date(startDateRaw) : null;
  const endDate = endDateRaw ? new Date(endDateRaw) : null;

  if (!organizationId || !organizationSlug) {
    return { error: "Missing organization." };
  }
  if (!name) {
    return { error: "Project name is required." };
  }

  try {
    const [newProject] = await db
      .insert(projects)
      .values({
      organizationId,
      name,
      description,
      boardUrl,
      prdPdfUrl,
      ownerUserId,
      startDate,
      endDate,
      })
      .returning({ id: projects.id });

    const projectId = newProject?.id;
    if (projectId) {
      const ids = new Set<string>(collaboratorIds);
      if (ownerUserId) ids.add(ownerUserId);
      const rows = [...ids].map((userId) => ({ projectId, userId }));
      if (rows.length > 0) {
        await db.insert(projectCollaborators).values(rows).onConflictDoNothing();
      }
    }
  } catch (err) {
    const code =
      err && typeof err === "object" && "code" in err
        ? String((err as { code: unknown }).code)
        : "";
    if (code === "23505") {
      return {
        error:
          "A project with that name already exists in this organization.",
      };
    }
    console.error(err);
    return { error: "Could not create the project." };
  }

  revalidatePath(`/organizations/${organizationSlug}`);
  return { success: true };
}

export async function updateProject(
  _prev: ProjectActionState,
  formData: FormData,
): Promise<ProjectActionState> {
  const organizationSlug =
    formData.get("organizationSlug")?.toString().trim() ?? "";
  const projectId = formData.get("projectId")?.toString().trim() ?? "";
  const name = formData.get("name")?.toString().trim() ?? "";
  const description =
    formData.get("description")?.toString().trim() || null;
  const boardUrl = formData.get("boardUrl")?.toString().trim() || null;
  const prdPdfUrl = formData.get("prdPdfUrl")?.toString().trim() || null;
  const ownerUserIdRaw = formData.get("ownerUserId")?.toString().trim() || "";
  const ownerUserId = ownerUserIdRaw || null;
  const collaboratorIds = formData
    .getAll("collaboratorIds")
    .map((v) => v.toString().trim())
    .filter(Boolean);
  const startDateRaw = formData.get("startDate")?.toString().trim() || "";
  const endDateRaw = formData.get("endDate")?.toString().trim() || "";
  const startDate = startDateRaw ? new Date(startDateRaw) : null;
  const endDate = endDateRaw ? new Date(endDateRaw) : null;

  if (!organizationSlug || !projectId) {
    return { error: "Missing project context." };
  }
  if (!name) {
    return { error: "Project name is required." };
  }

  const projectRow = await db
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

  if (!projectRow[0]) {
    return { error: "Project not found." };
  }

  try {
    await db.transaction(async (tx) => {
      await tx
        .update(projects)
        .set({
          name,
          description,
          boardUrl,
          prdPdfUrl,
          ownerUserId,
          startDate,
          endDate,
          updatedAt: new Date(),
        })
        .where(eq(projects.id, projectId));

      await tx
        .delete(projectCollaborators)
        .where(eq(projectCollaborators.projectId, projectId));

      const ids = new Set<string>(collaboratorIds);
      if (ownerUserId) ids.add(ownerUserId);
      const rows = [...ids].map((userId) => ({ projectId, userId }));
      if (rows.length > 0) {
        await tx
          .insert(projectCollaborators)
          .values(rows)
          .onConflictDoNothing();
      }
    });
  } catch (err) {
    const code =
      err && typeof err === "object" && "code" in err
        ? String((err as { code: unknown }).code)
        : "";
    if (code === "23505") {
      return {
        error:
          "A project with that name already exists in this organization.",
      };
    }
    console.error(err);
    return { error: "Could not update the project." };
  }

  revalidatePath(`/organizations/${organizationSlug}`);
  revalidatePath(`/organizations/${organizationSlug}/projects/${projectId}`);
  return { success: true };
}
