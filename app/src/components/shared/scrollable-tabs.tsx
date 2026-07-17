'use client';

import * as React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * A horizontal, swipeable strip (nav tabs, day tabs) that *tells the user it
 * scrolls*: a soft fade + a chevron appear on whichever edge still has content
 * off screen. Driven by comparing each child's rect to the container's, so it is
 * correct in both LTR and RTL without touching browser-specific `scrollLeft`
 * sign conventions — we work purely in physical left/right.
 */
export function ScrollableTabs({
  children,
  className,
  viewportClassName,
  as: Wrapper = 'div',
}: {
  children: React.ReactNode;
  /** Classes for the outer wrapper (e.g. `border-b`, `mb-6`). */
  className?: string;
  /** Classes for the inner scroller (e.g. `gap-1`). */
  viewportClassName?: string;
  /** Outer element — use `"nav"` to keep a navigation landmark. */
  as?: 'div' | 'nav';
}) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [edges, setEdges] = React.useState({ left: false, right: false });

  const update = React.useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const cr = el.getBoundingClientRect();
    let left = false;
    let right = false;
    for (const child of Array.from(el.children)) {
      const r = child.getBoundingClientRect();
      if (r.left < cr.left - 1) left = true;
      if (r.right > cr.right + 1) right = true;
    }
    setEdges((prev) => (prev.left === left && prev.right === right ? prev : { left, right }));
  }, []);

  React.useEffect(() => {
    update();
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(update);
    ro.observe(el);
    for (const child of Array.from(el.children)) ro.observe(child);
    window.addEventListener('resize', update);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', update);
    };
  }, [update, children]);

  const scrollBy = (dir: 1 | -1) =>
    ref.current?.scrollBy({ left: dir * ref.current.clientWidth * 0.7, behavior: 'smooth' });

  return (
    <Wrapper className={cn('relative', className)}>
      <div
        ref={ref}
        onScroll={update}
        className={cn('no-scrollbar flex overflow-x-auto', viewportClassName)}
      >
        {children}
      </div>

      <Fade side="left" show={edges.left} onClick={() => scrollBy(-1)} />
      <Fade side="right" show={edges.right} onClick={() => scrollBy(1)} />
    </Wrapper>
  );
}

function Fade({ side, show, onClick }: { side: 'left' | 'right'; show: boolean; onClick: () => void }) {
  const Chevron = side === 'left' ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      aria-hidden
      tabIndex={-1}
      onClick={onClick}
      className={cn(
        'absolute inset-y-0 flex w-12 items-center transition-opacity duration-200',
        side === 'left'
          ? 'left-0 justify-start bg-gradient-to-r from-background via-background/80 to-transparent'
          : 'right-0 justify-end bg-gradient-to-l from-background via-background/80 to-transparent',
        // Only interactive/visible when there is something to scroll to.
        show ? 'opacity-100' : 'pointer-events-none opacity-0',
      )}
    >
      <Chevron className="size-4 text-muted-foreground" />
    </button>
  );
}
