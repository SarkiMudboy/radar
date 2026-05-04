"use client";

import { Copy } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  fullBranchRef,
  generateSuggestedBranchName,
} from "@/lib/branch-name";
import { cn } from "@/lib/utils";

function parseRepoFullName(full: string): { owner: string; repo: string } | null {
  const t = full.trim();
  const i = t.indexOf("/");
  if (i <= 0 || i === t.length - 1) return null;
  const owner = t.slice(0, i);
  const repo = t.slice(i + 1);
  if (!owner || !repo) return null;
  return { owner, repo };
}

type ApiSuccess = {
  ok: true;
  branchName: string;
  branchUrl: string;
  comparePrUrl: string;
  ref: string;
  base?: string;
  owner?: string;
  repo?: string;
};

type ApiErrorBody = {
  error?: { code?: string; message?: string };
};

function friendlyError(code: string | undefined, message: string): string {
  switch (code) {
    case "VALIDATION":
      return message || "Invalid request.";
    case "BRANCH_EXISTS":
      return message || "A branch with this name already exists.";
    case "BASE_NOT_FOUND":
      return message || "That base branch does not exist on the repository.";
    case "REPO_NOT_FOUND":
      return message || "Repository was not found or you have no access.";
    case "FORBIDDEN":
      return message || "Permission denied. Check GitHub repository access.";
    case "UNAUTHORIZED":
      return message || "Sign in with GitHub under Integrations.";
    case "NETWORK":
      return message || "Network error. Try again.";
    case "TASK_CONTEXT_INVALID":
      return message || "This task or repository does not match the project.";
    case "STORAGE_FAILED":
      return (
        message ||
        "Branch was created on GitHub but could not be saved. Refresh the page."
      );
    default:
      return message || "Something went wrong.";
  }
}

