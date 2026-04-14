import { config } from "dotenv";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";

config({ path: ".env.local" });
config({ path: ".env" });

declare global {
  // eslint-disable-next-line no-var -- Next.js dev HMR singleton
  var __radar_db: PostgresJsDatabase<typeof schema> | undefined;
}

function createDb() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set");
  }
  const client = postgres(url, { max: 1 });
  return drizzle(client, { schema });
}

export const db = globalThis.__radar_db ?? createDb();

if (process.env.NODE_ENV !== "production") {
  globalThis.__radar_db = db;
}

export * from "./schema";
