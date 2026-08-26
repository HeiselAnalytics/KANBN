"use client";

import { Calendar, ChevronDown, Columns3, Folder, LayoutDashboard, RotateCcw, Search } from "lucide-react";
import Link from "next/link";
import { type CSSProperties, useMemo, useSyncExternalStore } from "react";

import {
  DEFAULT_OVERVIEW_FILTERS,
  getOverviewListFilterOptions,
  matchesOverviewFilters,
  NO_COLOR_FILTER,
  NO_SECTION_FILTER,
  OVERVIEW_FILTER_STORAGE_KEY,
  overviewListFilterKey,
  parseOverviewFilters,
  sortOverviewCards,
  type OverviewDueFilter,
  type OverviewFilters,
} from "@/lib/overview";
import type { AppSettings, BoardSectionSummary, BoardSummary, CardColorData, LabelData, OverviewCardData, OverviewListSummary } from "@/lib/types";

import { CustomSelect } from "./custom-select";

interface OverviewViewProps {
  cards: OverviewCardData[];
  boards: BoardSummary[];
  sections: BoardSectionSummary[];
  lists: OverviewListSummary[];
  colors: CardColorData[];
  labels: LabelData[];
  settings: AppSettings;
  serverNow: number;
}

const filterSubscribers = new Set<() => void>();
let inMemoryFilterSnapshot = "";

function getFilterSnapshot(): string {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(OVERVIEW_FILTER_STORAGE_KEY) ?? inMemoryFilterSnapshot;
  } catch {
    return inMemoryFilterSnapshot;
  }
}

