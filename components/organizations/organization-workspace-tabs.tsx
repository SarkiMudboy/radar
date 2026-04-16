"use client";

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
  prdPdfUrl: string | null;
  ownerName: string | null;
};

export type WorkspaceUser = {
  id: string;
  name: string;
  email: string;
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
          <ul className="divide-y rounded-lg border">
            {projects.map((p) => (
              <li
                key={p.id}
                className="flex min-h-16 flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{p.name}</p>
                  {p.ownerName ? (
                    <p className="text-muted-foreground mt-0.5 text-sm">
                      Owner: {p.ownerName}
                    </p>
                  ) : null}
                  {p.description ? (
                    <p className="text-muted-foreground mt-0.5 line-clamp-2 text-sm">
                      {p.description}
                    </p>
                  ) : null}
                </div>
                <div className="flex shrink-0 items-center justify-end gap-3 sm:min-w-20">
                  {p.prdPdfUrl ? (
                    <a
                      href={p.prdPdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary text-sm underline-offset-4 hover:underline"
                    >
                      PRD
                    </a>
                  ) : null}
                  {p.boardUrl ? (
                    <a
                      href={p.boardUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary text-sm underline-offset-4 hover:underline"
                    >
                      Board
                    </a>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
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
