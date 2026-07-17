'use client';

import { useTranslations } from 'next-intl';
import { CreditCard, LayoutDashboard, Users } from 'lucide-react';
import { Link, usePathname } from '@/i18n/routing';
import { cn } from '@/lib/utils';
import { ScrollableTabs } from '@/components/shared/scrollable-tabs';

const items = [
  { href: '/admin', key: 'overview', icon: LayoutDashboard },
  { href: '/admin/coaches', key: 'coaches', icon: Users },
  { href: '/admin/payments', key: 'payments', icon: CreditCard },
] as const;

export function AdminNav() {
  const t = useTranslations('adminNav');
  const pathname = usePathname();

  return (
    <ScrollableTabs as="nav" className="mb-6 border-b" viewportClassName="gap-1">
      {items.map(({ href, key, icon: Icon }) => {
        const active = href === '/admin' ? pathname === '/admin' : pathname.startsWith(href);
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
    </ScrollableTabs>
  );
}
