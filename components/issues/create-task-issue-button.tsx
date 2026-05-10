"use client";

import { useState } from "react";

import { CreateIssueDialog } from "@/components/issues/create-issue-dialog";
import { Button } from "@/components/ui/button";

export function CreateTaskIssueButton({
  organizationSlug,
  projectId,
  taskId,
  taskTitle,
  tasks,
  users,
  reporterUserId,
}: {
  organizationSlug: string;
  projectId: string;
  taskId: string;
  taskTitle: string;
  tasks: { id: string; title: string }[];
  users: { id: string; name: string; email: string }[];
  reporterUserId: string | null;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button type="button" variant="outline" onClick={() => setOpen(true)}>
        Create issue
      </Button>
      <CreateIssueDialog
        organizationSlug={organizationSlug}
        projectId={projectId}
        tasks={tasks}
        users={users}
        reporterUserId={reporterUserId}
        lockedAffectedTaskId={taskId}
        lockedAffectedTaskTitle={taskTitle}
        open={open}
        onOpenChange={setOpen}
      />
    </>
  );
}

