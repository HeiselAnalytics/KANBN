import { AppShellServer } from "@/components/app-shell-server";
import { SettingsView } from "@/components/settings-view";
import { getSettings, listBoards, listBoardSections } from "@/lib/services/kanban";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const [settings, boards, sections] = await Promise.all([getSettings(), listBoards(), listBoardSections()]);
  return <AppShellServer currentTitle="Settings"><SettingsView initialSettings={settings} boards={boards} sections={sections} /></AppShellServer>;
}
