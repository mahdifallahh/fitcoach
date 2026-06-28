import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

/**
 * Single error shaper. Turns any thrown value into:
 *   { success: false, error: { code, message, details? } }
 * - HttpException: reuses its status + payload (message/code/details).
 * - Everything else: 500 INTERNAL_ERROR (details hidden in production).
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = 'INTERNAL_ERROR';
    let message = 'Something went wrong';
    let details: unknown;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'string') {
        message = res;
      } else if (res && typeof res === 'object') {
        const r = res as Record<string, unknown>;
        message = (Array.isArray(r.message) ? r.message.join(', ') : (r.message as string)) ?? message;
        code = (r.code as string) ?? httpStatusToCode(status);
        details = r.details ?? (Array.isArray(r.message) ? r.message : undefined);
      }
      if (code === 'INTERNAL_ERROR') code = httpStatusToCode(status);
    } else if (exception instanceof Error) {
      message = exception.message || message;
    }

    if (status >= 500) {
      this.logger.error(
        `${request.method} ${request.url} -> ${status}: ${message}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    const body: ApiError = {
      success: false,
      error: {
        code,
        message: status >= 500 && process.env.NODE_ENV === 'production' ? 'Internal server error' : message,
        ...(details !== undefined ? { details } : {}),
      },
    };

    response.status(status).json(body);
  }
}

function httpStatusToCode(status: number): string {
  const map: Record<number, string> = {
    400: 'BAD_REQUEST',
    401: 'UNAUTHORIZED',
    403: 'FORBIDDEN',
    404: 'NOT_FOUND',
    409: 'CONFLICT',
    422: 'UNPROCESSABLE_ENTITY',
    429: 'TOO_MANY_REQUESTS',
  };
  return map[status] ?? 'ERROR';
}
