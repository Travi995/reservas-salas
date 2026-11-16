import { HttpStatus } from '@nestjs/common';

export const MIN_DURATION_MINUTES = 15;
export const MAX_DURATION_MINUTES = 4 * 60;

export interface RuleViolation {
  status: HttpStatus;
  code: string;
  message: string;
}

const MINUTE = 60_000;

/**
 * Time rules from section 4 of the brief, as a pure function (no DB, no clock):
 * end after start, not in the past (starting exactly now counts as past), 15 min to 4 h inclusive.
 * They apply to every role. Overlaps are checked separately against the database.
 */
export function checkTimeRules(
  startsAt: Date,
  endsAt: Date,
  now: Date,
): RuleViolation | null {
  const unprocessable = (code: string, message: string) => ({
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    code,
    message,
  });

  if (endsAt <= startsAt) {
    return unprocessable(
      'END_BEFORE_START',
      'La hora de fin tiene que ser posterior a la de inicio.',
    );
  }
  if (startsAt <= now) {
    return unprocessable('IN_THE_PAST', 'No se puede reservar en el pasado.');
  }
  const minutes = (endsAt.getTime() - startsAt.getTime()) / MINUTE;
  if (minutes < MIN_DURATION_MINUTES || minutes > MAX_DURATION_MINUTES) {
    return unprocessable(
      'DURATION_OUT_OF_RANGE',
      'La reserva debe durar entre 15 minutos y 4 horas.',
    );
  }
  return null;
}

/** Half-open intervals [a, b) and [c, d) overlap iff a < d and c < b. 10:00–11:00 and 11:00–12:00 do not. */
export function overlaps(
  aStart: Date,
  aEnd: Date,
  bStart: Date,
  bEnd: Date,
): boolean {
  return aStart < bEnd && bStart < aEnd;
}
