/**
 * Typed API client. Talks to the same-origin Next.js Route Handlers under
 * `/api/*` with httpOnly cookies (`credentials: 'include'`), unwraps the
 * `{ success, data }` envelope, and transparently refreshes the access token
 * once on a 401.
 */
const API_BASE = '';

export interface ApiErrorShape {
  code: string;
  message: string;
  details?: unknown;
}

export class ApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details?: unknown;
  constructor(status: number, error: ApiErrorShape) {
    super(error.message);
    this.name = 'ApiError';
    this.code = error.code;
    this.status = status;
    this.details = error.details;
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  /** internal: prevents infinite refresh loops */
  _retried?: boolean;
  signal?: AbortSignal;
}

async function rawRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, signal } = options;

  const res = await fetch(`${API_BASE}/api${path}`, {
    method,
    credentials: 'include',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    signal,
  });

  // Transparent one-shot refresh on expired access token.
  if (res.status === 401 && !options._retried && path !== '/auth/refresh' && !path.startsWith('/auth/otp')) {
    const refreshed = await tryRefresh();
    if (refreshed) return rawRequest<T>(path, { ...options, _retried: true });
  }

  const text = await res.text();
  const json = text ? JSON.parse(text) : {};

  if (!res.ok || json?.success === false) {
    const err: ApiErrorShape = json?.error ?? { code: 'UNKNOWN', message: res.statusText };
    throw new ApiError(res.status, err);
  }
  return (json?.data ?? null) as T;
}

let refreshPromise: Promise<boolean> | null = null;
function tryRefresh(): Promise<boolean> {
  // De-dupe concurrent refreshes.
  if (!refreshPromise) {
    refreshPromise = fetch(`${API_BASE}/api/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    })
      .then((r) => r.ok)
      .catch(() => false)
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

export const api = {
  get: <T>(path: string, signal?: AbortSignal) => rawRequest<T>(path, { method: 'GET', signal }),
  post: <T>(path: string, body?: unknown) => rawRequest<T>(path, { method: 'POST', body }),
  patch: <T>(path: string, body?: unknown) => rawRequest<T>(path, { method: 'PATCH', body }),
  put: <T>(path: string, body?: unknown) => rawRequest<T>(path, { method: 'PUT', body }),
  delete: <T>(path: string, body?: unknown) => rawRequest<T>(path, { method: 'DELETE', body }),
};

/**
 * A handful of error `code`s are cross-cutting (can come back from any
 * subscription-gated write, across every coach panel) and worth a proper
 * translation instead of the server's English sentence. Keyed by code so a
 * single fix here covers every call site; everything else falls through to
 * the server's own message (already a clear, specific sentence — e.g. "One or
 * more exercises do not belong to you").
 */
const KNOWN_ERROR_MESSAGES: Record<string, { fa: string; en: string }> = {
  SUBSCRIPTION_REQUIRED: {
    fa: 'برای ساخت یا ویرایش، اشتراک فعال لازم است.',
    en: 'An active subscription is required to create or edit.',
  },
};

function currentLocale(): 'fa' | 'en' {
  if (typeof document === 'undefined') return 'fa';
  return document.documentElement.lang === 'en' ? 'en' : 'fa';
}

/**
 * The server's own message when the failure is an `ApiError` (already a clear,
 * specific sentence), translated for known cross-cutting codes, otherwise a
 * translated fallback for network/unexpected errors.
 */
export function apiErrorMessage(err: unknown, fallback: string): string {
  if (!(err instanceof ApiError)) return fallback;
  const known = KNOWN_ERROR_MESSAGES[err.code];
  return known ? known[currentLocale()] : err.message;
}
