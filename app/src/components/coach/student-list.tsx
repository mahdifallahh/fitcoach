'use client';

import { useTranslations } from 'next-intl';
import { ChevronLeft, ClipboardList, Plus, UserCheck, UserPlus, Users } from 'lucide-react';
import { Link } from '@/i18n/routing';
import { useCoachStudents } from '@/lib/query/use-coach-students';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/shared/error-state';

export function StudentList() {
  const t = useTranslations('students');
  const tc = useTranslations('common');
  const { data: students, isLoading, isError, refetch } = useCoachStudents();

  if (isError) {
    return <ErrorState message={t('loadError')} onRetry={() => refetch()} retryLabel={tc('retry')} />;
  }
  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    );
  }
  if (!students || students.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center">
        <Users className="mb-3 size-10 text-muted-foreground" />
        <p className="text-muted-foreground">{t('empty')}</p>
        <Button asChild variant="outline" className="mt-4">
          <Link href="/coach/programs/new">
            <Plus className="size-4" />
            {t('emptyAction')}
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {students.map((student) => (
        <Card key={student.id} className="transition-colors hover:bg-muted/40">
          <CardContent className="p-0">
            <Link href={`/coach/students/${student.id}`} className="flex items-center gap-3 p-4">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                {student.userId ? <UserCheck className="size-5" /> : <UserPlus className="size-5" />}
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate font-medium" dir="ltr">
                  {student.phone ?? student.email ?? '—'}
                </p>
                <p className="mt-0.5 flex items-center gap-1.5 text-sm text-muted-foreground">
                  <ClipboardList className="size-3.5" />
                  {t('programCount', { count: student._count.programs })}
                </p>
              </div>

              {/* The one thing a coach cannot see anywhere else: whether this
                  person has signed up yet and can open what was written for them. */}
              {!student.userId && (
                <Badge variant="outline" className="shrink-0">
                  {t('notJoined')}
                </Badge>
              )}
              <ChevronLeft className="size-4 shrink-0 text-muted-foreground rtl-flip" />
            </Link>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
