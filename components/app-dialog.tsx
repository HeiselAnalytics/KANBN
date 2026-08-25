"use client";

import { X } from "lucide-react";
import { FormEvent, ReactNode, useEffect, useId, useState } from "react";

interface AppDialogProps {
  open: boolean;
  title: string;
  description?: string;
  children: ReactNode;
  onClose: () => void;
}

export function AppDialog({ open, title, description, children, onClose }: AppDialogProps) {
  const titleId = useId();
  useEffect(() => {
    if (!open) return;
    const close = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [open, onClose]);
  if (!open) return null;
  return <div className="app-dialog-layer" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="app-dialog-card" role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <header className="app-dialog-header">
        <div className="min-w-0"><h2 id={titleId} className="m-0 text-lg font-semibold">{title}</h2>{description && <p className="muted mb-0 mt-1">{description}</p>}</div>
        <button className="button button-ghost icon-button shrink-0" onClick={onClose} aria-label="Close"><X size={16} /></button>
      </header>
      {children}
    </section>
  </div>;
}

interface TextInputDialogProps {
  open: boolean;
  title: string;
  label: string;
  initialValue?: string;
  description?: string;
  submitLabel?: string;
  danger?: boolean;
  onClose: () => void;
  onSubmit: (value: string) => void | Promise<void>;
}

export function TextInputDialog({ open, title, label, initialValue = "", description, submitLabel = "Apply", danger = false, onClose, onSubmit }: TextInputDialogProps) {
  if (!open) return null;
  return <TextInputDialogContent key={`${title}:${initialValue}`} title={title} label={label} initialValue={initialValue} description={description} submitLabel={submitLabel} danger={danger} onClose={onClose} onSubmit={onSubmit} />;
}

function TextInputDialogContent({ title, label, initialValue = "", description, submitLabel = "Apply", danger = false, onClose, onSubmit }: Omit<TextInputDialogProps, "open">) {
  const [value, setValue] = useState(initialValue);
  const [pending, setPending] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!value.trim()) return;
    setPending(true);
    try { await onSubmit(value.trim()); onClose(); } finally { setPending(false); }
  }
  return <AppDialog open title={title} description={description} onClose={onClose}>
    <form className="mt-5" onSubmit={(event) => void submit(event)}>
      <label className="field"><span className="field-label">{label}</span><input className="input" value={value} onChange={(event) => setValue(event.target.value)} autoFocus maxLength={120} /></label>
      <div className="dialog-actions"><button type="button" className="button button-secondary" onClick={onClose}>Cancel</button><button className={danger ? "button button-danger" : "button"} disabled={pending || !value.trim()}>{pending ? "Working…" : submitLabel}</button></div>
    </form>
  </AppDialog>;
}

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  danger?: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
}

export function ConfirmDialog({ open, title, description, confirmLabel = "Confirm", danger = false, onClose, onConfirm }: ConfirmDialogProps) {
  const [pending, setPending] = useState(false);
  async function confirm() {
    setPending(true);
    try { await onConfirm(); onClose(); } finally { setPending(false); }
  }
  return <AppDialog open={open} title={title} description={description} onClose={onClose}>
    <div className="dialog-actions"><button className="button button-secondary" onClick={onClose}>Cancel</button><button className={danger ? "button button-danger" : "button"} disabled={pending} onClick={() => void confirm()}>{pending ? "Working…" : confirmLabel}</button></div>
  </AppDialog>;
}
