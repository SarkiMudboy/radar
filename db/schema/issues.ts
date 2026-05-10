import { pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { projects } from "./projects";
import { tasks, taskSeverityEnum } from "./tasks";
import { users } from "./users";

export const issueStatusEnum = pgEnum("issue_status", ["pending", "resolved"]);

export const issues = pgTable("issues", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),

  name: text("name").notNull(),
  description: text("description"),

  affectedTaskId: uuid("affected_task_id").references(() => tasks.id, {
    onDelete: "set null",
  }),
  assigneeUserId: uuid("assignee_user_id").references(() => users.id, {
    onDelete: "set null",
  }),

  severity: taskSeverityEnum("severity").notNull().default("medium"),
  reporterUserId: uuid("reporter_user_id").references(() => users.id, {
    onDelete: "set null",
  }),
  status: issueStatusEnum("status").notNull().default("pending"),

  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

