"use client";

import { useTranslations } from "next-intl";
import { ChevronLeft, UserRound, Users } from "lucide-react";
import { Link } from "@/i18n/routing";
import { useStudentCoaches } from "@/lib/query/use-student";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared/error-state";

export function CoachesList() {
  const t = useTranslations("student");
  const tc = useTranslations("common");
  const { data, isLoading, isError, refetch } = useStudentCoaches();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("coachesTitle")}</h1>
        <p className="text-muted-foreground">{t("coachesSubtitle")}</p>
      </div>

      {isError ? (
        <ErrorState
          message={t("loadCoachesError")}
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
          <Users className="mb-3 size-10 text-muted-foreground" />
          <p className="max-w-sm text-muted-foreground">{t("noCoaches")}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {data.map((coach) => (
            <Link
              key={coach.coachId}
              href={`/student/coaches/${coach.coachId}`}
            >
              <Card className="transition-colors hover:bg-muted/50">
                <CardContent className="flex items-center gap-4 p-4">
                  <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted">
                    {coach.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={coach.avatarUrl}
                        alt=""
                        className="size-full object-cover"
                      />
                    ) : (
                      <UserRound className="size-6 text-muted-foreground" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{coach.name}</p>
                    <p
                      className="truncate text-sm text-muted-foreground"
                      dir="ltr"
                    >
                      {coach.contact}
                    </p>
                  </div>
                  <Badge variant="secondary">
                    {t("programsCount", { count: coach.programCount })}
                  </Badge>
                  <ChevronLeft className="size-5 text-muted-foreground rtl-flip" />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
