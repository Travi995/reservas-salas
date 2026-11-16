/** Monday (ISO week start) of the week containing `date`, as "YYYY-MM-DD". */
export function mondayOf(date: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  const fromMonday = (d.getUTCDay() + 6) % 7; // Sunday = 6
  d.setUTCDate(d.getUTCDate() - fromMonday);
  return d.toISOString().slice(0, 10);
}

/** The 7 dates of the week starting on `monday`. */
export function weekDates(monday: string): string[] {
  const start = new Date(`${monday}T00:00:00Z`);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setUTCDate(d.getUTCDate() + i);
    return d.toISOString().slice(0, 10);
  });
}

/** Calendar date of an instant in `timeZone`, as "YYYY-MM-DD". */
export function localDate(instant: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(instant);
}
