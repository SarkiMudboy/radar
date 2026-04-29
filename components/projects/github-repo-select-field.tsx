"use client";

import Link from "next/link";
import { useEffect, useId, useState } from "react";

import { listGitHubReposForSession } from "@/app/actions/github-repos";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const selectClass = cn(
  "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30",
);

export function GitHubRepoSelectField({
  disabled,
  defaultFullName,
}: {
  disabled?: boolean;
  defaultFullName: string | null;
}) {
  const id = useId();
  const [loading, setLoading] = useState(true);
  const [repos, setRepos] = useState<{ fullName: string; private: boolean }[]>(
    [],
  );
  const [loadError, setLoadError] = useState<
    "NOT_CONNECTED" | "API_ERROR" | null
  >(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    void listGitHubReposForSession().then((result) => {
      if (cancelled) return;
      setLoading(false);
      if (!result.ok) {
        setLoadError(result.error);
        setRepos([]);
        return;
      }
      setRepos(result.repos);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const inList = new Set(repos.map((r) => r.fullName));
  const savedButNotListed =
    defaultFullName && !inList.has(defaultFullName) ? defaultFullName : null;

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>GitHub repository (optional)</Label>
      <p className="text-muted-foreground text-xs">
        Used later for branch automation. Choose a repo you can push to with your
        connected GitHub account.
      </p>

      {loading ? (
        <p className="text-muted-foreground text-sm" id={id}>
          Loading repositories…
        </p>
      ) : loadError === "NOT_CONNECTED" || loadError === "API_ERROR" ? (
        <>
          {loadError === "NOT_CONNECTED" ? (
            <p className="text-muted-foreground text-xs">
              <Link href="/integrations" className="text-primary underline">
                Connect GitHub
              </Link>{" "}
              to load your repositories, or type{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-[0.7rem]">
                owner/repo
              </code>{" "}
              manually.
            </p>
          ) : (
            <p className="text-destructive text-xs">
              Could not load repositories from GitHub. You can still enter{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-[0.7rem]">
                owner/repo
              </code>{" "}
              below.
            </p>
          )}
          <Input
            id={id}
            name="githubRepoFullName"
            defaultValue={defaultFullName ?? ""}
            placeholder="octocat/Hello-World"
            autoComplete="off"
            disabled={disabled}
          />
        </>
      ) : (
        <select
          id={id}
          name="githubRepoFullName"
          className={selectClass}
          defaultValue={defaultFullName ?? ""}
          disabled={disabled}
        >
          <option value="">None</option>
          {savedButNotListed ? (
            <option value={savedButNotListed}>
              {savedButNotListed} (current)
            </option>
          ) : null}
          {repos.map((r) => (
            <option key={r.fullName} value={r.fullName}>
              {r.fullName}
              {r.private ? " · private" : ""}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
