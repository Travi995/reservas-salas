import { compareValues, nextSort, sortFromParams, writeSortParams } from './sort'

describe('nextSort', () => {
  it('cycles ascending, descending, then back to the default order', () => {
    const asc = nextSort(null, 'title')
    expect(asc).toEqual({ by: 'title', dir: 'asc' })
    const desc = nextSort(asc, 'title')
    expect(desc).toEqual({ by: 'title', dir: 'desc' })
    expect(nextSort(desc, 'title')).toBeNull()
  })
  it('starts ascending when another column is chosen', () => {
    expect(nextSort({ by: 'title', dir: 'desc' }, 'room')).toEqual({ by: 'room', dir: 'asc' })
  })
})

describe('sort in the URL', () => {
  const allowed = ['date', 'title'] as const
  it('reads a known column and its direction', () => {
    expect(sortFromParams(new URLSearchParams('sort=title&dir=desc'), allowed)).toEqual({ by: 'title', dir: 'desc' })
    expect(sortFromParams(new URLSearchParams('sort=title'), allowed)).toEqual({ by: 'title', dir: 'asc' })
    expect(sortFromParams(new URLSearchParams('sort=title&dir=up'), allowed)).toEqual({ by: 'title', dir: 'asc' })
  })
  it('ignores unknown or missing columns', () => {
    expect(sortFromParams(new URLSearchParams('sort=password'), allowed)).toBeNull()
    expect(sortFromParams(new URLSearchParams(''), allowed)).toBeNull()
  })
  it('writes desc explicitly, leaves asc implicit and clears on null', () => {
    const p = new URLSearchParams('page=2')
    writeSortParams(p, { by: 'title', dir: 'desc' })
    expect(p.toString()).toBe('page=2&sort=title&dir=desc')
    writeSortParams(p, { by: 'date', dir: 'asc' })
    expect(p.toString()).toBe('page=2&sort=date')
    writeSortParams(p, null)
    expect(p.toString()).toBe('page=2')
  })
})

describe('compareValues', () => {
  it('compares numbers numerically and text ignoring case and accents', () => {
    expect(compareValues(2, 10)).toBeLessThan(0)
    expect(compareValues('Álamo', 'alamo')).toBe(0)
    expect(compareValues('b', 'A')).toBeGreaterThan(0)
  })
})
