import { localDate, mondayOf, weekDates } from './week.js';

describe('week helpers', () => {
  it('mondayOf returns the Monday of the ISO week (Sunday belongs to the previous week)', () => {
    expect(mondayOf('2026-11-16')).toBe('2026-11-16'); // Monday
    expect(mondayOf('2026-11-20')).toBe('2026-11-16'); // Friday
    expect(mondayOf('2026-11-22')).toBe('2026-11-16'); // Sunday
    expect(mondayOf('2027-01-01')).toBe('2026-12-28'); // across years
  });

  it('weekDates lists Monday to Sunday', () => {
    expect(weekDates('2026-11-30')).toEqual([
      '2026-11-30',
      '2026-12-01',
      '2026-12-02',
      '2026-12-03',
      '2026-12-04',
      '2026-12-05',
      '2026-12-06',
    ]);
  });

  it("localDate uses the room's zone, not UTC", () => {
    // 01:00 UTC on the 21st is still the 20th in Buenos Aires (UTC-3).
    const instant = new Date('2026-11-21T01:00:00Z');
    expect(localDate(instant, 'America/Argentina/Buenos_Aires')).toBe(
      '2026-11-20',
    );
    expect(localDate(instant, 'Europe/Madrid')).toBe('2026-11-21');
  });
});
