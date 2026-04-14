"use client";

import { useActionState } from "react";

import { deleteOrganization } from "@/app/actions/organizations";
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

import type { OrganizationFields } from "./edit-organization-dialog";

export function DeleteOrganizationDialog({
  organization,
}: {
  organization: OrganizationFields;
}) {
  const [state, formAction, pending] = useActionState(
    deleteOrganization,
    null,
  );

  return (
    <AlertDialog>
      <AlertDialogTrigger nativeButton={false} render={<Button variant="outline" type="button" />}>
        Delete
      </AlertDialogTrigger>
      <AlertDialogContent>
        <form action={formAction} className="flex flex-col gap-4">
          <input name="id" type="hidden" value={organization.id} />
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this organization?</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="block">
                <strong className="text-foreground">{organization.name}</strong>{" "}
                and all data tied to it in this workspace will be removed. This
                cannot be undone.
              </span>
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
              {pending ? "Deleting…" : "Delete organization"}
            </Button>
          </div>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}
