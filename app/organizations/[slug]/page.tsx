import { asc, eq } from "drizzle-orm";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { DeleteOrganizationDialog } from "@/components/organizations/delete-organization-dialog";
import { EditOrganizationDialog } from "@/components/organizations/edit-organization-dialog";
import { OrganizationWorkspaceTabs } from "@/components/organizations/organization-workspace-tabs";
import { db, organizations, projects, roles, users } from "@/db";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const org = await db.query.organizations.findFirst({
    where: eq(organizations.slug, slug),
  });
  return {
    title: org ? `${org.name} · Radar` : "Organization · Radar",
  };
}

export default async function OrganizationPage({ params }: PageProps) {
  const { slug } = await params;
  const org = await db.query.organizations.findFirst({
    where: eq(organizations.slug, slug),
  });

  if (!org) {
    notFound();
  }

  const projectRows = await db
    .select({
      id: projects.id,
      name: projects.name,
      description: projects.description,
      boardUrl: projects.boardUrl,
      projectUrl: projects.projectUrl,
      githubRepoFullName: projects.githubRepoFullName,
      prdPdfUrl: projects.prdPdfUrl,
      ownerName: users.name,
    })
    .from(projects)
    .leftJoin(users, eq(projects.ownerUserId, users.id))
    .where(eq(projects.organizationId, org.id))
    .orderBy(asc(projects.name));

  const userRows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      profileImageUrl: users.profileImageUrl,
    })
    .from(users)
    .where(eq(users.organizationId, org.id))
    .orderBy(asc(users.name));

  const roleRows = await db
    .select({ key: roles.key, name: roles.name })
    .from(roles)
    .orderBy(asc(roles.name));

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10">
      <Link
        href="/"
        className="text-muted-foreground text-sm hover:underline"
      >
        ← Organizations
      </Link>

      <header className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            {org.logoUrl ? (
              <Image
                src={org.logoUrl}
                alt={`${org.name} logo`}
                width={40}
                height={40}
                className="size-10 rounded-md border object-cover"
              />
            ) : (
              <div className="size-10 rounded-md border bg-muted" />
            )}
            <h1 className="text-2xl font-semibold tracking-tight">{org.name}</h1>
          </div>
          <p className="text-muted-foreground mt-1 font-mono text-sm">
            {org.slug}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <EditOrganizationDialog organization={org} />
          <DeleteOrganizationDialog organization={org} />
        </div>
      </header>

      <dl className="mt-10 grid gap-6 sm:grid-cols-2">
        <div>
          <dt className="text-muted-foreground text-sm">Created</dt>
          <dd className="mt-1 font-medium tabular-nums">
            {org.createdAt.toLocaleString()}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground text-sm">Last updated</dt>
          <dd className="mt-1 font-medium tabular-nums">
            {org.updatedAt.toLocaleString()}
          </dd>
        </div>
      </dl>

      <OrganizationWorkspaceTabs
        organizationId={org.id}
        organizationSlug={org.slug}
        projects={projectRows}
        users={userRows}
        roles={roleRows}
      />
    </div>
  );
}
