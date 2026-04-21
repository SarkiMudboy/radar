"use client";

import Image from "next/image";
import { useActionState, useCallback, useEffect, useId, useState } from "react";

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
  const avatarInputId = useId();
  const [state, formAction, pending] = useActionState(createOrgUser, null);
  const [profileImageUrl, setProfileImageUrl] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string>("");

  useEffect(() => {
    if (state?.success) {
      onSuccess();
    }
  }, [state?.success, onSuccess]);

  async function uploadAvatar(file: File) {
    setUploading(true);
    setUploadError("");
    try {
      const body = new FormData();
      body.set("file", file);
      const res = await fetch("/api/uploads/user-avatar", {
        method: "POST",
        body,
      });
      const json = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !json.url) {
        throw new Error(json.error || "Upload failed.");
      }
      setProfileImageUrl(json.url);
    } catch (e) {
      setProfileImageUrl("");
      setUploadError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input name="organizationId" type="hidden" value={organizationId} />
      <input name="organizationSlug" type="hidden" value={organizationSlug} />
      <input name="profileImageUrl" type="hidden" value={profileImageUrl} />
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
        <Label htmlFor={avatarInputId}>Profile picture (optional)</Label>
        <Input
          id={avatarInputId}
          type="file"
          accept="image/*"
          disabled={pending || uploading}
          onChange={(e) => {
            const f = e.currentTarget.files?.[0];
            if (f) void uploadAvatar(f);
          }}
        />
        {uploadError ? (
          <p className="text-destructive text-sm" role="alert">
            {uploadError}
          </p>
        ) : null}
        {profileImageUrl ? (
          <div className="flex items-center gap-3">
            <Image
              src={profileImageUrl}
              alt="Profile picture preview"
              width={40}
              height={40}
              className="size-10 rounded-full border object-cover"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setProfileImageUrl("")}
              disabled={pending || uploading}
            >
              Remove
            </Button>
          </div>
        ) : null}
        {uploading ? (
          <p className="text-muted-foreground text-sm">Uploading…</p>
        ) : null}
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
        <Button
          type="submit"
          disabled={pending || uploading}
          className="w-full sm:w-auto"
        >
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
