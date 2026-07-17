"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { ChevronLeft, Dumbbell, Layers, PlayCircle } from "lucide-react";
import { Link } from "@/i18n/routing";
import { useStudentProgram } from "@/lib/query/use-student";
import { studentApi } from "@/lib/api/student";
import type { StudentViewerExercise } from "@/lib/api/types";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { GifLightbox } from "@/components/shared/gif-lightbox";
import { DownloadPdfButton } from "@/components/coach/download-pdf-button";
import { cn } from "@/lib/utils";
import { ScrollableTabs } from "@/components/shared/scrollable-tabs";

interface Row {
  type: "single" | "superset";
  items: StudentViewerExercise[];
}

function toRows(exercises: StudentViewerExercise[]): Row[] {
  const rows: Row[] = [];
  const groups = new Map<string, Row>();
  for (const ex of exercises) {
    if (ex.supersetGroupId) {
      let row = groups.get(ex.supersetGroupId);
      if (!row) {
        row = { type: "superset", items: [] };
        groups.set(ex.supersetGroupId, row);
        rows.push(row);
      }
      row.items.push(ex);
    } else {
      rows.push({ type: "single", items: [ex] });
    }
  }
  return rows.map((r) =>
    r.items.length === 1 ? { type: "single", items: r.items } : r,
  );
}

export function ProgramViewer({ programId }: { programId: string }) {
  const t = useTranslations("student");
  const { data, isLoading, isError } = useStudentProgram(programId);
  const [activeIdx, setActiveIdx] = React.useState(0);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }
  if (isError || !data) {
    return (
      <p className="py-10 text-center text-muted-foreground">
        {t("loadError")}
      </p>
    );
  }

  const day = data.days[Math.min(activeIdx, data.days.length - 1)];
  const rows = day ? toRows(day.exercises) : [];

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <Link
        href={`/student/coaches/${data.coachId}`}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4 rtl-flip" /> {t("back")}
      </Link>

      <header className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold">{data.name}</h1>
          <p className="text-muted-foreground">
            {t("coachLabel", { name: data.coach.name })}
          </p>
        </div>
        <DownloadPdfButton
          programId={programId}
          variant="outline"
          withLabel
          fetcher={studentApi.programPdf}
        />
      </header>

      {/* Day navigation */}
      <ScrollableTabs viewportClassName="gap-2 pb-1">
        {data.days.map((d, i) => (
          <button
            key={d.id}
            type="button"
            onClick={() => setActiveIdx(i)}
            className={cn(
              "shrink-0 rounded-full border px-4 py-1.5 text-sm font-medium transition-colors",
              i === Math.min(activeIdx, data.days.length - 1)
                ? "border-primary bg-primary text-primary-foreground"
                : "bg-background text-muted-foreground hover:text-foreground",
            )}
          >
            {t("day", { n: d.dayIndex })}
          </button>
        ))}
      </ScrollableTabs>

      {day && (
        <div className="space-y-4">
          {day.title && (
            <h2 className="text-lg font-semibold text-primary">{day.title}</h2>
          )}

          {rows.length === 0 ? (
            <p className="rounded-xl border border-dashed py-12 text-center text-muted-foreground">
              {t("noExercises")}
            </p>
          ) : (
            rows.map((row, i) =>
              row.type === "superset" ? (
                <div
                  key={i}
                  className="space-y-3 rounded-2xl border-2 border-primary/30 bg-primary/5 p-3"
                >
                  <div className="flex items-center gap-1.5 text-sm font-bold text-primary">
                    <Layers className="size-4" /> {t("superset")}
                  </div>
                  {row.items.map((ex) => (
                    <ExerciseCard key={ex.id} ex={ex} />
                  ))}
                </div>
              ) : (
                <ExerciseCard key={row.items[0].id} ex={row.items[0]} />
              ),
            )
          )}
        </div>
      )}
    </div>
  );
}

function ExerciseCard({ ex }: { ex: StudentViewerExercise }) {
  const t = useTranslations("student");
  return (
    <div className="overflow-hidden rounded-2xl border bg-card">
      {ex.exercise.gifUrl ? (
        <GifLightbox
          src={ex.exercise.gifUrl}
          alt={ex.exercise.name}
          className="flex max-h-72 justify-center bg-muted/40"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={ex.exercise.gifUrl}
            alt={ex.exercise.name}
            className="max-h-72 w-auto object-contain"
          />
        </GifLightbox>
      ) : (
        <div className="flex h-28 items-center justify-center bg-muted/40">
          <Dumbbell className="size-8 text-muted-foreground" />
        </div>
      )}
      <div className="space-y-2 p-4">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-lg font-bold leading-tight">
            {ex.exercise.name}
          </h3>
          <Badge className="shrink-0 text-sm">
            {t("setsReps", { sets: ex.sets, reps: ex.reps })}
          </Badge>
        </div>
        {ex.exercise.description && (
          <p className="text-sm text-muted-foreground">
            {ex.exercise.description}
          </p>
        )}
        {ex.exercise.videoUrl && (
          <a
            href={ex.exercise.videoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
          >
            <PlayCircle className="size-4" /> {t("watchVideo")}
          </a>
        )}
        {ex.notes && (
          <p className="text-sm font-medium text-primary/80">{ex.notes}</p>
        )}
      </div>
    </div>
  );
}
