"use client";

import { Check, ChevronDown } from "lucide-react";
import { type KeyboardEvent, type ReactNode, useEffect, useId, useRef, useState } from "react";

export interface CustomSelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface CustomSelectProps {
  label: ReactNode;
  value: string;
  options: CustomSelectOption[];
  onChange: (value: string) => void;
  className?: string;
  disabled?: boolean;
}

export function CustomSelect({ label, value, options, onChange, className = "", disabled = false }: CustomSelectProps) {
  const labelId = useId();
  const valueId = useId();
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const selectedIndex = options.findIndex((option) => option.value === value);
  const selectedOption = options[selectedIndex] ?? options.find((option) => !option.disabled);

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const frame = window.requestAnimationFrame(() => optionRefs.current[activeIndex]?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, [activeIndex, open]);

  function enabledIndex(from: number, direction: 1 | -1) {
    if (!options.some((option) => !option.disabled)) return -1;
    let index = from;
    for (let count = 0; count < options.length; count += 1) {
      index = (index + direction + options.length) % options.length;
      if (!options[index]?.disabled) return index;
    }
    return -1;
  }

  function firstEnabledIndex(direction: 1 | -1) {
    const start = direction === 1 ? -1 : options.length;
    return enabledIndex(start, direction);
  }

  function openMenu(direction: 1 | -1 = 1) {
    const preferredIndex = selectedIndex >= 0 && !options[selectedIndex]?.disabled
      ? selectedIndex
      : firstEnabledIndex(direction);
    if (preferredIndex < 0) return;
    setActiveIndex(preferredIndex);
    setOpen(true);
  }

  function closeMenu(returnFocus = false) {
    setOpen(false);
    if (returnFocus) window.requestAnimationFrame(() => triggerRef.current?.focus());
  }

  function selectOption(index: number) {
    const option = options[index];
    if (!option || option.disabled) return;
    if (option.value !== value) onChange(option.value);
    closeMenu(true);
  }

  function onTriggerKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      openMenu(event.key === "ArrowDown" ? 1 : -1);
    } else if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      const index = firstEnabledIndex(event.key === "Home" ? 1 : -1);
      if (index >= 0) {
        setActiveIndex(index);
        setOpen(true);
      }
    } else if (event.key === "Escape" && open) {
      event.preventDefault();
      closeMenu();
    }
  }

  function onOptionKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const nextIndex = enabledIndex(index, event.key === "ArrowDown" ? 1 : -1);
      if (nextIndex >= 0) setActiveIndex(nextIndex);
    } else if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      const nextIndex = firstEnabledIndex(event.key === "Home" ? 1 : -1);
      if (nextIndex >= 0) setActiveIndex(nextIndex);
    } else if (event.key === "Escape") {
      event.preventDefault();
      closeMenu(true);
    } else if (event.key === "Tab") {
      setOpen(false);
    }
  }

  return <div className={`field ${className}`.trim()} ref={rootRef}>
    <span className="field-label" id={labelId}>{label}</span>
    <div className="custom-select">
      <button
        ref={triggerRef}
        type="button"
        className="custom-select-trigger"
        aria-labelledby={`${labelId} ${valueId}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        disabled={disabled || options.length === 0}
        onClick={() => open ? closeMenu() : openMenu()}
        onKeyDown={onTriggerKeyDown}
      >
        <span className="custom-select-value" id={valueId} title={selectedOption?.label}>{selectedOption?.label ?? "No options"}</span>
        <ChevronDown className="custom-select-chevron" size={16} aria-hidden="true" />
      </button>
      {open && <div className="custom-select-menu" id={menuId} role="listbox" aria-labelledby={labelId}>
        {options.map((option, index) => <button
          key={option.value}
          ref={(node) => { optionRefs.current[index] = node; }}
          type="button"
          className="custom-select-option"
          role="option"
          aria-selected={option.value === value}
          disabled={option.disabled}
          tabIndex={activeIndex === index ? 0 : -1}
          title={option.label}
          onClick={() => selectOption(index)}
          onKeyDown={(event) => onOptionKeyDown(event, index)}
        >
          <Check className="custom-select-check" size={16} aria-hidden="true" />
          <span>{option.label}</span>
        </button>)}
      </div>}
    </div>
  </div>;
}
