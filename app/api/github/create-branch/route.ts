import { and, eq, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

import {
  db,
  organizations,
  projects,
  taskGithubBranches,
  tasks,
} from "@/db";
import { getGitHubAccessToken } from "@/lib/github-token";

export const dynamic = "force-dynamic";

type CreateBranchBody = {
  owner: string;
  repo: string;
  branchName: string;
  base: string;
  /** When set with projectId + organizationSlug, branch is stored on the task after success. */
  taskId?: string;
  projectId?: string;
  organizationSlug?: string;
};

type ErrorCode =
  | "UNAUTHORIZED"
  | "VALIDATION"
  | "BASE_NOT_FOUND"
  | "REPO_NOT_FOUND"
  | "BRANCH_EXISTS"
  | "FORBIDDEN"
  | "GITHUB_ERROR"
  | "NETWORK"
  | "TASK_CONTEXT_INVALID"
  | "STORAGE_FAILED";

function jsonError(
  status: number,
  code: ErrorCode,
  message: string,
  details?: string,
) {
  return NextResponse.json(
    { error: { code, message, details } },
    { status },
  );
}

async function assertTaskMatchesRepo(params: {
  taskId: string;
  projectId: string;
  organizationSlug: string;
  owner: string;
  repo: string;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const rows = await db
    .select({
      githubRepoFullName: projects.githubRepoFullName,
    })
    .from(tasks)
    .innerJoin(projects, eq(tasks.projectId, projects.id))
    .innerJoin(organizations, eq(projects.organizationId, organizations.id))
    .where(
      and(
        eq(tasks.id, params.taskId),
        eq(projects.id, params.projectId),
        eq(organizations.slug, params.organizationSlug),
        isNull(tasks.archivedAt),
      ),
    )
    .limit(1);

  const row = rows[0];
  if (!row) {
    return {
      ok: false,
      message: "Task not found or does not belong to this project.",
    };
  }

  const expected = row.githubRepoFullName?.trim().toLowerCase() ?? "";
  const actual = `${params.owner}/${params.repo}`.toLowerCase();
  if (!expected || expected !== actual) {
    return {
      ok: false,
      message:
        "Repository must match the GitHub repository linked to this project.",
    };
  }

  return { ok: true };
}

function safeOwnerOrRepo(s: string): boolean {
  return /^[a-zA-Z0-9._-]+$/.test(s) && s.length > 0 && s.length < 200;
}

export async function POST(req: Request) {
  let body: CreateBranchBody;
  try {
    body = (await req.json()) as CreateBranchBody;
  } catch {
    return jsonError(400, "VALIDATION", "Invalid JSON body.");
  }

  const owner = body.owner?.trim() ?? "";
  const repo = body.repo?.trim() ?? "";
  const branchName = body.branchName?.trim() ?? "";
  const base = body.base?.trim() || "main";

  if (!safeOwnerOrRepo(owner) || !safeOwnerOrRepo(repo)) {
    return jsonError(400, "VALIDATION", "Invalid owner or repository name.");
  }
  if (!branchName || branchName.length > 255) {
    return jsonError(400, "VALIDATION", "Branch name is required.");
  }
  if (!/^[a-zA-Z0-9/_.-]+$/.test(branchName)) {
    return jsonError(
      400,
      "VALIDATION",
      "Branch name contains invalid characters.",
    );
  }
  if (!/^[a-zA-Z0-9/_.-]+$/.test(base) || !base) {
    return jsonError(400, "VALIDATION", "Invalid base branch name.");
  }

  const taskIdOpt = body.taskId?.trim() ?? "";
  const projectIdOpt = body.projectId?.trim() ?? "";
  const organizationSlugOpt = body.organizationSlug?.trim() ?? "";
  const hasAnyContext = Boolean(
    taskIdOpt || projectIdOpt || organizationSlugOpt,
  );
  const hasFullContext = Boolean(
    taskIdOpt && projectIdOpt && organizationSlugOpt,
  );
  if (hasAnyContext && !hasFullContext) {
    return jsonError(
      400,
      "VALIDATION",
      "Send taskId, projectId, and organizationSlug together to record branches.",
    );
  }

  if (hasFullContext) {
    const assert = await assertTaskMatchesRepo({
      taskId: taskIdOpt,
      projectId: projectIdOpt,
      organizationSlug: organizationSlugOpt,
      owner,
      repo,
    });
    if (!assert.ok) {
      return jsonError(400, "TASK_CONTEXT_INVALID", assert.message);
    }
  }

  const token = await getGitHubAccessToken();
  if (!token) {
    return jsonError(
      401,
      "UNAUTHORIZED",
      "Sign in with GitHub and connect your account under Integrations.",
    );
  }

  const apiBase = "https://api.github.com";
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  } as const;

  let repoCheck: Response;
  try {
    repoCheck = await fetch(
      `${apiBase}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`,
      { headers, cache: "no-store" },
    );
  } catch {
    return jsonError(
      503,
      "NETWORK",
      "Could not reach GitHub. Check your connection and try again.",
    );
  }

  if (repoCheck.status === 404) {
    return jsonError(
      404,
      "REPO_NOT_FOUND",
      `Repository ${owner}/${repo} was not found or you have no access.`,
    );
  }
  if (repoCheck.status === 403) {
    return jsonError(
      403,
      "FORBIDDEN",
      "GitHub denied access to this repository.",
    );
  }
  if (!repoCheck.ok) {
    const t = await repoCheck.text();
    return jsonError(
      repoCheck.status,
      "GITHUB_ERROR",
      "Could not access the repository on GitHub.",
      t.slice(0, 300),
    );
  }

  let refRes: Response;
  try {
    refRes = await fetch(
      `${apiBase}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/ref/heads/${encodeURIComponent(base)}`,
      { headers, cache: "no-store" },
    );
  } catch {
    return jsonError(
      503,
      "NETWORK",
      "Could not reach GitHub. Check your connection and try again.",
    );
  }

  if (refRes.status === 404) {
    return jsonError(
      404,
      "BASE_NOT_FOUND",
      `Base branch “${base}” was not found in ${owner}/${repo}.`,
    );
  }
  if (refRes.status === 403) {
    return jsonError(
      403,
      "FORBIDDEN",
      "GitHub denied access to this repository or branch.",
    );
  }
  if (!refRes.ok) {
    const text = await refRes.text();
    return jsonError(
      refRes.status,
      "GITHUB_ERROR",
      "Could not read the base branch from GitHub.",
      text.slice(0, 500),
    );
  }

  const refData = (await refRes.json()) as { object?: { sha?: string } };
  const sha = refData.object?.sha;
  if (!sha) {
    return jsonError(
      502,
      "GITHUB_ERROR",
      "Unexpected response when resolving the base branch.",
    );
  }

  let createRes: Response;
  try {
    createRes = await fetch(
      `${apiBase}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/refs`,
      {
        method: "POST",
        headers: {
          ...headers,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ref: `refs/heads/${branchName}`,
          sha,
        }),
        cache: "no-store",
      },
    );
  } catch {
    return jsonError(
      503,
      "NETWORK",
      "Could not reach GitHub while creating the branch.",
    );
  }

  const createText = await createRes.text();
  let createJson: { message?: string } = {};
  try {
    createJson = createText ? JSON.parse(createText) : {};
  } catch {
    /* ignore */
  }

  if (createRes.status === 422) {
    const msg = (createJson.message ?? createText).toLowerCase();
    if (
      msg.includes("already exists") ||
      msg.includes("reference already exists")
    ) {
      return jsonError(
        422,
        "BRANCH_EXISTS",
        `A branch named “${branchName}” already exists.`,
      );
    }
    return jsonError(
      422,
      "GITHUB_ERROR",
      createJson.message ?? "GitHub rejected the branch creation.",
      createText.slice(0, 300),
    );
  }

  if (createRes.status === 403) {
    return jsonError(
      403,
      "FORBIDDEN",
      "GitHub denied creating a branch (check repository permissions).",
    );
  }

  if (createRes.status === 404) {
    return jsonError(
      404,
      "REPO_NOT_FOUND",
      `Repository ${owner}/${repo} was not found or you have no access.`,
    );
  }

  if (!createRes.ok) {
    return jsonError(
      createRes.status,
      "GITHUB_ERROR",
      createJson.message ?? "Branch creation failed.",
      createText.slice(0, 500),
    );
  }

  const branchUrl = `https://github.com/${owner}/${repo}/tree/${encodeURIComponent(branchName)}`;
  const comparePrUrl = `https://github.com/${owner}/${repo}/compare/${encodeURIComponent(base)}...${encodeURIComponent(branchName)}?expand=1`;

  if (hasFullContext) {
    try {
      await db.insert(taskGithubBranches).values({
        taskId: taskIdOpt,
        branchName,
        branchUrl,
        repoFullName: `${owner}/${repo}`,
        baseBranch: base,
      }).onConflictDoNothing({
        target: [
          taskGithubBranches.taskId,
          taskGithubBranches.branchName,
        ],
      });
    } catch (err) {
      console.error(err);
      return jsonError(
        500,
        "STORAGE_FAILED",
        "Branch was created on GitHub but could not be saved to Radar.",
      );
    }

    revalidatePath(
      `/organizations/${organizationSlugOpt}/projects/${projectIdOpt}/tasks/${taskIdOpt}`,
    );
  }

  return NextResponse.json({
    ok: true as const,
    branchName,
    base,
    owner,
    repo,
    branchUrl,
    comparePrUrl,
    ref: `refs/heads/${branchName}`,
    persisted: hasFullContext,
  });
}
