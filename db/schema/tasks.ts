import {
  date,
  foreignKey,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { milestoneStatusEnum, milestones } from "./milestones";
import { projects } from "./projects";
import { users } from "./users";

export const taskSeverityEnum = pgEnum("task_severity", [
  "low",
  "medium",
  "high",
  "critical",
]);

export const tasks = pgTable(
  "tasks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    /** Same values as milestones: not_started → shown under Backlog in UI. */
    status: milestoneStatusEnum("status").notNull().default("not_started"),
    severity: taskSeverityEnum("severity").notNull().default("medium"),
    tags: text("tags").array(),
    /** Due date for the task (optional). */
    dueDate: date("due_date", { mode: "date" }),
    /** 0–100 completion for progress ring in UI. */
    progressPct: integer("progress_pct").notNull().default(0),
    /** Optional delivery milestone this task belongs to. */
    milestoneId: uuid("milestone_id").references(() => milestones.id, {
      onDelete: "set null",
    }),
    parentTaskId: uuid("parent_task_id"),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.parentTaskId],
      foreignColumns: [table.id],
      name: "tasks_parent_task_id_fkey",
    }).onDelete("set null"),
  ],
);

export const taskAssignees = pgTable(
  "task_assignees",
  {
    taskId: uuid("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.taskId, t.userId] })],
);

export const taskBlockers = pgTable("task_blockers", {
  id: uuid("id").primaryKey().defaultRandom(),
  taskId: uuid("task_id")
    .notNull()
    .references(() => tasks.id, { onDelete: "cascade" }),
  note: text("note").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
