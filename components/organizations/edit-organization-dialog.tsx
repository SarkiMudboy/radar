"use client";

import { useActionState, useCallback, useEffect, useState } from "react";

import { updateOrganization } from "@/app/actions/organizations";
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

export type OrganizationFields = {
  id: string;
  name: string;
  slug: string;
};

function EditOrganizationForm({
  organization,
  onSuccess,
}: {
  organization: OrganizationFields;
  onSuccess: () => void;
}) {
  const [state, formAction, pending] = useActionState(
    updateOrganization,
    null,
  );

  useEffect(() => {
    if (state?.success) {
      onSuccess();
    }
  }, [state?.success, onSuccess]);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input name="id" type="hidden" value={organization.id} />
      <input name="currentSlug" type="hidden" value={organization.slug} />
      <div className="flex flex-col gap-2">
        <Label htmlFor="edit-org-name">Name</Label>
        <Input
          id="edit-org-name"
          name="name"
          required
          defaultValue={organization.name}
          autoComplete="organization"
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="edit-org-slug">Slug</Label>
        <Input
          id="edit-org-slug"
          name="slug"
          defaultValue={organization.slug}
          autoComplete="off"
        />
      </div>
      {state?.error ? (
        <p className="text-destructive text-sm" role="alert">
          {state.error}
        </p>
      ) : null}
      <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="submit" disabled={pending} className="w-full sm:w-auto">
          {pending ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}

export function EditOrganizationDialog({
  organization,
}: {
  organization: OrganizationFields;
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
      <Button type="button" variant="outline" onClick={() => setOpen(true)}>
        Edit
      </Button>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit organization</DialogTitle>
          <DialogDescription>
            Changing the slug updates the URL of this page.
          </DialogDescription>
        </DialogHeader>
        <EditOrganizationForm
          key={`${formKey}-${organization.slug}`}
          organization={organization}
          onSuccess={handleSuccess}
        />
      </DialogContent>
    </Dialog>
  );
}
