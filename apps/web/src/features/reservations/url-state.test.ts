import { pageFromParams } from './url-state'

describe('pageFromParams', () => {
  it('reads a positive integer page and falls back to 1 for anything else', () => {
    expect(pageFromParams(new URLSearchParams('page=3'))).toBe(3)
    for (const bad of ['', 'page=0', 'page=-2', 'page=abc', 'page=1.5']) {
      expect(pageFromParams(new URLSearchParams(bad))).toBe(1)
    }
  })
})
