"use client";

import { useEffect, type RefObject } from "react";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Keeps Tab inside an open dialog (aria-modal hides the page from screen
 * readers, so keyboard focus mustn't wander there), focuses its first
 * control, and closes it on Escape when it can be closed.
 */
export function useFocusTrap(
  box: RefObject<HTMLElement | null>,
  onEscape?: () => void,
  /** Change this to move focus to the first control again (a new step in the dialog). */
  step?: unknown,
) {
  useEffect(() => {
    box.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus();
  }, [box, step]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = box.current;
      if (!el) return;
      if (e.key === "Escape" && onEscape) {
        onEscape();
        return;
      }
      if (e.key !== "Tab") return;
      const items = [...el.querySelectorAll<HTMLElement>(FOCUSABLE)];
      const first = items[0];
      const last = items[items.length - 1];
      if (!first || !last) return;
      const active = document.activeElement;
      if (e.shiftKey && (active === first || !el.contains(active))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (active === last || !el.contains(active))) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
    };
  }, [box, onEscape]);
}
