export type SortDirection = 'asc' | 'desc'

export interface SortState<K extends string = string> {
  by: K
  dir: SortDirection
}

/** Clicking a column header cycles: ascending → descending → back to the default order. */
export function nextSort<K extends string>(current: SortState<K> | null, field: K): SortState<K> | null {
  if (current?.by !== field) return { by: field, dir: 'asc' }
  return current.dir === 'asc' ? { by: field, dir: 'desc' } : null
}

/** `?sort=title&dir=desc` → state. Unknown columns are ignored; a missing or odd `dir` means ascending. */
export function sortFromParams<K extends string>(params: URLSearchParams, allowed: readonly K[]): SortState<K> | null {
  const by = params.get('sort')
  if (!by || !(allowed as readonly string[]).includes(by)) return null
  return { by: by as K, dir: params.get('dir') === 'desc' ? 'desc' : 'asc' }
}

/** Writes the state into `params` (mutating): ascending is the implicit direction, so `dir` only appears for desc. */
export function writeSortParams(params: URLSearchParams, sort: SortState | null) {
  params.delete('sort')
  params.delete('dir')
  if (!sort) return
  params.set('sort', sort.by)
  if (sort.dir === 'desc') params.set('dir', 'desc')
}

/** Compares two values for a client-side sort: numbers numerically, text accent- and case-insensitively (es). */
export function compareValues(a: string | number, b: string | number): number {
  if (typeof a === 'number' && typeof b === 'number') return a - b
  return String(a).localeCompare(String(b), 'es', { sensitivity: 'base' })
}
