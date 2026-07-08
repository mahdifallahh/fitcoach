'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowRight, Loader2 } from 'lucide-react';
import { useRouter } from '@/i18n/routing';
import { authApi } from '@/lib/api/auth';
import { ApiError } from '@/lib/api/client';
import type { Role } from '@/lib/api/types';
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

/** Only allow same-origin internal paths (avoid open-redirect / protocol-relative). */
function safeNext(next?: string): string | null {
  if (!next || !next.startsWith('/') || next.startsWith('//')) return null;
  return next;
}

export function AuthForm({ role, next }: { role: Role; next?: string }) {
  const t = useTranslations('auth');
  const router = useRouter();
  const qc = useQueryClient();

  const [step, setStep] = React.useState<'identifier' | 'code'>('identifier');
  const [identifier, setIdentifier] = React.useState('');
  const [code, setCode] = React.useState('');
  const [sentTo, setSentTo] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  const errMsg = (err: unknown) =>
    err instanceof ApiError ? err.message : t('errorGeneric');

  async function sendCode(e?: React.FormEvent) {
    e?.preventDefault();
    if (!identifier.trim()) return;
    setLoading(true);
    try {
      const res = await authApi.requestOtp(identifier);
      setSentTo(res.sentTo);
      setStep('code');
      if (res.devCode) {
        // Dev-only convenience: the backend echoed the code, so skip the manual
        // copy-from-logs step and log straight in.
        setCode(res.devCode);
        await verify(undefined, res.devCode);
        return;
      }
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setLoading(false);
    }
  }

  async function verify(e?: React.FormEvent, codeOverride?: string) {
    e?.preventDefault();
    const codeToVerify = codeOverride ?? code;
    setLoading(true);
    try {
      const { user } = await authApi.verifyOtp(identifier, codeToVerify, role);
      await qc.invalidateQueries({ queryKey: ME_QUERY_KEY });
      const dest = safeNext(next) ?? (user.role === 'COACH' ? '/coach' : '/student');
      router.replace(dest);
    } catch (err) {
      if (err instanceof ApiError && err.code.startsWith('OTP')) {
        toast.error(t('errorInvalidCode'));
      } else {
        toast.error(errMsg(err));
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>{t('loginTitle')}</CardTitle>
        <CardDescription>{role === 'COACH' ? t('asCoach') : t('asStudent')}</CardDescription>
      </CardHeader>
      <CardContent>
        {step === 'identifier' ? (
          <form onSubmit={sendCode} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="identifier">{t('identifierLabel')}</Label>
              <Input
                id="identifier"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                dir="ltr"
                placeholder={t('identifierPlaceholder')}
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                autoFocus
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading || !identifier.trim()}>
              {loading ? <Loader2 className="animate-spin" /> : <ArrowRight className="rtl-flip" />}
              {loading ? t('sending') : t('sendCode')}
            </Button>
            <p className="text-center text-xs text-muted-foreground">{t('devHint')}</p>
          </form>
        ) : (
          <form onSubmit={verify} className="space-y-4">
            <p className="text-sm text-muted-foreground">{t('sentTo', { target: sentTo })}</p>
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
              <button type="button" className="text-primary hover:underline" onClick={() => sendCode()} disabled={loading}>
                {t('resend')}
              </button>
              <button
                type="button"
                className="text-muted-foreground hover:underline"
                onClick={() => {
                  setStep('identifier');
                  setCode('');
                }}
                disabled={loading}
              >
                {t('changeIdentifier')}
              </button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
