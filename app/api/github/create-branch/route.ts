import { NextResponse } from "next/server";

import { getGitHubAccessToken } from "@/lib/github-token";

export const dynamic = "force-dynamic";

type CreateBranchBody = {
  owner: string;
  repo: string;
  branchName: string;
  base: string;
};

type ErrorCode =
  | "UNAUTHORIZED"
  | "VALIDATION"
  | "BASE_NOT_FOUND"
  | "REPO_NOT_FOUND"
  | "BRANCH_EXISTS"
  | "FORBIDDEN"
  | "GITHUB_ERROR"
  | "NETWORK";

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

  return NextResponse.json({
    ok: true as const,
    branchName,
    base,
    owner,
    repo,
    branchUrl,
    comparePrUrl,
    ref: `refs/heads/${branchName}`,
  });
}
