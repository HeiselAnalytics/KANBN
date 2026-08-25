import { readFileSync } from "node:fs";
import { join } from "node:path";

export function getProjectVersion(): string {
  try {
    const projectFile = readFileSync(join(process.cwd(), "project.yaml"), "utf8");
    const version = projectFile.match(/^\s{2}version:\s*['"]?([^'"\r\n#]+)['"]?\s*(?:#.*)?$/m)?.[1].trim();
    return version || "unknown";
  } catch {
    return "unknown";
  }
}
