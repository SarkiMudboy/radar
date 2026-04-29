/** Normalize optional website URL for a project. */
export function normalizeProjectUrl(raw: string): {
  value: string | null;
  error?: string;
} {
  const s = raw.trim();
  if (!s) return { value: null };
  try {
    const u = new URL(s);
    if (u.protocol !== "http:" && u.protocol !== "https:") {
      return {
        value: null,
        error: "Project URL must start with http:// or https://.",
      };
    }
    return { value: u.href };
  } catch {
    return { value: null, error: "Invalid project URL." };
  }
}

/** Normalize optional `owner/repo` string from UI or API. */
export function normalizeGithubRepoFullName(raw: string): {
  value: string | null;
  error?: string;
} {
  const s = raw.trim();
  if (!s) return { value: null };
  if (!/^[\w.-]+\/[\w.-]+$/.test(s)) {
    return {
      value: null,
      error: 'Repository must look like "owner/repo" (letters, numbers, ., -, _).',
    };
  }
  return { value: s };
}
