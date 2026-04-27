"use client";

import { useActionState, useCallback, useId, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { updateTask } from "@/app/actions/tasks";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useServerActionFeedback } from "@/hooks/use-server-action-feedback";
import { TASK_SEVERITIES, TASK_SEVERITY_LABELS, type TaskSeverity } from "@/lib/task-severity";
import { cn } from "@/lib/utils";
import type { MilestoneStatus } from "@/lib/milestone-status";
import { MILESTONE_STATUS_LABELS, MILESTONE_STATUSES } from "@/lib/milestone-status";

const selectClass = cn(
  "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30",
);

const textareaClass = cn(
  "min-h-16 w-full resize-y rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30",
);

function toDateInputValue(value: Date | null | undefined): string {
  if (!value) return "";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export type EditableTask = {
  id: string;
  title: string;
  description: string | null;
  status: MilestoneStatus;
  severity: TaskSeverity;
  tags: string[] | null;
  dueDate: Date | null;
  progressPct: number;
  parentTaskId: string | null;
  assigneeIds: string[];
  blockers: string[];
};

export function EditTaskDialog({
  organizationSlug,
  projectId,
  task,
  users,
  parentTaskOptions,
}: {
  organizationSlug: string;
  projectId: string;
  task: EditableTask;
  users: { id: string; name: string; email: string }[];
  parentTaskOptions: { id: string; title: string }[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [formKey, setFormKey] = useState(0);

  const titleId = useId();
  const descId = useId();
  const statusId = useId();
  const severityId = useId();
  const dueId = useId();
  const assigneeId = useId();
  const tagsId = useId();
  const blockersId = useId();
  const parentId = useId();
  const progressId = useId();

  const [state, formAction, pending] = useActionState(updateTask, null);

  const handleSuccess = useCallback(() => {
    setOpen(false);
    router.refresh();
  }, [router]);

  useServerActionFeedback(state, {
    successMessage: "Task updated",
    onSuccess: handleSuccess,
  });

  const blockerText = useMemo(() => task.blockers.join("\n"), [task.blockers]);
  const tagsText = useMemo(() => (task.tags ?? []).join(", "), [task.tags]);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setFormKey((k) => k + 1);
      }}
    >
      <Button type="button" variant="outline" onClick={() => setOpen(true)}>
        Edit task
      </Button>
      <DialogContent className="max-h-[min(90dvh,52rem)] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit task</DialogTitle>
          <DialogDescription>Update details, assignees, and due date.</DialogDescription>
        </DialogHeader>
        <form key={formKey} action={formAction} className="mt-2 flex flex-col gap-4">
          <input name="organizationSlug" type="hidden" value={organizationSlug} />
          <input name="projectId" type="hidden" value={projectId} />
          <input name="taskId" type="hidden" value={task.id} />

          <div className="flex flex-col gap-2">
            <Label htmlFor={titleId}>Title</Label>
            <Input
              id={titleId}
              name="title"
              required
              defaultValue={task.title}
              autoComplete="off"
              disabled={pending}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor={descId}>Description (optional)</Label>
            <textarea
              id={descId}
              name="description"
              rows={3}
              defaultValue={task.description ?? ""}
              className={textareaClass}
              disabled={pending}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor={statusId}>Stage</Label>
              <select
                id={statusId}
                name="status"
                className={selectClass}
                defaultValue={task.status}
                disabled={pending}
              >
                {MILESTONE_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s === "not_started" ? "Backlog" : MILESTONE_STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor={severityId}>Severity</Label>
              <select
                id={severityId}
                name="severity"
                className={selectClass}
                defaultValue={task.severity}
                disabled={pending}
              >
                {TASK_SEVERITIES.map((s) => (
                  <option key={s} value={s}>
                    {TASK_SEVERITY_LABELS[s]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor={dueId}>Due date (optional)</Label>
              <Input
                id={dueId}
                name="dueDate"
                type="date"
                defaultValue={toDateInputValue(task.dueDate)}
                disabled={pending}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor={progressId}>Progress (0–100)</Label>
              <Input
                id={progressId}
                name="progressPct"
                type="number"
                min={0}
                max={100}
                defaultValue={task.progressPct}
                disabled={pending}
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor={assigneeId}>Assignees (optional)</Label>
            <select
              id={assigneeId}
              name="assigneeIds"
              multiple
              defaultValue={task.assigneeIds}
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
              defaultValue={tagsText}
              placeholder="api, ui… (comma-separated)"
              autoComplete="off"
              disabled={pending}
            />
          </div>

          {parentTaskOptions.length > 0 ? (
            <div className="flex flex-col gap-2">
              <Label htmlFor={parentId}>Sub-task of (optional)</Label>
              <select
                id={parentId}
                name="parentTaskId"
                className={selectClass}
                defaultValue={task.parentTaskId ?? ""}
                disabled={pending}
              >
                <option value="">Top-level task</option>
                {parentTaskOptions
                  .filter((t) => t.id !== task.id)
                  .map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title}
                    </option>
                  ))}
              </select>
            </div>
          ) : null}

          <div className="flex flex-col gap-2">
            <Label htmlFor={blockersId}>Blockers (optional)</Label>
            <textarea
              id={blockersId}
              name="blockers"
              rows={3}
              defaultValue={blockerText}
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
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

