"use client";

import { useRouter } from "next/navigation";
import { useActionState, useCallback, useId, useState } from "react";

import { updateProject } from "@/app/actions/projects";
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

export type EditableProjectFields = {
  id: string;
  name: string;
  description: string | null;
  boardUrl: string | null;
  prdPdfUrl: string | null;
  ownerUserId: string | null;
  startDate: Date | null;
  endDate: Date | null;
};

function toDateInputValue(value: Date | null | undefined): string {
  if (!value) return "";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function EditProjectForm({
  organizationSlug,
  project,
  collaboratorUserIds,
  users,
  onSuccess,
}: {
  organizationSlug: string;
  project: EditableProjectFields;
  collaboratorUserIds: string[];
  users: { id: string; name: string; email: string }[];
  onSuccess: () => void;
}) {
  const prdInputId = useId();
  const [state, formAction, pending] = useActionState(updateProject, null);
  const [prdPdfUrl, setPrdPdfUrl] = useState<string>(project.prdPdfUrl ?? "");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string>("");

  useServerActionFeedback(state, {
    successMessage: "Project updated",
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
      setUploadError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input name="organizationSlug" type="hidden" value={organizationSlug} />
      <input name="projectId" type="hidden" value={project.id} />
      <input name="prdPdfUrl" type="hidden" value={prdPdfUrl} />
      <div className="flex flex-col gap-2">
        <Label htmlFor="edit-project-name">Name</Label>
        <Input
          id="edit-project-name"
          name="name"
          required
          defaultValue={project.name}
          autoComplete="off"
          disabled={pending || uploading}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="edit-project-owner">Owner (optional)</Label>
        <select
          id="edit-project-owner"
          name="ownerUserId"
          defaultValue={project.ownerUserId ?? ""}
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
        <Label htmlFor="edit-project-collaborators">Collaborators (optional)</Label>
        <select
          id="edit-project-collaborators"
          name="collaboratorIds"
          multiple
          className={cn(
            "min-h-24 w-full rounded-lg border border-input bg-transparent p-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30",
          )}
          defaultValue={collaboratorUserIds}
          disabled={pending || uploading || users.length === 0}
        >
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name} ({u.email})
            </option>
          ))}
        </select>
        <p className="text-muted-foreground text-xs">
          Hold Ctrl/Cmd to select multiple. Owner is added automatically when
          set.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="edit-project-start-date">Start date (optional)</Label>
          <Input
            id="edit-project-start-date"
            name="startDate"
            type="date"
            defaultValue={toDateInputValue(project.startDate)}
            disabled={pending || uploading}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="edit-project-end-date">End date (optional)</Label>
          <Input
            id="edit-project-end-date"
            name="endDate"
            type="date"
            defaultValue={toDateInputValue(project.endDate)}
            disabled={pending || uploading}
          />
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="edit-project-description">Description (optional)</Label>
        <textarea
          id="edit-project-description"
          name="description"
          rows={3}
          defaultValue={project.description ?? ""}
          placeholder="Short summary"
          className={cn(
            "min-h-18 w-full resize-y rounded-lg border border-input bg-transparent px-2.5 py-2 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm dark:bg-input/30",
          )}
          disabled={pending || uploading}
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
            <p className="text-sm truncate">PRD attached</p>
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
        <Label htmlFor="edit-project-board-url">Board URL (optional)</Label>
        <Input
          id="edit-project-board-url"
          name="boardUrl"
          type="url"
          defaultValue={project.boardUrl ?? ""}
          placeholder="https://…"
          autoComplete="off"
          disabled={pending || uploading}
        />
      </div>
      <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button
          type="submit"
          disabled={pending || uploading}
          className="w-full sm:w-auto"
        >
          {pending ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}

export function EditProjectDialog({
  organizationSlug,
  project,
  collaboratorUserIds,
  users,
}: {
  organizationSlug: string;
  project: EditableProjectFields;
  collaboratorUserIds: string[];
  users: { id: string; name: string; email: string }[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [formKey, setFormKey] = useState(0);

  const handleSuccess = useCallback(() => {
    setOpen(false);
    router.refresh();
  }, [router]);

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
      <Button type="button" variant="outline" onClick={() => setOpen(true)}>
        Edit project
      </Button>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit project</DialogTitle>
          <DialogDescription>
            Update project details, collaborators, and dates. Names must stay
            unique within this organization.
          </DialogDescription>
        </DialogHeader>
        <EditProjectForm
          key={formKey}
          organizationSlug={organizationSlug}
          project={project}
          collaboratorUserIds={collaboratorUserIds}
          users={users}
          onSuccess={handleSuccess}
        />
      </DialogContent>
    </Dialog>
  );
}
