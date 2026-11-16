import { randomUUID } from 'node:crypto';

export const REQUEST_ID_HEADER = 'x-request-id';

/** Only short, safe ids from the client are trusted; anything else gets a fresh UUID (no log injection). */
const SAFE_ID = /^[A-Za-z0-9._-]{1,64}$/;

/** Reuses the caller's `X-Request-Id` (e.g. from a proxy) when it is safe, otherwise generates one. */
export function resolveRequestId(
  incoming: string | string[] | undefined,
): string {
  const value = Array.isArray(incoming) ? incoming[0] : incoming;
  return value && SAFE_ID.test(value) ? value : randomUUID();
}
