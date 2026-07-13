import { getTranslations } from 'next-intl/server';
import { Dumbbell, GraduationCap, HelpCircle, Info, Newspaper } from 'lucide-react';
import { Link } from '@/i18n/routing';
import { Logo } from './logo';

/** Marketing footer shared by the landing, blog and about pages. */
export async function PublicFooter() {
  const t = await getTranslations('footer');

  const explore = [
    { href: '/about', label: t('about'), icon: Info },
    { href: '/#faq', label: t('faq'), icon: HelpCircle },
    { href: '/blog', label: t('blog'), icon: Newspaper },
  ];
  const accounts = [
    { href: '/login?role=coach', label: t('coachLogin'), icon: Dumbbell },
    { href: '/login?role=student', label: t('studentLogin'), icon: GraduationCap },
  ];

  return (
    <footer className="border-t bg-muted/30">
      <div className="container grid gap-8 py-12 sm:grid-cols-2 md:grid-cols-4">
        {/* Brand */}
        <div className="md:col-span-2">
          <Logo size="lg" />
          <p className="mt-3 max-w-xs text-sm text-muted-foreground">{t('tagline')}</p>
        </div>

        <FooterColumn heading={t('exploreHeading')} items={explore} />
        <FooterColumn heading={t('accountHeading')} items={accounts} />
      </div>

      <div className="border-t">
        <div className="container flex flex-col items-center justify-between gap-2 py-4 text-sm text-muted-foreground sm:flex-row">
          <span>{t('copyright', { year: new Date().getFullYear() })}</span>
          <span>{t('madeWith')}</span>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({
  heading,
  items,
}: {
  heading: string;
  items: { href: string; label: string; icon: React.ComponentType<{ className?: string }> }[];
}) {
  return (
    <div>
      <h2 className="mb-3 text-sm font-semibold">{heading}</h2>
      <ul className="space-y-2">
        {items.map(({ href, label, icon: Icon }) => (
          <li key={href}>
            <Link
              href={href}
              className="flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-primary"
            >
              <Icon className="size-4" />
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
