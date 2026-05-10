"use client";

import { useState } from "react";

import { CreateIssueDialog } from "@/components/issues/create-issue-dialog";
import { IssuesBoard, type IssueRow } from "@/components/issues/issues-board";

export function ProjectIssuesPageClient({
  organizationSlug,
  projectId,
  issueRows,
  taskOptions,
  userOptions,
  reporterUserId,
}: {
  organizationSlug: string;
  projectId: string;
  issueRows: IssueRow[];
  taskOptions: { id: string; title: string }[];
  userOptions: { id: string; name: string; email: string }[];
  reporterUserId: string | null;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <IssuesBoard
        organizationSlug={organizationSlug}
        issues={issueRows}
        onCreateIssueClick={() => setOpen(true)}
      />
      <CreateIssueDialog
        organizationSlug={organizationSlug}
        projectId={projectId}
        tasks={taskOptions}
        users={userOptions}
        reporterUserId={reporterUserId}
        open={open}
        onOpenChange={setOpen}
      />
    </>
  );
}

