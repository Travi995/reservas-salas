import { ValidateIf } from 'class-validator';

/**
 * Optional field that may be omitted but not sent as `null`.
 * `@IsOptional()` also skips `null`, which then reaches a NOT NULL column and ends in a 500.
 */
export function IsUndefinable() {
  return ValidateIf((_: object, value: unknown) => value !== undefined);
}
