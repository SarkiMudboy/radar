"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db, roles, userRoles, users } from "@/db";

export type OrgUserActionState = {
  error?: string;
  success?: boolean;
} | null;

export async function createOrgUser(
  _prev: OrgUserActionState,
  formData: FormData,
): Promise<OrgUserActionState> {
  const organizationId =
    formData.get("organizationId")?.toString().trim() ?? "";
  const organizationSlug =
    formData.get("organizationSlug")?.toString().trim() ?? "";
  const name = formData.get("name")?.toString().trim() ?? "";
  const email = formData.get("email")?.toString().trim() ?? "";
  const roleKey = formData.get("roleKey")?.toString().trim() ?? "";

  if (!organizationId || !organizationSlug) {
    return { error: "Missing organization." };
  }
  if (!name || !email) {
    return { error: "Name and email are required." };
  }
  if (!roleKey) {
    return { error: "Role is required." };
  }

  try {
    const role = await db.query.roles.findFirst({
      where: eq(roles.key, roleKey),
    });
    if (!role) {
      return { error: "Invalid role." };
    }

    const [newUser] = await db
      .insert(users)
      .values({
        organizationId,
        name,
        email,
      })
      .returning({ id: users.id });

    if (!newUser) {
      return { error: "Could not create the user." };
    }

    await db.insert(userRoles).values({
      userId: newUser.id,
      roleId: role.id,
    });
  } catch (err) {
    const code =
      err && typeof err === "object" && "code" in err
        ? String((err as { code: unknown }).code)
        : "";
    if (code === "23505") {
      return {
        error: "A user with that email already exists in this organization.",
      };
    }
    console.error(err);
    return { error: "Could not create the user." };
  }

  revalidatePath(`/organizations/${organizationSlug}`);
  return { success: true };
}
