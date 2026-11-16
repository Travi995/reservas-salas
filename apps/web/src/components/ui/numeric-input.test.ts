import { allowsDecimals, sanitizeNumeric } from './numeric-input'

describe('sanitizeNumeric', () => {
  it('keeps only digits in a whole-number field', () => {
    expect(sanitizeNumeric('1e5', false)).toBe('15')
    expect(sanitizeNumeric('-3', false)).toBe('3')
    expect(sanitizeNumeric('1.5', false)).toBe('15')
    expect(sanitizeNumeric('abc', false)).toBe('')
    expect(sanitizeNumeric('12', false)).toBe('12')
  })
  it('keeps a single decimal point when decimals are allowed', () => {
    expect(sanitizeNumeric('1,5', true)).toBe('1.5')
    expect(sanitizeNumeric('1.2.3', true)).toBe('1.23')
    expect(sanitizeNumeric('-2e3', true)).toBe('23')
  })
})

describe('allowsDecimals', () => {
  it('is false without a step or with a whole step, true for fractions or «any»', () => {
    expect(allowsDecimals(undefined)).toBe(false)
    expect(allowsDecimals(1)).toBe(false)
    expect(allowsDecimals('5')).toBe(false)
    expect(allowsDecimals('0.5')).toBe(true)
    expect(allowsDecimals('any')).toBe(true)
  })
})
