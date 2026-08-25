import { AppShellServer } from "@/components/app-shell-server";
import { TemplatesView } from "@/components/templates-view";
import { listTemplates } from "@/lib/services/kanban";

export const dynamic = "force-dynamic";

export default async function TemplatesPage() {
  const templates = await listTemplates();
  return <AppShellServer currentTitle="Templates"><TemplatesView templates={templates} /></AppShellServer>;
}
