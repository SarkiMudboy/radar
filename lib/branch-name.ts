/**
 * Branch naming for Git integration: `{type}/{taskKey}-{slug}`.
 * Task key is stable per org + task id (Jira-style readable id without a DB sequence).
 */

export type BranchNameKind = "feature" | "bugfix" | "chore";

/** Map tags to branch prefix; tasks have no separate `type` column — use tag conventions. */
export function branchTypeFromTags(tags: string[] | null | undefined): BranchNameKind {
  if (!tags?.length) return "feature";
  const lower = new Set(tags.map((t) => t.toLowerCase()));
  if (lower.has("bug")) return "bugfix";
  if (lower.has("chore")) return "chore";
  return "feature";
}

/**
 * Stable, human-readable task key like `ACME-48291` (org prefix + numeric hash).
 */
export function getTaskKeySegment(organizationSlug: string, taskUuid: string): string {
  const prefix =
    organizationSlug
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .slice(0, 4) || "TASK";

  let h = 0;
  for (let i = 0; i < taskUuid.length; i++) {
    h = Math.imul(31, h) + taskUuid.charCodeAt(i);
  }
  const num = (Math.abs(h) % 890000) + 10000;
  return `${prefix}-${num}`;
}

export function slugifyTaskTitle(title: string, maxLen = 50): string {
  const s = title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, maxLen)
    .replace(/-+$/g, "");
  return s || "task";
}

export function generateSuggestedBranchName(params: {
  organizationSlug: string;
  taskId: string;
  title: string;
  tags: string[] | null | undefined;
}): string {
  const type = branchTypeFromTags(params.tags);
  const key = getTaskKeySegment(params.organizationSlug, params.taskId);
  const slug = slugifyTaskTitle(params.title);
  return `${type}/${key}-${slug}`;
}

export function fullBranchRef(branchName: string): string {
  return `refs/heads/${branchName}`;
}
