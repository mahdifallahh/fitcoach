"use client";

import * as React from "react";
import { useFormatter, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Check, CreditCard, Loader2 } from "lucide-react";
import {
  useActivateTrial,
  useBilling,
  useDevComplete,
} from "@/lib/query/use-billing";
import { TIERS } from "@/lib/plans";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TierCard } from "@/components/shared/tier-card";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared/error-state";

export function BillingView() {
  const t = useTranslations("billing");
  const tc = useTranslations("common");
  const format = useFormatter();
  const params = useSearchParams();
  const { data, isLoading, isError, refetch } = useBilling();
  const devComplete = useDevComplete();
  const activateTrial = useActivateTrial();
  const handled = React.useRef(false);

  // Handle the return from checkout: dev-simulate completion, or a gateway status.
  React.useEffect(() => {
    if (handled.current) return;
    const simulate = params.get("simulate");
    const status = params.get("status");
    if (!simulate && !status) return;
    handled.current = true;
    if (simulate) {
      devComplete.mutate(simulate, {
        onSuccess: () => toast.success(t("paySuccess")),
        onError: () => toast.error(t("payFailed")),
      });
    } else if (status === "success") toast.success(t("paySuccess"));
    else if (status === "cancel") toast.message(t("payCanceled"));
    else toast.error(t("payFailed"));
    if (typeof window !== "undefined")
      window.history.replaceState(null, "", window.location.pathname);
  }, [params, devComplete, t]);

  function startTrial() {
    activateTrial.mutate(undefined, {
      onSuccess: () => toast.success(t("trialActivated")),
      onError: () => toast.error(t("trialActivateFailed")),
    });
  }

  if (isError) {
    return (
      <ErrorState
        message={t("loadError")}
        onRetry={() => refetch()}
        retryLabel={tc("retry")}
      />
    );
  }
  if (isLoading || !data) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full max-w-md" />
        <div className="grid gap-3 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full" />
          ))}
        </div>
      </div>
    );
  }

  const sub = data.subscription;
  const statusLabel =
    sub?.status === "TRIALING"
      ? t("trial")
      : sub?.status === "ACTIVE"
        ? t("active")
        : sub
          ? t("expired")
          : t("noSub");
  const statusVariant =
    sub?.status === "ACTIVE" || sub?.status === "TRIALING"
      ? "default"
      : "secondary";
  const dateLine = sub
    ? sub.status === "TRIALING"
      ? t("trialEnds", { date: fmtDate(sub.endsAt) })
      : sub.status === "ACTIVE"
        ? t("activeUntil", { date: fmtDate(sub.endsAt) })
        : t("expiredOn", { date: fmtDate(sub.endsAt) })
    : "";

  function fmtDate(d: string) {
    return format.dateTime(new Date(d), { dateStyle: "medium" });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="text-muted-foreground">{t("subtitle")}</p>
      </div>

      {/* Current status */}
      {!sub ? (
        <Card className="max-w-md border-primary/40 bg-primary/5">
          <CardHeader>
            <CardTitle className="text-lg">{t("startTrialTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {t("startTrialDesc")}
            </p>
            <Button onClick={startTrial} disabled={activateTrial.isPending}>
              {activateTrial.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Check className="size-4" />
              )}
              {activateTrial.isPending ? t("activating") : t("startTrial")}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="max-w-md">
          <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
            <CardTitle className="text-lg">{statusLabel}</CardTitle>
            <Badge variant={statusVariant}>
              <CreditCard className="me-1 size-3.5" />
              {sub?.plan ?? "—"}
            </Badge>
          </CardHeader>
          {dateLine && (
            <CardContent>
              <p className="text-sm text-muted-foreground">{dateLine}</p>
            </CardContent>
          )}
        </Card>
      )}

      {data.simulateMode && (
        <p className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-700 dark:border-amber-700/40 dark:bg-amber-950/30 dark:text-amber-300">
          {t("simulateNote")}
        </p>
      )}

      {/* Plans — scoped by number of students; pricing is coming soon. */}
      <div>
        <h2 className="mb-1 text-lg font-semibold">{t("plansTitle")}</h2>
        <p className="mb-3 text-sm text-muted-foreground">{t("plansSubtitle")}</p>
        <div className="grid gap-3 sm:grid-cols-3">
          {TIERS.map((tier) => (
            <TierCard
              key={tier.code}
              name={t(`tier_${tier.code}_name`)}
              studentsLine={
                tier.maxStudents === null
                  ? t("unlimitedStudents")
                  : t("upToStudents", { count: tier.maxStudents })
              }
              highlight={tier.highlight}
              popularLabel={t("popular")}
              comingSoonLabel={t("comingSoon")}
            />
          ))}
        </div>
      </div>

      {/* History */}
      <div>
        <h2 className="mb-3 text-lg font-semibold">{t("history")}</h2>
        {data.payments.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("noHistory")}</p>
        ) : (
          <div className="divide-y rounded-xl border">
            {data.payments.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm"
              >
                <span className="font-medium">{p.plan}</span>
                <span className="text-muted-foreground" dir="ltr">
                  {p.gateway} · {format.number(p.amount)} {p.currency}
                </span>
                <Badge variant={p.status === "PAID" ? "default" : "secondary"}>
                  {p.status === "PAID"
                    ? t("statusPaid")
                    : p.status === "PENDING"
                      ? t("statusPending")
                      : t("statusFailed")}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
