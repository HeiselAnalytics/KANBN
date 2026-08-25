"use client";

import {
  closestCorners,
  type CollisionDetection,
  DndContext,
  DragOverlay,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy, horizontalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Calendar, CheckSquare, ChevronDown, Filter, GripVertical, MoreHorizontal, Palette, Plus, Search, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { CSSProperties, FormEvent, useEffect, useId, useMemo, useRef, useState, useTransition } from "react";

import {
  createCardAction,
  createListAction,
  deleteBoardAction,
  deleteListAction,
  duplicateBoardAction,
  moveCardAction,
  moveListAction,
  renameBoardAction,
  renameListAction,
  saveTemplateAction,
  updateChecklistItemAction,
} from "@/app/actions";
import type { AppSettings, BoardData, CardData, ListData } from "@/lib/types";
import { moveCardOnBoard } from "@/lib/board-order";

import { CardDetail } from "./card-detail";
import { ConfirmDialog, TextInputDialog } from "./app-dialog";
import { CustomSelect } from "./custom-select";
import { useDismissableLayer } from "./use-dismissable-layer";

type FilterState = { label: string; due: "all" | "due" | "overdue"; checklist: boolean };

const EMPTY_FILTER: FilterState = { label: "", due: "all", checklist: false };

function isInput(target: EventTarget | null) {
  return target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement || (target instanceof HTMLElement && target.isContentEditable);
}

function positionsForMove<T extends { publicId: string; position: number }>(items: T[], movingId: string, targetIndex: number) {
  const remaining = items.filter((item) => item.publicId !== movingId);
  return {
    beforePosition: remaining[targetIndex - 1]?.position ?? null,
    afterPosition: remaining[targetIndex]?.position ?? null,
  };
}

export function BoardView({ initialBoard, settings, serverNow }: { initialBoard: BoardData; settings: AppSettings; serverNow: number }) {
  const router = useRouter();
  const searchRef = useRef<HTMLInputElement>(null);
  const [board, setBoard] = useState(initialBoard);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [focusedListId, setFocusedListId] = useState<string | null>(initialBoard.lists[0]?.publicId ?? null);
  const [addingCardTo, setAddingCardTo] = useState<string | null>(null);
  const [addingList, setAddingList] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterState>(EMPTY_FILTER);
  const [filterOpen, setFilterOpen] = useState(false);
  const [boardMenuOpen, setBoardMenuOpen] = useState(false);
  const [boardTextAction, setBoardTextAction] = useState<"rename" | "template" | null>(null);
  const [deleteBoardOpen, setDeleteBoardOpen] = useState(false);
  const [activeCardId, setActiveCardId] = useState<string | null>(null);
  const [dragOverListId, setDragOverListId] = useState<string | null>(null);
  const [toast, setToast] = useState("");
  const filterLayerRef = useDismissableLayer<HTMLDivElement>(filterOpen, () => setFilterOpen(false));
  const boardMenuLayerRef = useDismissableLayer<HTMLDivElement>(boardMenuOpen, () => setBoardMenuOpen(false));
  const [, startTransition] = useTransition();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const collisionDetection = useMemo<CollisionDetection>(() => (args) => {
    const activeType = args.active.data.current?.type;
    const droppableContainers = args.droppableContainers.filter((container) => {
      const targetType = container.data.current?.type;
      if (activeType === "list") return targetType === "list";
      if (activeType === "card") return targetType === "card" || targetType === "card-container";
      return true;
    });
    return closestCorners({ ...args, droppableContainers });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 4000);
    return () => window.clearTimeout(timer);
  }, [toast]);
  useEffect(() => {
    function shortcuts(event: KeyboardEvent) {
      if (isInput(event.target)) return;
      if (event.key === "/") { event.preventDefault(); searchRef.current?.focus(); }
      if (event.key.toLowerCase() === "n" && focusedListId) { event.preventDefault(); setAddingCardTo(focusedListId); }
    }
    window.addEventListener("keydown", shortcuts);
    return () => window.removeEventListener("keydown", shortcuts);
  }, [focusedListId]);

  const selectedCard = useMemo(() => board.lists.flatMap((list) => list.cards).find((card) => card.publicId === selectedCardId) ?? null, [board, selectedCardId]);
  const activeCard = useMemo(() => board.lists.flatMap((list) => list.cards).find((card) => card.publicId === activeCardId) ?? null, [activeCardId, board]);
  const colorLegend = useMemo(() => {
    const usedColors = new Set(board.lists.flatMap((list) => list.cards.map((card) => card.color?.publicId).filter(Boolean)));
    return board.colors.filter((color) => usedColors.has(color.publicId));
  }, [board]);
  const activeFilterCount = Number(Boolean(filter.label)) + Number(filter.due !== "all") + Number(filter.checklist);

  function matches(card: CardData) {
    const term = search.trim().toLocaleLowerCase();
    if (term && !`${card.title} ${card.description} ${card.labels.map((label) => label.name).join(" ")}`.toLocaleLowerCase().includes(term)) return false;
    if (filter.label && !card.labels.some((label) => label.publicId === filter.label)) return false;
    const now = serverNow;
    if (filter.due === "due" && !card.dueDate) return false;
    if (filter.due === "overdue" && (!card.dueDate || new Date(card.dueDate).getTime() >= now)) return false;
    if (filter.checklist && !card.checklists.length) return false;
    return true;
  }

  async function run(action: () => Promise<BoardData>, success?: string): Promise<BoardData | null> {
    const previous = board;
    try {
      const data = await action();
      setBoard(data);
      if (success) setToast(success);
      return data;
    } catch (cause) {
      setBoard(previous);
      setToast(cause instanceof Error ? cause.message : "The change could not be saved.");
      return null;
    }
  }

  async function addCard(listPublicId: string, title: string, editAfterCreate: boolean) {
    const existingCardIds = new Set(board.lists.flatMap((list) => list.cards.map((card) => card.publicId)));
    setAddingCardTo(null);
    const data = await run(() => createCardAction(listPublicId, title), "Card added.");
    if (!data || !editAfterCreate) return;
    const createdCard = data.lists.flatMap((list) => list.cards).find((card) => !existingCardIds.has(card.publicId));
    if (createdCard) setSelectedCardId(createdCard.publicId);
  }

  function onDragStart(event: DragStartEvent) {
    if (event.active.data.current?.type !== "card") return;
    setActiveCardId(String(event.active.id).replace("card:", ""));
    setDragOverListId(event.active.data.current?.listPublicId as string | null);
  }

  function onDragOver(event: DragOverEvent) {
    if (event.active.data.current?.type !== "card") return;
    setDragOverListId((event.over?.data.current?.listPublicId as string | undefined) ?? null);
  }

  function clearCardDrag() {
    setActiveCardId(null);
    setDragOverListId(null);
  }

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    clearCardDrag();
    if (!over || active.id === over.id) return;
    const type = active.data.current?.type as "list" | "card" | undefined;
    if (type === "list") {
      const oldIndex = board.lists.findIndex((list) => `list:${list.publicId}` === active.id);
      const newIndex = board.lists.findIndex((list) => `list:${list.publicId}` === over.id);
      if (oldIndex < 0 || newIndex < 0) return;
      const moved = board.lists[oldIndex];
      const positions = positionsForMove(board.lists, moved.publicId, newIndex);
      setBoard({ ...board, lists: arrayMove(board.lists, oldIndex, newIndex) });
      void run(() => moveListAction({ publicId: moved.publicId, ...positions }));
      return;
    }
    if (type === "card") {
      const overType = over.data.current?.type as "card" | "card-container" | undefined;
      const targetListId = over.data.current?.listPublicId as string | undefined;
      if (!targetListId) return;
      const targetList = board.lists.find((list) => list.publicId === targetListId);
      if (!targetList) return;
      const cardId = String(active.id).replace("card:", "");
      const hoveredIndex = overType === "card" ? targetList.cards.findIndex((item) => `card:${item.publicId}` === over.id) : targetList.cards.length;
      const targetIndex = hoveredIndex < 0 ? targetList.cards.length : hoveredIndex;
      const result = moveCardOnBoard(board, cardId, targetListId, targetIndex);
      if (!result) return;
      setBoard(result.board);
      void run(() => moveCardAction({ publicId: cardId, targetListPublicId: targetListId, beforePosition: result.beforePosition, afterPosition: result.afterPosition }));
    }
  }

  async function boardMenuAction(kind: "rename" | "duplicate" | "template" | "delete") {
    setBoardMenuOpen(false);
    if (kind === "rename") {
      setBoardTextAction("rename");
    } else if (kind === "duplicate") {
      const id = await duplicateBoardAction(board.publicId);
      router.push(`/b/${id}`);
      router.refresh();
    } else if (kind === "template") {
      setBoardTextAction("template");
    } else {
      setDeleteBoardOpen(true);
    }
  }

  return (
    <div className="board-page" data-compact={settings.compactCards}>
      <header className="board-toolbar">
        <h1 className="board-title" title={board.name}>{board.name}</h1>
        {colorLegend.length > 0 && <div className="board-color-legend" aria-label="Card color legend"><span className="legend-title"><Palette size={14} /> Legend</span>{colorLegend.map((color) => <span key={color.publicId} className="legend-item"><span className="legend-swatch" style={{ "--legend-color": color.color } as CSSProperties} />{color.name}</span>)}</div>}
        <div className="filter-bar">
          <label className="search-wrap"><span className="sr-only">Search cards</span><Search size={16} /><input ref={searchRef} className="input" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search cards…" /></label>
          <div className="relative" ref={filterLayerRef}>
            <button className="button button-secondary" onClick={() => setFilterOpen(!filterOpen)} aria-expanded={filterOpen} aria-label={`Filter cards${activeFilterCount ? `, ${activeFilterCount} active` : ""}`}><Filter size={16} /><span className="filter-label">Filter{activeFilterCount > 0 && <span className="filter-count" aria-hidden="true">{activeFilterCount}</span>}</span></button>
            {filterOpen && <div className="menu-popover filter-popover right-0 top-10" role="group" aria-label="Card filters">
              <div className="filter-popover-header">
                <h2 className="filter-popover-title">Filter cards</h2>
                <button className="button button-ghost icon-button filter-popover-close" onClick={() => setFilterOpen(false)} aria-label="Close filters"><X size={16} /></button>
              </div>
              <div className="filter-popover-body">
                <CustomSelect label="Label" value={filter.label} onChange={(label) => setFilter({ ...filter, label })} options={[
                  { value: "", label: "All labels" },
                  ...board.labels.map((label) => ({ value: label.publicId, label: label.name })),
                ]} />
                <CustomSelect label="Due date" value={filter.due} onChange={(due) => setFilter({ ...filter, due: due as FilterState["due"] })} options={[
                  { value: "all", label: "Any date" },
                  { value: "due", label: "Has due date" },
                  { value: "overdue", label: "Overdue" },
                ]} />
                <div className="field">
                  <span className="field-label">Checklist</span>
                  <label className="filter-check-row"><input type="checkbox" checked={filter.checklist} onChange={(event) => setFilter({ ...filter, checklist: event.target.checked })} /><span>Has checklist items</span></label>
                </div>
              </div>
              <div className="filter-popover-footer">
                <span className="filter-status">{activeFilterCount ? `${activeFilterCount} active` : "No filters active"}</span>
                <button className="button button-ghost filter-clear" disabled={activeFilterCount === 0} onClick={() => setFilter(EMPTY_FILTER)}><X size={16} /> Clear filters</button>
              </div>
            </div>}
          </div>
        </div>
        <div className="relative" ref={boardMenuLayerRef}>
          <button className="button button-ghost icon-button" aria-label="Board menu" title="Board menu" onClick={() => setBoardMenuOpen(!boardMenuOpen)} aria-expanded={boardMenuOpen}><MoreHorizontal size={18} /></button>
          {boardMenuOpen && <div className="menu-popover right-0 top-10">{([['rename','Rename board'],['duplicate','Duplicate board'],['template','Create template'],['delete','Delete board']] as const).map(([kind, label]) => <button key={kind} className={`menu-button ${kind === "delete" ? "text-[var(--danger)]" : ""}`} onClick={() => void boardMenuAction(kind)}>{label}</button>)}</div>}
        </div>
      </header>

      <DndContext sensors={sensors} collisionDetection={collisionDetection} onDragStart={onDragStart} onDragOver={onDragOver} onDragCancel={clearCardDrag} onDragEnd={onDragEnd}>
        <div className="board-canvas">
          <SortableContext items={board.lists.map((list) => `list:${list.publicId}`)} strategy={horizontalListSortingStrategy}>
            <div className="board-columns">
              {board.lists.map((list) => <KanbanList key={list.publicId} list={{ ...list, cards: list.cards.filter(matches) }} adding={addingCardTo === list.publicId} dropTarget={Boolean(activeCardId && dragOverListId === list.publicId)} setAdding={setAddingCardTo} onCreateCard={addCard} onFocus={setFocusedListId} run={run} serverNow={serverNow} settings={settings} />)}
              <div className="add-list">
                {addingList ? <InlineCreate label="List name" submitLabel="Add list" onCancel={() => setAddingList(false)} onSubmit={(name) => { startTransition(() => void run(() => createListAction(board.publicId, name), "List added.")); setAddingList(false); }} /> : <button className="button button-secondary w-full justify-start" onClick={() => setAddingList(true)}><Plus size={16} /> {board.lists.length ? "Add list" : "Add first list"}</button>}
              </div>
            </div>
          </SortableContext>
        </div>
        <DragOverlay adjustScale={false} zIndex={100} dropAnimation={{ duration: 180, easing: "cubic-bezier(.2,.8,.2,1)" }}>
          {activeCard && <CardDragPreview card={activeCard} serverNow={serverNow} settings={settings} />}
        </DragOverlay>
      </DndContext>

      {selectedCard && <CardDetail card={selectedCard} board={board} settings={settings} onBoard={setBoard} onClose={() => setSelectedCardId(null)} />}
      <CardSelectionBridge onSelect={setSelectedCardId} />
      {toast && <div className="toast" role="status" aria-live="polite">{toast}</div>}
      <TextInputDialog open={boardTextAction === "rename"} title="Rename board" label="Board name" initialValue={board.name} submitLabel="Rename board" onClose={() => setBoardTextAction(null)} onSubmit={async (name) => { await renameBoardAction(board.publicId, name); setBoard({ ...board, name }); router.refresh(); }} />
      <TextInputDialog open={boardTextAction === "template"} title="Create board template" label="Template name" initialValue={board.name} submitLabel="Create template" onClose={() => setBoardTextAction(null)} onSubmit={async (name) => { await saveTemplateAction(board.publicId, name); setToast("Template created."); }} />
      <ConfirmDialog open={deleteBoardOpen} title="Delete board?" description={`“${board.name}” and its cards will be hidden. This cannot be undone in the interface.`} confirmLabel="Delete board" danger onClose={() => setDeleteBoardOpen(false)} onConfirm={async () => { await deleteBoardAction(board.publicId); router.push("/"); router.refresh(); }} />
    </div>
  );
}

