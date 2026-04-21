import { and, eq } from "drizzle-orm";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
  AvatarImage,
} from "@/components/ui/avatar";
import { db, organizations, projectCollaborators, projects, users } from "@/db";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ slug: string; projectId: string }>;
};

function initials(name: string) {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase()).join("") || "?";
}

function formatDateRange(start: Date | null, end: Date | null) {
  const fmt = new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
  if (start && end) return `${fmt.format(start)} – ${fmt.format(end)}`;
  if (start) return `Starts ${fmt.format(start)}`;
  if (end) return `Ends ${fmt.format(end)}`;
  return "Not set";
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug, projectId } = await params;
  const org = await db.query.organizations.findFirst({
    where: eq(organizations.slug, slug),
  });
  if (!org) return { title: "Project · Radar" };

  const project = await db.query.projects.findFirst({
    where: and(eq(projects.id, projectId), eq(projects.organizationId, org.id)),
  });

  return {
    title: project ? `${project.name} · ${org.name} · Radar` : "Project · Radar",
  };
}

export default async function ProjectDetailPage({ params }: PageProps) {
  const { slug, projectId } = await params;

  const org = await db.query.organizations.findFirst({
    where: eq(organizations.slug, slug),
  });
  if (!org) notFound();

  const project = await db.query.projects.findFirst({
    where: and(eq(projects.id, projectId), eq(projects.organizationId, org.id)),
  });
  if (!project) notFound();

  const collaborators = await db
    .select({
      id: users.id,
      name: users.name,
      profileImageUrl: users.profileImageUrl,
    })
    .from(projectCollaborators)
    .innerJoin(users, eq(projectCollaborators.userId, users.id))
    .where(eq(projectCollaborators.projectId, project.id))
    .limit(10);

  const visible = collaborators.slice(0, 5);
  const extra = Math.max(0, collaborators.length - visible.length);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10">
      <Link
        href={`/organizations/${org.slug}`}
        className="text-muted-foreground text-sm hover:underline"
      >
        ← {org.name}
      </Link>

      <header className="mt-6">
        <h1 className="text-2xl font-semibold tracking-tight">{project.name}</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Duration:{" "}
          <span className="font-medium text-foreground">
            {formatDateRange(project.startDate, project.endDate)}
          </span>
        </p>
      </header>

      <section className="mt-8 space-y-6">
        <div>
          <h2 className="text-sm font-medium">Description</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            {project.description || "No description yet."}
          </p>
        </div>

        <div>
          <h2 className="text-sm font-medium">Collaborators</h2>
          {collaborators.length === 0 ? (
            <p className="text-muted-foreground mt-1 text-sm">
              No collaborators yet.
            </p>
          ) : (
            <div className="mt-2 flex items-center gap-3">
              <AvatarGroup>
                {visible.map((u) => (
                  <Avatar key={u.id} size="sm" title={u.name}>
                    {u.profileImageUrl ? (
                      <AvatarImage src={u.profileImageUrl} alt={u.name} />
                    ) : null}
                    <AvatarFallback>{initials(u.name)}</AvatarFallback>
                  </Avatar>
                ))}
                {extra > 0 ? <AvatarGroupCount>+{extra}</AvatarGroupCount> : null}
              </AvatarGroup>
              <p className="text-muted-foreground text-sm">
                {collaborators.length} collaborator
                {collaborators.length === 1 ? "" : "s"}
              </p>
            </div>
          )}
        </div>

        <div>
          <h2 className="text-sm font-medium">PRD</h2>
          {project.prdPdfUrl ? (
            <a
              href={project.prdPdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary mt-1 inline-block text-sm underline-offset-4 hover:underline"
            >
              Download PRD (PDF)
            </a>
          ) : (
            <p className="text-muted-foreground mt-1 text-sm">No PRD uploaded.</p>
          )}
        </div>
      </section>
    </div>
  );
}

