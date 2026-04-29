"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { getAppSession } from "@/lib/auth";
import { db, oauthIntegrations } from "@/db";

export type GitHubIntegrationActionState = {
  error?: string;
  success?: boolean;
} | null;

export async function disconnectGitHub(): Promise<GitHubIntegrationActionState> {
  const session = await getAppSession();
  const accountId = session?.user?.id;
  if (!accountId) {
    return { error: "You are not signed in with GitHub." };
  }

  try {
    await db
      .delete(oauthIntegrations)
      .where(
        and(
          eq(oauthIntegrations.provider, "github"),
          eq(oauthIntegrations.providerAccountId, accountId),
        ),
      );
  } catch (err) {
    console.error(err);
    return { error: "Could not disconnect GitHub." };
  }

  revalidatePath("/integrations");
  return { success: true };
}
