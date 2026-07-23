'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Check, ChevronDown, GraduationCap, Loader2, PencilLine, Plus } from 'lucide-react';
import { useRouter, usePathname } from '@/i18n/routing';
import { useMe } from '@/lib/query/use-auth';
import { useEnableRole } from '@/lib/query/use-account';
import { apiErrorMessage } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type Mode = 'COACH' | 'STUDENT';

/**
 * Switches the account between its coach and student sides — the UI half of
 * "one phone, both roles". It always shows which mode you're currently in (the
 * main source of confusion), and if the other side isn't enabled yet it offers
 * to turn it on in place rather than sending the user off to sign up again.
 *
 * Hidden for ADMIN, whose panel is separate and single-purpose.
 */
export function RoleSwitcher() {
  const t = useTranslations('roleSwitcher');
  const { data: me } = useMe();
  const enableRole = useEnableRole();
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  // Close on outside click / Escape — a plain popover, no extra dependency.
  React.useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!me || me.role === 'ADMIN') return null;

  const current: Mode = pathname.startsWith('/student') ? 'STUDENT' : 'COACH';
  const enabled: Record<Mode, boolean> = { COACH: me.isCoach, STUDENT: me.isStudent };

  function go(mode: Mode) {
    setOpen(false);
    if (mode === current) return;
    router.push(mode === 'COACH' ? '/coach' : '/student');
  }

  function activate(mode: Mode) {
    enableRole.mutate(mode, {
      onSuccess: () => {
        toast.success(t('activated', { mode: t(`mode_${mode}`) }));
        setOpen(false);
        router.push(mode === 'COACH' ? '/coach' : '/student');
      },
      onError: (e) => toast.error(apiErrorMessage(e, t('activateError'))),
    });
  }

  const modes: { code: Mode; icon: typeof PencilLine }[] = [
    { code: 'COACH', icon: PencilLine },
    { code: 'STUDENT', icon: GraduationCap },
  ];

  return (
    <div ref={ref} className="relative">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="gap-1.5"
      >
        {current === 'COACH' ? <PencilLine className="size-4" /> : <GraduationCap className="size-4" />}
        <span className="hidden sm:inline">{t(`mode_${current}`)}</span>
        <ChevronDown className={cn('size-3.5 transition-transform', open && 'rotate-180')} />
      </Button>

      {open && (
        <div
          role="menu"
          className="absolute end-0 z-50 mt-2 w-64 overflow-hidden rounded-xl border bg-popover p-1 shadow-lg"
        >
          <p className="px-3 py-2 text-xs text-muted-foreground">{t('title')}</p>
          {modes.map(({ code, icon: Icon }) => {
            const isCurrent = code === current;
            const isEnabled = enabled[code];
            return (
              <button
                key={code}
                type="button"
                role="menuitem"
                disabled={enableRole.isPending}
                onClick={() => (isEnabled ? go(code) : activate(code))}
                className={cn(
                  'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-start transition-colors hover:bg-muted disabled:opacity-60',
                  isCurrent && 'bg-muted/60',
                )}
              >
                <Icon className="size-4 shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium">{t(`mode_${code}`)}</span>
                  <span className="block text-xs text-muted-foreground">
                    {isCurrent ? t('current') : isEnabled ? t('switchTo') : t('notActive')}
                  </span>
                </span>
                {enableRole.isPending && !isEnabled ? (
                  <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" />
                ) : isCurrent ? (
                  <Check className="size-4 shrink-0 text-primary" />
                ) : !isEnabled ? (
                  <Plus className="size-4 shrink-0 text-primary" />
                ) : null}
              </button>
            );
          })}
          <p className="px-3 py-2 text-xs text-muted-foreground">{t('hint')}</p>
        </div>
      )}
    </div>
  );
}
