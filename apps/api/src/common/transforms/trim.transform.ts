/** class-transformer helper: `@Transform(trim)` trims string values and leaves the rest untouched. */
export const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;
