"use client";

import { Briefcase, CalendarDays, CircleDollarSign, Code, Folder, FolderPlus, LayoutDashboard, LayoutTemplate, Megaphone, Menu, MoreHorizontal, Palette, Plus, Rocket, Sailboat, Settings, ShoppingBag, Wrench, X, type LucideIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { type ReactNode, useEffect, useRef, useState, useTransition } from "react";

import { assignBoardSectionAction, createBoardAction, createBoardSectionAction, deleteBoardSectionAction, renameBoardSectionAction } from "@/app/actions";
import type { BrandingConfig } from "@/lib/branding";
import type { AppSettings, BoardSectionSummary, BoardSummary, TemplateSummary } from "@/lib/types";

import { AppDialog, ConfirmDialog } from "./app-dialog";
import { CustomSelect } from "./custom-select";
import { useDismissableLayer } from "./use-dismissable-layer";

const SECTION_ICONS: Record<string, LucideIcon> = { Folder, Megaphone, Settings, Sailboat, Briefcase, Rocket, Code, Palette, ShoppingBag, CalendarDays, CircleDollarSign, Wrench };

interface AppShellProps {
  boards: BoardSummary[];
  sections: BoardSectionSummary[];
  templates: TemplateSummary[];
  applicationName: string;
  branding: BrandingConfig;
  projectVersion: string;
  defaultTheme: AppSettings["theme"];
  language: AppSettings["language"];
  currentTitle: string;
  children: ReactNode;
}

export function AppShell({ boards, sections, templates, applicationName, branding, projectVersion, defaultTheme, language, currentTitle, children }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [name, setName] = useState("");
  const [templatePublicId, setTemplatePublicId] = useState("default");
  const [sectionPublicId, setSectionPublicId] = useState("");
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [sectionEditor, setSectionEditor] = useState<BoardSectionSummary | "new" | null>(null);
  const [sectionToDelete, setSectionToDelete] = useState<BoardSectionSummary | null>(null);
  const [error, setError] = useState("");
  const [health, setHealth] = useState<"checking" | "operational" | "error">("checking");
  const [pending, startTransition] = useTransition();
  const openMenuLayerRef = useDismissableLayer<HTMLDivElement>(Boolean(openMenu), () => setOpenMenu(null));

  useEffect(() => {
    const open = () => dialogRef.current?.showModal();
    window.addEventListener("kanbn:new-board", open);
    return () => window.removeEventListener("kanbn:new-board", open);
  }, []);
  useEffect(() => {
    const stored = window.localStorage.getItem("kanbn-theme");
    const preference = stored === "light" || stored === "dark" || stored === "system" ? stored : defaultTheme;
    const resolved = preference === "system" ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light") : preference;
    document.documentElement.dataset.theme = resolved;
    document.documentElement.dataset.themePreference = preference;
    document.documentElement.lang = language;
  }, [defaultTheme, language]);
  useEffect(() => {
    let active = true;
    async function checkHealth() {
      try {
        const response = await fetch("/api/health", { cache: "no-store" });
        if (active) setHealth(response.ok ? "operational" : "error");
      } catch {
        if (active) setHealth("error");
      }
    }
    void checkHealth();
    const interval = window.setInterval(() => void checkHealth(), 60_000);
    return () => { active = false; window.clearInterval(interval); };
  }, []);

  function createBoard() {
    setError("");
    startTransition(async () => {
      try {
        const publicId = await createBoardAction({ name, templatePublicId, sectionPublicId });
        dialogRef.current?.close();
        setName("");
        setTemplatePublicId("default");
        setSectionPublicId("");
        router.push(`/b/${publicId}`);
        router.refresh();
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Board could not be created.");
      }
    });
  }

  function editSection(section: BoardSectionSummary, action: "rename" | "delete") {
    setOpenMenu(null);
    if (action === "rename") {
      setSectionEditor(section);
      return;
    }
    setSectionToDelete(section);
  }

  function moveBoard(board: BoardSummary, targetSectionPublicId: string) {
    setOpenMenu(null);
    startTransition(async () => { await assignBoardSectionAction(board.publicId, targetSectionPublicId || undefined); router.refresh(); });
  }

  function boardLink(board: BoardSummary) {
    return <div key={board.publicId} className="board-nav-row">
      <Link href={`/b/${board.publicId}`} className="nav-item min-w-0 flex-1" data-active={pathname === `/b/${board.publicId}`} onClick={() => setSidebarOpen(false)} title={board.name}>
        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-current opacity-60" aria-hidden="true" />
        <span className="truncate">{board.name}</span>
      </Link>
      <div className="relative" ref={openMenu === `board:${board.publicId}` ? openMenuLayerRef : undefined}>
        <button className="button button-ghost icon-button board-nav-menu" aria-label={`Choose section for ${board.name}`} aria-expanded={openMenu === `board:${board.publicId}`} onClick={() => setOpenMenu(openMenu === `board:${board.publicId}` ? null : `board:${board.publicId}`)}><MoreHorizontal size={15} /></button>
        {openMenu === `board:${board.publicId}` && <div className="menu-popover right-0 top-9 w-64">
          <div className="menu-caption">Move to section</div>
          <button className="menu-button" disabled={!board.sectionPublicId} onClick={() => moveBoard(board, "")}>Without section</button>
          {sections.map((section) => <button key={section.publicId} className="menu-button" disabled={board.sectionPublicId === section.publicId} onClick={() => moveBoard(board, section.publicId)}>{section.name}</button>)}
        </div>}
      </div>
    </div>;
  }

  return (
    <div className="app-shell">
      <button className="sidebar-scrim" data-open={sidebarOpen} aria-label="Close navigation" onClick={() => setSidebarOpen(false)} />
      <aside className="app-sidebar" data-open={sidebarOpen} aria-label="Primary navigation">
        <div className="mb-6 flex min-h-8 items-center gap-3 px-2">
          <Image src="/assets/kanbn-lighthouse.png" alt="" width={24} height={32} className="h-7 w-auto object-contain" priority />
          <span className="brand-title min-w-0 flex-1 truncate">{applicationName}</span>
          <button className="button button-ghost icon-button lg:hidden" onClick={() => setSidebarOpen(false)} aria-label="Close navigation"><X size={16} /></button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col">
          <Link href="/overview" className="nav-item mb-4" data-active={pathname === "/overview"} onClick={() => setSidebarOpen(false)}><LayoutDashboard size={16} /> Overview</Link>
          <div className="sidebar-section-title mb-2 px-2">Boards</div>
          <nav className="sidebar-board-nav min-h-0 flex-1 overflow-y-auto" aria-label="Boards">
            {boards.filter((board) => !board.sectionPublicId).map(boardLink)}
            {sections.map((section) => {
              const SectionIcon = SECTION_ICONS[section.icon] ?? Folder;
              return <section key={section.publicId} className="sidebar-board-section">
              <div className="section-heading-row">
                <SectionIcon size={14} aria-hidden="true" />
                <span className="min-w-0 flex-1 truncate" title={section.name}>{section.name}</span>
                <div className="relative" ref={openMenu === `section:${section.publicId}` ? openMenuLayerRef : undefined}>
                  <button className="button button-ghost icon-button section-menu-button" aria-label={`${section.name} section menu`} aria-expanded={openMenu === `section:${section.publicId}`} onClick={() => setOpenMenu(openMenu === `section:${section.publicId}` ? null : `section:${section.publicId}`)}><MoreHorizontal size={14} /></button>
                  {openMenu === `section:${section.publicId}` && <div className="menu-popover right-0 top-9"><button className="menu-button" onClick={() => editSection(section, "rename")}>Rename section</button><button className="menu-button text-[var(--danger)]" onClick={() => editSection(section, "delete")}>Delete section</button></div>}
                </div>
              </div>
              <div className="space-y-0.5">{boards.filter((board) => board.sectionPublicId === section.publicId).map(boardLink)}</div>
            </section>;
            })}
          </nav>
          <div className="sidebar-action-group grid gap-1">
            <button className="nav-item" onClick={() => setSectionEditor("new")} disabled={pending}><FolderPlus size={16} /> New section</button>
            <button className="nav-item" onClick={() => dialogRef.current?.showModal()}><Plus size={16} /> New board</button>
          </div>
        </div>

        <nav className="sidebar-action-group space-y-1" aria-label="Application">
          <Link href="/templates" className="nav-item" data-active={pathname === "/templates"} onClick={() => setSidebarOpen(false)}><LayoutTemplate size={16} /> Templates</Link>
          <Link href="/settings" className="nav-item" data-active={pathname === "/settings"} onClick={() => setSidebarOpen(false)}><Settings size={16} /> Settings</Link>
        </nav>
        <div className="brand-logo-wrap sidebar-brand-group">
          <div className="brand-logo-row">
            <div className="brand-logo-pair" role="img" aria-label={branding.name}>
              {/* Custom operator-provided logos can have any intrinsic dimensions. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={branding.logoLightUrl} alt="" className="brand-logo brand-logo-light" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={branding.logoDarkUrl} alt="" className="brand-logo brand-logo-dark" />
            </div>
            <div className="brand-status-meta">
              <span className="brand-version">Version {projectVersion}</span>
              <span className="brand-health" role="status" aria-live="polite"><span>{health === "operational" ? "Fully operational" : health === "checking" ? "Checking status" : "Service unavailable"}</span><span className="health-dot" data-status={health} aria-hidden="true" /></span>
            </div>
          </div>
        </div>
      </aside>

      <main className="app-main">
        <div className="mobile-bar">
          <button className="button button-ghost icon-button" aria-label="Open navigation" onClick={() => setSidebarOpen(true)}><Menu size={20} /></button>
          <span className="mobile-title">{currentTitle}</span>
        </div>
        {children}
      </main>

      <dialog ref={dialogRef} className="dialog dialog-popovers-visible" onClose={() => setError("")}>
        <form method="dialog" onSubmit={(event) => { event.preventDefault(); createBoard(); }}>
          <div className="mb-6 flex items-start justify-between gap-4">
            <div><h2 className="m-0 text-xl font-semibold">Create board</h2><p className="muted mb-0 mt-1">Start empty or use a local template.</p></div>
            <button type="button" className="button button-ghost icon-button" onClick={() => dialogRef.current?.close()} aria-label="Close"><X size={16} /></button>
          </div>
          <label className="field">
            <span className="field-label">Board name</span>
            <input className="input" value={name} onChange={(event) => setName(event.target.value)} autoFocus required maxLength={120} />
          </label>
          <CustomSelect className="mt-4" label={<>Create from template <span className="muted font-normal">(optional)</span></>} value={templatePublicId} onChange={setTemplatePublicId} options={[
            { value: "default", label: "Default · IN PROGRESS / TODO / BACKLOG / DONE" },
            { value: "", label: "Empty board" },
            ...templates.map((template) => ({ value: template.publicId, label: template.name })),
          ]} />
          <CustomSelect className="mt-4" label={<>Section <span className="muted font-normal">(optional)</span></>} value={sectionPublicId} onChange={setSectionPublicId} options={[
            { value: "", label: "Without section" },
            ...sections.map((section) => ({ value: section.publicId, label: section.name })),
          ]} />
          {error && <p className="error mb-0 mt-3" role="alert">{error}</p>}
          <div className="dialog-actions">
            <button type="button" className="button button-secondary" onClick={() => dialogRef.current?.close()}>Cancel</button>
            <button className="button" disabled={pending || !name.trim()}>{pending ? "Creating…" : "Create board"}</button>
          </div>
        </form>
      </dialog>
      <SectionEditorDialog section={sectionEditor} onClose={() => setSectionEditor(null)} onSave={async (sectionName, icon) => {
        if (sectionEditor === "new") await createBoardSectionAction(sectionName, icon);
        else if (sectionEditor) await renameBoardSectionAction(sectionEditor.publicId, sectionName, icon);
        router.refresh();
      }} />
      <ConfirmDialog open={Boolean(sectionToDelete)} title="Delete section?" description={`Boards in “${sectionToDelete?.name ?? ""}” will remain and move to Without section. Section-wide labels will be removed.`} confirmLabel="Delete section" danger onClose={() => setSectionToDelete(null)} onConfirm={async () => { if (sectionToDelete) { await deleteBoardSectionAction(sectionToDelete.publicId); router.refresh(); } }} />
    </div>
  );
}

function SectionEditorDialog({ section, onClose, onSave }: { section: BoardSectionSummary | "new" | null; onClose: () => void; onSave: (name: string, icon: string) => Promise<void> }) {
  if (!section) return null;
  return <SectionEditorDialogContent key={section === "new" ? "new" : section.publicId} section={section} onClose={onClose} onSave={onSave} />;
}

function SectionEditorDialogContent({ section, onClose, onSave }: { section: BoardSectionSummary | "new"; onClose: () => void; onSave: (name: string, icon: string) => Promise<void> }) {
  const [name, setName] = useState(section === "new" ? "" : section.name);
  const [icon, setIcon] = useState(section === "new" ? "Folder" : section.icon);
  const [saving, setSaving] = useState(false);
  return <AppDialog open title={section === "new" ? "New section" : "Edit section"} description="Choose a name and a Lucide icon." onClose={onClose}>
    <form className="mt-5" onSubmit={(event) => { event.preventDefault(); if (!name.trim()) return; setSaving(true); void onSave(name.trim(), icon).finally(() => { setSaving(false); onClose(); }); }}>
      <label className="field"><span className="field-label">Section name</span><input className="input" value={name} onChange={(event) => setName(event.target.value)} autoFocus maxLength={120} /></label>
      <fieldset className="m-0 mt-4 border-0 p-0"><legend className="field-label mb-2">Icon</legend><div className="icon-picker">{Object.entries(SECTION_ICONS).map(([value, Icon]) => <label key={value} className="icon-choice" data-active={icon === value} title={value}><input className="sr-only" type="radio" name="section-icon" value={value} checked={icon === value} onChange={() => setIcon(value)} /><Icon size={18} /><span className="sr-only">{value}</span></label>)}</div></fieldset>
      <div className="dialog-actions"><button type="button" className="button button-secondary" onClick={onClose}>Cancel</button><button className="button" disabled={saving || !name.trim()}>{saving ? (section === "new" ? "Creating…" : "Applying…") : (section === "new" ? "Create section" : "Apply changes")}</button></div>
    </form>
  </AppDialog>;
}
