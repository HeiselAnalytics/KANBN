import { NextResponse } from "next/server";

import { databaseHealth } from "@/lib/services/kanban";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const healthy = await databaseHealth();
    return NextResponse.json({ status: healthy ? "ok" : "error" }, { status: healthy ? 200 : 503 });
  } catch {
    return NextResponse.json({ status: "error" }, { status: 503 });
  }
}
