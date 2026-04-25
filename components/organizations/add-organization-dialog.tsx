"use client";

import Image from "next/image";
import { useActionState, useCallback, useId, useState } from "react";

import { createOrganization } from "@/app/actions/organizations";
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

function AddOrganizationForm({
  onSuccess,
}: {
  onSuccess: () => void;
}) {
  const fileInputId = useId();
  const [state, formAction, pending] = useActionState(
    createOrganization,
    null,
  );
  const [logoUrl, setLogoUrl] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string>("");

  useServerActionFeedback(state, {
    successMessage: "Organization created",
    onSuccess,
  });

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
      setLogoUrl("");
      setUploadError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="logoUrl" value={logoUrl} />
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
        <Label htmlFor="org-slug">Slug (optional)</Label>
        <Input
          id="org-slug"
          name="slug"
          placeholder="acme-corp"
          autoComplete="off"
        />
      </div>
      <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button
          type="submit"
          disabled={pending || uploading}
          className="w-full sm:w-auto"
        >
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
