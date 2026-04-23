"use client";

import {
  useActionState,
  useCallback,
  useEffect,
  useState,
  type ComponentProps,
} from "react";

import { archiveMilestone } from "@/app/actions/milestones";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

function ArchiveMilestoneForm({
  organizationSlug,
  projectId,
  milestoneId,
  milestoneName,
  onSuccess,
}: {
  organizationSlug: string;
  projectId: string;
  milestoneId: string;
  milestoneName: string;
  onSuccess: () => void;
}) {
  const [state, formAction, pending] = useActionState(archiveMilestone, null);

  useEffect(() => {
    if (state?.success) {
      onSuccess();
    }
  }, [state?.success, onSuccess]);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input name="organizationSlug" type="hidden" value={organizationSlug} />
      <input name="projectId" type="hidden" value={projectId} />
      <input name="milestoneId" type="hidden" value={milestoneId} />
      <AlertDialogHeader>
        <AlertDialogTitle>Archive milestone?</AlertDialogTitle>
        <AlertDialogDescription>
          &ldquo;{milestoneName}&rdquo; will be hidden from the project list. You
          can still open it by URL if needed.
        </AlertDialogDescription>
      </AlertDialogHeader>
      {state?.error ? (
        <p className="text-destructive text-sm" role="alert">
          {state.error}
        </p>
      ) : null}
      <div className="mt-2 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <AlertDialogCancel type="button" disabled={pending}>
          Cancel
        </AlertDialogCancel>
        <Button
          type="submit"
          variant="destructive"
          disabled={pending}
          className="w-full sm:w-auto"
        >
          {pending ? "Archiving…" : "Archive"}
        </Button>
      </div>
    </form>
  );
}

export function ArchiveMilestoneDialog({
  organizationSlug,
  projectId,
  milestoneId,
  milestoneName,
  triggerVariant = "outline",
  onArchived,
}: {
  organizationSlug: string;
  projectId: string;
  milestoneId: string;
  milestoneName: string;
  triggerVariant?: ComponentProps<typeof Button>["variant"];
  onArchived?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [formKey, setFormKey] = useState(0);

  const handleSuccess = useCallback(() => {
    setOpen(false);
    onArchived?.();
  }, [onArchived]);

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          setFormKey((k) => k + 1);
        }
      }}
    >
      <AlertDialogTrigger
        nativeButton={false}
        render={
          <Button
            variant={triggerVariant}
            size="sm"
            type="button"
            className="text-destructive hover:text-destructive"
            onClick={(e) => {
              e.stopPropagation();
            }}
          />
        }
      >
        Archive
      </AlertDialogTrigger>
      <AlertDialogContent>
        <ArchiveMilestoneForm
          key={formKey}
          organizationSlug={organizationSlug}
          projectId={projectId}
          milestoneId={milestoneId}
          milestoneName={milestoneName}
          onSuccess={handleSuccess}
        />
      </AlertDialogContent>
    </AlertDialog>
  );
}
