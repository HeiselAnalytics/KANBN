"use client";

import { closestCenter, DndContext, type DragEndEvent, KeyboardSensor, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Activity, CalendarDays, CheckSquare, Clock3, GripVertical, ListTodo, MessageSquare, Palette, Pencil, Plus, Tag, Trash2, X } from "lucide-react";
import { CSSProperties, FormEvent, useCallback, useEffect, useRef, useState, useTransition } from "react";

import {
  addCommentAction,
  createCardColorAction,
  createChecklistAction,
  createChecklistItemAction,
  createLabelAction,
  deleteCardAction,
  deleteCardColorAction,
  deleteChecklistAction,
  deleteChecklistItemAction,
  deleteCommentAction,
  deleteLabelAction,
  moveCardAction,
  setCardColorAction,
  toggleCardLabelAction,
  updateCardAction,
  updateCardColorAction,
  updateChecklistItemAction,
  updateLabelAction,
} from "@/app/actions";
import type { AppSettings, BoardData, CardColorData, CardData, ChecklistData, ChecklistItemData } from "@/lib/types";

import { ConfirmDialog } from "./app-dialog";
import { CustomSelect } from "./custom-select";

const LABEL_COLORS = ["#DF3F3F", "#FFAA00", "#737373", "#171717", "#A3A3A3", "#404040"];

