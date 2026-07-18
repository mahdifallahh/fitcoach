'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { Menu, X } from 'lucide-react';
import { Link } from '@/i18n/routing';
import { Button } from '@/components/ui/button';
import { Logo } from './logo';
import { LocaleSwitcher } from './locale-switcher';
import { ThemeToggle } from './theme-toggle';
import { InstallButton } from '@/components/pwa/install-button';

/** Shared header for public marketing/blog pages: nav, logins, locale & theme + a mobile menu. */
export function PublicHeader() {
  const t = useTranslations('footer');
  const tc = useTranslations('common');
  const [open, setOpen] = React.useState(false);

  const navLinks = [
    { href: '/about', label: t('about') },
    { href: '/#faq', label: t('faq') },
    { href: '/blog', label: t('blog') },
  ];

  return (
    <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur">
      <div className="flex items-center justify-between gap-6 px-4 py-3">
        {/* Brand + nav cluster together at the start (right in RTL) */}
        <div className="flex min-w-0 items-center gap-6">
          <Link href="/" aria-label={tc('logoHome')} onClick={() => setOpen(false)}>
            <Logo size="md" priority alt={tc('logoHome')} markAlt={tc('logoHomeMark')} />
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {navLinks.map((l) => (
              <Button key={l.href} asChild variant="ghost" size="sm">
                <Link href={l.href}>{l.label}</Link>
              </Button>
            ))}
            <span className="mx-1 h-5 w-px bg-border" />
            <Button asChild variant="ghost" size="sm">
              <Link href="/login?role=student">{t('studentLogin')}</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/login?role=coach">{t('coachLogin')}</Link>
            </Button>
          </nav>
        </div>

        {/* Locale + theme (+ mobile hamburger) always at the opposite end */}
        <div className="hidden items-center gap-1 md:flex">
          <InstallButton />
          <LocaleSwitcher />
          <ThemeToggle />
        </div>
        <div className="flex items-center gap-1 md:hidden">
          <InstallButton iconOnly />
          <LocaleSwitcher />
          <ThemeToggle />
          <Button
            variant="ghost"
            size="icon"
            aria-label={open ? tc('close') : tc('menu')}
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile menu panel */}
      {open && (
        <div className="border-t bg-background px-4 py-3 md:hidden">
          <nav className="flex flex-col gap-1">
            {navLinks.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                {l.label}
              </Link>
            ))}
            <div className="mt-2 flex flex-col gap-2 border-t pt-3">
              <Button asChild variant="outline" onClick={() => setOpen(false)}>
                <Link href="/login?role=student">{t('studentLogin')}</Link>
              </Button>
              <Button asChild onClick={() => setOpen(false)}>
                <Link href="/login?role=coach">{t('coachLogin')}</Link>
              </Button>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
