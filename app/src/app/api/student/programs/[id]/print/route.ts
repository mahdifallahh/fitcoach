import type { NextRequest } from 'next/server';
import { getSession } from '@/server/auth/session';
import { getPdf } from '@/server/container';
import { mapError } from '@/server/http/envelope';
import { ForbiddenException, UnauthorizedException } from '@/server/http/errors';
import { printableHtmlResponse } from '@/server/pdf/print-response';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Student-facing twin of the coach print route; ownership is checked in the service. */
export async function GET(
  req: NextRequest,
  context: { params: Promise<Record<string, string>> },
) {
  try {
    const user = await getSession(req);
    if (!user) {
      throw new UnauthorizedException({
        code: 'UNAUTHENTICATED',
        message: 'Not authenticated',
      });
    }
    if (!user.isStudent) {
      throw new ForbiddenException({
        code: 'FORBIDDEN_ROLE',
        message: 'Insufficient role',
      });
    }
    const { id } = await context.params;
    const locale = new URL(req.url).searchParams.get('locale') === 'en' ? 'en' : 'fa';
    return printableHtmlResponse(
      await getPdf().getPrintableHtmlForStudent(user.id, id, locale),
    );
  } catch (err) {
    return mapError(err);
  }
}
