"use client";

import { useActionState, useCallback, useId } from "react";
import { useRouter } from "next/navigation";

import { createIssue } from "@/app/actions/issues";
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
import { TASK_SEVERITIES, TASK_SEVERITY_LABELS } from "@/lib/task-severity";
import { cn } from "@/lib/utils";

const selectClass = cn(
  "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30",
);

const textareaClass = cn(
  "min-h-16 w-full resize-y rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30",
);

function CreateIssueForm({
  organizationSlug,
  projectId,
  tasks,
  users,
  reporterUserId,
  lockedAffectedTaskId,
  lockedAffectedTaskTitle,
  onSuccess,
  onCancel,
}: {
  organizationSlug: string;
  projectId: string;
  tasks: { id: string; title: string }[];
  users: { id: string; name: string; email: string }[];
  reporterUserId: string | null;
  lockedAffectedTaskId?: string | null;
  lockedAffectedTaskTitle?: string | null;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const router = useRouter();
  const nameId = useId();
  const descId = useId();
  const taskId = useId();
  const assigneeId = useId();
  const severityId = useId();
  const reporterId = useId();

  const [state, formAction, pending] = useActionState(createIssue, null);

  const handleCreated = useCallback(() => {
    router.refresh();
    onSuccess();
  }, [router, onSuccess]);

  useServerActionFeedback(state, {
    successMessage: "Issue created",
    onSuccess: handleCreated,
  });

  return (
    <form action={formAction} className="mt-2 flex flex-col gap-4">
      <input name="organizationSlug" type="hidden" value={organizationSlug} />
      <input name="projectId" type="hidden" value={projectId} />
      {lockedAffectedTaskId ? (
        <input name="affectedTaskId" type="hidden" value={lockedAffectedTaskId} />
      ) : null}

      <div className="flex flex-col gap-2">
        <Label htmlFor={nameId}>Name</Label>
        <Input
          id={nameId}
          name="name"
          required
          placeholder="Issue name"
          autoComplete="off"
          disabled={pending}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor={descId}>Description (optional)</Label>
        <textarea
          id={descId}
          name="description"
          rows={2}
          placeholder="Steps to reproduce, expected vs actual…"
          className={textareaClass}
          disabled={pending}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor={taskId}>Affected task (optional)</Label>
          {lockedAffectedTaskId ? (
            <div className="rounded-lg border border-border bg-muted/20 px-2.5 py-2 text-sm">
              <div className="font-medium text-foreground">
                {lockedAffectedTaskTitle ?? "Selected task"}
              </div>
              <div className="text-muted-foreground mt-0.5 text-xs">
                This issue will be attached to this task.
              </div>
            </div>
          ) : (
            <select
              id={taskId}
              name="affectedTaskId"
              className={selectClass}
              defaultValue=""
              disabled={pending || tasks.length === 0}
            >
              <option value="">None</option>
              {tasks.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor={assigneeId}>Assignee (optional)</Label>
          <select
            id={assigneeId}
            name="assigneeUserId"
            className={selectClass}
            defaultValue=""
            disabled={pending || users.length === 0}
          >
            <option value="">Unassigned</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} ({u.email})
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor={severityId}>Severity</Label>
          <select
            id={severityId}
            name="severity"
            className={selectClass}
            defaultValue="medium"
            disabled={pending}
          >
            {TASK_SEVERITIES.map((s) => (
              <option key={s} value={s}>
                {TASK_SEVERITY_LABELS[s]}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor={reporterId}>Reporter</Label>
          <select
            id={reporterId}
            name="reporterUserId"
            className={selectClass}
            defaultValue={reporterUserId ?? ""}
            disabled={pending}
          >
            <option value="">
              {reporterUserId ? "Reporter" : "Select reporter"}
            </option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} ({u.email})
              </option>
            ))}
          </select>
          <p className="text-muted-foreground text-xs">
            Defaults to the signed-in user if their email matches a workspace member.
          </p>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button
          type="button"
          variant="outline"
          disabled={pending}
          onClick={() => onCancel()}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "Creating…" : "Create issue"}
        </Button>
      </div>
    </form>
  );
}

export function CreateIssueDialog({
  organizationSlug,
  projectId,
  tasks,
  users,
  reporterUserId,
  lockedAffectedTaskId,
  lockedAffectedTaskTitle,
  open,
  onOpenChange,
}: {
  organizationSlug: string;
  projectId: string;
  tasks: { id: string; title: string }[];
  users: { id: string; name: string; email: string }[];
  reporterUserId: string | null;
  lockedAffectedTaskId?: string | null;
  lockedAffectedTaskTitle?: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const handleSuccess = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[min(90dvh,48rem)] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create issue</DialogTitle>
          <DialogDescription>
            Log QA findings and attach them to a task when applicable.
          </DialogDescription>
        </DialogHeader>
        <CreateIssueForm
          organizationSlug={organizationSlug}
          projectId={projectId}
          tasks={tasks}
          users={users}
          reporterUserId={reporterUserId}
          lockedAffectedTaskId={lockedAffectedTaskId}
          lockedAffectedTaskTitle={lockedAffectedTaskTitle}
          onSuccess={handleSuccess}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

