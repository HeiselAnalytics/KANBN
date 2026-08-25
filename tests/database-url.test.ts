import { describe, expect, it } from "vitest";

import { getDatabaseUrl } from "@/lib/database-url";

describe("database URL construction", () => {
  it("builds the URL from individual PostgreSQL parameters", () => {
    expect(getDatabaseUrl({
      POSTGRES_USER: "kanbn user",
      POSTGRES_PASSWORD: "p@ss/word",
      POSTGRES_HOST: "database.internal",
      POSTGRES_PORT: "5544",
      POSTGRES_DB: "kanbn data",
    })).toBe("postgresql://kanbn%20user:p%40ss%2Fword@database.internal:5544/kanbn%20data");
  });

  it("uses safe local defaults and rejects an invalid port", () => {
    expect(getDatabaseUrl({ POSTGRES_PORT: "invalid" })).toBe("postgresql://kanbn:change-me@localhost:5432/kanbn");
  });
});
