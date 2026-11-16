import { registerDecorator, type ValidationOptions } from 'class-validator';

/** True if the value is an IANA time zone known to the runtime (e.g. "America/Argentina/Buenos_Aires"). */
export function isTimeZone(value: unknown): value is string {
  if (typeof value !== 'string' || !value) return false;
  try {
    new Intl.DateTimeFormat('en', { timeZone: value });
    return true;
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