function CardSelectionBridge({ onSelect }: { onSelect: (id: string) => void }) {
  useEffect(() => {
    const listener = (event: Event) => onSelect((event as CustomEvent<string>).detail);
    window.addEventListener("kanbn:open-card", listener);
    return () => window.removeEventListener("kanbn:open-card", listener);
  }, [onSelect]);
  return null;
}

function KanbanList({ list, adding, dropTarget, setAdding, onCreateCard, onFocus, run, serverNow, settings }: { list: ListData; adding: boolean; dropTarget: boolean; setAdding: (id: string | null) => void; onCreateCard: (listPublicId: string, title: string, editAfterCreate: boolean) => Promise<void>; onFocus: (id: string) => void; run: (action: () => Promise<BoardData>, success?: string) => Promise<BoardData | null>; serverNow: number; settings: AppSettings }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const menuLayerRef = useDismissableLayer<HTMLDivElement>(menuOpen, () => setMenuOpen(false));
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: `list:${list.publicId}`, data: { type: "list", listPublicId: list.publicId } });
  const { setNodeRef: setCardContainerRef, isOver: isCardContainerOver } = useDroppable({ id: `cards:${list.publicId}`, data: { type: "card-container", listPublicId: list.publicId } });
  const style: CSSProperties = { transform: CSS.Transform.toString(transform), transition };
  function menu(kind: "rename" | "delete") {
    setMenuOpen(false);
    if (kind === "rename") setRenameOpen(true);
    else setDeleteOpen(true);
  }
  return <section ref={setNodeRef} style={style} className="kanban-list" data-dragging={isDragging} onPointerDown={() => onFocus(list.publicId)} aria-label={`${list.name}, ${list.cards.length} cards`}>
    <header className="list-header"><button className="button button-ghost icon-button drag-handle" {...attributes} {...listeners} aria-label={`Move ${list.name}`}><GripVertical size={16} /></button><h2 className="list-title" title={list.name}>{list.name}</h2><span className="muted text-xs">{list.cards.length}</span><div className="relative" ref={menuLayerRef}><button className="button button-ghost icon-button" aria-label={`${list.name} menu`} onClick={() => setMenuOpen(!menuOpen)}><MoreHorizontal size={16} /></button>{menuOpen && <div className="menu-popover right-0 top-9"><button className="menu-button" onClick={() => void menu("rename")}>Rename list</button><button className="menu-button text-[var(--danger)]" onClick={() => void menu("delete")}>Delete list</button></div>}</div></header>
    <SortableContext items={list.cards.map((card) => `card:${card.publicId}`)} strategy={verticalListSortingStrategy}><div ref={setCardContainerRef} className="card-list" data-drop-target={dropTarget || isCardContainerOver}>{list.cards.map((card) => <KanbanCard key={card.publicId} card={card} serverNow={serverNow} settings={settings} run={run} />)}</div></SortableContext>
    <div className="p-2">{adding ? <InlineCreate label="Card title" submitLabel="Add card" secondarySubmitLabel="Add card & edit" onCancel={() => setAdding(null)} onSubmit={(title) => void onCreateCard(list.publicId, title, false)} onSecondarySubmit={(title) => void onCreateCard(list.publicId, title, true)} /> : <button className="button button-ghost w-full justify-start" onClick={() => setAdding(list.publicId)}><Plus size={16} /> Add card</button>}</div>
    <TextInputDialog open={renameOpen} title="Rename list" label="List name" initialValue={list.name} submitLabel="Rename list" onClose={() => setRenameOpen(false)} onSubmit={async (name) => { await run(() => renameListAction(list.publicId, name)); }} />
    <ConfirmDialog open={deleteOpen} title="Delete list?" description={`“${list.name}” and its cards will be hidden.`} confirmLabel="Delete list" danger onClose={() => setDeleteOpen(false)} onConfirm={async () => { await run(() => deleteListAction(list.publicId), "List deleted."); }} />
  </section>;
}