function subscribeToFilters(callback: () => void): () => void {
  filterSubscribers.add(callback);
  const onStorage = (event: StorageEvent) => {
    if (event.key === OVERVIEW_FILTER_STORAGE_KEY) {
      inMemoryFilterSnapshot = event.newValue ?? "";
      callback();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    filterSubscribers.delete(callback);
    window.removeEventListener("storage", onStorage);
  };
}

function saveFilters(filters: OverviewFilters) {
  inMemoryFilterSnapshot = JSON.stringify(filters);
  try {
    window.localStorage.setItem(OVERVIEW_FILTER_STORAGE_KEY, inMemoryFilterSnapshot);
  } catch {
    // The in-memory fallback keeps the selection for this session.
  }
  filterSubscribers.forEach((subscriber) => subscriber());
}

function filtersFromSnapshot(snapshot: string): OverviewFilters {
  if (!snapshot) return DEFAULT_OVERVIEW_FILTERS;
  try {
    return parseOverviewFilters(JSON.parse(snapshot));
  } catch {
    return DEFAULT_OVERVIEW_FILTERS;
  }
}

function toggleSelection(values: string[], value: string): string[] {
  return values.includes(value) ? values.filter((entry) => entry !== value) : [...values, value];
}

function formatDueDate(value: string, settings: AppSettings) {
  const date = new Date(value);
  const datePart = settings.dateFormat === "yyyy-MM-dd"
    ? date.toISOString().slice(0, 10)
    : new Intl.DateTimeFormat(settings.dateFormat === "MM/dd/yyyy" ? "en-US" : "de-CH", { year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
  const timePart = new Intl.DateTimeFormat(settings.language === "de" ? "de-CH" : "en", { hour: "2-digit", minute: "2-digit" }).format(date);
  return `${datePart}, ${timePart}`;
}

function FilterGroup({ title, values, selected, onToggle, appearance = "default", collapsible = false }: { title: string; values: { id: string; name: string; color?: string | null }[]; selected: string[]; onToggle: (id: string) => void; appearance?: "default" | "labels"; collapsible?: boolean }) {
  const selectionHint = selected.length ? `${selected.length} selected` : "All included";
  const options = <div className="overview-check-list">
      {values.map((value) => <label key={value.id} className="overview-check-row">
        <input type="checkbox" checked={selected.includes(value.id)} onChange={() => onToggle(value.id)} />
        {appearance === "labels" && value.color ? <span className="label-badge" style={{ "--label-color": value.color } as CSSProperties} title={value.name}><span className="label-dot" aria-hidden="true" /><span className="truncate">{value.name}</span></span> : <>
          {value.color !== undefined && <span className="overview-filter-color" data-empty={value.color === null} style={value.color ? { "--filter-color": value.color } as CSSProperties : undefined} aria-hidden="true" />}
          <span className="min-w-0 flex-1 truncate" title={value.name}>{value.name}</span>
        </>}
      </label>)}
    </div>;

  if (collapsible) return <details className="overview-filter-group overview-filter-collapsible">
    <summary className="overview-filter-summary"><span className="field-label">{title}</span><span className="overview-filter-hint">{selectionHint}</span><ChevronDown size={16} aria-hidden="true" /></summary>
    {options}
  </details>;

  return <fieldset className="overview-filter-group">
    <legend className="overview-filter-legend"><span className="overview-filter-legend-row"><span className="field-label">{title}</span><span className="overview-filter-hint">{selectionHint}</span></span></legend>
    {options}
  </fieldset>;
}

export function OverviewView({ cards, boards, sections, lists, colors, labels, settings, serverNow }: OverviewViewProps) {
  const filterSnapshot = useSyncExternalStore(subscribeToFilters, getFilterSnapshot, () => "");
  const listFilterOptions = useMemo(() => getOverviewListFilterOptions(lists), [lists]);
  const filters = useMemo(() => {
    const stored = filtersFromSnapshot(filterSnapshot);
    const sectionIds = new Set([NO_SECTION_FILTER, ...sections.map((section) => section.publicId)]);
    const boardIds = new Set(boards.map((board) => board.publicId));
    const listIds = new Set(listFilterOptions.map((list) => list.id));
    const legacyListIds = new Map(lists.map((list) => [list.publicId, overviewListFilterKey(list.name)]));
    const colorIds = new Set([NO_COLOR_FILTER, ...colors.map((color) => color.publicId)]);
    const labelIds = new Set(labels.map((label) => label.publicId));
    return {
      ...stored,
      sections: stored.sections.filter((id) => sectionIds.has(id)),
      boards: stored.boards.filter((id) => boardIds.has(id)),
      lists: Array.from(new Set(stored.lists.map((id) => legacyListIds.get(id) ?? id))).filter((id) => listIds.has(id)),
      colors: stored.colors.filter((id) => colorIds.has(id)),
      labels: stored.labels.filter((id) => labelIds.has(id)),
    };
  }, [boards, colors, filterSnapshot, labels, listFilterOptions, lists, sections]);

  const visibleCards = useMemo(
    () => cards.filter((card) => matchesOverviewFilters(card, filters, serverNow)).sort(sortOverviewCards),
    [cards, filters, serverNow],
  );
  const activeFilterCount = filters.sections.length + filters.boards.length + filters.lists.length + filters.colors.length + filters.labels.length + Number(filters.due !== "all") + Number(Boolean(filters.search.trim()));

  function update<K extends keyof OverviewFilters>(key: K, value: OverviewFilters[K]) {
    saveFilters({ ...filters, [key]: value });
  }

  return <div className="overview-page">
    <h1 className="sr-only">Overview</h1>
    <div className="overview-layout">
      <aside className="overview-filters" aria-label="Overview filters">
        <div className="overview-filter-heading">
          <div><h2>Display</h2><p>Your selection is saved on this device.</p></div>
          <div className="overview-filter-actions">
            <span className="overview-result-count" role="status">{visibleCards.length} of {cards.length}</span>
            <button className="button button-ghost icon-button" disabled={activeFilterCount === 0} onClick={() => saveFilters({ ...DEFAULT_OVERVIEW_FILTERS, due: "all" })} aria-label="Reset all overview filters" title="Reset filters"><RotateCcw size={16} /></button>
          </div>
        </div>
        <label className="field">
          <span className="field-label">Search</span>
          <span className="overview-search"><Search size={16} /><input className="input" value={filters.search} onChange={(event) => update("search", event.target.value)} placeholder="Title, board, list, color, label…" /></span>
        </label>
        <CustomSelect label="Due date · What is due soon?" value={filters.due} onChange={(value) => update("due", value as OverviewDueFilter)} options={[
          { value: "next7", label: "Next 7 days" },
          { value: "next14", label: "Next 14 days" },
          { value: "next30", label: "Next 30 days" },
          { value: "today", label: "Due today" },
          { value: "overdue", label: "Overdue" },
          { value: "scheduled", label: "Any due date" },
          { value: "none", label: "Without due date" },
          { value: "all", label: "All cards" },
        ]} />
        <FilterGroup title="Lists" values={listFilterOptions} selected={filters.lists} onToggle={(id) => update("lists", toggleSelection(filters.lists, id))} />
        {labels.length > 0 && <FilterGroup title="Labels" appearance="labels" values={labels.map((label) => ({ id: label.publicId, name: label.name, color: label.color }))} selected={filters.labels} onToggle={(id) => update("labels", toggleSelection(filters.labels, id))} />}
        <div className="overview-filter-collapsed-groups">
          <FilterGroup title="Sections" collapsible values={[{ id: NO_SECTION_FILTER, name: "Without section" }, ...sections.map((section) => ({ id: section.publicId, name: section.name }))]} selected={filters.sections} onToggle={(id) => update("sections", toggleSelection(filters.sections, id))} />
          <FilterGroup title="Boards" collapsible values={boards.map((board) => ({ id: board.publicId, name: board.name }))} selected={filters.boards} onToggle={(id) => update("boards", toggleSelection(filters.boards, id))} />
          <FilterGroup title="Card colors" collapsible values={[{ id: NO_COLOR_FILTER, name: "Without color", color: null }, ...colors.map((color) => ({ id: color.publicId, name: color.name, color: color.color }))]} selected={filters.colors} onToggle={(id) => update("colors", toggleSelection(filters.colors, id))} />
        </div>
      </aside>

      <main className="overview-content">
        {visibleCards.length > 0 ? <div className="overview-card-grid">
          {visibleCards.map((card) => <OverviewCard key={card.publicId} card={card} settings={settings} serverNow={serverNow} />)}
        </div> : <section className="overview-empty">
          <LayoutDashboard size={28} aria-hidden="true" />
          <h2>No cards match this view</h2>
          <p>Adjust the saved filters or choose a wider due-date range.</p>
          <button className="button button-secondary" onClick={() => saveFilters({ ...DEFAULT_OVERVIEW_FILTERS, due: "all" })}><RotateCcw size={16} /> Show all cards</button>
        </section>}
      </main>
    </div>
  </div>;
}

function OverviewCard({ card, settings, serverNow }: { card: OverviewCardData; settings: AppSettings; serverNow: number }) {
  const cardStyle = card.color ? { "--card-color": card.color.color } as CSSProperties : undefined;
  const overdue = Boolean(card.dueDate && new Date(card.dueDate).getTime() < serverNow);
  return <article className="kanban-card overview-card" style={cardStyle} data-colored={Boolean(card.color)}>
    <div className="overview-card-origin">
      <span className="overview-section-name" title={card.sectionName ?? "Without section"}><Folder size={13} aria-hidden="true" />{card.sectionName ?? "Without section"}</span>
      <Link className="overview-board-link" href={`/b/${card.boardPublicId}`} title={`Open ${card.boardName}`}><Columns3 size={13} aria-hidden="true" />{card.boardName}</Link>
      <span className="overview-list-name" title={card.listName}>{card.listName}</span>
    </div>
    <Link className="card-open no-underline" href={`/b/${card.boardPublicId}`}>
      <h2 className="card-title m-0">{card.title}</h2>
      {card.description && <p className="card-description">{card.description}</p>}
      {(card.labels.length > 0 || card.dueDate) && <div className="card-meta-row">
        <div className="flex min-w-0 flex-wrap gap-1">{card.labels.map((label) => <span key={label.publicId} className="label-badge" style={{ "--label-color": label.color } as CSSProperties}><span className="label-dot" /><span className="truncate">{label.name}</span></span>)}</div>
        {card.dueDate && <time className={`card-due ${overdue ? "text-[var(--danger)]" : ""}`} dateTime={card.dueDate}><Calendar size={14} />{formatDueDate(card.dueDate, settings)}</time>}
      </div>}
    </Link>
  </article>;
}
