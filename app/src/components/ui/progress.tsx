import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Minimal determinate/indeterminate progress bar.
 *
 * `value` is 0–100. Pass `indeterminate` while waiting on work whose duration is
 * unknown (server-side transcoding) — the stripe animates instead of pretending
 * to a percentage we can't measure.
 */
export function Progress({
  value = 0,
  indeterminate = false,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  value?: number;
  indeterminate?: boolean;
}) {
  const clamped = Math.min(100, Math.max(0, value));
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={indeterminate ? undefined : Math.round(clamped)}
      className={cn(
        "relative h-2 w-full overflow-hidden rounded-full bg-muted",
        className,
      )}
      {...props}
    >
      <div
        className={cn(
          "h-full rounded-full bg-primary transition-[width] duration-200",
          indeterminate && "w-1/3 animate-progress-slide",
        )}
        style={indeterminate ? undefined : { width: `${clamped}%` }}
      />
    </div>
  );
}
