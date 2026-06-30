'use client';

import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ExternalLink, Phone, Send } from 'lucide-react';
import { Link } from '@/i18n/routing';
import { usePublicCoach } from '@/lib/query/use-requests';
import { LocaleSwitcher } from '@/components/shared/locale-switcher';
import { ThemeToggle } from '@/components/shared/theme-toggle';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

export default function PublicCoachPage() {
  const t = useTranslations('publicCoach');
  const params = useParams();
  const handle = String(params.handle);
  const { data, isLoading, isError } = usePublicCoach(handle);

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex items-center justify-between border-b px-4 py-3">
        <Link href="/" className="text-lg font-bold text-primary">
          FitCoach
        </Link>
        <div className="flex items-center gap-1">
          <LocaleSwitcher />
          <ThemeToggle />
        </div>
      </header>

      <main className="container flex flex-1 justify-center py-10">
        <div className="w-full max-w-md">
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="mx-auto size-24 rounded-full" />
              <Skeleton className="mx-auto h-7 w-40" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : isError || !data ? (
            <p className="py-16 text-center text-muted-foreground">{t('notFound')}</p>
          ) : (
            <div className="flex flex-col items-center text-center">
              {data.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={data.avatarUrl}
                  alt={data.name}
                  className="size-24 rounded-full object-cover ring-2 ring-primary/20"
                />
              ) : (
                <div className="flex size-24 items-center justify-center rounded-full bg-primary/10 text-3xl font-bold text-primary">
                  {data.name.charAt(0).toUpperCase()}
                </div>
              )}
              <h1 className="mt-4 text-2xl font-bold">{data.name}</h1>
              {data.bio && <p className="mt-2 text-muted-foreground">{data.bio}</p>}

              {data.tags.length > 0 && (
                <div className="mt-3 flex flex-wrap justify-center gap-1.5">
                  {data.tags.map((tag) => (
                    <Badge key={tag} variant="secondary">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}

              <Button asChild size="lg" className="mt-6 w-full">
                <Link href={`/c/${handle}/request`}>
                  <Send className="size-4 rtl-flip" />
                  {t('requestProgram')}
                </Link>
              </Button>

              <div className="mt-6 w-full space-y-2">
                {data.phone && (
                  <a
                    href={`tel:${data.phone}`}
                    dir="ltr"
                    className="flex items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium hover:bg-muted"
                  >
                    <Phone className="size-4" /> {data.phone}
                  </a>
                )}
                {data.socialLinks.map((link, i) => (
                  <a
                    key={i}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium hover:bg-muted"
                  >
                    <ExternalLink className="size-4" /> {link.label || link.type}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
