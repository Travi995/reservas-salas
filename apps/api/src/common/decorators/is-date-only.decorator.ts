import { registerDecorator, type ValidationOptions } from 'class-validator';

export const MIN_YEAR = 2000;
export const MAX_YEAR = 2100;

/**
 * True for a real calendar date written as "YYYY-MM-DD" (rejects 2026-02-30).
 * Years are bounded: dates near year 9999 overflow when the day is converted to a UTC range.
 */
export function isDateOnly(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    return false;
  const year = Number(value.slice(0, 4));
  if (year < MIN_YEAR || year > MAX_YEAR) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
}

export function IsDateOnly(options?: ValidationOptions) {
  return (target: object, propertyName: string) =>
    registerDecorator({
      name: 'isDateOnly',
      target: target.constructor,
      propertyName,
      options,
      validator: { validate: isDateOnly },
    });
}
