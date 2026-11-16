import { resolveRequestId } from './request-id.js';

const UUID = /^[0-9a-f-]{36}$/;

describe('resolveRequestId', () => {
  it('reuses a safe id sent by the client or proxy', () => {
    expect(resolveRequestId('abc-123_x.y')).toBe('abc-123_x.y');
    expect(resolveRequestId(['first', 'second'])).toBe('first');
  });

  it('generates a UUID when missing, too long or with unsafe characters', () => {
    expect(resolveRequestId(undefined)).toMatch(UUID);
    expect(resolveRequestId('a'.repeat(65))).toMatch(UUID);
    expect(resolveRequestId('evil\nINJECTED log line')).toMatch(UUID);
  });
});
