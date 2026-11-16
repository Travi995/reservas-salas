import { dayRangeUtc, formatTime, zonedToUtc } from './zoned-time.js';

describe('zoned time helpers', () => {
  it('converts a Buenos Aires wall-clock time (UTC-3) to UTC', () => {
    expect(
      zonedToUtc(
        '2026-11-20',
        '10:00',
        'America/Argentina/Buenos_Aires',
      ).toISOString(),
    ).toBe('2026-11-20T13:00:00.000Z');
  });

  it('handles daylight saving time (Madrid: UTC+1 in winter, UTC+2 in summer)', () => {
    expect(
      zonedToUtc('2026-01-15', '10:00', 'Europe/Madrid').toISOString(),
    ).toBe('2026-01-15T09:00:00.000Z');
    expect(
      zonedToUtc('2026-07-15', '10:00', 'Europe/Madrid').toISOString(),
    ).toBe('2026-07-15T08:00:00.000Z');
  });

  it('returns the local calendar day as a half-open UTC range', () => {
    const { start, end } = dayRangeUtc(
      '2026-11-20',
      'America/Argentina/Buenos_Aires',
    );
    expect(start.toISOString()).toBe('2026-11-20T03:00:00.000Z');
    expect(end.toISOString()).toBe('2026-11-21T03:00:00.000Z');
  });

  it('formats an instant as HH:mm in the given zone', () => {
    expect(
      formatTime(
        new Date('2026-11-20T13:00:00Z'),
        'America/Argentina/Buenos_Aires',
      ),
    ).toBe('10:00');
  });
});
