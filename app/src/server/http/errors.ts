/**
 * Framework-agnostic error shims. Ported Nest services throw these with the same
 * `({ code, message, details? })` constructor shape they used before, so their
 * bodies are unchanged. `mapError` (envelope.ts) turns them into the JSON
 * envelope with the right HTTP status.
 */
export interface ErrorPayload {
  code: string;
  message: string;
  details?: unknown;
}

/**
 * Cross-realm brand. Next.js dev can evaluate this module in more than one
 * bundle, which breaks `instanceof` across the boundary. A `Symbol.for` brand
 * lives in the global symbol registry, so `isAppError` recognizes an AppError
 * no matter which copy of the class created it.
 */
const APP_ERROR = Symbol.for('fitlo.AppError');

export class AppError extends Error {
  readonly [APP_ERROR] = true;
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(status: number, payload: ErrorPayload | string) {
    const p: ErrorPayload =
      typeof payload === 'string' ? { code: statusToCode(status), message: payload } : payload;
    super(p.message);
    this.status = status;
    this.code = p.code ?? statusToCode(status);
    this.details = p.details;
  }
}

/** Structural, cross-bundle check for AppError (see the brand note above). */
export function isAppError(err: unknown): err is AppError {
  return (
    !!err &&
    typeof err === 'object' &&
    (err as Record<symbol, unknown>)[APP_ERROR] === true
  );
}

/** `new HttpException({code,message}, status)` — matches the Nest signature. */
export class HttpException extends AppError {
  constructor(payload: ErrorPayload | string, status: number) {
    super(status, payload);
  }
}

export class BadRequestException extends AppError {
  constructor(payload: ErrorPayload | string) {
    super(400, payload);
  }
}
export class UnauthorizedException extends AppError {
  constructor(payload: ErrorPayload | string) {
    super(401, payload);
  }
}
export class ForbiddenException extends AppError {
  constructor(payload: ErrorPayload | string) {
    super(403, payload);
  }
}
export class NotFoundException extends AppError {
  constructor(payload: ErrorPayload | string) {
    super(404, payload);
  }
}
export class ConflictException extends AppError {
  constructor(payload: ErrorPayload | string) {
    super(409, payload);
  }
}
export class ServiceUnavailableException extends AppError {
  constructor(payload: ErrorPayload | string) {
    super(503, payload);
  }
}

export function statusToCode(status: number): string {
  const map: Record<number, string> = {
    400: 'BAD_REQUEST',
    401: 'UNAUTHORIZED',
    402: 'PAYMENT_REQUIRED',
    403: 'FORBIDDEN',
    404: 'NOT_FOUND',
    409: 'CONFLICT',
    422: 'UNPROCESSABLE_ENTITY',
    429: 'TOO_MANY_REQUESTS',
    503: 'SERVICE_UNAVAILABLE',
  };
  return map[status] ?? 'ERROR';
}
