import { defineConfig } from "drizzle-kit";

import { getDatabaseUrl } from "./lib/database-url";

export default defineConfig({
  dialect: "postgresql",
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: getDatabaseUrl(),
  },
});