export function CreateBranchDialog({
  organizationSlug,
  projectId,
  taskId,
  taskTitle,
  tags,
  repositories,
}: {
  organizationSlug: string;
  projectId: string;
  taskId: string;
  taskTitle: string;
  tags: string[] | null;
  /** Full names `owner/repo` from project context — do not fetch here. */
  repositories: string[];
}) {
  const router = useRouter();
  const baseId = useId();
  const branchInputId = `${baseId}-branch`;
  const [open, setOpen] = useState(false);

  const suggested = useMemo(
    () =>
      generateSuggestedBranchName({
        organizationSlug,
        taskId,
        title: taskTitle,
        tags,
      }),
    [organizationSlug, taskId, taskTitle, tags],
  );

  const [selectedRepoFull, setSelectedRepoFull] = useState(
    () => repositories[0] ?? "",
  );
  const [baseBranch, setBaseBranch] = useState("main");
  const [branchName, setBranchName] = useState(suggested);
  const [userEditedBranchName, setUserEditedBranchName] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<ApiSuccess | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSelectedRepoFull(repositories[0] ?? "");
  }, [open, repositories]);

  useEffect(() => {
    if (!open || userEditedBranchName) return;
    setBranchName(suggested);
  }, [open, suggested, userEditedBranchName]);

  useEffect(() => {
    if (!open || success) return;
    const t = window.setTimeout(() => {
      const el = document.getElementById(branchInputId);
      if (el instanceof HTMLInputElement) {
        el.focus();
        el.select();
      }
    }, 0);
    return () => window.clearTimeout(t);
  }, [open, success, branchInputId]);

  const resetForOpen = useCallback(() => {
    setUserEditedBranchName(false);
    setBranchName(suggested);
    setBaseBranch("main");
    setError(null);
    setSuccess(null);
    setCopied(false);
    setSelectedRepoFull(repositories[0] ?? "");
  }, [suggested, repositories]);

  const handleOpenChange = useCallback(
    (next: boolean) => {
      setOpen(next);
      if (next) {
        resetForOpen();
      }
    },
    [resetForOpen],
  );

  const onBranchInputChange = useCallback((value: string) => {
    setBranchName(value);
    setUserEditedBranchName(true);
  }, []);

  const submit = useCallback(async () => {
    setError(null);
    const parsed = parseRepoFullName(selectedRepoFull);
    if (!parsed) {
      setError("Choose a valid repository.");
      return;
    }
    const trimmed = branchName.trim();
    if (!trimmed) {
      setError("Branch name is required.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/github/create-branch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          owner: parsed.owner,
          repo: parsed.repo,
          branchName: trimmed,
          base: baseBranch.trim() || "main",
          taskId,
          projectId,
          organizationSlug,
        }),
      });

      let data: Record<string, unknown>;
      try {
        data = (await res.json()) as Record<string, unknown>;
      } catch {
        setError("Unexpected response from server.");
        return;
      }

      if (
        !res.ok ||
        !data ||
        typeof data !== "object" ||
        data.ok !== true
      ) {
        const err = data as ApiErrorBody | undefined;
        const code = err?.error?.code;
        const msg = err?.error?.message ?? "";
        setError(friendlyError(code, msg));
        return;
      }

      setSuccess(data as unknown as ApiSuccess);
      router.refresh();
    } catch {
      setError(friendlyError("NETWORK", ""));
    } finally {
      setLoading(false);
    }
  }, [
    baseBranch,
    branchName,
    organizationSlug,
    projectId,
    router,
    selectedRepoFull,
    taskId,
  ]);

  const onFormSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      void submit();
    },
    [submit],
  );

  const copyBranchName = useCallback(async () => {
    const name = success?.branchName ?? branchName.trim();
    if (!name) return;
    try {
      await navigator.clipboard.writeText(name);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }, [success, branchName]);

  const canUse = repositories.length > 0;
  const showRepoSelect = repositories.length > 1;
  const previewRef = fullBranchRef(branchName.trim() || suggested);

  return (
    <>
      <Button
        type="button"
        variant="outline"
        disabled={!canUse}
        title={
          !canUse
            ? "Link a GitHub repository to this project first (Edit project)."
            : undefined
        }
        onClick={() => handleOpenChange(true)}
      >
        Create Branch
      </Button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-lg" showCloseButton={!loading}>
          <DialogHeader>
            <DialogTitle>Create branch</DialogTitle>
            <DialogDescription>
              Creates a branch from your repo’s base branch using your GitHub
              connection. Prefix is{" "}
              <span className="text-foreground font-medium">feature</span> by
              default; add a{" "}
              <span className="text-foreground font-medium">bug</span> or{" "}
              <span className="text-foreground font-medium">chore</span> tag on
              the task for <span className="font-medium">bugfix/</span> or{" "}
              <span className="font-medium">chore/</span>.
            </DialogDescription>
          </DialogHeader>

          {success ? (
            <div className="space-y-4">
              <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-800 dark:text-emerald-200">
                Branch created successfully.
              </p>
              <div>
                <p className="text-muted-foreground text-xs">Branch name</p>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <code className="bg-muted rounded px-2 py-1 text-sm">
                    {success.branchName}
                  </code>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    className="size-7"
                    onClick={() => void copyBranchName()}
                    aria-label="Copy branch name"
                  >
                    <Copy className="size-3.5" />
                  </Button>
                  {copied ? (
                    <span className="text-muted-foreground text-xs">Copied</span>
                  ) : null}
                </div>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button type="button" render={<a href={success.branchUrl} />}>
                  View branch on GitHub
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  render={<a href={success.comparePrUrl} />}
                >
                  Open pull request
                </Button>
              </div>
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => handleOpenChange(false)}
              >
                Close
              </Button>
            </div>
          ) : (
            <form onSubmit={onFormSubmit} className="space-y-4">
              {error ? (
                <p
                  className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
                  role="alert"
                >
                  {error}
                </p>
              ) : null}

              {showRepoSelect ? (
                <div className="flex flex-col gap-2">
                  <Label htmlFor={`${baseId}-repo`}>Repository</Label>
                  <select
                    id={`${baseId}-repo`}
                    className={cn(
                      "h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30",
                    )}
                    value={selectedRepoFull}
                    onChange={(e) => setSelectedRepoFull(e.target.value)}
                    disabled={loading}
                  >
                    {repositories.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <p className="text-muted-foreground text-xs">Repository</p>
                  <p className="mt-0.5 font-mono text-sm">
                    {repositories[0] ?? "—"}
                  </p>
                </div>
              )}

              <div className="flex flex-col gap-2">
                <Label htmlFor={`${baseId}-base`}>Base branch</Label>
                <Input
                  id={`${baseId}-base`}
                  value={baseBranch}
                  onChange={(e) => setBaseBranch(e.target.value)}
                  placeholder="main"
                  autoComplete="off"
                  disabled={loading}
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor={`${baseId}-branch`}>Branch name</Label>
                <Input
                  id={branchInputId}
                  value={branchName}
                  onChange={(e) => onBranchInputChange(e.target.value)}
                  placeholder={suggested}
                  autoComplete="off"
                  disabled={loading}
                  name="branchName"
                />
              </div>

              <div className="rounded-lg border border-border bg-muted/30 px-3 py-2">
                <p className="text-muted-foreground text-xs">Preview</p>
                <code className="mt-1 block break-all text-xs">{previewRef}</code>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={loading}
                  onClick={() => handleOpenChange(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? "Creating…" : "Create Branch"}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
