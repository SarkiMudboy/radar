"use client";

import { useActionState, useCallback, useEffect, useId, useState } from "react";

import { createMilestone } from "@/app/actions/milestones";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MilestoneFormFields } from "@/components/milestones/milestone-form-fields";

function AddMilestoneForm({
  organizationSlug,
  projectId,
  onSuccess,
}: {
  organizationSlug: string;
  projectId: string;
  onSuccess: () => void;
}) {
  const nameId = useId();
  const descriptionId = useId();
  const timelineId = useId();
  const statusId = useId();
  const [state, formAction, pending] = useActionState(createMilestone, null);

  useEffect(() => {
    if (state?.success) {
      onSuccess();
    }
  }, [state?.success, onSuccess]);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input name="organizationSlug" type="hidden" value={organizationSlug} />
      <input name="projectId" type="hidden" value={projectId} />
      <MilestoneFormFields
        nameId={nameId}
        descriptionId={descriptionId}
        timelineId={timelineId}
        statusId={statusId}
        disabled={pending}
      />
      {state?.error ? (
        <p className="text-destructive text-sm" role="alert">
          {state.error}
        </p>
      ) : null}
      <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="submit" disabled={pending} className="w-full sm:w-auto">
          {pending ? "Creating…" : "Create milestone"}
        </Button>
      </div>
    </form>
  );
}

export function AddMilestoneDialog({
  organizationSlug,
  projectId,
}: {
  organizationSlug: string;
  projectId: string;
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
        Add milestone
      </Button>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New milestone</DialogTitle>
          <DialogDescription>
            Name must be unique within this project. You can refine details
            later.
          </DialogDescription>
        </DialogHeader>
        <AddMilestoneForm
          key={formKey}
          organizationSlug={organizationSlug}
          projectId={projectId}
          onSuccess={handleSuccess}
        />
      </DialogContent>
    </Dialog>
  );
}
