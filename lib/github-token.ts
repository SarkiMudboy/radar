import "server-only";

import { and, eq } from "drizzle-orm";

import { getAppSession } from "@/lib/auth";
import { db, oauthIntegrations } from "@/db";

/**
 * Returns the stored GitHub OAuth access token for the current session user.
 * Server-only; never pass this to the client.
 */
export async function getGitHubAccessToken(): Promise<string | null> {
  const session = await getAppSession();
  const accountId = session?.user?.id;
  if (!accountId) return null;

  const rows = await db
    .select({ accessToken: oauthIntegrations.accessToken })
    .from(oauthIntegrations)
    .where(
      and(
        eq(oauthIntegrations.provider, "github"),
        eq(oauthIntegrations.providerAccountId, accountId),
      ),
    )
    .limit(1);

  return rows[0]?.accessToken ?? null;
}
