"use client";

import { useRouter } from "next/navigation";

import { ArchiveMilestoneDialog } from "@/components/milestones/archive-milestone-dialog";
import { EditMilestoneDialog } from "@/components/milestones/edit-milestone-dialog";
import type { MilestoneStatus } from "@/lib/milestone-status";

export function MilestoneDetailActions({
  organizationSlug,
  projectId,
  milestone,
}: {
  organizationSlug: string;
  projectId: string;
  milestone: {
    id: string;
    name: string;
    description: string | null;
    timeline: string | null;
    status: MilestoneStatus;
  };
}) {
  const router = useRouter();
  const projectHref = `/organizations/${organizationSlug}/projects/${projectId}`;

  return (
    <div className="flex shrink-0 flex-wrap items-center gap-2">
      <EditMilestoneDialog
        organizationSlug={organizationSlug}
        projectId={projectId}
        milestone={milestone}
      />
      <ArchiveMilestoneDialog
        organizationSlug={organizationSlug}
        projectId={projectId}
        milestoneId={milestone.id}
        milestoneName={milestone.name}
        onArchived={() => {
          router.push(projectHref);
        }}
      />
    </div>
  );
}
