export const MIN_WEEKS = 2;
export const MAX_WEEKS = 12;

/**
 * Calendar dates of a weekly series: `firstDate` and the same weekday for the next `weeks - 1` weeks.
 * Works on plain dates ("YYYY-MM-DD"), so a DST change in between keeps the same wall-clock time:
 * each date is converted to UTC with the room's zone afterwards.
 */
export function weeklyDates(firstDate: string, weeks: number): string[] {
  const start = new Date(`${firstDate}T00:00:00Z`);
  return Array.from({ length: weeks }, (_, i) => {
    const d = new Date(start);
    d.setUTCDate(d.getUTCDate() + 7 * i);
    return d.toISOString().slice(0, 10);
  });
}

/** "2026-11-24" → "24/11/2026" for user-facing messages. */
export function formatDate(date: string): string {
  const [y, m, d] = date.split('-');
  return `${d}/${m}/${y}`;
}
