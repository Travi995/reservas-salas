import { checkTimeRules, overlaps } from './reservation-rules.js';

const NOW = new Date('2026-11-20T12:00:00Z');
const at = (time: string) => new Date(`2026-11-21T${time}:00Z`);
const code = (start: string, end: string, now = NOW) =>
  checkTimeRules(at(start), at(end), now)?.code ?? null;

describe('reservation rules (section 4)', () => {
  describe('end must be after start', () => {
    it('rejects equal and inverted times', () => {
      expect(code('10:00', '10:00')).toBe('END_BEFORE_START');
      expect(code('11:00', '10:00')).toBe('END_BEFORE_START');
    });
  });

  describe('no bookings in the past', () => {
    it('rejects a start before now', () => {
      expect(
        checkTimeRules(
          new Date('2026-11-20T11:00:00Z'),
          new Date('2026-11-20T13:00:00Z'),
          NOW,
        )?.code,
      ).toBe('IN_THE_PAST');
    });

    it('rejects a start exactly at now', () => {
      expect(
        checkTimeRules(NOW, new Date('2026-11-20T13:00:00Z'), NOW)?.code,
      ).toBe('IN_THE_PAST');
    });

    it('accepts a start one minute from now', () => {
      expect(
        checkTimeRules(
          new Date('2026-11-20T12:01:00Z'),
          new Date('2026-11-20T13:00:00Z'),
          NOW,
        ),
      ).toBeNull();
    });
  });

  describe('duration between 15 minutes and 4 hours (inclusive)', () => {
    it('accepts exactly 15 minutes and exactly 4 hours', () => {
      expect(code('10:00', '10:15')).toBeNull();
      expect(code('10:00', '14:00')).toBeNull();
    });

    it('rejects 14 minutes and 4 hours 1 minute', () => {
      expect(code('10:00', '10:14')).toBe('DURATION_OUT_OF_RANGE');
      expect(code('10:00', '14:01')).toBe('DURATION_OUT_OF_RANGE');
    });
  });

  it('returns 422 for every time rule violation', () => {
    expect(checkTimeRules(at('10:00'), at('10:05'), NOW)?.status).toBe(422);
  });

  describe('overlaps (half-open intervals)', () => {
    it('back-to-back bookings do not overlap: 10–11 and 11–12', () => {
      expect(overlaps(at('10:00'), at('11:00'), at('11:00'), at('12:00'))).toBe(
        false,
      );
    });

    it('detects partial, contained and identical overlaps', () => {
      expect(overlaps(at('10:00'), at('11:00'), at('10:30'), at('11:30'))).toBe(
        true,
      );
      expect(overlaps(at('10:00'), at('12:00'), at('10:30'), at('11:00'))).toBe(
        true,
      );
      expect(overlaps(at('10:00'), at('11:00'), at('10:00'), at('11:00'))).toBe(
        true,
      );
    });
  });
});
