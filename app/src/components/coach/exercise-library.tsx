"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  Dumbbell,
  FolderCog,
  Lock,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import type { Exercise } from "@/lib/api/types";
import { useExercises, useDeleteExercise } from "@/lib/query/use-exercises";
import { useCategories } from "@/lib/query/use-categories";
import { useDebounce } from "@/lib/hooks/use-debounce";
import { usePaged } from "@/lib/hooks/use-paged";
import { useWriteAccess } from "@/lib/hooks/use-write-access";
import { apiErrorMessage } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { GifLightbox } from "@/components/shared/gif-lightbox";
import { ErrorState } from "@/components/shared/error-state";
import { Pagination } from "@/components/shared/pagination";
import { HelpCallout } from "@/components/shared/help-callout";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { ExerciseFormDialog } from "./exercise-form-dialog";
import { CategoryManager } from "./category-manager";

export function ExerciseLibrary() {
  const t = useTranslations("exercises");
  const tc = useTranslations("common");
  const tb = useTranslations("billing");
  const { canWrite } = useWriteAccess();
  const { data: categories } = useCategories();
  const [search, setSearch] = React.useState("");
  const [categoryId, setCategoryId] = React.useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [page, setPage] = usePaged(`${debouncedSearch}|${categoryId}`);
  const {
    data,
    isLoading,
    isError,
    refetch,
  } = useExercises({
    search: debouncedSearch || undefined,
    categoryId: categoryId || undefined,
    page,
  });
  const exercises = data?.items;
  const remove = useDeleteExercise();

  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Exercise | null>(null);
  const [catOpen, setCatOpen] = React.useState(false);
  /** The exercise awaiting confirmation; null when the dialog is closed. */
  const [deleting, setDeleting] = React.useState<Exercise | null>(null);

  const isFiltered = !!debouncedSearch || !!categoryId;

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }
  function openEdit(ex: Exercise) {
    setEditing(ex);
    setFormOpen(true);
  }
  function confirmDelete() {
    if (!deleting) return;
    const { id, name } = deleting;
    remove.mutate(id, {
      onSuccess: () => {
        setDeleting(null);
        // Name it: after the row disappears, "deleted" alone leaves the coach
        // checking the list to work out *which* one went.
        toast.success(t("deletedNamed", { name }));
      },
      onError: (err) => toast.error(apiErrorMessage(err, t("deleteError"))),
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{t("title")}</h1>
          <p className="text-muted-foreground">{t("subtitle")}</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setCatOpen(true)}
            disabled={!canWrite}
            title={canWrite ? undefined : tb("lockedTitle")}
          >
            <FolderCog className="size-4" />
            {t("manageCategories")}
          </Button>
          <Button
            onClick={openCreate}
            disabled={!canWrite}
            title={canWrite ? undefined : tb("lockedTitle")}
          >
            {canWrite ? <Plus className="size-4" /> : <Lock className="size-4" />}
            {t("new")}
          </Button>
        </div>
      </div>

      {/* First-run help: what the library is for and where categories live */}
      <HelpCallout
        storageKey="fitlo:help-exercises"
        title={t("helpTitle")}
        items={[
          t("help1"),
          t.rich("help2", {
            action: (chunks) => (
              <button
                type="button"
                onClick={() => setCatOpen(true)}
                className="font-medium text-primary underline underline-offset-2"
              >
                {chunks}
              </button>
            ),
          }),
          t("help3"),
        ]}
      />

      {/* Toolbar */}
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="ps-9"
            placeholder={t("search")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select
          className="sm:w-56"
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
        >
          <option value="">{t("allCategories")}</option>
          {categories?.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
      </div>

      {/* Content */}
      {isError ? (
        <ErrorState
          message={t("loadError")}
          onRetry={() => refetch()}
          retryLabel={tc("retry")}
        />
      ) : isLoading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
      ) : !exercises || exercises.length === 0 ? (
        <EmptyState message={isFiltered ? t("emptyFiltered") : t("empty")} />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {exercises.map((ex) => (
            <ExerciseCard
              key={ex.id}
              ex={ex}
              setsReps={t("setsReps", {
                sets: ex.defaultSets,
                reps: ex.defaultReps,
              })}
              canWrite={canWrite}
              lockedTitle={tb("lockedTitle")}
              editLabel={tc("edit")}
              deleteLabel={tc("delete")}
              onEdit={() => openEdit(ex)}
              onDelete={() => setDeleting(ex)}
            />
          ))}
        </div>
      )}

      {data && (
        <Pagination
          page={data.page}
          totalPages={data.totalPages}
          total={data.total}
          onPageChange={setPage}
        />
      )}

      <ExerciseFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        exercise={editing}
      />
      <CategoryManager open={catOpen} onOpenChange={setCatOpen} />

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={t("deleteConfirmTitle")}
        description={t("deleteConfirmBody", { name: deleting?.name ?? "" })}
        confirmLabel={tc("delete")}
        onConfirm={confirmDelete}
        pending={remove.isPending}
      />
    </div>
  );
}

function ExerciseCard({
  ex,
  setsReps,
  canWrite,
  lockedTitle,
  editLabel,
  deleteLabel,
  onEdit,
  onDelete,
}: {
  ex: Exercise;
  setsReps: string;
  canWrite: boolean;
  lockedTitle: string;
  editLabel: string;
  deleteLabel: string;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="flex gap-3 p-3">
        <div className="size-20 shrink-0 overflow-hidden rounded-md bg-muted">
          {ex.gifUrl ? (
            <GifLightbox src={ex.gifUrl} alt={ex.name} className="size-full">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={ex.gifUrl}
                alt={ex.name}
                className="size-full object-cover"
              />
            </GifLightbox>
          ) : (
            <div className="flex size-full items-center justify-center">
              <Dumbbell className="size-6 text-muted-foreground" />
            </div>
          )}
        </div>
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Wraps instead of truncating: on a phone the name column is only
              ~250px wide, and a real exercise name ("پرس بالاسینه دمبل روی میز
              شیب‌دار") lost its second half to an ellipsis — the one piece of
              text on the card that has to be readable. `break-words` keeps a
              single long token from overflowing the card. */}
          <p className="font-medium leading-snug break-words" title={ex.name}>
            {ex.name}
          </p>
          <p className="mt-0.5 text-sm text-muted-foreground">{setsReps}</p>
          {ex.category && (
            <Badge variant="secondary" className="mt-1 w-fit">
              {ex.category.name}
            </Badge>
          )}
          <div className="mt-auto flex justify-end gap-1 pt-1">
            {/* The name is in the label, not just "edit": a screen reader on
                this grid otherwise reads "button, button, button" down the page
                with no way to tell which exercise each one belongs to. */}
            <Button
              size="icon"
              variant="ghost"
              onClick={onEdit}
              disabled={!canWrite}
              aria-label={`${editLabel} — ${ex.name}`}
              title={canWrite ? undefined : lockedTitle}
            >
              <Pencil className="size-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={onDelete}
              disabled={!canWrite}
              aria-label={`${deleteLabel} — ${ex.name}`}
              title={canWrite ? undefined : lockedTitle}
            >
              <Trash2 className="size-4 text-destructive" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center">
      <Dumbbell className="mb-3 size-10 text-muted-foreground" />
      <p className="text-muted-foreground">{message}</p>
    </div>
  );
}