function formatDueDate(value: string, settings: AppSettings) {
  const date = new Date(value);
  if (settings.dateFormat === "yyyy-MM-dd") return date.toISOString().slice(0, 10);
  return new Intl.DateTimeFormat(settings.dateFormat === "MM/dd/yyyy" ? "en-US" : "de-CH", { year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

function CardDragPreview({ card, serverNow, settings }: { card: CardData; serverNow: number; settings: AppSettings }) {
  const total = card.checklists.reduce((sum, checklist) => sum + checklist.items.length, 0);
  const done = card.checklists.reduce((sum, checklist) => sum + checklist.items.filter((item) => item.completed).length, 0);
  const cardStyle = card.color ? { "--card-color": card.color.color } as CSSProperties : undefined;
  return <article className="kanban-card card-drag-overlay" style={cardStyle} data-colored={Boolean(card.color)} aria-hidden="true">
    <span className="card-handle drag-handle card-drag-handle"><GripVertical size={16} /></span>
    <div className="card-open">
      <div className="card-title pr-6">{card.title}</div>
      {card.description && <p className="card-description">{card.description}</p>}
      {(card.labels.length > 0 || card.dueDate) && <div className="card-meta-row"><div className="flex min-w-0 flex-wrap gap-1">{card.labels.map((label) => <span key={label.publicId} className="label-badge" style={{ "--label-color": label.color } as CSSProperties}><span className="label-dot" /><span className="truncate">{label.name}</span></span>)}</div>{card.dueDate && <span className={`card-due ${new Date(card.dueDate).getTime() < serverNow ? "text-[var(--danger)]" : ""}`}><Calendar size={14} /> {formatDueDate(card.dueDate, settings)}</span>}</div>}
    </div>
    {card.checklists.length > 0 && <div className="card-drag-checklist"><span className="flex items-center gap-1"><CheckSquare size={14} /> Checklist · {done}/{total}</span><ChevronDown size={14} /></div>}
  </article>;
}

function KanbanCard({ card, serverNow, settings, run }: { card: CardData; serverNow: number; settings: AppSettings; run: (action: () => Promise<BoardData>, success?: string) => Promise<BoardData | null> }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: `card:${card.publicId}`, data: { type: "card", listPublicId: card.listPublicId } });
  const style: CSSProperties = { transform: CSS.Transform.toString(transform), transition };
  const total = card.checklists.reduce((sum, checklist) => sum + checklist.items.length, 0);
  const done = card.checklists.reduce((sum, checklist) => sum + checklist.items.filter((item) => item.completed).length, 0);
  const cardStyle = { ...style, ...(card.color ? { "--card-color": card.color.color } : {}) } as CSSProperties;
  return <article ref={setNodeRef} style={cardStyle} className="kanban-card" data-dragging={isDragging} data-colored={Boolean(card.color)}>
    <button className="card-handle drag-handle" {...attributes} {...listeners} aria-label={`Move ${card.title}`}><GripVertical size={16} /></button>
    <button className="card-open" onClick={() => window.dispatchEvent(new CustomEvent("kanbn:open-card", { detail: card.publicId }))}>
      <div className="card-title pr-6">{card.title}</div>
      {card.description && <p className="card-description">{card.description}</p>}
      {(card.labels.length > 0 || card.dueDate) && <div className="card-meta-row"><div className="flex min-w-0 flex-wrap gap-1">{card.labels.map((label) => <span key={label.publicId} className="label-badge" style={{ "--label-color": label.color } as CSSProperties}><span className="label-dot" /><span className="truncate">{label.name}</span></span>)}</div>{card.dueDate && <span className={`card-due ${new Date(card.dueDate).getTime() < serverNow ? "text-[var(--danger)]" : ""}`}><Calendar size={14} /> {formatDueDate(card.dueDate, settings)}</span>}</div>}
    </button>
    {card.checklists.length > 0 && <details className="card-checklist-collapse" onClick={(event) => event.stopPropagation()}>
      <summary><span className="flex items-center gap-1"><CheckSquare size={14} /> Checklist · {done}/{total}</span><ChevronDown className="collapse-chevron" size={14} /></summary>
      <div className="card-checklist-content">{card.checklists.map((checklist) => <section key={checklist.publicId}><h4>{checklist.title}</h4>{checklist.items.map((item) => <label key={item.publicId} className="card-checklist-item"><input type="checkbox" checked={item.completed} onChange={(event) => void run(() => updateChecklistItemAction({ publicId: item.publicId, text: item.text, completed: event.target.checked }))} /><span className={item.completed ? "line-through opacity-60" : ""}>{item.text}</span></label>)}</section>)}</div>
    </details>}
  </article>;
}

function InlineCreate({ label, submitLabel, secondarySubmitLabel, onSubmit, onSecondarySubmit, onCancel }: { label: string; submitLabel: string; secondarySubmitLabel?: string; onSubmit: (value: string) => void; onSecondarySubmit?: (value: string) => void; onCancel: () => void }) {
  const inputId = useId();
  const [value, setValue] = useState("");
  function submit(event: FormEvent) { event.preventDefault(); if (value.trim()) onSubmit(value.trim()); }
  return <form className="inline-create" onSubmit={submit}>
    <button type="button" className="button button-ghost icon-button inline-create-cancel" onClick={onCancel} aria-label="Cancel" title="Cancel"><X size={16} /></button>
    <label className="inline-create-label" htmlFor={inputId}>{label}</label>
    <input id={inputId} className="inline-create-input" value={value} onChange={(event) => setValue(event.target.value)} onKeyDown={(event) => { if (event.key === "Escape") onCancel(); }} placeholder={label === "Card title" ? "What needs to be done?" : "Name this list…"} autoFocus maxLength={240} />
    <div className="inline-create-actions">{secondarySubmitLabel && onSecondarySubmit && <button type="button" className="button button-secondary inline-create-submit" disabled={!value.trim()} onClick={() => { if (value.trim()) onSecondarySubmit(value.trim()); }}><Plus size={16} />{secondarySubmitLabel}</button>}<button className="button inline-create-submit" disabled={!value.trim()}><Plus size={16} />{submitLabel}</button></div>
  </form>;
}
