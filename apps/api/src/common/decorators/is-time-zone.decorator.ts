import { registerDecorator, type ValidationOptions } from 'class-validator';

const AREA_LOCATION = /^[A-Za-z_]+(\/[A-Za-z0-9_+-]+)+$/;

/**
 * True if the value is an IANA time zone known to the runtime (e.g. "America/Argentina/Buenos_Aires").
 * Offsets ("+05:00") and other spellings ("europe/madrid") are rejected: Intl accepts them,
 * but they are stored as typed and the rest of the system expects the canonical id.
 */
export function isTimeZone(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  if (value !== 'UTC' && !AREA_LOCATION.test(value)) return false;
  try {
    const resolved = new Intl.DateTimeFormat('en', {
      timeZone: value,
    }).resolvedOptions().timeZone;
    // Same id in another letter case is a misspelling; a different id is just an alias.
    return resolved.toLowerCase() !== value.toLowerCase() || resolved === value;
  } catch {
    return false;
  }
}

/** class-validator decorator for IANA time zones. */
export function IsTimeZone(options?: ValidationOptions) {
  return (target: object, propertyName: string) =>
    registerDecorator({
      name: 'isTimeZone',
      target: target.constructor,
      propertyName,
      options,
      validator: { validate: isTimeZone },
    });
}
