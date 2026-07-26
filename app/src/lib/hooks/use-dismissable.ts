'use client';

import * as React from 'react';

/**
 * Popover open-state that closes on outside click or Escape, and returns focus
 * to the trigger on Escape (so keyboard users don't lose their place).
 *
 * Used by the header menus instead of a Radix popover: these are single-level
 * menus, and a bespoke 30-line hook keeps the header off the critical-path
 * bundle we tuned for LCP.
 */
export function useDismissable<T extends HTMLElement = HTMLDivElement>() {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<T>(null);
  const triggerRef = React.useRef<HTMLButtonElement>(null);

  React.useEffect(() => {
    if (!open) return;

    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setOpen(false);
      triggerRef.current?.focus();
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return { open, setOpen, ref, triggerRef };
}
