'use client';

import * as React from 'react';
import dynamic from 'next/dynamic';
import { useLocale, useTranslations } from 'next-intl';
import { toast } from 'sonner';
import {
  Check,
  Download,
  GraduationCap,
  Languages,
  Loader2,
  LogOut,
  Moon,
  PencilLine,
  Plus,
  Sun,
  UserRound,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import {
  usePathname,
  useRouter,
  routing,
  localeLabels,
  type Locale,
} from '@/i18n/routing';
import { useMe, useLogout } from '@/lib/query/use-auth';
import { useEnableRole } from '@/lib/query/use-account';
import { useDismissable } from '@/lib/hooks/use-dismissable';
import { isStandalone, usePwaInstall } from '@/lib/hooks/use-pwa-install';
import { apiErrorMessage } from '@/lib/api/client';
import { UserAvatar } from '@/components/shared/user-avatar';
import { cn } from '@/lib/utils';

// Only opened when the browser exposes no native install prompt, so keep Radix
// Dialog out of the panel's initial chunk (same treatment as `install-prompt`).
const InstallDialog = dynamic(
  () => import('@/components/pwa/install-dialog').then((m) => m.InstallDialog),
  { ssr: false },
);

type Mode = 'COACH' | 'STUDENT';

/**
 * The single header control for an authenticated user: identity, account mode
 * (coach ⇄ student), language, theme, install, and sign-out.
 *
 * Everything lives behind one avatar button because the panel header used to
 * line up five separate controls — two of them with text labels — which
 * overflowed on phones and squeezed the logo. One trigger keeps the mobile
 * header to two elements at any width.
 */
export function ProfileMenu() {
  const t = useTranslations('profileMenu');
  const tr = useTranslations('roleSwitcher');
  const tc = useTranslations('common');
  const tp = useTranslations('pwa');

  const { data: me } = useMe();
  const { open, setOpen, ref, triggerRef } = useDismissable();
  const router = useRouter();
  const pathname = usePathname();
  const locale = useLocale() as Locale;
  const { resolvedTheme, setTheme } = useTheme();
  const { canPrompt, install } = usePwaInstall();
  const enableRole = useEnableRole();
  const logout = useLogout();

  const [mounted, setMounted] = React.useState(false);
  const [installOpen, setInstallOpen] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  if (!me) return null;

  const isDark = mounted && resolvedTheme === 'dark';
  const otherLocale = routing.locales.find((l) => l !== locale) ?? locale;
  const showInstall = mounted && !isStandalone();
  const identifier = me.phone ?? me.email ?? '';
  // A brand-new coach's profile name defaults to their phone number, which would
  // otherwise render the same value twice (and mangle the `+` under RTL). Treat
  // that as "no name chosen yet" and show the identifier line alone.
  const profileName = me.coachProfile?.name?.trim();
  const displayName = profileName && profileName !== identifier ? profileName : '';
  const isAdmin = me.role === 'ADMIN';
  const currentMode: Mode = pathname.startsWith('/student') ? 'STUDENT' : 'COACH';

  const close = () => setOpen(false);

  function selectMode(mode: Mode) {
    const enabled = mode === 'COACH' ? me!.isCoach : me!.isStudent;
    const target = mode === 'COACH' ? '/coach' : '/student';

    if (enabled) {
      close();
      if (mode !== currentMode) router.push(target);
      return;
    }
    // Not enabled yet → turn this side on, then land in it.
    enableRole.mutate(mode, {
      onSuccess: () => {
        toast.success(tr('activated', { mode: tr(`mode_${mode}`) }));
        close();
        router.push(target);
      },
      onError: (e) => toast.error(apiErrorMessage(e, tr('activateError'))),
    });
  }

  async function onInstall() {
    close();
    if (canPrompt) {
      await install();
      return;
    }
    setInstallOpen(true); // no native prompt → show the manual steps
  }

  return (
    <div className="relative" ref={ref}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t('open')}
        className="flex items-center gap-1.5 rounded-full p-0.5 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <UserAvatar src={me.coachProfile?.avatarUrl} name={displayName} />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute end-0 z-50 mt-2 w-[17rem] max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border bg-popover shadow-lg"
        >
          {/* Identity */}
          <div className="flex items-center gap-3 border-b p-3">
            <UserAvatar src={me.coachProfile?.avatarUrl} name={displayName} size="lg" className="size-11" />
            <div className="min-w-0">
              {displayName ? (
                <>
                  <p className="truncate text-sm font-semibold">{displayName}</p>
                  <p className="truncate text-xs text-muted-foreground" dir="ltr">
                    {identifier}
                  </p>
                </>
              ) : (
                <>
                  <p className="truncate text-sm font-semibold" dir="ltr">
                    {identifier}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">{t('account')}</p>
                </>
              )}
            </div>
          </div>

          {/* Account mode — hidden for ADMIN, whose panel is single-purpose */}
          {!isAdmin && (
            <div className="border-b p-1">
              <p className="px-3 pb-1 pt-2 text-xs text-muted-foreground">{tr('title')}</p>
              {(['COACH', 'STUDENT'] as Mode[]).map((mode) => {
                const Icon = mode === 'COACH' ? PencilLine : GraduationCap;
                const enabled = mode === 'COACH' ? me.isCoach : me.isStudent;
                const isCurrent = enabled && mode === currentMode;
                const pending = enableRole.isPending && enableRole.variables === mode;
                return (
                  <button
                    key={mode}
                    type="button"
                    role="menuitem"
                    disabled={enableRole.isPending}
                    onClick={() => selectMode(mode)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-start transition-colors hover:bg-muted disabled:opacity-60',
                      isCurrent && 'bg-muted/70',
                    )}
                  >
                    <Icon className="size-4 shrink-0 text-muted-foreground" />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium">{tr(`mode_${mode}`)}</span>
                      {!enabled && (
                        <span className="block text-xs text-muted-foreground">{tr('notActive')}</span>
                      )}
                    </span>
                    {pending ? (
                      <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" />
                    ) : isCurrent ? (
                      <Check className="size-4 shrink-0 text-primary" />
                    ) : !enabled ? (
                      <Plus className="size-4 shrink-0 text-primary" />
                    ) : null}
                  </button>
                );
              })}
            </div>
          )}

          {/* Preferences + actions */}
          <div className="p-1">
            <MenuItem
              icon={Languages}
              label={tc('language')}
              value={localeLabels[otherLocale]}
              onClick={() => {
                close();
                router.replace(pathname, { locale: otherLocale });
              }}
            />
            <MenuItem
              icon={isDark ? Sun : Moon}
              label={tc('theme')}
              value={isDark ? tc('lightMode') : tc('darkMode')}
              onClick={() => setTheme(isDark ? 'light' : 'dark')}
            />
            {showInstall && (
              <MenuItem icon={Download} label={tp('installButton')} onClick={onInstall} />
            )}
            <MenuItem
              icon={UserRound}
              label={t('profile')}
              onClick={() => {
                close();
                router.push(me.isCoach ? '/coach/profile' : '/student');
              }}
            />
            <MenuItem
              icon={LogOut}
              label={t('logout')}
              destructive
              disabled={logout.isPending}
              onClick={() =>
                logout.mutate(undefined, {
                  onSuccess: () => router.replace('/'),
                  onError: () => toast.error(t('logoutError')),
                })
              }
            />
          </div>
        </div>
      )}

      {/* Mounted on demand so its chunk is fetched only when actually needed. */}
      {installOpen && <InstallDialog open onOpenChange={setInstallOpen} />}
    </div>
  );
}

function MenuItem({
  icon: Icon,
  label,
  value,
  onClick,
  destructive,
  disabled,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  /** Secondary text at the end of the row (e.g. the target language). */
  value?: string;
  onClick: () => void;
  destructive?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-start text-sm transition-colors hover:bg-muted disabled:opacity-60',
        destructive && 'text-destructive hover:bg-destructive/10',
      )}
    >
      <Icon className="size-4 shrink-0 opacity-70" />
      <span className="flex-1">{label}</span>
      {value && <span className="text-xs text-muted-foreground">{value}</span>}
    </button>
  );
}
