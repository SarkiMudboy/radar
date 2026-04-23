"use client";

import Link from "next/link";
import { ChevronRightIcon, ListTodo } from "lucide-react";

import { AddMilestoneDialog } from "@/components/milestones/add-milestone-dialog";
import { ArchiveMilestoneDialog } from "@/components/milestones/archive-milestone-dialog";
import { EditMilestoneDialog } from "@/components/milestones/edit-milestone-dialog";
import { MilestoneStatusBadge } from "@/components/milestones/milestone-status-badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import type { MilestoneStatus } from "@/lib/milestone-status";
import { cn } from "@/lib/utils";

export type ProjectMilestoneListItem = {
  id: string;
  name: string;
  description: string | null;
  timeline: string | null;
  status: MilestoneStatus;
};

export function ProjectMilestonesSection({
  organizationSlug,
  projectId,
  milestones,
}: {
  organizationSlug: string;
  projectId: string;
  milestones: ProjectMilestoneListItem[];
}) {
  const tasksHref = `/organizations/${organizationSlug}/projects/${projectId}/tasks`;

  return (
    <section className="mt-10">
      <div className="mb-4 flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Link
          href={tasksHref}
          className={cn(
            buttonVariants({ variant: "outline" }),
            "inline-flex w-fit items-center gap-2 no-underline",
          )}
        >
          <ListTodo className="size-4" aria-hidden />
          Tasks
        </Link>
        <AddMilestoneDialog
          organizationSlug={organizationSlug}
          projectId={projectId}
        />
      </div>

      <div className="w-full">
        {milestones.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No milestones yet. Add one to track delivery phases.
          </p>
        ) : (
          <div className="grid gap-3">
            {milestones.map((m) => (
              <Card
                key={m.id}
                size="sm"
                className="relative gap-0 overflow-hidden rounded-md border border-border py-0 shadow-none ring-0 transition-all duration-200 ease-out hover:-translate-y-px hover:border-primary/50 hover:bg-muted/15 hover:shadow-md hover:shadow-primary/10"
              >
                <Link
                  href={`/organizations/${organizationSlug}/projects/${projectId}/milestones/${m.id}`}
                  className="absolute inset-0 z-5 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label={`Open milestone ${m.name}`}
                >
                  <span className="sr-only">Open milestone {m.name}</span>
                </Link>

                <CardHeader className="pointer-events-none relative z-10 gap-2 px-4 pt-4 pb-3">
                  <p className="text-[0.65rem] font-semibold tracking-[0.2em] text-muted-foreground uppercase">
                    Milestone
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="text-base leading-snug font-semibold text-foreground">
                      {m.name}
                    </div>
                    <MilestoneStatusBadge status={m.status} />
                  </div>
                  {m.timeline ? (
                    <p className="text-muted-foreground text-xs">
                      Timeline: {m.timeline}
                    </p>
                  ) : null}
                  <p className="text-muted-foreground line-clamp-2 min-h-10 text-sm">
                    {m.description || "No description."}
                  </p>
                </CardHeader>

                <CardFooter className="relative z-20 flex flex-wrap items-center justify-end gap-2 border-border/60 border-t bg-background/40 px-4 py-3">
                  <EditMilestoneDialog
                    organizationSlug={organizationSlug}
                    projectId={projectId}
                    milestone={m}
                  />
                  <ArchiveMilestoneDialog
                    organizationSlug={organizationSlug}
                    projectId={projectId}
                    milestoneId={m.id}
                    milestoneName={m.name}
                  />
                  <span className="text-muted-foreground pointer-events-none inline-flex items-center gap-1 text-xs">
                    Details
                    <ChevronRightIcon className="size-3" />
                  </span>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
