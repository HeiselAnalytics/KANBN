import { notFound } from "next/navigation";

import { AppShellServer } from "@/components/app-shell-server";
import { BoardView } from "@/components/board-view";
import { currentTimestamp, getBoard, getSettings } from "@/lib/services/kanban";

export const dynamic = "force-dynamic";

export default async function BoardPage({ params }: { params: Promise<{ boardId: string }> }) {
  const { boardId } = await params;
  const [board, settings] = await Promise.all([getBoard(boardId, true), getSettings()]);
  if (!board) notFound();
  return <AppShellServer currentTitle={board.name}><BoardView key={board.publicId} initialBoard={board} settings={settings} serverNow={currentTimestamp()} /></AppShellServer>;
}
