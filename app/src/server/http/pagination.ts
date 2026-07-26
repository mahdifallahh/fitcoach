import "server-only";

/** Shared page-size policy for every paginated list endpoint. */
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

/** Raw paging input as it arrives from a query string (or a caller). */
export interface ListQuery {
  page?: string | number | null;
  pageSize?: string | number | null;
}

/** Validated paging window, ready to spread into a Prisma query. */
export interface PageParams {
  page: number;
  pageSize: number;
  skip: number;
  take: number;
}

/** One page of results plus everything the UI needs to render its controls. */
export interface Paginated<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

/** Pull the raw paging values off a request URL (route-handler convenience). */
export function pageQuery(req: { url: string }): ListQuery {
  const sp = new URL(req.url).searchParams;
  return { page: sp.get("page"), pageSize: sp.get("pageSize") };
}

/**
 * Parse `?page=&pageSize=` into a safe window. Anything malformed, negative or
 * over `MAX_PAGE_SIZE` is clamped rather than rejected — a bad query string in a
 * shared link should still render a list, not a 400.
 */
export function pageParams(
  params: { page?: string | number | null; pageSize?: string | number | null } = {},
): PageParams {
  const page = clampInt(params.page, 1, 1, Number.MAX_SAFE_INTEGER);
  const pageSize = clampInt(params.pageSize, DEFAULT_PAGE_SIZE, 1, MAX_PAGE_SIZE);
  return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize };
}

/** Build the response envelope from a page of rows and the total row count. */
export function paginated<T>(
  items: T[],
  total: number,
  { page, pageSize }: PageParams,
): Paginated<T> {
  return {
    items,
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

function clampInt(
  raw: string | number | null | undefined,
  fallback: number,
  min: number,
  max: number,
): number {
  const n = typeof raw === "number" ? raw : Number.parseInt(String(raw ?? ""), 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(n)));
}
