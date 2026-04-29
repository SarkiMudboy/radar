import {
  date,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { organizations } from "./organizations";
import { users } from "./users";

export const projects = pgTable(
  "projects",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    /** Full PRD text; AI-generated summary can live in description later */
    prdContent: text("prd_content"),
    /** Uploaded PRD PDF URL (filesystem-backed for now). */
    prdPdfUrl: text("prd_pdf_url"),
    /** Workspace user who owns the project (optional). */
    ownerUserId: uuid("owner_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    startDate: date("start_date", { mode: "date" }),
    endDate: date("end_date", { mode: "date" }),
    /** External task board URL */
    boardUrl: text("board_url"),
    /** Public website or product URL for this project. */
    projectUrl: text("project_url"),
    /**
     * Linked GitHub repository as `owner/repo` (for future automation, e.g. branches from tasks).
     */
    githubRepoFullName: text("github_repo_full_name"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("projects_organization_id_name_uidx").on(
      table.organizationId,
      table.name,
    ),
  ],
);
