import { redirect } from "next/navigation";

import { AppShellServer } from "@/components/app-shell-server";
import { EmptyBoard } from "@/components/empty-board";
import { findInitialBoard } from "@/lib/services/kanban";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const boardId = await findInitialBoard();
  if (boardId) redirect(`/b/${boardId}`);
  return <AppShellServer currentTitle="KANBN"><EmptyBoard /></AppShellServer>;
}
