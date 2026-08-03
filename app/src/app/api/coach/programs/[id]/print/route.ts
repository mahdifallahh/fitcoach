import type { NextRequest } from 'next/server';
import { getSession } from '@/server/auth/session';
import { getPdf } from '@/server/container';
import { ForbiddenException, UnauthorizedException } from '@/server/http/errors';
import {
  printableErrorResponse,
  printableHtmlResponse,
} from '@/server/pdf/print-response';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * The program as a self-printing HTML page — the no-Chromium path to a PDF.
 *
 * `withRoute` is deliberately not used here: it wraps every result in the JSON
 * envelope, and this response is a document. Auth is therefore done by hand,
 * exactly as the auth and webhook routes do it. The browser sends the
 * `access_token` cookie on a normal navigation, so opening this in a tab works.
 */
export async function GET(
  req: NextRequest,
  context: { params: Promise<Record<string, string>> },
) {
  const locale = new URL(req.url).searchParams.get('locale') === 'en' ? 'en' : 'fa';
  try {
    const user = await getSession(req);
    if (!user) {
      throw new UnauthorizedException({
        code: 'UNAUTHENTICATED',
        message: 'Not authenticated',
      });
    }
    if (!user.isCoach) {
      throw new ForbiddenException({
        code: 'FORBIDDEN_ROLE',
        message: 'Insufficient role',
      });
    }
    const { id } = await context.params;
    return printableHtmlResponse(await getPdf().getPrintableHtml(user.id, id, locale));
  } catch (err) {
    return printableErrorResponse(err, locale);
  }
}
