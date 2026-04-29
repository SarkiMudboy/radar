"use server";

import { getGitHubAccessToken } from "@/lib/github-token";

export type GitHubRepoOption = {
  fullName: string;
  private: boolean;
};

export async function listGitHubReposForSession(): Promise<
  | { ok: true; repos: GitHubRepoOption[] }
  | { ok: false; error: "NOT_CONNECTED" | "API_ERROR" }
> {
  const token = await getGitHubAccessToken();
  if (!token) {
    return { ok: false, error: "NOT_CONNECTED" };
  }

  const res = await fetch(
    "https://api.github.com/user/repos?per_page=100&sort=updated&affiliation=owner,collaborator,organization_member",
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      cache: "no-store",
    },
  );

  if (!res.ok) {
    console.error("GitHub list repos failed", res.status, await res.text());
    return { ok: false, error: "API_ERROR" };
  }

  const data = (await res.json()) as { full_name: string; private: boolean }[];

  return {
    ok: true,
    repos: data.map((r) => ({
      fullName: r.full_name,
      private: r.private,
    })),
  };
}
