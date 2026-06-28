'use client';

import { useTranslations } from 'next-intl';
import { CoachPageLayout } from '@/components/coach/coach-page-layout';
import { ProfileForm } from '@/components/coach/profile-form';
import { useCoachProfile } from '@/lib/query/use-coach-profile';
import { Skeleton } from '@/components/ui/skeleton';

export default function CoachProfilePage() {
  return (
    <CoachPageLayout>
      <ProfileContent />
    </CoachPageLayout>
  );
}

function ProfileContent() {
  const t = useTranslations('profile');
  const { data, isLoading } = useCoachProfile();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <p className="text-muted-foreground">{t('subtitle')}</p>
      </div>
      {isLoading || !data ? (
        <div className="max-w-2xl space-y-4">
          <Skeleton className="size-20 rounded-full" />
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-11 w-40" />
        </div>
      ) : (
        <ProfileForm profile={data} />
      )}
    </div>
  );
}
