"use client";

import Link from "next/link";
import { ChevronRightIcon } from "lucide-react";

import {
  Card,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

import { AddProjectDialog } from "./add-project-dialog";
import { AddUserDialog } from "./add-user-dialog";

export type WorkspaceProject = {
  id: string;
  name: string;
  description: string | null;
  boardUrl: string | null;
  projectUrl: string | null;
  githubRepoFullName: string | null;
  prdPdfUrl: string | null;
  ownerName: string | null;
};

export type WorkspaceUser = {
  id: string;
  name: string;
  email: string;
  profileImageUrl?: string | null;
};

export function OrganizationWorkspaceTabs({
  organizationId,
  organizationSlug,
  projects,
  users,
  roles,
}: {
  organizationId: string;
  organizationSlug: string;
  projects: WorkspaceProject[];
  users: WorkspaceUser[];
  roles: { key: string; name: string }[];
}) {
  return (
    <Tabs defaultValue="projects" className="mt-10">
      <TabsList>
        <TabsTrigger value="projects">Projects</TabsTrigger>
        <TabsTrigger value="users">Users</TabsTrigger>
      </TabsList>

      <TabsContent value="projects" className="mt-4">
        <div className="mb-4 flex items-center justify-end">
          <AddProjectDialog
            organizationId={organizationId}
            organizationSlug={organizationSlug}
            users={users}
          />
        </div>
        {projects.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No projects yet. Add one to get started.
          </p>
        ) : (
          <div className="grid gap-3">
            {projects.map((p) => (
              <Card
                key={p.id}
                size="sm"
                className="relative gap-0 overflow-hidden rounded-md border border-border py-0 shadow-none ring-0 transition-all duration-200 ease-out hover:-translate-y-px hover:border-primary/50 hover:bg-muted/15 hover:shadow-md hover:shadow-primary/10"
              >
                <Link
                  href={`/organizations/${organizationSlug}/projects/${p.id}`}
                  className="absolute inset-0 z-5 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label={`Open project ${p.name}`}
                >
                  <span className="sr-only">Open project {p.name}</span>
                </Link>

                <CardHeader className="pointer-events-none relative z-10 gap-2 px-4 pt-4 pb-3">
                  <p className="text-[0.65rem] font-semibold tracking-[0.2em] text-muted-foreground uppercase">
                    Project
                  </p>
                  <div className="text-base leading-snug font-semibold text-foreground">
                    {p.name}
                  </div>
                  {p.ownerName ? (
                    <p className="text-muted-foreground text-xs">
                      Owner: {p.ownerName}
                    </p>
                  ) : null}
                  <p className="text-muted-foreground line-clamp-2 min-h-10 text-sm">
                    {p.description || "No description."}
                  </p>
                </CardHeader>

                <CardFooter className="relative z-20 flex flex-wrap items-center justify-between gap-2 border-border/60 border-t bg-background/40 px-4 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    {p.prdPdfUrl ? (
                      <a
                        href={p.prdPdfUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="border-border text-foreground hover:border-primary/60 hover:text-primary pointer-events-auto inline-flex items-center gap-1 rounded border bg-transparent px-2 py-1 text-xs font-medium transition-colors"
                      >
                        PRD
                        <ChevronRightIcon className="size-3" />
                      </a>
                    ) : null}
                    {p.projectUrl ? (
                      <a
                        href={p.projectUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="border-border text-foreground hover:border-primary/60 hover:text-primary pointer-events-auto inline-flex items-center gap-1 rounded border bg-transparent px-2 py-1 text-xs font-medium transition-colors"
                      >
                        Site
                        <ChevronRightIcon className="size-3" />
                      </a>
                    ) : null}
                    {p.githubRepoFullName ? (
                      <a
                        href={`https://github.com/${p.githubRepoFullName}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="border-border text-foreground hover:border-primary/60 hover:text-primary pointer-events-auto inline-flex items-center gap-1 rounded border bg-transparent px-2 py-1 text-xs font-medium transition-colors"
                      >
                        GitHub
                        <ChevronRightIcon className="size-3" />
                      </a>
                    ) : null}
                    {p.boardUrl ? (
                      <a
                        href={p.boardUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="border-border text-foreground hover:border-primary/60 hover:text-primary pointer-events-auto inline-flex items-center gap-1 rounded border bg-transparent px-2 py-1 text-xs font-medium transition-colors"
                      >
                        Board
                        <ChevronRightIcon className="size-3" />
                      </a>
                    ) : null}
                  </div>
                  <span className="text-muted-foreground inline-flex items-center gap-1 text-xs">
                    Details
                    <ChevronRightIcon className="size-3" />
                  </span>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </TabsContent>

      <TabsContent value="users" className="mt-4">
        <div className="mb-4 flex items-center justify-end">
          <AddUserDialog
            organizationId={organizationId}
            organizationSlug={organizationSlug}
            roles={roles}
          />
        </div>
        {users.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No users yet. Add workspace members here.
          </p>
        ) : (
          <ul className="divide-y rounded-lg border">
            {users.map((u) => (
              <li
                key={u.id}
                className="flex flex-col gap-0.5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <span className="font-medium">{u.name}</span>
                <span className="text-muted-foreground text-sm">{u.email}</span>
              </li>
            ))}
          </ul>
        )}
      </TabsContent>
    </Tabs>
  );
}
