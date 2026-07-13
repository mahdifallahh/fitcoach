"use client";

import { AlertCircle, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Shown in place of a list/page when its query fails, instead of an empty state or infinite skeleton. */
export function ErrorState({
  message,
  onRetry,
  retryLabel,
  compact,
}: {
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
  /** Tighter padding for use inside dialogs/small lists. */
  compact?: boolean;
}) {
  return (
    <div
      className={
        compact
          ? "flex flex-col items-center gap-2 py-8 text-center"
          : "flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-destructive/40 bg-destructive/5 py-16 text-center"
      }
    >
      <AlertCircle
        className={
          compact ? "size-5 text-destructive" : "size-8 text-destructive"
        }
      />
      <p className="max-w-sm text-sm text-destructive">{message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RotateCw className="size-4" /> {retryLabel}
        </Button>
      )}
    </div>
  );
}
