import type { Metadata } from "next";

import { AppShellServer } from "@/components/app-shell-server";
import { OverviewView } from "@/components/overview-view";
import { currentTimestamp, getOverview, getSettings } from "@/lib/services/kanban";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Overview",
};

export default async function OverviewPage() {
  const [overview, settings] = await Promise.all([getOverview(), getSettings()]);
  return <AppShellServer currentTitle="Overview">
    <OverviewView {...overview} settings={settings} serverNow={currentTimestamp()} />
  </AppShellServer>;
}
