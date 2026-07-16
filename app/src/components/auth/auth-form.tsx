'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowRight, Eye, EyeOff, KeyRound, Loader2, ShieldCheck } from 'lucide-react';
import { Link, useRouter } from '@/i18n/routing';
import { authApi, roleHome } from '@/lib/api/auth';
import { ApiError } from '@/lib/api/client';
import type { CurrentUser, Role } from '@/lib/api/types';
import { ME_QUERY_KEY } from '@/lib/query/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

const MIN_PASSWORD = 8;
// Mirrors the server's OTP resend cooldown (src/server/auth/otp.ts) — the
// button stays disabled with a live countdown for exactly as long as a resend
// would otherwise 429 with OTP_COOLDOWN.
const RESEND_COOLDOWN_SECONDS = 60;

/**
 * identifier → we ask the server whether the phone is known:
 *   known + has password → `password` (with an OTP escape hatch)
 *   unknown, or no password yet → `code` (OTP) → `setPassword` on success
 */
type Step = 'identifier' | 'password' | 'code' | 'setPassword';

/** Only allow same-origin internal paths (avoid open-redirect / protocol-relative). */
function safeNext(next?: string): string | null {
  if (!next || !next.startsWith('/') || next.startsWith('//')) return null;
  return next;
}

export function AuthForm({ role, next }: { role: Role; next?: string }) {
  const t = useTranslations('auth');
  const router = useRouter();
  const qc = useQueryClient();

  const [step, setStep] = React.useState<Step>('identifier');
  const [identifier, setIdentifier] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);
  const [code, setCode] = React.useState('');
  const [sentTo, setSentTo] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [resendIn, setResendIn] = React.useState(0);

  // Tick the resend countdown down to zero, one second at a time.
  React.useEffect(() => {
    if (resendIn <= 0) return;
    const timer = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendIn]);

  const errMsg = (err: unknown) => (err instanceof ApiError ? err.message : t('errorGeneric'));

  /** Land the user in their panel once we hold a session. */
  async function finish(user: CurrentUser) {
    await qc.invalidateQueries({ queryKey: ME_QUERY_KEY });
    router.replace(safeNext(next) ?? roleHome(user.role));
  }

  // ── Step 1: who are you? ───────────────────────────────────────────────────
  async function submitIdentifier(e: React.FormEvent) {
    e.preventDefault();
    if (!identifier.trim()) return;
    setLoading(true);
    try {
      const { exists, hasPassword } = await authApi.check(identifier);
      if (exists && hasPassword) {
        setStep('password');
      } else {
        // New account, or an old one that never set a password → verify by OTP.
        await sendCode();
      }
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setLoading(false);
    }
  }

  // ── Step 2a: password sign-in ──────────────────────────────────────────────
  async function submitPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!password) return;
    setLoading(true);
    try {
      const { user } = await authApi.loginWithPassword(identifier, password);
      await finish(user);
    } catch (err) {
      toast.error(
        err instanceof ApiError && err.code === 'BAD_CREDENTIALS'
          ? t('errorBadCredentials')
          : errMsg(err),
      );
    } finally {
      setLoading(false);
    }
  }

  // ── Step 2b: OTP ───────────────────────────────────────────────────────────
  async function sendCode() {
    setLoading(true);
    try {
      const res = await authApi.requestOtp(identifier);
      setSentTo(res.sentTo);
      setStep('code');
      setResendIn(RESEND_COOLDOWN_SECONDS);
      // Dev-only: the server echoes the code, so skip the manual copy-from-logs step.
      if (res.devCode) {
        setCode(res.devCode);
        await verify(undefined, res.devCode);
      }
    } catch (err) {
      // Stale page / another tab already reset the timer server-side: resync
      // our countdown to the server's real remaining cooldown instead of
      // leaving the resend button wrongly enabled.
      if (err instanceof ApiError && err.code === 'OTP_COOLDOWN') {
        const retryAfter = (err.details as { retryAfter?: number } | undefined)?.retryAfter;
        if (retryAfter) setResendIn(retryAfter);
      }
      toast.error(errMsg(err));
    } finally {
      setLoading(false);
    }
  }

  async function verify(e?: React.FormEvent, codeOverride?: string) {
    e?.preventDefault();
    setLoading(true);
    try {
      const { user, isNew } = await authApi.verifyOtp(identifier, codeOverride ?? code, role);
      // A brand-new account (or one with no password) picks a password now, so the
      // next sign-in is a single field instead of another SMS round-trip.
      if (isNew) {
        await qc.invalidateQueries({ queryKey: ME_QUERY_KEY });
        setPassword('');
        setStep('setPassword');
        return;
      }
      await finish(user);
    } catch (err) {
      toast.error(
        err instanceof ApiError && err.code.startsWith('OTP')
          ? t('errorInvalidCode')
          : errMsg(err),
      );
    } finally {
      setLoading(false);
    }
  }

  // ── Step 3: choose a password (already authenticated by OTP) ───────────────
  async function submitNewPassword(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < MIN_PASSWORD) return toast.error(t('passwordTooShort', { min: MIN_PASSWORD }));
    setLoading(true);
    try {
      await authApi.setPassword(password);
      const user = await authApi.me();
      toast.success(t('passwordSaved'));
      await finish(user);
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setLoading(false);
    }
  }

  function restart() {
    setStep('identifier');
    setPassword('');
    setCode('');
    setResendIn(0);
  }

  const titles: Record<Step, string> = {
    identifier: t('loginTitle'),
    password: t('passwordTitle'),
    code: t('codeTitle'),
    setPassword: t('setPasswordTitle'),
  };
  const descriptions: Record<Step, React.ReactNode> = {
    identifier: role === 'COACH' ? t('asCoach') : t('asStudent'),
    password: identifier,
    // `<n>` isolates the phone number in its own LTR run — inlined raw inside
    // the Persian sentence, the digit/asterisk mix reorders unpredictably
    // (bidi resolution), which is what actually caused the "jumbled" masked
    // number the sentence used to show.
    code: t.rich('sentTo', { target: sentTo, n: (chunks) => <bdi dir="ltr">{chunks}</bdi> }),
    setPassword: t('setPasswordSubtitle'),
  };

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>{titles[step]}</CardTitle>
        <CardDescription dir={step === 'password' ? 'ltr' : undefined}>
          {descriptions[step]}
        </CardDescription>
      </CardHeader>

      <CardContent>
        {step === 'identifier' && (
          <form onSubmit={submitIdentifier} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="identifier">{t('identifierLabel')}</Label>
              <Input
                id="identifier"
                name="username"
                type="tel"
                inputMode="tel"
                autoComplete="username tel"
                dir="ltr"
                placeholder={t('identifierPlaceholder')}
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                autoFocus
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading || !identifier.trim()}>
              {loading ? <Loader2 className="animate-spin" /> : <ArrowRight className="rtl-flip" />}
              {loading ? t('checking') : t('continue')}
            </Button>
            <p className="text-center text-xs text-muted-foreground">{t('identifierHint')}</p>
            <p className="text-center text-xs text-muted-foreground">
              {t.rich('consent', {
                terms: (chunks) => (
                  <Link href="/terms" className="underline hover:text-primary">
                    {chunks}
                  </Link>
                ),
                privacy: (chunks) => (
                  <Link href="/privacy" className="underline hover:text-primary">
                    {chunks}
                  </Link>
                ),
              })}
            </p>
          </form>
        )}

        {step === 'password' && (
          <form onSubmit={submitPassword} className="space-y-4">
            {/* Hidden username so password managers file the credential under the phone. */}
            <input type="text" name="username" autoComplete="username" value={identifier} readOnly hidden />
            <PasswordField
              id="password"
              label={t('passwordLabel')}
              autoComplete="current-password"
              value={password}
              onChange={setPassword}
              show={showPassword}
              onToggleShow={() => setShowPassword((s) => !s)}
              toggleLabel={showPassword ? t('hidePassword') : t('showPassword')}
              autoFocus
            />
            <Button type="submit" className="w-full" disabled={loading || !password}>
              {loading ? <Loader2 className="animate-spin" /> : <KeyRound className="size-4" />}
              {loading ? t('verifying') : t('signIn')}
            </Button>

            <div className="flex flex-col gap-2 text-center text-sm">
              <button
                type="button"
                className="text-primary hover:underline"
                onClick={sendCode}
                disabled={loading}
              >
                {t('useOtpInstead')}
              </button>
              <button
                type="button"
                className="text-muted-foreground hover:underline"
                onClick={restart}
                disabled={loading}
              >
                {t('changeIdentifier')}
              </button>
            </div>
          </form>
        )}

        {step === 'code' && (
          <form onSubmit={verify} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="code">{t('codeLabel')}</Label>
              <Input
                id="code"
                inputMode="numeric"
                autoComplete="one-time-code"
                dir="ltr"
                className="text-center text-lg tracking-[0.4em]"
                placeholder={t('codePlaceholder')}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                autoFocus
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading || code.length < 4}>
              {loading ? <Loader2 className="animate-spin" /> : null}
              {loading ? t('verifying') : t('verify')}
            </Button>

            <div className="flex flex-col gap-2 text-center text-sm">
              <button
                type="button"
                className="text-primary hover:underline disabled:text-muted-foreground disabled:no-underline"
                onClick={sendCode}
                disabled={loading || resendIn > 0}
              >
                {resendIn > 0 ? t('resendIn', { seconds: resendIn }) : t('resend')}
              </button>
              <button
                type="button"
                className="text-muted-foreground hover:underline"
                onClick={restart}
                disabled={loading}
              >
                {t('changeIdentifier')}
              </button>
            </div>
          </form>
        )}

        {step === 'setPassword' && (
          <form onSubmit={submitNewPassword} className="space-y-4">
            <input type="text" name="username" autoComplete="username" value={identifier} readOnly hidden />
            <PasswordField
              id="new-password"
              label={t('newPasswordLabel')}
              autoComplete="new-password"
              value={password}
              onChange={setPassword}
              show={showPassword}
              onToggleShow={() => setShowPassword((s) => !s)}
              toggleLabel={showPassword ? t('hidePassword') : t('showPassword')}
              autoFocus
            />
            <p className="text-xs text-muted-foreground">{t('passwordRule', { min: MIN_PASSWORD })}</p>

            <Button type="submit" className="w-full" disabled={loading || password.length < MIN_PASSWORD}>
              {loading ? <Loader2 className="animate-spin" /> : <ShieldCheck className="size-4" />}
              {loading ? t('saving') : t('savePassword')}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}

function PasswordField({
  id,
  label,
  autoComplete,
  value,
  onChange,
  show,
  onToggleShow,
  toggleLabel,
  autoFocus,
}: {
  id: string;
  label: string;
  autoComplete: 'current-password' | 'new-password';
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  onToggleShow: () => void;
  toggleLabel: string;
  autoFocus?: boolean;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      {/* dir=ltr on the wrapper (not just the input) so the reveal button's `end-0`
          resolves to the same (right) side as the input's `pe-10` padding — otherwise
          the page's RTL puts the eye on the left, overlapping the password dots. */}
      <div className="relative" dir="ltr">
        <Input
          id={id}
          name="password"
          type={show ? 'text' : 'password'}
          autoComplete={autoComplete}
          className="pe-10"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoFocus={autoFocus}
        />
        <button
          type="button"
          onClick={onToggleShow}
          aria-label={toggleLabel}
          className="absolute end-0 top-0 flex h-full items-center px-3 text-muted-foreground hover:text-foreground"
        >
          {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
    </div>
  );
}
