import type { ReactNode } from "react";

import { getBrandingConfig } from "@/lib/branding";
import { getProjectVersion } from "@/lib/project";
import { getSettings, listBoards, listBoardSections, listTemplates } from "@/lib/services/kanban";

import { AppShell } from "./app-shell";

export async function AppShellServer({ currentTitle, children }: { currentTitle: string; children: ReactNode }) {
  const [boards, sections, templates, settings] = await Promise.all([listBoards(), listBoardSections(), listTemplates(), getSettings()]);
  return <AppShell boards={boards} sections={sections} templates={templates} applicationName={settings.applicationName} branding={getBrandingConfig(settings)} projectVersion={getProjectVersion()} defaultTheme={settings.theme} language={settings.language} currentTitle={currentTitle}>{children}</AppShell>;
}
