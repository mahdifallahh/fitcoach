'use client';

import { useTranslations } from 'next-intl';
import { ClipboardList, CreditCard, Dumbbell, FileText, Inbox, LayoutDashboard, User } from 'lucide-react';
import { Link, usePathname } from '@/i18n/routing';
import { cn } from '@/lib/utils';

const items = [
  { href: '/coach', key: 'dashboard', icon: LayoutDashboard },
  { href: '/coach/requests', key: 'requests', icon: Inbox },
  { href: '/coach/programs', key: 'programs', icon: ClipboardList },
  { href: '/coach/exercises', key: 'exercises', icon: Dumbbell },
  { href: '/coach/intake', key: 'intake', icon: FileText },
  { href: '/coach/profile', key: 'profile', icon: User },
  { href: '/coach/billing', key: 'billing', icon: CreditCard },
] as const;

export function CoachNav() {
  const t = useTranslations('coachNav');
  const pathname = usePathname();

  return (
    <nav className="mb-6 flex gap-1 overflow-x-auto border-b">
      {items.map(({ href, key, icon: Icon }) => {
        const active = href === '/coach' ? pathname === '/coach' : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              '-mb-px flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition-colors',
              active
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            <Icon className="size-4" />
            {t(key)}
          </Link>
        );
      })}
    </nav>
  );
}
