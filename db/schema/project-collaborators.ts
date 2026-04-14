import { pgTable, primaryKey, uuid } from "drizzle-orm/pg-core";

import { projects } from "./projects";
import { users } from "./users";

export const projectCollaborators = pgTable(
  "project_collaborators",
  {
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
  },
  (table) => [
    primaryKey({ columns: [table.projectId, table.userId] }),
  ],
);
