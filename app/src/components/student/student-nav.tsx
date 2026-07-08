'use client';

import { useTranslations } from 'next-intl';
import { Inbox, Users } from 'lucide-react';
import { Link, usePathname } from '@/i18n/routing';
import { cn } from '@/lib/utils';

const items = [
  { href: '/student', key: 'coaches', icon: Users },
  { href: '/student/requests', key: 'requests', icon: Inbox },
] as const;

export function StudentNav() {
  const t = useTranslations('studentNav');
  const pathname = usePathname();

  return (
    <nav className="mb-6 flex gap-1 overflow-x-auto border-b">
      {items.map(({ href, key, icon: Icon }) => {
        const active = href === '/student' ? pathname === '/student' : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              '-mb-px flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition-colors',
              active ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground',
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
