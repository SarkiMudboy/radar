import { pgTable, text, uuid } from "drizzle-orm/pg-core";

/** Global role catalog (not tied to a single org). */
export const roles = pgTable("roles", {
  id: uuid("id").primaryKey().defaultRandom(),
  /** Stable key for code, e.g. admin, qa, engineering */
  key: text("key").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
});
