/**
 * Seed workspace data (no auth — users are records for assignment/RBAC only).
 * Run: npm run db:seed
 */
import { config } from "dotenv";

config({ path: ".env.local" });
config({ path: ".env" });

import { and, eq } from "drizzle-orm";

import { db } from "./index";
import {
  organizations,
  projectCollaborators,
  projects,
  roles,
  userRoles,
  users,
} from "./schema";

async function seed() {
  console.info("Seeding roles…");
  await db
    .insert(roles)
    .values([
      {
        key: "admin",
        name: "Admin",
        description: "Full access to org settings and AI reports.",
      },
      {
        key: "qa",
        name: "Quality Assurance",
        description: "QA queue, task comments, and test sign-off.",
      },
      {
        key: "engineering",
        name: "Engineering",
        description: "Build features, branches, and implementation work.",
      },
      {
        key: "pm",
        name: "Project Management",
        description: "Planning, milestones, and stakeholder updates.",
      },
    ])
    .onConflictDoNothing({ target: roles.key });

  const allRoles = await db.select().from(roles);
  const roleByKey = Object.fromEntries(allRoles.map((r) => [r.key, r])) as Record<
    string,
    (typeof allRoles)[number]
  >;

  console.info("Seeding organization…");
  await db
    .insert(organizations)
    .values({ name: "Acme Corp", slug: "acme" })
    .onConflictDoNothing({ target: organizations.slug });

  const org = await db.query.organizations.findFirst({
    where: eq(organizations.slug, "acme"),
  });
  if (!org) throw new Error("Organization acme not found after insert");

  console.info("Seeding users…");
  await db
    .insert(users)
    .values([
      {
        organizationId: org.id,
        email: "alex@acme.test",
        name: "Alex Rivera",
      },
      {
        organizationId: org.id,
        email: "sam@acme.test",
        name: "Sam Chen",
      },
      {
        organizationId: org.id,
        email: "jordan@acme.test",
        name: "Jordan Lee",
      },
    ])
    .onConflictDoNothing({
      target: [users.organizationId, users.email],
    });

  const [alex, sam, jordan] = await Promise.all([
    db.query.users.findFirst({
      where: and(eq(users.organizationId, org.id), eq(users.email, "alex@acme.test")),
    }),
    db.query.users.findFirst({
      where: and(eq(users.organizationId, org.id), eq(users.email, "sam@acme.test")),
    }),
    db.query.users.findFirst({
      where: and(eq(users.organizationId, org.id), eq(users.email, "jordan@acme.test")),
    }),
  ]);

  if (!alex || !sam || !jordan) {
    throw new Error("Expected seeded users not found");
  }

  const R = (key: string) => {
    const r = roleByKey[key];
    if (!r) throw new Error(`Missing role: ${key}`);
    return r;
  };

  console.info("Seeding user ↔ role links…");
  await db
    .insert(userRoles)
    .values([
      { userId: alex.id, roleId: R("admin").id },
      { userId: alex.id, roleId: R("pm").id },
      { userId: sam.id, roleId: R("qa").id },
      { userId: jordan.id, roleId: R("engineering").id },
    ])
    .onConflictDoNothing();

  console.info("Seeding projects…");
  await db
    .insert(projects)
    .values({
      organizationId: org.id,
      name: "Radar MVP",
      description: "Planning and tracking platform.",
      prdContent: "# Radar MVP\n\nShip core projects, tasks, and QA flows.",
      boardUrl: "https://example.com/board/radar-mvp",
    })
    .onConflictDoNothing({
      target: [projects.organizationId, projects.name],
    });

  const project = await db.query.projects.findFirst({
    where: and(
      eq(projects.organizationId, org.id),
      eq(projects.name, "Radar MVP"),
    ),
  });
  if (!project) throw new Error("Project Radar MVP not found after insert");

  console.info("Seeding project collaborators…");
  await db
    .insert(projectCollaborators)
    .values([
      { projectId: project.id, userId: alex.id },
      { projectId: project.id, userId: sam.id },
      { projectId: project.id, userId: jordan.id },
    ])
    .onConflictDoNothing();

  console.info("Done.");
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
