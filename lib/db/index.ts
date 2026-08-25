import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { getDatabaseUrl } from "@/lib/database-url";

import * as schema from "./schema";

const connectionString = getDatabaseUrl();

const globalForDatabase = globalThis as unknown as {
  kanbnSql?: ReturnType<typeof postgres>;
};

const sql =
  globalForDatabase.kanbnSql ??
  postgres(connectionString, {
    max: process.env.NODE_ENV === "production" ? 10 : 2,
    prepare: false,
  });

if (process.env.NODE_ENV !== "production") globalForDatabase.kanbnSql = sql;

export const db = drizzle(sql, { schema });
export { sql };
