import "server-only";

import { and, eq } from "drizzle-orm";
import type { NextAuthOptions } from "next-auth";
import { getServerSession } from "next-auth";
import GitHubProvider from "next-auth/providers/github";

import { db, oauthIntegrations } from "@/db";

const githubScopes = ["read:user", "user:email", "repo"] as const;

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    GitHubProvider({
      clientId: process.env.GITHUB_ID ?? "",
      clientSecret: process.env.GITHUB_SECRET ?? "",
      authorization: {
        params: {
          scope: githubScopes.join(" "),
        },
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
  },
  callbacks: {
    async jwt({ token, account }) {
      if (account?.provider === "github" && account.providerAccountId) {
        token.githubId = account.providerAccountId;
      }
      return token;
    },
    async session({ session, token }) {
      const githubAccountId =
        typeof token.githubId === "string"
          ? token.githubId
          : typeof token.sub === "string"
            ? token.sub
            : null;

      if (session.user && githubAccountId) {
        session.user.id = githubAccountId;
      }

      if (githubAccountId) {
        const row = await db
          .select({ id: oauthIntegrations.id })
          .from(oauthIntegrations)
          .where(
            and(
              eq(oauthIntegrations.provider, "github"),
              eq(oauthIntegrations.providerAccountId, githubAccountId),
            ),
          )
          .limit(1);
        session.github = { connected: row.length > 0 };
      } else {
        session.github = { connected: false };
      }

      return session;
    },
  },
  events: {
    async signIn({ account }) {
      if (
        account?.provider !== "github" ||
        !account.access_token ||
        !account.providerAccountId
      ) {
        return;
      }

      const expiresAt =
        account.expires_at != null
          ? new Date(Number(account.expires_at) * 1000)
          : null;

      await db
        .insert(oauthIntegrations)
        .values({
          provider: "github",
          providerAccountId: account.providerAccountId,
          accessToken: account.access_token,
          refreshToken: account.refresh_token ?? null,
          expiresAt,
          scope: account.scope ?? null,
        })
        .onConflictDoUpdate({
          target: [
            oauthIntegrations.provider,
            oauthIntegrations.providerAccountId,
          ],
          set: {
            accessToken: account.access_token,
            refreshToken: account.refresh_token ?? null,
            expiresAt,
            scope: account.scope ?? null,
            updatedAt: new Date(),
          },
        });
    },
  },
};

export function getAppSession() {
  return getServerSession(authOptions);
}
