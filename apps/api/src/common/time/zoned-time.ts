/**
 * Time zone helpers built on Intl (no extra dependency).
 * The API receives wall-clock times in the room's time zone and stores UTC instants (ADR-0004).
 */

/** Offset in ms between the wall clock of `timeZone` and UTC at the given instant. */
function offsetAt(instant: number, timeZone: string): number {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
      .formatToParts(new Date(instant))
      .map((p) => [p.type, Number(p.value)]),
  );
  const asUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  );
  return asUtc - Math.floor(instant / 1000) * 1000;
}

/** "2026-11-20" + "10:30" in `timeZone` → UTC Date. Two passes so it stays correct around DST changes. */
export function zonedToUtc(date: string, time: string, timeZone: string): Date {
  const [y, m, d] = date.split('-').map(Number);
  const [hh, mm] = time.split(':').map(Number);
  const wallClock = Date.UTC(y, m - 1, d, hh, mm);
  let utc = wallClock - offsetAt(wallClock, timeZone);
  utc = wallClock - offsetAt(utc, timeZone);
  return new Date(utc);
}

/** Half-open UTC range [start, end) covering the calendar day `date` in `timeZone`. */
export function dayRangeUtc(
  date: string,
  timeZone: string,
): { start: Date; end: Date } {
  const next = new Date(`${date}T00:00:00Z`);
  next.setUTCDate(next.getUTCDate() + 1);
  return {
    start: zonedToUtc(date, '00:00', timeZone),
    end: zonedToUtc(next.toISOString().slice(0, 10), '00:00', timeZone),
  };
}

/** UTC instant → "HH:mm" in `timeZone`. */
export function formatTime(instant: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(instant);
}
