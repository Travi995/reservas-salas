/** `?page=N` as a positive integer; anything else (missing, 0, "abc") is page 1. */
export function pageFromParams(params: URLSearchParams): number {
  const n = Number(params.get('page'))
  return Number.isInteger(n) && n >= 1 ? n : 1
}

export const PAGE_SIZE_OPTIONS = [5, 10, 20, 50]
export const DEFAULT_PAGE_SIZE = 10

/** `?size=N`: only one of the offered sizes counts; anything else falls back to the default. */
export function pageSizeFromParams(params: URLSearchParams): number {
  const n = Number(params.get('size'))
  return PAGE_SIZE_OPTIONS.includes(n) ? n : DEFAULT_PAGE_SIZE
}

export const RESERVATION_SORT_FIELDS = ['date', 'time', 'title', 'room', 'user', 'status'] as const
