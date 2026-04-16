"use client";

import Image from "next/image";
import { useActionState, useCallback, useEffect, useId, useState } from "react";

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
  logoUrl?: string | null;
};

function EditOrganizationForm({
  organization,
  onSuccess,
}: {
  organization: OrganizationFields;
  onSuccess: () => void;
}) {
  const fileInputId = useId();
  const [state, formAction, pending] = useActionState(
    updateOrganization,
    null,
  );
  const [logoUrl, setLogoUrl] = useState<string>(organization.logoUrl ?? "");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string>("");

  useEffect(() => {
    if (state?.success) {
      onSuccess();
    }
  }, [state?.success, onSuccess]);

  async function uploadLogo(file: File) {
    setUploading(true);
    setUploadError("");
    try {
      const body = new FormData();
      body.set("file", file);
      const res = await fetch("/api/uploads/org-logo", {
        method: "POST",
        body,
      });
      const json = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !json.url) {
        throw new Error(json.error || "Upload failed.");
      }
      setLogoUrl(json.url);
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input name="id" type="hidden" value={organization.id} />
      <input name="currentSlug" type="hidden" value={organization.slug} />
      <input type="hidden" name="logoUrl" value={logoUrl} />
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
        <Label htmlFor={fileInputId}>Logo (optional)</Label>
        <Input
          id={fileInputId}
          type="file"
          accept="image/*"
          disabled={pending || uploading}
          onChange={(e) => {
            const f = e.currentTarget.files?.[0];
            if (f) void uploadLogo(f);
          }}
        />
        {uploadError ? (
          <p className="text-destructive text-sm" role="alert">
            {uploadError}
          </p>
        ) : null}
        {logoUrl ? (
          <div className="flex items-center gap-3">
            <Image
              src={logoUrl}
              alt="Organization logo preview"
              width={40}
              height={40}
              className="rounded-md border object-cover"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setLogoUrl("")}
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
        <Button
          type="submit"
          disabled={pending || uploading}
          className="w-full sm:w-auto"
        >
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
