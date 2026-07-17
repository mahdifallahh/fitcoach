"use client";

import { useFormatter, useTranslations } from "next-intl";
import { toast } from "sonner";
import { ClipboardList, Lock, Pencil, Plus, Trash2 } from "lucide-react";
import { Link } from "@/i18n/routing";
import { usePrograms, useDeleteProgram } from "@/lib/query/use-programs";
import { useWriteAccess } from "@/lib/hooks/use-write-access";
import { apiErrorMessage } from "@/lib/api/client";
import { DownloadPdfButton } from "@/components/coach/download-pdf-button";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared/error-state";

export function ProgramList() {
  const t = useTranslations("programs");
  const tc = useTranslations("common");
  const tb = useTranslations("billing");
  const format = useFormatter();
  const { data, isLoading, isError, refetch } = usePrograms();
  const del = useDeleteProgram();
  const { canWrite } = useWriteAccess();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{t("title")}</h1>
          <p className="text-muted-foreground">{t("subtitle")}</p>
        </div>
        {canWrite ? (
          <Button asChild>
            <Link href="/coach/programs/new">
              <Plus className="size-4" />
              {t("new")}
            </Link>
          </Button>
        ) : (
          <Button disabled title={tb("lockedTitle")}>
            <Lock className="size-4" />
            {t("new")}
          </Button>
        )}
      </div>

      {isError ? (
        <ErrorState
          message={t("loadError")}
          onRetry={() => refetch()}
          retryLabel={tc("retry")}
        />
      ) : isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : !data || data.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center">
          <ClipboardList className="mb-3 size-10 text-muted-foreground" />
          <p className="text-muted-foreground">{t("empty")}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {data.map((p) => (
            <Card key={p.id}>
              <CardContent className="flex flex-wrap items-center gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-semibold">{p.name}</span>
                    <Badge
                      variant={
                        p.status === "PUBLISHED" ? "default" : "secondary"
                      }
                    >
                      {p.status === "PUBLISHED" ? t("published") : t("draft")}
                    </Badge>
                  </div>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {t("for")}{" "}
                    <span dir="ltr">{p.student.email ?? p.student.phone}</span>{" "}
                    · {t("daysCount", { count: p._count.days })} ·{" "}
                    {t("updatedAt", {
                      date: format.dateTime(new Date(p.updatedAt), {
                        dateStyle: "medium",
                      }),
                    })}
                  </p>
                </div>
                <div className="flex gap-1">
                  <DownloadPdfButton programId={p.id} />
                  <Button asChild variant="ghost" size="icon">
                    <Link
                      href={`/coach/programs/${p.id}/edit`}
                      aria-label={t("edit")}
                    >
                      <Pencil className="size-4" />
                    </Link>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={t("delete")}
                    disabled={!canWrite}
                    title={canWrite ? undefined : tb("lockedTitle")}
                    onClick={() => {
                      if (confirm(t("deleteConfirm", { name: p.name }))) {
                        del.mutate(p.id, {
                          onSuccess: () => toast.success(t("deleted")),
                          onError: (err) =>
                            toast.error(apiErrorMessage(err, t("deleteError"))),
                        });
                      }
                    }}
                  >
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
