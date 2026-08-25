import { exportData } from "@/lib/services/kanban";

export const dynamic = "force-dynamic";

export async function GET() {
  const data = await exportData();
  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="kanbn-backup-${new Date().toISOString().slice(0, 10)}.json"`,
    },
  });
}
