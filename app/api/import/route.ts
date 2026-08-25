import { NextResponse } from "next/server";

import { importBackup } from "@/lib/services/kanban";
import { backupSchema } from "@/lib/validation/backup";

export async function POST(request: Request) {
  try {
    const contentLength = Number(request.headers.get("content-length") ?? 0);
    if (contentLength > 25_000_000) return NextResponse.json({ error: "Backup is larger than 25 MB." }, { status: 413 });
    const backup = backupSchema.parse(await request.json());
    await importBackup(backup);
    return NextResponse.json({ status: "ok" });
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : "Invalid KANBN backup.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
