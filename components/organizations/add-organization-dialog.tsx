"use client";

import { useActionState, useCallback, useEffect, useState } from "react";

import { createOrganization } from "@/app/actions/organizations";
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

function AddOrganizationForm({
  onSuccess,
}: {
  onSuccess: () => void;
}) {
  const [state, formAction, pending] = useActionState(
    createOrganization,
    null,
  );

  useEffect(() => {
    if (state?.success) {
      onSuccess();
    }
  }, [state?.success, onSuccess]);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="org-name">Name</Label>
        <Input
          id="org-name"
          name="name"
          required
          placeholder="Acme Corp"
          autoComplete="organization"
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="org-slug">Slug (optional)</Label>
        <Input
          id="org-slug"
          name="slug"
          placeholder="acme-corp"
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
          {pending ? "Adding…" : "Add organization"}
        </Button>
      </div>
    </form>
  );
}

export function AddOrganizationDialog() {
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
        Add organization
      </Button>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New organization</DialogTitle>
          <DialogDescription>
            Slug appears in URLs. Leave it blank to derive from the name.
          </DialogDescription>
        </DialogHeader>
        <AddOrganizationForm key={formKey} onSuccess={handleSuccess} />
      </DialogContent>
    </Dialog>
  );
}
