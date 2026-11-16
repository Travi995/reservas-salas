import { formatDate, weeklyDates } from './recurrence.js';

describe('weeklyDates', () => {
  it('repeats the same weekday every 7 days', () => {
    expect(weeklyDates('2026-11-23', 4)).toEqual([
      '2026-11-23',
      '2026-11-30',
      '2026-12-07',
      '2026-12-14',
    ]);
  });

  it('crosses month and year boundaries and leap days', () => {
    expect(weeklyDates('2027-12-27', 2)).toEqual(['2027-12-27', '2028-01-03']);
    expect(weeklyDates('2028-02-22', 2)).toEqual(['2028-02-22', '2028-02-29']);
  });

  it('keeps calendar dates across a DST change (end of summer time in Europe)', () => {
    expect(weeklyDates('2026-10-19', 2)).toEqual(['2026-10-19', '2026-10-26']);
  });
});

describe('formatDate', () => {
  it('formats as dd/mm/yyyy', () => {
    expect(formatDate('2026-11-04')).toBe('04/11/2026');
  });
});
