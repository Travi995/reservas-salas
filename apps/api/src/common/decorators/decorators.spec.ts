import { isDateOnly } from './is-date-only.decorator.js';
import { isTimeZone } from './is-time-zone.decorator.js';

describe('isDateOnly', () => {
  it('accepts real calendar dates', () => {
    expect(isDateOnly('2026-11-20')).toBe(true);
    expect(isDateOnly('2028-02-29')).toBe(true);
  });

  it('rejects impossible dates and other formats', () => {
    expect(isDateOnly('2026-02-30')).toBe(false);
    expect(isDateOnly('20/11/2026')).toBe(false);
    expect(isDateOnly(null)).toBe(false);
  });

  it('rejects years outside 2000–2100 (they overflow the day range)', () => {
    expect(isDateOnly('9999-12-31')).toBe(false);
    expect(isDateOnly('1999-12-31')).toBe(false);
    expect(isDateOnly('2100-12-31')).toBe(true);
  });
});

describe('isTimeZone', () => {
  it('accepts IANA ids and UTC', () => {
    expect(isTimeZone('America/Argentina/Buenos_Aires')).toBe(true);
    expect(isTimeZone('Europe/Madrid')).toBe(true);
    expect(isTimeZone('UTC')).toBe(true);
  });

  it('rejects unknown zones, offsets, misspelled ids and null', () => {
    expect(isTimeZone('Mars/Base')).toBe(false);
    expect(isTimeZone('+05:00')).toBe(false);
    expect(isTimeZone('europe/madrid')).toBe(false);
    expect(isTimeZone('')).toBe(false);
    expect(isTimeZone(null)).toBe(false);
  });
});
