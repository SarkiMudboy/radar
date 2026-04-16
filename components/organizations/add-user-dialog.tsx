"use client";

import { useActionState, useCallback, useEffect, useState } from "react";

import { createOrgUser } from "@/app/actions/users";
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
import { cn } from "@/lib/utils";

function AddUserForm({
  organizationId,
  organizationSlug,
  roles,
  onSuccess,
}: {
  organizationId: string;
  organizationSlug: string;
  roles: { key: string; name: string }[];
  onSuccess: () => void;
}) {
  const [state, formAction, pending] = useActionState(createOrgUser, null);

  useEffect(() => {
    if (state?.success) {
      onSuccess();
    }
  }, [state?.success, onSuccess]);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input name="organizationId" type="hidden" value={organizationId} />
      <input name="organizationSlug" type="hidden" value={organizationSlug} />
      <div className="flex flex-col gap-2">
        <Label htmlFor="user-name">Name</Label>
        <Input
          id="user-name"
          name="name"
          required
          placeholder="Alex Rivera"
          autoComplete="name"
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="user-role">Role</Label>
        <select
          id="user-role"
          name="roleKey"
          required
          defaultValue={roles[0]?.key ?? ""}
          className={cn(
            "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm dark:bg-input/30",
          )}
          disabled={pending || roles.length === 0}
        >
          {roles.length === 0 ? (
            <option value="">No roles configured</option>
          ) : null}
          {roles.map((r) => (
            <option key={r.key} value={r.key}>
              {r.name}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="user-email">Email</Label>
        <Input
          id="user-email"
          name="email"
          type="email"
          required
          placeholder="alex@example.com"
          autoComplete="email"
        />
      </div>
      {state?.error ? (
        <p className="text-destructive text-sm" role="alert">
          {state.error}
        </p>
      ) : null}
      <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="submit" disabled={pending} className="w-full sm:w-auto">
          {pending ? "Adding…" : "Add user"}
        </Button>
      </div>
    </form>
  );
}

export function AddUserDialog({
  organizationId,
  organizationSlug,
  roles,
}: {
  organizationId: string;
  organizationSlug: string;
  roles: { key: string; name: string }[];
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
        Add user
      </Button>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New user</DialogTitle>
          <DialogDescription>
            Workspace member (no sign-in). Email must be unique in this
            organization.
          </DialogDescription>
        </DialogHeader>
        <AddUserForm
          key={formKey}
          organizationId={organizationId}
          organizationSlug={organizationSlug}
          roles={roles}
          onSuccess={handleSuccess}
        />
      </DialogContent>
    </Dialog>
  );
}
