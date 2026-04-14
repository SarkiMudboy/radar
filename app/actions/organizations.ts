"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { db, organizations } from "@/db";
import { slugify } from "@/lib/slug";

export type OrganizationActionState = {
  error?: string;
  success?: boolean;
} | null;

export async function createOrganization(
  _prevState: OrganizationActionState,
  formData: FormData,
): Promise<OrganizationActionState> {
  const name = formData.get("name")?.toString().trim() ?? "";
  const slugRaw = formData.get("slug")?.toString().trim() ?? "";

  if (!name) {
    return { error: "Name is required." };
  }

  const slug = slugRaw ? slugify(slugRaw) : slugify(name);
  if (!slug) {
    return { error: "Use letters or numbers in the name or slug." };
  }

  try {
    await db.insert(organizations).values({ name, slug });
    revalidatePath("/");
    return { success: true };
  } catch (err) {
    const code =
      err && typeof err === "object" && "code" in err
        ? String((err as { code: unknown }).code)
        : "";
    if (code === "23505") {
      return { error: "An organization with that slug already exists." };
    }
    console.error(err);
    return { error: "Could not create the organization." };
  }
}

export async function updateOrganization(
  _prev: OrganizationActionState,
  formData: FormData,
): Promise<OrganizationActionState> {
  const id = formData.get("id")?.toString().trim() ?? "";
  const currentSlug = formData.get("currentSlug")?.toString().trim() ?? "";
  const name = formData.get("name")?.toString().trim() ?? "";
  const slugRaw = formData.get("slug")?.toString().trim() ?? "";

  if (!id || !name) {
    return { error: "Name is required." };
  }

  const slug = slugRaw ? slugify(slugRaw) : slugify(name);
  if (!slug) {
    return { error: "Use letters or numbers in the name or slug." };
  }

  try {
    await db
      .update(organizations)
      .set({
        name,
        slug,
        updatedAt: new Date(),
      })
      .where(eq(organizations.id, id));
  } catch (err) {
    const code =
      err && typeof err === "object" && "code" in err
        ? String((err as { code: unknown }).code)
        : "";
    if (code === "23505") {
      return { error: "An organization with that slug already exists." };
    }
    console.error(err);
    return { error: "Could not update the organization." };
  }

  revalidatePath("/");
  revalidatePath(`/organizations/${currentSlug}`);
  if (slug !== currentSlug) {
    revalidatePath(`/organizations/${slug}`);
    redirect(`/organizations/${slug}`);
  }

  return { success: true };
}

export async function deleteOrganization(
  _prev: OrganizationActionState,
  formData: FormData,
): Promise<OrganizationActionState> {
  const id = formData.get("id")?.toString().trim();
  if (!id) {
    return { error: "Missing organization." };
  }

  try {
    await db.delete(organizations).where(eq(organizations.id, id));
  } catch (err) {
    console.error(err);
    return { error: "Could not delete the organization." };
  }

  revalidatePath("/");
  redirect("/");
}
