'use client';

import { useFormatter, useTranslations } from 'next-intl';
import { ChevronRight, ClipboardList, Info, Plus } from 'lucide-react';
import { Link } from '@/i18n/routing';
import { useCoachStudent } from '@/lib/query/use-coach-students';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/shared/error-state';
import { DownloadPdfButton } from '@/components/coach/download-pdf-button';

export function StudentDetail({ studentId }: { studentId: string }) {
  const t = useTranslations('students');
  const tc = useTranslations('common');
  const tp = useTranslations('programs');
  const format = useFormatter();
  const { data: student, isLoading, isError, refetch } = useCoachStudent(studentId);

  if (isError) {
    return <ErrorState message={t('loadError')} onRetry={() => refetch()} retryLabel={tc('retry')} />;
  }
  if (isLoading || !student) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-9 w-56" />
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  const contact = student.phone ?? student.email ?? '—';
  const stats = [
    student.age != null ? t('age', { value: student.age }) : null,
    student.heightCm != null ? t('height', { value: student.heightCm }) : null,
    student.weightKg != null ? t('weight', { value: student.weightKg }) : null,
  ].filter(Boolean) as string[];

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/coach/students"
          className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronRight className="size-4 rtl-flip" />
          {t('backToList')}
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold" dir="ltr">
            {contact}
          </h1>
          <Button asChild>
            {/* `student` is the param the builder prefills the contact from. */}
            <Link href={`/coach/programs/new?student=${encodeURIComponent(contact)}`}>
              <Plus className="size-4" />
              {t('newProgram')}
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats on file + the account status. */}
      <Card>
        <CardContent className="space-y-3 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={student.claimed ? 'default' : 'outline'}>
              {student.claimed ? t('joined') : t('notJoined')}
            </Badge>
            <span className="text-sm text-muted-foreground">
              {t('addedOn', {
                date: format.dateTime(new Date(student.createdAt), { dateStyle: 'medium' }),
              })}
            </span>
          </div>

          {stats.length > 0 ? (
            <p className="text-sm text-muted-foreground">{stats.join(' · ')}</p>
          ) : (
            <p className="text-sm text-muted-foreground">{t('noStats')}</p>
          )}

          {/* Without this a coach reads silence as the student ignoring them. */}
          {!student.claimed && (
            <p className="flex items-start gap-2 rounded-lg border bg-muted/40 p-3 text-sm text-muted-foreground">
              <Info className="mt-0.5 size-4 shrink-0 text-primary" />
              {t('notJoinedHint')}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Program history, newest first. */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">
          {t('historyTitle', { count: student.programs.length })}
        </h2>

        {student.programs.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-12 text-center">
            <ClipboardList className="mb-3 size-8 text-muted-foreground" />
            <p className="text-muted-foreground">{t('noPrograms')}</p>
          </div>
        ) : (
          student.programs.map((program) => (
            <Card key={program.id}>
              <CardContent className="flex flex-wrap items-center gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate font-semibold">{program.name}</span>
                    <Badge variant={program.status === 'PUBLISHED' ? 'default' : 'outline'}>
                      {tp(program.status === 'PUBLISHED' ? 'published' : 'draft')}
                    </Badge>
                  </div>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {t('programMeta', {
                      days: program._count.days,
                      perWeek: program.daysPerWeek,
                      date: format.dateTime(new Date(program.updatedAt), {
                        dateStyle: 'medium',
                      }),
                    })}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <DownloadPdfButton programId={program.id} />
                  <Button asChild variant="ghost" size="sm">
                    <Link href={`/coach/programs/${program.id}/edit`}>{tc('edit')}</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
