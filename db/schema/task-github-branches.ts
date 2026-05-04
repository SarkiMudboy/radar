import {
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { tasks } from "./tasks";

/** Branches created from Radar (e.g. via Create Branch on a task). */
export const taskGithubBranches = pgTable(
  "task_github_branches",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    taskId: uuid("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    /** Full branch ref path segment, e.g. feature/ACME-1234-slug */
    branchName: text("branch_name").notNull(),
    /** Link to the branch on GitHub (tree view). */
    branchUrl: text("branch_url").notNull(),
    /** Repository as owner/repo at time of creation. */
    repoFullName: text("repo_full_name").notNull(),
    baseBranch: text("base_branch"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("task_github_branches_task_id_branch_name_uidx").on(
      table.taskId,
      table.branchName,
    ),
  ],
);
