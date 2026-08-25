"use client";

import { CopyPlus, LayoutTemplate, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { createBoardAction, deleteTemplateAction } from "@/app/actions";
import type { TemplateSummary } from "@/lib/types";

import { ConfirmDialog, TextInputDialog } from "./app-dialog";

export function TemplatesView({ templates }: { templates: TemplateSummary[] }) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState("");
  const [error, setError] = useState("");
  const [templateToCreate, setTemplateToCreate] = useState<TemplateSummary | null>(null);
  const [templateToDelete, setTemplateToDelete] = useState<TemplateSummary | null>(null);
  const [, startTransition] = useTransition();

  function create(template: TemplateSummary, name: string) {
    setPendingId(template.publicId);
    startTransition(async () => {
      try {
        const publicId = await createBoardAction({ name, templatePublicId: template.publicId });
        router.push(`/b/${publicId}`);
        router.refresh();
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Board could not be created.");
        setPendingId("");
      }
    });
  }

  function remove(template: TemplateSummary) {
    setPendingId(template.publicId);
    startTransition(async () => {
      try { await deleteTemplateAction(template.publicId); router.refresh(); }
      catch (cause) { setError(cause instanceof Error ? cause.message : "Template could not be deleted."); }
      finally { setPendingId(""); }
    });
  }

  return <div className="h-[calc(100dvh-56px)] overflow-y-auto p-4 lg:h-dvh lg:p-6">
    <header className="mb-6 flex items-start justify-between gap-4"><div><h1 className="m-0 text-2xl font-semibold">Templates</h1><p className="muted mb-0 mt-1">Local starting points for repeatable boards.</p></div><button className="button" onClick={() => window.dispatchEvent(new Event("kanbn:new-board"))}><Plus size={16} /> New Board</button></header>
    {error && <p className="error panel mb-4 p-3" role="alert">{error}</p>}
    {templates.length === 0 ? <section className="flex min-h-80 items-center justify-center text-center"><div><LayoutTemplate className="muted mx-auto" size={28} /><h2 className="mb-1 mt-3 text-lg font-semibold">No templates yet</h2><p className="muted m-0 max-w-sm">Open a board and choose “Create template” from the board menu.</p></div></section> : <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-4">{templates.map((template) => <article key={template.publicId} className="panel p-4"><div className="flex items-start gap-3"><div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[6px] bg-[var(--secondary)]"><LayoutTemplate size={16} /></div><div className="min-w-0 flex-1"><h2 className="m-0 truncate text-base font-semibold" title={template.name}>{template.name}</h2><p className="muted mb-0 mt-1 text-xs">{template.listCount} lists · {template.cardCount} cards</p></div></div>{template.description && <p className="muted mb-0 mt-3">{template.description}</p>}<div className="mt-5 flex gap-2"><button className="button flex-1" disabled={pendingId === template.publicId} onClick={() => setTemplateToCreate(template)}><CopyPlus size={16} /> Create Board</button><button className="button button-ghost icon-button text-[var(--danger)]" disabled={pendingId === template.publicId} onClick={() => setTemplateToDelete(template)} aria-label={`Delete ${template.name}`}><Trash2 size={16} /></button></div></article>)}</div>}
    <TextInputDialog open={Boolean(templateToCreate)} title="Create board from template" label="Board name" initialValue={templateToCreate?.name} submitLabel="Create board" onClose={() => setTemplateToCreate(null)} onSubmit={async (name) => { if (templateToCreate) create(templateToCreate, name); }} />
    <ConfirmDialog open={Boolean(templateToDelete)} title="Delete template?" description={`“${templateToDelete?.name ?? ""}” will be permanently removed.`} confirmLabel="Delete template" danger onClose={() => setTemplateToDelete(null)} onConfirm={async () => { if (templateToDelete) remove(templateToDelete); }} />
  </div>;
}
