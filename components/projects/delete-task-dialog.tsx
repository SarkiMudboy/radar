"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";

import { deleteTask } from "@/app/actions/tasks";
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
import { useServerActionFeedback } from "@/hooks/use-server-action-feedback";

export function DeleteTaskDialog({
  organizationSlug,
  projectId,
  taskId,
  taskTitle,
  onDeletedHref,
}: {
  organizationSlug: string;
  projectId: string;
  taskId: string;
  taskTitle: string;
  /** Navigate here after delete (usually project tasks page). */
  onDeletedHref: string;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(deleteTask, null);

  useServerActionFeedback(state, {
    successMessage: "Task deleted",
    onSuccess: () => {
      router.push(onDeletedHref);
      router.refresh();
    },
  });

  return (
    <AlertDialog>
      <AlertDialogTrigger
        nativeButton={false}
        render={<Button variant="destructive" type="button" />}
      >
        Delete
      </AlertDialogTrigger>
      <AlertDialogContent>
        <form action={formAction} className="flex flex-col gap-4">
          <input name="organizationSlug" type="hidden" value={organizationSlug} />
          <input name="projectId" type="hidden" value={projectId} />
          <input name="taskId" type="hidden" value={taskId} />
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this task?</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="block">
                <strong className="text-foreground">{taskTitle}</strong> will be
                removed. This cannot be undone.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
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
              {pending ? "Deleting…" : "Delete task"}
            </Button>
          </div>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}

