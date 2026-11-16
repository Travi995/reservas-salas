export interface PageMeta {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

/** Envelope for every paginated list: `{ items, meta }`. */
export interface Paginated<T> {
  items: T[];
  meta: PageMeta;
}

export function paginate<T>(
  items: T[],
  totalItems: number,
  page: number,
  pageSize: number,
): Paginated<T> {
  return {
    items,
    meta: {
      page,
      pageSize,
      totalItems,
      totalPages: Math.ceil(totalItems / pageSize),
    },
  };
}
