"use client";

import { useEffect, useRef, type RefObject } from "react";

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Traps Tab/Shift+Tab cycling within a modal's DOM subtree and closes on
 * Escape. Focus starts on `initialFocusRef` (usually the Cancel button) so
 * keyboard users landing in the modal can never Tab past its edges out to
 * the page behind the backdrop.
 */
export function useFocusTrap<T extends HTMLElement>(
  onCancel: () => void,
  initialFocusRef?: RefObject<HTMLElement>,
) {
  const containerRef = useRef<T>(null);

  useEffect(() => {
    initialFocusRef?.current?.focus();

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onCancel();
        return;
      }
      if (e.key !== "Tab" || !containerRef.current) return;

      const focusable = Array.from(
        containerRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onCancel, initialFocusRef]);

  return containerRef;
}
