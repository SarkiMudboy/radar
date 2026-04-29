"use client";

import { useActionState, useCallback, useId, useState } from "react";
import { useRouter } from "next/navigation";

import { createTask } from "@/app/actions/tasks";
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
import { MILESTONE_STATUS_LABELS } from "@/lib/milestone-status";
import type { MilestoneStatus } from "@/lib/milestone-status";
import { TASK_SEVERITIES, TASK_SEVERITY_LABELS } from "@/lib/task-severity";
import { cn } from "@/lib/utils";

const selectClass = cn(
  "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30",
);

const textareaClass = cn(
  "min-h-16 w-full resize-y rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30",
);

function groupLabel(status: MilestoneStatus) {
  return status === "not_started" ? "Backlog" : MILESTONE_STATUS_LABELS[status];
}

function AddSubtaskForm({
  organizationSlug,
  projectId,
  parentTaskId,
  users,
  lockedStatus,
  onSuccess,
  onCancel,
}: {
  organizationSlug: string;
  projectId: string;
  parentTaskId: string;
  users: { id: string; name: string; email: string }[];
  lockedStatus: MilestoneStatus;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const router = useRouter();
  const titleId = useId();
  const descId = useId();
  const severityId = useId();
  const dueId = useId();
  const assigneeId = useId();
  const tagsId = useId();
  const blockersId = useId();

  const [state, formAction, pending] = useActionState(createTask, null);

  const handleCreated = useCallback(() => {
    router.refresh();
    onSuccess();
  }, [router, onSuccess]);

  useServerActionFeedback(state, {
    successMessage: "Subtask created",
    onSuccess: handleCreated,
  });

  return (
    <form action={formAction} className="mt-2 flex flex-col gap-4">
      <input name="organizationSlug" type="hidden" value={organizationSlug} />
      <input name="projectId" type="hidden" value={projectId} />
      <input name="parentTaskId" type="hidden" value={parentTaskId} />
      <input name="status" type="hidden" value={lockedStatus} />
      <input name="progressPct" type="hidden" value="0" />

      <div className="flex flex-col gap-2">
        <Label htmlFor={titleId}>Title</Label>
        <Input
          id={titleId}
          name="title"
          required
          placeholder="Subtask title"
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
          placeholder="Context, acceptance criteria…"
          className={textareaClass}
          disabled={pending}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor={severityId}>Priority</Label>
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
          <Label htmlFor={dueId}>Due date (optional)</Label>
          <Input id={dueId} name="dueDate" type="date" disabled={pending} />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor={assigneeId}>Assignees (optional)</Label>
        <select
          id={assigneeId}
          name="assigneeIds"
          multiple
          className={cn(
            "min-h-24 w-full rounded-lg border border-input bg-transparent p-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30",
          )}
          disabled={pending || users.length === 0}
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

      <div className="flex flex-col gap-2">
        <Label htmlFor={tagsId}>Tags (optional)</Label>
        <Input
          id={tagsId}
          name="tags"
          placeholder="api, ui… (comma-separated)"
          autoComplete="off"
          disabled={pending}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor={blockersId}>Blockers (optional)</Label>
        <textarea
          id={blockersId}
          name="blockers"
          rows={2}
          placeholder="One per line"
          className={textareaClass}
          disabled={pending}
        />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button
          type="button"
          variant="outline"
          disabled={pending}
          onClick={onCancel}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "Creating…" : "Create subtask"}
        </Button>
      </div>
    </form>
  );
}

export function AddSubtaskDialog({
  organizationSlug,
  projectId,
  parentTaskId,
  parentTaskTitle,
  users,
  lockedStatus,
  open,
  onOpenChange,
}: {
  organizationSlug: string;
  projectId: string;
  parentTaskId: string;
  parentTaskTitle: string;
  users: { id: string; name: string; email: string }[];
  lockedStatus: MilestoneStatus;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [formKey, setFormKey] = useState(0);

  const handleSuccess = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (next) setFormKey((k) => k + 1);
      }}
    >
      <DialogContent className="max-h-[min(90dvh,48rem)] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add subtask · {groupLabel(lockedStatus)}</DialogTitle>
          <DialogDescription>
            This subtask will be created under{" "}
            <span className="text-foreground font-medium">{parentTaskTitle}</span>.
          </DialogDescription>
        </DialogHeader>
        <AddSubtaskForm
          key={formKey}
          organizationSlug={organizationSlug}
          projectId={projectId}
          parentTaskId={parentTaskId}
          users={users}
          lockedStatus={lockedStatus}
          onSuccess={handleSuccess}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