function dateTimeLocal(value: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function formatTimestamp(value: string, settings: AppSettings) {
  const date = new Date(value);
  const datePart = settings.dateFormat === "yyyy-MM-dd" ? date.toISOString().slice(0, 10) : new Intl.DateTimeFormat(settings.dateFormat === "MM/dd/yyyy" ? "en-US" : "de-CH", { year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
  return `${datePart}, ${new Intl.DateTimeFormat(settings.language === "de" ? "de-CH" : "en", { timeStyle: "short" }).format(date)}`;
}

export function CardDetail({ card, board, settings, onBoard, onClose }: { card: CardData; board: BoardData; settings: AppSettings; onBoard: (board: BoardData) => void; onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [title, setTitle] = useState(card.title);
  const [description, setDescription] = useState(card.description);
  const [dueDate, setDueDate] = useState(dateTimeLocal(card.dueDate));
  const [cardColorName, setCardColorName] = useState("");
  const [cardColorValue, setCardColorValue] = useState(LABEL_COLORS[1]);
  const [labelName, setLabelName] = useState("");
  const [labelColor, setLabelColor] = useState(LABEL_COLORS[1]);
  const [checklistTitle, setChecklistTitle] = useState("");
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");
  const [cardDeleteOpen, setCardDeleteOpen] = useState(false);
  const [colorToDelete, setColorToDelete] = useState<CardColorData | null>(null);
  const [checklistToDelete, setChecklistToDelete] = useState<ChecklistData | null>(null);
  const [labelToDelete, setLabelToDelete] = useState<{ publicId: string; name: string } | null>(null);
  const [editingLabelId, setEditingLabelId] = useState<string | null>(null);
  const [editingLabelName, setEditingLabelName] = useState("");
  const [editingLabelColor, setEditingLabelColor] = useState("");
  const [editingColorId, setEditingColorId] = useState<string | null>(null);
  const [editingColorName, setEditingColorName] = useState("");
  const [editingColorValue, setEditingColorValue] = useState("");
  const lastSaved = useRef(JSON.stringify({ title: card.title, description: card.description, dueDate: dateTimeLocal(card.dueDate) }));
  const [pending, startTransition] = useTransition();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

  useEffect(() => { const dialog = dialogRef.current; dialog?.showModal(); return () => dialog?.close(); }, []);

  const mutate = useCallback(async (action: () => Promise<BoardData>) => {
    setError("");
    try { onBoard(await action()); } catch (cause) { setError(cause instanceof Error ? cause.message : "The change could not be saved."); }
  }, [onBoard]);

  useEffect(() => {
    const snapshot = JSON.stringify({ title, description, dueDate });
    if (!title.trim() || snapshot === lastSaved.current) return;
    const timer = window.setTimeout(() => {
      startTransition(async () => {
        await mutate(() => updateCardAction({ publicId: card.publicId, title: title.trim(), description, dueDate: dueDate ? new Date(dueDate).toISOString() : null }));
        lastSaved.current = snapshot;
      });
    }, 700);
    return () => window.clearTimeout(timer);
  }, [card.publicId, description, dueDate, mutate, title]);

  function addLabel(event: FormEvent) {
    event.preventDefault();
    if (!labelName.trim()) return;
    startTransition(async () => { await mutate(() => createLabelAction(board.publicId, labelName, labelColor)); setLabelName(""); });
  }

  function addCardColor(event: FormEvent) {
    event.preventDefault();
    if (!cardColorName.trim()) return;
    startTransition(async () => { await mutate(() => createCardColorAction(board.publicId, cardColorName, cardColorValue)); setCardColorName(""); });
  }

  function addChecklist(event: FormEvent) {
    event.preventDefault();
    if (!checklistTitle.trim()) return;
    startTransition(async () => { await mutate(() => createChecklistAction(card.publicId, checklistTitle)); setChecklistTitle(""); });
  }

  function addCardComment(event: FormEvent) {
    event.preventDefault();
    if (!comment.trim()) return;
    startTransition(async () => { await mutate(() => addCommentAction(card.publicId, comment)); setComment(""); });
  }

  async function removeCard() {
    await mutate(() => deleteCardAction(card.publicId));
    onClose();
  }

  async function closeDetail() {
    const snapshot = JSON.stringify({ title, description, dueDate });
    if (title.trim() && snapshot !== lastSaved.current) {
      await mutate(() => updateCardAction({ publicId: card.publicId, title: title.trim(), description, dueDate: dueDate ? new Date(dueDate).toISOString() : null }));
      lastSaved.current = snapshot;
    }
    onClose();
  }

  const dateValue = dueDate.slice(0, 10);
  const timeValue = dueDate.slice(11, 16);

  function changeDueDate(value: string) {
    setDueDate(value ? `${value}T${timeValue || "09:00"}` : "");
  }

  function changeDueTime(value: string) {
    if (dateValue) setDueDate(`${dateValue}T${value || "09:00"}`);
  }

  function moveToList(targetListPublicId: string) {
    if (targetListPublicId === card.listPublicId) return;
    const targetList = board.lists.find((list) => list.publicId === targetListPublicId);
    if (!targetList) return;
    const lastCard = targetList.cards.at(-1);
    startTransition(() => void mutate(() => moveCardAction({ publicId: card.publicId, targetListPublicId, beforePosition: lastCard?.position ?? null, afterPosition: null })));
  }

  function moveChecklistItem(checklist: ChecklistData, event: DragEndEvent) {
    if (!event.over || event.active.id === event.over.id) return;
    const oldIndex = checklist.items.findIndex((item) => `item:${item.publicId}` === event.active.id);
    const newIndex = checklist.items.findIndex((item) => `item:${item.publicId}` === event.over?.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const item = checklist.items[oldIndex];
    const next = arrayMove(checklist.items, oldIndex, newIndex);
    const beforePosition = next[newIndex - 1]?.position ?? null;
    const afterPosition = next[newIndex + 1]?.position ?? null;
    startTransition(() => void mutate(() => updateChecklistItemAction({ publicId: item.publicId, text: item.text, completed: item.completed, beforePosition, afterPosition })));
  }

  return <dialog ref={dialogRef} className="dialog dialog-large" onCancel={(event) => { event.preventDefault(); void closeDetail(); }} aria-labelledby="card-detail-title">
    <div className="mb-4 flex items-center gap-4">
      <div className="min-w-0 flex-1">
        <label className="sr-only" htmlFor="card-detail-title">Card title</label>
        <input id="card-detail-title" className="card-title-input" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={240} />
      </div>
      <button className="button button-secondary icon-button card-detail-close" onClick={() => void closeDetail()} aria-label="Close card"><X size={18} /></button>
    </div>

    {error && <p className="error rounded-[6px] border border-[var(--danger)] p-2" role="alert">{error}</p>}
    <div className="detail-grid">
      <div className="min-w-0">
        <section className="detail-tile">
          <h2 className="detail-section-title">Description</h2>
          <textarea className="input" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Add a description…" maxLength={20000} />
          <p className="help mb-0 mt-1 text-xs">Plain text and Markdown syntax are preserved.</p>
        </section>

        <section className="detail-tile detail-section">
          <h2 className="detail-section-title"><CheckSquare size={16} /> Checklists</h2>
          {card.checklists.map((checklist) => <div key={checklist.publicId} className="panel mb-3 p-3">
            <div className="mb-2 flex items-center gap-2"><h3 className="m-0 flex-1 text-sm font-semibold">{checklist.title}</h3><button className="button button-ghost icon-button text-[var(--danger)]" aria-label={`Delete ${checklist.title}`} onClick={() => setChecklistToDelete(checklist)}><Trash2 size={15} /></button></div>
            <ChecklistProgress checklist={checklist} />
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(event) => moveChecklistItem(checklist, event)}><SortableContext items={checklist.items.map((item) => `item:${item.publicId}`)} strategy={verticalListSortingStrategy}><div className="mt-2">{checklist.items.map((item) => <ChecklistItem key={item.publicId} item={item} onChange={(next) => startTransition(() => void mutate(() => updateChecklistItemAction({ publicId: item.publicId, text: next.text, completed: next.completed })))} onDelete={() => startTransition(() => void mutate(() => deleteChecklistItemAction(item.publicId)))} />)}</div></SortableContext></DndContext>
            <ChecklistItemForm onSubmit={(text) => startTransition(() => void mutate(() => createChecklistItemAction(checklist.publicId, text)))} />
          </div>)}
          <form className="flex gap-2" onSubmit={addChecklist}><label className="sr-only">Checklist title</label><input className="input" value={checklistTitle} onChange={(event) => setChecklistTitle(event.target.value)} placeholder="Checklist title" maxLength={120} /><button className="button button-secondary shrink-0" disabled={!checklistTitle.trim()}><Plus size={16} /> Add checklist</button></form>
        </section>

        <section className="detail-tile detail-section">
          <h2 className="detail-section-title"><MessageSquare size={16} /> Comments</h2>
          <form onSubmit={addCardComment}><label className="sr-only">Comment</label><textarea className="input" value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Write a comment…" /><div className="mt-2 flex justify-end"><button className="button" disabled={!comment.trim()}>Add comment</button></div></form>
          <div className="mt-3 space-y-2">{card.comments.map((entry) => <article key={entry.publicId} className="panel p-3"><p className="mb-2 mt-0 whitespace-pre-wrap">{entry.text}</p><div className="flex items-center justify-between gap-2"><time className="muted text-xs" dateTime={entry.createdAt}>{formatTimestamp(entry.createdAt, settings)}</time><button className="button button-ghost icon-button text-[var(--danger)]" aria-label="Delete comment" onClick={() => startTransition(() => void mutate(() => deleteCommentAction(entry.publicId)))}><Trash2 size={14} /></button></div></article>)}</div>
        </section>
      </div>

      <aside>
        <section className="detail-tile">
          <h2 className="detail-section-title"><ListTodo size={16} /> List</h2>
          <CustomSelect label="Move card to" value={card.listPublicId} onChange={moveToList} disabled={pending} options={board.lists.map((list) => ({ value: list.publicId, label: list.name }))} />
        </section>
        <section className="detail-tile detail-section">
          <h2 className="detail-section-title"><Palette size={16} /> Card color</h2>
          <div className="card-color-picker">
            <button type="button" className="card-color-option" data-active={!card.color} onClick={() => startTransition(() => void mutate(() => setCardColorAction(card.publicId)))}><span className="card-color-none" aria-hidden="true" />No color</button>
            {board.colors.map((color) => {
              if (editingColorId === color.publicId) return <form key={color.publicId} className="color-edit-row" onSubmit={(event) => { event.preventDefault(); if (!editingColorName.trim()) return; startTransition(async () => { await mutate(() => updateCardColorAction(color.publicId, board.publicId, editingColorName, editingColorValue)); setEditingColorId(null); }); }}><input className="input min-w-0" value={editingColorName} onChange={(event) => setEditingColorName(event.target.value)} autoFocus /><input className="color-input" type="color" value={editingColorValue} onChange={(event) => setEditingColorValue(event.target.value)} aria-label="Card color" /><button className="button button-secondary">Done</button></form>;
              return <div key={color.publicId} className="card-color-row"><button type="button" className="card-color-option" data-active={card.color?.publicId === color.publicId} onClick={() => startTransition(() => void mutate(() => setCardColorAction(card.publicId, color.publicId)))}><span className="card-color-swatch" style={{ "--option-color": color.color } as CSSProperties} aria-hidden="true" /><span className="truncate">{color.name}</span></button><button className="button button-ghost icon-button" aria-label={`Edit ${color.name}`} onClick={() => { setEditingColorId(color.publicId); setEditingColorName(color.name); setEditingColorValue(color.color); }}><Pencil size={14} /></button><button className="button button-ghost icon-button text-[var(--danger)]" aria-label={`Delete ${color.name}`} onClick={() => setColorToDelete(color)}><Trash2 size={14} /></button></div>;
            })}
          </div>
          <form className="mt-3" onSubmit={addCardColor}>
            <span className="field-label mb-1 block">New card color</span>
            <div className="label-composer">
              <label className="sr-only" htmlFor="new-card-color-name">Color name</label>
              <input id="new-card-color-name" className="label-name-input" value={cardColorName} onChange={(event) => setCardColorName(event.target.value)} placeholder="Color name" maxLength={120} />
              <label className="sr-only" htmlFor="new-card-color-value">Color</label>
              <input id="new-card-color-value" className="label-color-input" type="color" value={cardColorValue} onChange={(event) => setCardColorValue(event.target.value)} title="Card color" />
              <button className="label-add-button" disabled={!cardColorName.trim()}>Add</button>
            </div>
          </form>
          <p className="help mb-0 mt-2 text-xs">Reusable within this section. Used colors appear in the board legend.</p>
        </section>
        <section className="detail-tile detail-section">
          <h2 className="detail-section-title"><CalendarDays size={16} /> Due date</h2>
          <div className="due-date-picker">
            <label className="due-date-field" htmlFor="card-due-date"><span className="due-date-field-label">Date</span><span className="due-date-input-wrap"><CalendarDays size={16} aria-hidden="true" /><input id="card-due-date" type="date" className="date-input" value={dateValue} onChange={(event) => changeDueDate(event.target.value)} /></span></label>
            <label className="due-date-field" htmlFor="card-due-time"><span className="due-date-field-label">Time</span><span className="due-date-input-wrap"><Clock3 size={16} aria-hidden="true" /><input id="card-due-time" type="time" className="date-input" value={timeValue} disabled={!dateValue} onChange={(event) => changeDueTime(event.target.value)} /></span></label>
          </div>
          {dueDate && <button className="button button-ghost mt-2 w-full" onClick={() => setDueDate("")}><X size={16} /> Clear due date</button>}
        </section>
        <section className="detail-tile detail-section">
          <h2 className="detail-section-title"><Tag size={16} /> Labels</h2>
          <div className="space-y-1">{board.labels.map((label) => {
            const checked = card.labels.some((item) => item.publicId === label.publicId);
            if (editingLabelId === label.publicId) return <form key={label.publicId} className="label-edit-row" onSubmit={(event) => { event.preventDefault(); if (!editingLabelName.trim()) return; startTransition(async () => { await mutate(() => updateLabelAction(label.publicId, board.publicId, editingLabelName, editingLabelColor)); setEditingLabelId(null); }); }}><input className="input min-w-0" value={editingLabelName} onChange={(event) => setEditingLabelName(event.target.value)} autoFocus /><input className="color-input" type="color" value={editingLabelColor} onChange={(event) => setEditingLabelColor(event.target.value)} aria-label="Label color" /><button className="button button-secondary">Done</button></form>;
            return <div key={label.publicId} className="flex items-center gap-1"><label className="flex min-h-8 flex-1 cursor-pointer items-center gap-2 rounded-[6px] px-2 hover:bg-[color-mix(in_srgb,var(--highlight)_14%,transparent)]"><input type="checkbox" checked={checked} onChange={() => startTransition(() => void mutate(() => toggleCardLabelAction(card.publicId, label.publicId)))} /><span className="label-dot" style={{ "--label-color": label.color } as CSSProperties} /><span className="min-w-0 flex-1 truncate">{label.name}</span></label><button className="button button-ghost icon-button" aria-label={`Edit ${label.name}`} onClick={() => { setEditingLabelId(label.publicId); setEditingLabelName(label.name); setEditingLabelColor(label.color); }}><Pencil size={14} /></button><button className="button button-ghost icon-button text-[var(--danger)]" aria-label={`Delete ${label.name}`} onClick={() => setLabelToDelete(label)}><Trash2 size={14} /></button></div>;
          })}</div>
          <form className="mt-3" onSubmit={addLabel}>
            <span className="field-label mb-1 block">New label</span>
            <div className="label-composer">
              <label className="sr-only" htmlFor="new-label-name">Label name</label>
              <input id="new-label-name" className="label-name-input" value={labelName} onChange={(event) => setLabelName(event.target.value)} placeholder="Label name" maxLength={120} />
              <label className="sr-only" htmlFor="new-label-color">Label color</label>
              <input id="new-label-color" className="label-color-input" type="color" value={labelColor} onChange={(event) => setLabelColor(event.target.value)} title="Label color" />
              <button className="label-add-button" disabled={!labelName.trim()}>Add</button>
            </div>
            <p className="help mb-0 mt-1 text-xs">Available to every board in this section.</p>
          </form>
        </section>
        <section className="detail-tile detail-section">
          <h2 className="detail-section-title"><Activity size={16} /> Activity</h2>
          <div className="activity-log">{card.activity.map((entry) => <div key={entry.publicId} className="activity-row"><div>{entry.type === "Card moved" ? `Card moved from ${entry.metadata.from} to ${entry.metadata.to}` : entry.type}</div><time className="muted text-xs" dateTime={entry.createdAt}>{formatTimestamp(entry.createdAt, settings)}</time></div>)}</div>
        </section>
      </aside>
    </div>
    <div className="dialog-actions"><span className="autosave-status mr-auto" role="status" aria-live="polite">{pending ? "Saving changes…" : ""}</span><button className="button button-danger" onClick={() => setCardDeleteOpen(true)}><Trash2 size={16} /> Delete card</button><button className="button button-secondary" onClick={() => void closeDetail()}>Close</button></div>
    <ConfirmDialog open={cardDeleteOpen} title="Delete card?" description={`“${card.title}” will be hidden and cannot be restored in the interface.`} confirmLabel="Delete card" danger onClose={() => setCardDeleteOpen(false)} onConfirm={removeCard} />
    <ConfirmDialog open={Boolean(colorToDelete)} title="Delete card color?" description={`“${colorToDelete?.name ?? ""}” will be removed from every card using it in this section.`} confirmLabel="Delete color" danger onClose={() => setColorToDelete(null)} onConfirm={async () => { if (colorToDelete) await mutate(() => deleteCardColorAction(colorToDelete.publicId, board.publicId)); }} />
    <ConfirmDialog open={Boolean(checklistToDelete)} title="Delete checklist?" description={`“${checklistToDelete?.title ?? ""}” and all of its items will be removed.`} confirmLabel="Delete checklist" danger onClose={() => setChecklistToDelete(null)} onConfirm={async () => { if (checklistToDelete) await mutate(() => deleteChecklistAction(checklistToDelete.publicId)); }} />
    <ConfirmDialog open={Boolean(labelToDelete)} title="Delete shared label?" description={`“${labelToDelete?.name ?? ""}” will be removed from every card using it in this section.`} confirmLabel="Delete label" danger onClose={() => setLabelToDelete(null)} onConfirm={async () => { if (labelToDelete) await mutate(() => deleteLabelAction(labelToDelete.publicId, board.publicId)); }} />
  </dialog>;
}

function ChecklistProgress({ checklist }: { checklist: ChecklistData }) {
  const done = checklist.items.filter((item) => item.completed).length;
  const percent = checklist.items.length ? Math.round((done / checklist.items.length) * 100) : 0;
  return <div className="flex items-center gap-2"><span className="muted w-8 text-xs">{percent}%</span><div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--secondary)]"><div className="h-full bg-[var(--foreground)]" style={{ width: `${percent}%` }} /></div></div>;
}

function ChecklistItem({ item, onChange, onDelete }: { item: ChecklistItemData; onChange: (item: ChecklistItemData) => void; onDelete: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: `item:${item.publicId}`, data: { type: "checklist-item" } });
  const style: CSSProperties = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? .55 : 1 };
  return <div ref={setNodeRef} style={style} className="checklist-item"><button className="button button-ghost icon-button drag-handle" {...attributes} {...listeners} aria-label={`Move ${item.text}`}><GripVertical size={14} /></button><label className="flex min-w-0 items-center gap-2"><input type="checkbox" checked={item.completed} onChange={(event) => onChange({ ...item, completed: event.target.checked })} /><span className={item.completed ? "line-through opacity-60" : ""}>{item.text}</span></label><button className="button button-ghost icon-button text-[var(--danger)]" onClick={onDelete} aria-label={`Delete ${item.text}`}><X size={14} /></button></div>;
}

function ChecklistItemForm({ onSubmit }: { onSubmit: (text: string) => void }) {
  const [value, setValue] = useState("");
  function submit(event: FormEvent) { event.preventDefault(); if (!value.trim()) return; onSubmit(value.trim()); setValue(""); }
  return <form className="mt-2 flex gap-2" onSubmit={submit}><label className="sr-only">Checklist item</label><input className="input" value={value} onChange={(event) => setValue(event.target.value)} placeholder="Add item…" /><button className="button button-ghost shrink-0" disabled={!value.trim()}><Plus size={16} /> Add</button></form>;
}
