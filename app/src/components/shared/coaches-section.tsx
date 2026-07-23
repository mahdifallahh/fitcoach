import { getTranslations } from 'next-intl/server';
import { ArrowLeft, UserRound } from 'lucide-react';
import { Link } from '@/i18n/routing';
import { getPublicCoach } from '@/server/container';
import { Badge } from '@/components/ui/badge';

type PublicCoach = {
  handle: string | null;
  name: string;
  bio: string | null;
  avatarUrl: string | null;
  tags: string[];
};

/**
 * Public coach directory on the landing page — social proof that doubles as an
 * internal-linking hub to every `/c/<handle>` page (good for crawl depth).
 *
 * Soft-fails to an empty list: `next build` prerenders this page and may run
 * without a reachable database, and a directory is never worth failing a build
 * over. When the list is empty the whole section is omitted rather than showing
 * an empty grid. The page uses ISR (see `revalidate` in page.tsx), so the
 * directory refreshes without giving up static delivery.
 */
export async function CoachesSection() {
  const t = await getTranslations('landing.coaches');

  let coaches: PublicCoach[] = [];
  try {
    coaches = await getPublicCoach().listPublic();
  } catch {
    return null; // DB unavailable (e.g. at build time) — skip the section
  }
  if (coaches.length === 0) return null;

  return (
    <section id="coaches" className="scroll-mt-20 border-t py-16">
      <div className="container">
        <div className="mb-10 text-center">
          <h2 className="text-2xl font-bold">{t('title')}</h2>
          <p className="mx-auto mt-2 max-w-lg text-muted-foreground">{t('subtitle')}</p>
        </div>

        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {coaches.map((coach) => (
            <li key={coach.handle}>
              <Link
                href={`/c/${coach.handle}`}
                className="group flex h-full flex-col gap-3 rounded-xl border bg-card p-5 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <div className="flex items-center gap-3">
                  {/* Avatars are user uploads on an external/S3 host; a plain <img>
                      keeps them off the Next image optimizer's allowlist burden. */}
                  {coach.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={coach.avatarUrl}
                      alt=""
                      loading="lazy"
                      className="size-14 shrink-0 rounded-full border object-cover"
                    />
                  ) : (
                    <span className="flex size-14 shrink-0 items-center justify-center rounded-full border bg-muted text-muted-foreground">
                      <UserRound className="size-6" />
                    </span>
                  )}
                  <div className="min-w-0">
                    <p className="truncate font-bold group-hover:text-primary">{coach.name}</p>
                    {coach.handle && (
                      <p className="truncate text-xs text-muted-foreground" dir="ltr">
                        @{coach.handle}
                      </p>
                    )}
                  </div>
                </div>

                {coach.bio && (
                  <p className="line-clamp-2 text-sm text-muted-foreground">{coach.bio}</p>
                )}

                {coach.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {coach.tags.slice(0, 3).map((tag) => (
                      <Badge key={tag} variant="secondary" className="font-normal">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}

                <span className="mt-auto inline-flex items-center gap-1 pt-1 text-sm font-medium text-primary">
                  {t('view')}
                  <ArrowLeft className="size-4 rtl-flip transition-transform group-hover:-translate-x-0.5" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
