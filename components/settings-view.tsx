"use client";

import { closestCenter, DndContext, type DragEndEvent, KeyboardSensor, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Briefcase, CalendarDays, CircleDollarSign, Code, Download, Folder, GripVertical, Megaphone, Palette, Rocket, Sailboat, Settings, ShoppingBag, Upload, Wrench, type LucideIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { type ChangeEvent, type CSSProperties, useEffect, useRef, useState, useTransition } from "react";

import { moveBoardSectionAction, saveSettingsAction } from "@/app/actions";
import { rankBetween } from "@/lib/rank";
import type { AppSettings, BoardSectionSummary, BoardSummary } from "@/lib/types";

import { ConfirmDialog } from "./app-dialog";
import { CustomSelect } from "./custom-select";

const SECTION_ICONS: Record<string, LucideIcon> = { Folder, Megaphone, Settings, Sailboat, Briefcase, Rocket, Code, Palette, ShoppingBag, CalendarDays, CircleDollarSign, Wrench };

function applyTheme(theme: AppSettings["theme"]) {
  const resolved = theme === "system" ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light") : theme;
  document.documentElement.dataset.theme = resolved;
  document.documentElement.dataset.themePreference = theme;
  window.localStorage.setItem("kanbn-theme", theme);
}

export function SettingsView({ initialSettings, boards, sections }: { initialSettings: AppSettings; boards: BoardSummary[]; sections: BoardSectionSummary[] }) {
  const router = useRouter();
  const [settings, setSettings] = useState(initialSettings);
  const [orderedSections, setOrderedSections] = useState(sections);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [autosaveStatus, setAutosaveStatus] = useState<"idle" | "waiting" | "saving" | "saved" | "error">("idle");
  const [pending, startTransition] = useTransition();
  const [sorting, startSortTransition] = useTransition();
  const [importFile, setImportFile] = useState<File | null>(null);
  const lastSavedSettings = useRef(JSON.stringify(initialSettings));
  const saveVersion = useRef(0);
  const saveQueue = useRef<Promise<void>>(Promise.resolve());
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const listener = () => { if (settings.theme === "system") applyTheme("system"); };
    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }, [settings.theme]);
  useEffect(() => {
    const snapshot = JSON.stringify(settings);
    if (snapshot === lastSavedSettings.current) return;
    if (!settings.applicationName.trim()) return;
    const version = ++saveVersion.current;
    const timer = window.setTimeout(() => {
      setAutosaveStatus("saving");
      startTransition(async () => {
        saveQueue.current = saveQueue.current.catch(() => undefined).then(() => saveSettingsAction(settings));
        try {
          await saveQueue.current;
          lastSavedSettings.current = snapshot;
          applyTheme(settings.theme);
          document.documentElement.lang = settings.language;
          if (version === saveVersion.current) setAutosaveStatus("saved");
          router.refresh();
        } catch {
          if (version === saveVersion.current) setAutosaveStatus("error");
        }
      });
    }, 600);
    return () => window.clearTimeout(timer);
  }, [router, settings]);

  function updateSettings(next: AppSettings) {
    setSettings(next);
    setAutosaveStatus(next.applicationName.trim() ? "waiting" : "error");
  }

  async function importBackup(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) setImportFile(file);
  }

  async function confirmImport() {
    const file = importFile;
    if (!file) return;
    setError(""); setMessage("Importing backup…");
    try {
      const response = await fetch("/api/import", { method: "POST", headers: { "content-type": "application/json" }, body: await file.text() });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || "Import failed.");
      setMessage("Backup imported. Reloading…");
      router.push("/");
      router.refresh();
    } catch (cause) { setMessage(""); setError(cause instanceof Error ? cause.message : "Import failed."); }
  }

  function sortSection(event: DragEndEvent) {
    if (!event.over || event.active.id === event.over.id) return;
    const oldIndex = orderedSections.findIndex((section) => section.publicId === event.active.id);
    const newIndex = orderedSections.findIndex((section) => section.publicId === event.over?.id);
    if (oldIndex < 0 || newIndex < 0) return;

    const previous = orderedSections;
    const moved = orderedSections[oldIndex];
    const next = arrayMove(orderedSections, oldIndex, newIndex);
    const withoutMoved = orderedSections.filter((section) => section.publicId !== moved.publicId);
    const beforePosition = withoutMoved[newIndex - 1]?.position ?? null;
    const afterPosition = withoutMoved[newIndex]?.position ?? null;
    const nextPosition = rankBetween(beforePosition, afterPosition);
    setOrderedSections(next.map((section) => section.publicId === moved.publicId ? { ...section, position: nextPosition } : section));
    setError("");
    setMessage("");

    startSortTransition(async () => {
      try {
        await moveBoardSectionAction({ publicId: moved.publicId, beforePosition, afterPosition });
        setMessage("Section order saved.");
        router.refresh();
      } catch (cause) {
        setOrderedSections(previous);
        setError(cause instanceof Error ? cause.message : "Section order could not be saved.");
      }
    });
  }

  return <div className="h-[calc(100dvh-56px)] overflow-y-auto p-4 lg:h-dvh lg:p-6">
    <div className="mx-auto max-w-3xl">
      <header className="mb-6"><h1 className="m-0 text-2xl font-semibold">Settings</h1><p className="muted mb-0 mt-1">Configure this KANBN installation.</p><p className={`autosave-status mb-0 ${autosaveStatus === "error" ? "error" : ""}`} role="status" aria-live="polite">{autosaveStatus === "waiting" ? "Changes will be stored automatically…" : autosaveStatus === "saving" || pending ? "Storing changes…" : autosaveStatus === "saved" ? "All changes are stored automatically." : autosaveStatus === "error" ? (settings.applicationName.trim() ? "Changes could not be stored." : "Application name is required.") : "Changes are stored automatically."}</p></header>
      {message && <p className="panel mb-4 p-3" role="status">{message}</p>}{error && <p className="error panel mb-4 p-3" role="alert">{error}</p>}
      <section className="border-b border-[var(--border)] py-5 first:pt-0"><h2 className="mb-4 mt-0 text-lg font-semibold">General</h2><div className="grid gap-4 sm:grid-cols-2"><label className="field"><span className="field-label">Application name</span><input className="input" value={settings.applicationName} onChange={(event) => updateSettings({ ...settings, applicationName: event.target.value })} maxLength={120} /></label><CustomSelect label="Default board" value={settings.defaultBoard} onChange={(defaultBoard) => updateSettings({ ...settings, defaultBoard })} options={[{ value: "", label: "Last opened board" }, ...boards.map((board) => ({ value: board.publicId, label: board.name }))]} /><CustomSelect label="Language" value={settings.language} onChange={(language) => updateSettings({ ...settings, language: language as AppSettings["language"] })} options={[{ value: "en", label: "English" }, { value: "de", label: "Deutsch" }]} /><CustomSelect label="Date format" value={settings.dateFormat} onChange={(dateFormat) => updateSettings({ ...settings, dateFormat: dateFormat as AppSettings["dateFormat"] })} options={[{ value: "dd.MM.yyyy", label: "DD.MM.YYYY" }, { value: "MM/dd/yyyy", label: "MM/DD/YYYY" }, { value: "yyyy-MM-dd", label: "YYYY-MM-DD" }]} /></div><p className="help mb-0 mt-3 text-xs">Installation branding is controlled by <code>KANBN_BRAND_*</code> environment variables. Custom Light and Dark Mode logos can be mounted from <code>public/branding</code>.</p></section>
      <section className="border-b border-[var(--border)] py-5"><h2 className="mb-1 mt-0 text-lg font-semibold">Board sections</h2><p className="muted mb-4 mt-0">Drag sections into the order used in the sidebar and board selectors.</p>{orderedSections.length > 0 ? <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={sortSection}><SortableContext items={orderedSections.map((section) => section.publicId)} strategy={verticalListSortingStrategy}><div className="section-sort-list">{orderedSections.map((section) => <SortableSection key={section.publicId} section={section} boardCount={boards.filter((board) => board.sectionPublicId === section.publicId).length} disabled={sorting} />)}</div></SortableContext></DndContext> : <p className="panel muted m-0 p-4">Create a section in the sidebar to arrange it here.</p>}</section>
      <section className="border-b border-[var(--border)] py-5"><h2 className="mb-4 mt-0 text-lg font-semibold">Appearance</h2><fieldset className="m-0 border-0 p-0"><legend className="field-label mb-2">Theme</legend><div className="flex flex-wrap gap-2">{(["light", "dark", "system"] as const).map((theme) => <label key={theme} className="flex min-h-8 cursor-pointer items-center gap-2 rounded-[6px] border border-[var(--border)] px-3 capitalize"><input type="radio" name="theme" value={theme} checked={settings.theme === theme} onChange={() => { updateSettings({ ...settings, theme }); applyTheme(theme); }} /> {theme}</label>)}</div></fieldset><label className="mt-4 flex min-h-8 items-center gap-2"><input type="checkbox" checked={settings.compactCards} onChange={(event) => updateSettings({ ...settings, compactCards: event.target.checked })} /> Compact cards</label></section>
      <section className="py-5"><h2 className="mb-2 mt-0 text-lg font-semibold">Data</h2><p className="muted mb-4 mt-0">Export a complete JSON backup or replace this installation from a KANBN backup.</p><div className="flex flex-wrap gap-2"><a className="button button-secondary no-underline" href="/api/export"><Download size={16} /> Export</a><label className="button button-secondary cursor-pointer"><Upload size={16} /> Import<input className="sr-only" type="file" accept="application/json,.json" onChange={(event) => void importBackup(event)} /></label></div></section>
    </div>
    <ConfirmDialog open={Boolean(importFile)} title="Replace all KANBN data?" description={`Importing “${importFile?.name ?? ""}” replaces every current section, board, card, template, and setting.`} confirmLabel="Import backup" danger onClose={() => setImportFile(null)} onConfirm={async () => { await confirmImport(); setImportFile(null); }} />
  </div>;
}

function SortableSection({ section, boardCount, disabled }: { section: BoardSectionSummary; boardCount: number; disabled: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: section.publicId, disabled });
  const style: CSSProperties = { transform: CSS.Transform.toString(transform), transition };
  const Icon = SECTION_ICONS[section.icon] ?? Folder;
  return <div ref={setNodeRef} style={style} className="section-sort-row" data-dragging={isDragging}>
    <button type="button" className="button button-ghost icon-button drag-handle" aria-label={`Reorder ${section.name}`} disabled={disabled} {...attributes} {...listeners}><GripVertical size={16} /></button>
    <Icon size={17} aria-hidden="true" />
    <span className="section-sort-name">{section.name}</span>
    <span className="muted text-xs">{boardCount} {boardCount === 1 ? "board" : "boards"}</span>
  </div>;
}
