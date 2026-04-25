"use client";

import { useActionState, useCallback, useId, useState } from "react";

import { updateMilestone } from "@/app/actions/milestones";
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
import {
  MILESTONE_STATUS_LABELS,
  MILESTONE_STATUSES,
  type MilestoneStatus,
} from "@/lib/milestone-status";
import { cn } from "@/lib/utils";

const textareaClass = cn(
  "min-h-18 w-full resize-y rounded-lg border border-input bg-transparent px-2.5 py-2 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm dark:bg-input/30",
);

const selectClass = cn(
  "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm dark:bg-input/30",
);

function EditMilestoneFormBody({
  organizationSlug,
  projectId,
  milestoneId,
  initialName,
  initialDescription,
  initialTimeline,
  initialStatus,
  onSuccess,
}: {
  organizationSlug: string;
  projectId: string;
  milestoneId: string;
  initialName: string;
  initialDescription: string | null;
  initialTimeline: string | null;
  initialStatus: MilestoneStatus;
  onSuccess: () => void;
}) {
  const nameId = useId();
  const descriptionId = useId();
  const timelineId = useId();
  const statusId = useId();
  const [state, formAction, pending] = useActionState(updateMilestone, null);

  useServerActionFeedback(state, {
    successMessage: "Milestone updated",
    onSuccess,
  });

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input name="organizationSlug" type="hidden" value={organizationSlug} />
      <input name="projectId" type="hidden" value={projectId} />
      <input name="milestoneId" type="hidden" value={milestoneId} />
      <div className="flex flex-col gap-2">
        <Label htmlFor={nameId}>Name</Label>
        <Input
          id={nameId}
          name="name"
          required
          defaultValue={initialName}
          autoComplete="off"
          disabled={pending}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor={descriptionId}>Description</Label>
        <textarea
          id={descriptionId}
          name="description"
          rows={3}
          defaultValue={initialDescription ?? ""}
          className={textareaClass}
          disabled={pending}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor={timelineId}>Timeline</Label>
        <Input
          id={timelineId}
          name="timeline"
          defaultValue={initialTimeline ?? ""}
          autoComplete="off"
          disabled={pending}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor={statusId}>Status</Label>
        <select
          id={statusId}
          name="status"
          className={selectClass}
          defaultValue={initialStatus}
          disabled={pending}
        >
          {MILESTONE_STATUSES.map((value) => (
            <option key={value} value={value}>
              {MILESTONE_STATUS_LABELS[value]}
            </option>
          ))}
        </select>
      </div>
      <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="submit" disabled={pending} className="w-full sm:w-auto">
          {pending ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}

export function EditMilestoneDialog({
  organizationSlug,
  projectId,
  milestone,
  triggerLabel = "Edit",
  triggerClassName,
}: {
  organizationSlug: string;
  projectId: string;
  milestone: {
    id: string;
    name: string;
    description: string | null;
    timeline: string | null;
    status: MilestoneStatus;
  };
  triggerLabel?: string;
  triggerClassName?: string;
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
      <Button
        type="button"
        variant="outline"
        size="sm"
        className={triggerClassName}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(true);
        }}
      >
        {triggerLabel}
      </Button>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit milestone</DialogTitle>
          <DialogDescription>
            Update name, description, timeline, or status.
          </DialogDescription>
        </DialogHeader>
        <EditMilestoneFormBody
          key={`${milestone.id}-${formKey}`}
          organizationSlug={organizationSlug}
          projectId={projectId}
          milestoneId={milestone.id}
          initialName={milestone.name}
          initialDescription={milestone.description}
          initialTimeline={milestone.timeline}
          initialStatus={milestone.status}
          onSuccess={handleSuccess}
        />
      </DialogContent>
    </Dialog>
  );
}
