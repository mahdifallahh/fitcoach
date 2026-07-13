"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Check, Info, Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import { ApiError, apiErrorMessage } from "@/lib/api/client";
import {
  useCategories,
  useCreateCategory,
  useDeleteCategory,
  useRenameCategory,
} from "@/lib/query/use-categories";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ErrorState } from "@/components/shared/error-state";

export function CategoryManager({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations("categories");
  const tc = useTranslations("common");
  const { data: categories, isError, refetch } = useCategories();
  const create = useCreateCategory();
  const rename = useRenameCategory();
  const remove = useDeleteCategory();

  const [newName, setNewName] = React.useState("");
  const [editing, setEditing] = React.useState<{
    id: string;
    name: string;
  } | null>(null);

  function add() {
    const name = newName.trim();
    if (!name) return;
    create.mutate(name, {
      onSuccess: () => {
        setNewName("");
        toast.success(t("created"));
      },
      onError: (e) =>
        toast.error(
          e instanceof ApiError && e.code === "CATEGORY_EXISTS"
            ? t("exists")
            : apiErrorMessage(e, t("saveError")),
        ),
    });
  }

  function saveRename() {
    if (!editing) return;
    const name = editing.name.trim();
    if (!name) return;
    rename.mutate(
      { id: editing.id, name },
      {
        onSuccess: () => {
          setEditing(null);
          toast.success(t("renamed"));
        },
        onError: (e) =>
          toast.error(
            e instanceof ApiError && e.code === "CATEGORY_EXISTS"
              ? t("exists")
              : apiErrorMessage(e, t("saveError")),
          ),
      },
    );
  }

  function remove_(id: string) {
    if (!confirm(t("deleteConfirm"))) return;
    remove.mutate(id, {
      onSuccess: () => toast.success(t("deleted")),
      onError: (e) => toast.error(apiErrorMessage(e, t("deleteError"))),
    });
  }

  /** One-tap starters so a coach with an empty list isn't staring at a blank input. */
  const suggestions = (t.raw("suggestions") as string[]).filter(
    (s) => !categories?.some((c) => c.name === s),
  );

  function addSuggestion(name: string) {
    create.mutate(name, {
      onSuccess: () => toast.success(t("created")),
      onError: (e) =>
        toast.error(
          e instanceof ApiError && e.code === "CATEGORY_EXISTS"
            ? t("exists")
            : apiErrorMessage(e, t("saveError")),
        ),
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("subtitle")}</DialogDescription>
        </DialogHeader>

        {/* What categories are actually for */}
        <p className="flex items-start gap-2 rounded-lg bg-muted/60 p-3 text-sm text-muted-foreground">
          <Info className="mt-0.5 size-4 shrink-0 text-primary" />
          {t("what")}
        </p>

        <div className="flex gap-2">
          <Input
            value={newName}
            placeholder={t("namePlaceholder")}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), add())}
          />
          <Button onClick={add} disabled={create.isPending || !newName.trim()}>
            {create.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Plus className="size-4" />
            )}
            {t("add")}
          </Button>
        </div>

        {/* Starter suggestions — one tap each, so an empty list isn't a blank page */}
        {suggestions.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-muted-foreground">{t("suggestionsLabel")}</span>
            {suggestions.map((s) => (
              <button
                key={s}
                type="button"
                disabled={create.isPending}
                onClick={() => addSuggestion(s)}
                className="rounded-full border border-dashed px-2.5 py-1 text-xs transition-colors hover:border-primary hover:bg-primary/5 hover:text-primary disabled:opacity-50"
              >
                + {s}
              </button>
            ))}
          </div>
        )}

        {isError ? (
          <ErrorState
            message={t("loadError")}
            onRetry={() => refetch()}
            retryLabel={tc("retry")}
            compact
          />
        ) : (
          <ul className="max-h-72 space-y-1 overflow-y-auto">
            {categories?.length === 0 && (
              <li className="py-6 text-center text-sm text-muted-foreground">
                {t("empty")}
              </li>
            )}
            {categories?.map((cat) => (
              <li
                key={cat.id}
                className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted"
              >
                {editing?.id === cat.id ? (
                  <>
                    <Input
                      className="h-9 flex-1"
                      value={editing.name}
                      autoFocus
                      onChange={(e) =>
                        setEditing({ id: cat.id, name: e.target.value })
                      }
                      onKeyDown={(e) =>
                        e.key === "Enter" && (e.preventDefault(), saveRename())
                      }
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={saveRename}
                      disabled={rename.isPending}
                    >
                      <Check className="size-4 text-primary" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setEditing(null)}
                    >
                      <X className="size-4" />
                    </Button>
                  </>
                ) : (
                  <>
                    <span className="flex-1 text-sm">{cat.name}</span>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setEditing({ id: cat.id, name: cat.name })}
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => remove_(cat.id)}
                    >
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}
