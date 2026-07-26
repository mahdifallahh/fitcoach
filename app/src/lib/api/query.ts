import type { PageParams } from './types';

/**
 * Serialize paging params into a query string (`''` when nothing is set, so the
 * default first page keeps a clean URL and a stable react-query cache key).
 */
export function pageQuery(params: PageParams = {}): string {
  const sp = new URLSearchParams();
  if (params.page) sp.set('page', String(params.page));
  if (params.pageSize) sp.set('pageSize', String(params.pageSize));
  const s = sp.toString();
  return s ? `?${s}` : '';
}
