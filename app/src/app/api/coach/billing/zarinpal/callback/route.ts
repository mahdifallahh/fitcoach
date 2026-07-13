import { type NextRequest, NextResponse } from 'next/server';
import { getConfig, getPayments } from '@/server/container';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** ZarinPal redirects the user back here after payment → verify then bounce to the app. */
export async function GET(req: NextRequest) {
  const sp = new URL(req.url).searchParams;
  const authority = sp.get('Authority') ?? '';
  const status = sp.get('Status') ?? '';
  const locale = sp.get('locale') === 'en' ? 'en' : 'fa';
  try {
    const url = await getPayments().handleZarinpalCallback(authority, status, locale);
    return NextResponse.redirect(url);
  } catch (err) {
    console.error('[zarinpal] callback error:', err);
    const appUrl = getConfig().get('APP_PUBLIC_URL');
    return NextResponse.redirect(`${appUrl}/${locale}/coach/billing?status=failed`);
  }
}
