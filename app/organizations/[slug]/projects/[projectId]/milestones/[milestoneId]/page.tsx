import { and, eq } from "drizzle-orm";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { MilestoneDetailActions } from "@/components/milestones/milestone-detail-actions";
import { MilestoneStatusBadge } from "@/components/milestones/milestone-status-badge";
import { Button } from "@/components/ui/button";
import { db, milestones, organizations, projects } from "@/db";
import type { MilestoneStatus } from "@/lib/milestone-status";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ slug: string; projectId: string; milestoneId: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug, projectId, milestoneId } = await params;
  const row = await db
    .select({
      milestoneName: milestones.name,
      projectName: projects.name,
      orgName: organizations.name,
    })
    .from(milestones)
    .innerJoin(projects, eq(milestones.projectId, projects.id))
    .innerJoin(organizations, eq(projects.organizationId, organizations.id))
    .where(
      and(
        eq(milestones.id, milestoneId),
        eq(projects.id, projectId),
        eq(organizations.slug, slug),
      ),
    )
    .limit(1);

  const r = row[0];
  if (!r) return { title: "Milestone · Radar" };

  return {
    title: `${r.milestoneName} · ${r.projectName} · ${r.orgName} · Radar`,
  };
}

export default async function MilestoneDetailPage({ params }: PageProps) {
  const { slug, projectId, milestoneId } = await params;

  const row = await db
    .select({
      milestone: milestones,
      projectName: projects.name,
      orgSlug: organizations.slug,
      orgName: organizations.name,
    })
    .from(milestones)
    .innerJoin(projects, eq(milestones.projectId, projects.id))
    .innerJoin(organizations, eq(projects.organizationId, organizations.id))
    .where(
      and(
        eq(milestones.id, milestoneId),
        eq(projects.id, projectId),
        eq(organizations.slug, slug),
      ),
    )
    .limit(1);

  const data = row[0];
  if (!data) notFound();

  const m = data.milestone;
  const status = m.status as MilestoneStatus;
  const archived = Boolean(m.archivedAt);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10">
      <Link
        href={`/organizations/${data.orgSlug}/projects/${projectId}`}
        className="text-muted-foreground text-sm hover:underline"
      >
        ← {data.projectName}
      </Link>

      <header className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{m.name}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <MilestoneStatusBadge status={status} size="md" />
            {archived ? (
              <span className="inline-flex items-center rounded-md border border-destructive/40 bg-destructive/10 px-2.5 py-1 text-[0.7rem] font-semibold tracking-[0.12em] text-destructive uppercase">
                Archived
              </span>
            ) : null}
          </div>
        </div>
        {!archived ? (
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              render={
                <Link
                  href={`/organizations/${data.orgSlug}/projects/${projectId}/milestones/${m.id}/tasks`}
                />
              }
            >
              Tasks
            </Button>
            <MilestoneDetailActions
              organizationSlug={data.orgSlug}
              projectId={projectId}
              milestone={{
                id: m.id,
                name: m.name,
                description: m.description,
                timeline: m.timeline,
                status,
              }}
            />
          </div>
        ) : null}
      </header>

      {archived ? (
        <p className="bg-muted/50 text-muted-foreground mt-6 rounded-lg border px-4 py-3 text-sm">
          This milestone is archived. It no longer appears in the project
          milestone list.
        </p>
      ) : null}

      <section className="mt-8 space-y-6">
        <div>
          <h2 className="text-sm font-medium">Description</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            {m.description || "No description yet."}
          </p>
        </div>

        <div>
          <h2 className="text-sm font-medium">Timeline</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            {m.timeline || "Not set."}
          </p>
        </div>

        <div>
          <h2 className="text-sm font-medium">Organization</h2>
          <Link
            href={`/organizations/${data.orgSlug}`}
            className="text-primary mt-1 inline-block text-sm underline-offset-4 hover:underline"
          >
            {data.orgName}
          </Link>
        </div>
      </section>
    </div>
  );
}
