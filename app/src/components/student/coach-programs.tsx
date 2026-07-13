"use client";

import { useFormatter, useTranslations } from "next-intl";
import { ArrowRight, ChevronLeft, ClipboardList } from "lucide-react";
import { Link } from "@/i18n/routing";
import { useCoachPrograms, useStudentCoaches } from "@/lib/query/use-student";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared/error-state";

export function CoachPrograms({ coachId }: { coachId: string }) {
  const t = useTranslations("student");
  const tc = useTranslations("common");
  const format = useFormatter();
  const { data, isLoading, isError, refetch } = useCoachPrograms(coachId);
  const { data: coaches } = useStudentCoaches();
  const coach = coaches?.find((c) => c.coachId === coachId);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link
        href="/student"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4 rtl-flip" /> {t("back")}
      </Link>

      <h1 className="text-2xl font-bold">
        {t("programsOf", { name: coach?.name ?? "" })}
      </h1>

      {isError ? (
        <ErrorState
          message={t("loadProgramsError")}
          onRetry={() => refetch()}
          retryLabel={tc("retry")}
        />
      ) : isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : !data || data.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center">
          <ClipboardList className="mb-3 size-10 text-muted-foreground" />
          <p className="text-muted-foreground">{t("noPrograms")}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {data.map((p) => (
            <Link key={p.id} href={`/student/programs/${p.id}`}>
              <Card className="transition-colors hover:bg-muted/50">
                <CardContent className="flex items-center gap-3 p-4">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{p.name}</p>
                    <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                      <Badge variant="secondary">
                        {t("daysCount", { count: p._count.days })}
                      </Badge>
                      <span>
                        {format.dateTime(new Date(p.updatedAt), {
                          dateStyle: "medium",
                        })}
                      </span>
                    </div>
                  </div>
                  <ArrowRight className="size-5 text-primary rtl-flip" />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
