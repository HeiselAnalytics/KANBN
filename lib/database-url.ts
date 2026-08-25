type DatabaseEnvironment = Readonly<Record<string, string | undefined>>;

function value(environment: DatabaseEnvironment, key: string, fallback: string): string {
  return environment[key]?.trim() || fallback;
}

export function getDatabaseUrl(environment: DatabaseEnvironment = process.env): string {
  const user = encodeURIComponent(value(environment, "POSTGRES_USER", "kanbn"));
  const password = encodeURIComponent(value(environment, "POSTGRES_PASSWORD", "change-me"));
  const database = encodeURIComponent(value(environment, "POSTGRES_DB", "kanbn"));
  const rawHost = value(environment, "POSTGRES_HOST", "localhost");
  const host = rawHost.includes(":") && !rawHost.startsWith("[") ? `[${rawHost}]` : rawHost;
  const configuredPort = value(environment, "POSTGRES_PORT", "5432");
  const port = /^\d{1,5}$/.test(configuredPort) ? configuredPort : "5432";
  return `postgresql://${user}:${password}@${host}:${port}/${database}`;
}
