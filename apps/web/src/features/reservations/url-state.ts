/** `?page=N` as a positive integer; anything else (missing, 0, "abc") is page 1. */
export function pageFromParams(params: URLSearchParams): number {
  const n = Number(params.get('page'))
  return Number.isInteger(n) && n >= 1 ? n : 1
}
