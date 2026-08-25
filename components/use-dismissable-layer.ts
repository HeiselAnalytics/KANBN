"use client";

import { useEffect, useRef } from "react";

export function useDismissableLayer<T extends HTMLElement>(open: boolean, onDismiss: () => void) {
  const layerRef = useRef<T>(null);
  const dismissRef = useRef(onDismiss);

  useEffect(() => { dismissRef.current = onDismiss; }, [onDismiss]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (event.target instanceof Node && layerRef.current?.contains(event.target)) return;
      dismissRef.current();
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") dismissRef.current();
    }
    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return layerRef;
}
