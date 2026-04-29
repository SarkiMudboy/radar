"use client";

import { useActionState, useCallback, useId, useState } from "react";

import { createProject } from "@/app/actions/projects";
import { GitHubRepoSelectField } from "@/components/projects/github-repo-select-field";
import { useServerActionFeedback } from "@/hooks/use-server-action-feedback";
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
import { cn } from "@/lib/utils";

function AddProjectForm({
  organizationId,
  organizationSlug,
  users,
  onSuccess,
}: {
  organizationId: string;
  organizationSlug: string;
  users: { id: string; name: string; email: string }[];
  onSuccess: () => void;
}) {
  const prdInputId = useId();
  const [state, formAction, pending] = useActionState(createProject, null);
  const [prdPdfUrl, setPrdPdfUrl] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string>("");

  useServerActionFeedback(state, {
    successMessage: "Project created",
    onSuccess,
  });

  async function uploadPrd(file: File) {
    setUploading(true);
    setUploadError("");
    try {
      const body = new FormData();
      body.set("file", file);
      const res = await fetch("/api/uploads/project-prd", {
        method: "POST",
        body,
      });
      const json = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !json.url) {
        throw new Error(json.error || "Upload failed.");
      }
      setPrdPdfUrl(json.url);
    } catch (e) {
      setPrdPdfUrl("");
      setUploadError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input name="organizationId" type="hidden" value={organizationId} />
      <input name="organizationSlug" type="hidden" value={organizationSlug} />
      <input name="prdPdfUrl" type="hidden" value={prdPdfUrl} />
      <div className="flex flex-col gap-2">
        <Label htmlFor="project-name">Name</Label>
        <Input
          id="project-name"
          name="name"
          required
          placeholder="Radar MVP"
          autoComplete="off"
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="project-owner">Owner (optional)</Label>
        <select
          id="project-owner"
          name="ownerUserId"
          defaultValue=""
          className={cn(
            "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm dark:bg-input/30",
          )}
          disabled={pending || uploading || users.length === 0}
        >
          <option value="">
            {users.length === 0 ? "No users in this org yet" : "Unassigned"}
          </option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name} ({u.email})
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="project-collaborators">Collaborators (optional)</Label>
        <select
          id="project-collaborators"
          name="collaboratorIds"
          multiple
          className={cn(
            "min-h-24 w-full rounded-lg border border-input bg-transparent p-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30",
          )}
          disabled={pending || uploading || users.length === 0}
        >
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name} ({u.email})
            </option>
          ))}
        </select>
        <p className="text-muted-foreground text-xs">
          Hold Ctrl/Cmd to select multiple.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="project-start-date">Start date (optional)</Label>
          <Input id="project-start-date" name="startDate" type="date" />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="project-end-date">End date (optional)</Label>
          <Input id="project-end-date" name="endDate" type="date" />
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="project-description">Description (optional)</Label>
        <textarea
          id="project-description"
          name="description"
          rows={3}
          placeholder="Short summary"
          className={cn(
            "min-h-18 w-full resize-y rounded-lg border border-input bg-transparent px-2.5 py-2 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm dark:bg-input/30",
          )}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor={prdInputId}>PRD PDF (optional)</Label>
        <Input
          id={prdInputId}
          type="file"
          accept="application/pdf"
          disabled={pending || uploading}
          onChange={(e) => {
            const f = e.currentTarget.files?.[0];
            if (f) void uploadPrd(f);
          }}
        />
        {uploadError ? (
          <p className="text-destructive text-sm" role="alert">
            {uploadError}
          </p>
        ) : null}
        {prdPdfUrl ? (
          <div className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2">
            <p className="text-sm truncate">PRD uploaded</p>
            <div className="flex shrink-0 items-center gap-2">
              <a
                href={prdPdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary text-sm underline-offset-4 hover:underline"
              >
                View
              </a>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setPrdPdfUrl("")}
                disabled={pending || uploading}
              >
                Remove
              </Button>
            </div>
          </div>
        ) : null}
        {uploading ? (
          <p className="text-muted-foreground text-sm">Uploading…</p>
        ) : null}
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="project-project-url">Project URL (optional)</Label>
        <Input
          id="project-project-url"
          name="projectUrl"
          type="url"
          placeholder="https://product.example.com"
          autoComplete="off"
        />
        <p className="text-muted-foreground text-xs">
          Public website or product link for this project.
        </p>
      </div>
      <GitHubRepoSelectField disabled={pending || uploading} defaultFullName={null} />
      <div className="flex flex-col gap-2">
        <Label htmlFor="project-board-url">Board URL (optional)</Label>
        <Input
          id="project-board-url"
          name="boardUrl"
          type="url"
          placeholder="https://…"
          autoComplete="off"
        />
      </div>
      <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button
          type="submit"
          disabled={pending || uploading}
          className="w-full sm:w-auto"
        >
          {pending ? "Adding…" : "Add project"}
        </Button>
      </div>
    </form>
  );
}

export function AddProjectDialog({
  organizationId,
  organizationSlug,
  users,
}: {
  organizationId: string;
  organizationSlug: string;
  users: { id: string; name: string; email: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [formKey, setFormKey] = useState(0);

  const handleSuccess = useCallback(() => {
    setOpen(false);
  }, []);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          setFormKey((k) => k + 1);
        }
      }}
    >
      <Button type="button" onClick={() => setOpen(true)}>
        Add project
      </Button>
      <DialogContent className="max-h-[min(90dvh,44rem)] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New project</DialogTitle>
          <DialogDescription>
            Projects belong to this organization. Names must be unique here.
          </DialogDescription>
        </DialogHeader>
        <AddProjectForm
          key={formKey}
          organizationId={organizationId}
          organizationSlug={organizationSlug}
          users={users}
          onSuccess={handleSuccess}
        />
      </DialogContent>
    </Dialog>
  );
}
