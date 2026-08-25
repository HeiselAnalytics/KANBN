"use client";

import { Plus } from "lucide-react";

export function EmptyBoard() {
  return (
    <section className="flex h-[calc(100dvh-56px)] items-center justify-center p-6 lg:h-dvh" aria-labelledby="empty-title">
      <div className="max-w-sm text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-[7px] border border-[var(--border)] bg-[var(--secondary)]">
          <Plus size={20} aria-hidden="true" />
        </div>
        <h1 id="empty-title" className="m-0 text-2xl font-semibold">No boards yet</h1>
        <p className="muted mb-6 mt-2">Create your first board to get started.</p>
        <button className="button" onClick={() => window.dispatchEvent(new Event("kanbn:new-board"))}><Plus size={16} /> Create Board</button>
      </div>
    </section>
  );
}
