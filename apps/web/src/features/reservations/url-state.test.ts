import { pageFromParams, pageSizeFromParams } from './url-state'

describe('pageFromParams', () => {
  it('reads a positive integer page and falls back to 1 for anything else', () => {
    expect(pageFromParams(new URLSearchParams('page=3'))).toBe(3)
    for (const bad of ['', 'page=0', 'page=-2', 'page=abc', 'page=1.5']) {
      expect(pageFromParams(new URLSearchParams(bad))).toBe(1)
    }
  })
})

describe('pageSizeFromParams', () => {
  const size = (v: string) => pageSizeFromParams(new URLSearchParams(v))
  it('accepts only the offered sizes', () => {
    expect(size('size=20')).toBe(20)
    expect(size('size=5')).toBe(5)
  })
  it('falls back to 10 for anything else', () => {
    expect(size('')).toBe(10)
    expect(size('size=7')).toBe(10)
    expect(size('size=1000')).toBe(10)
    expect(size('size=abc')).toBe(10)
  })
})
