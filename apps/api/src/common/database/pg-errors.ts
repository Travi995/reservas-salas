import { QueryFailedError } from 'typeorm';

/** PostgreSQL error codes the API translates into HTTP errors instead of a 500. */
export const PG = {
  UNIQUE_VIOLATION: '23505',
  EXCLUSION_VIOLATION: '23P01',
  DEADLOCK_DETECTED: '40P01',
} as const;

/** True if `e` is a failed query with one of the given PostgreSQL error codes. */
export function isPgError(e: unknown, ...codes: string[]): boolean {
  return (
    e instanceof QueryFailedError &&
    codes.includes((e.driverError as { code?: string }).code ?? '')
  );
}
