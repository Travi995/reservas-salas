import type { ClipboardEvent, DragEvent, KeyboardEvent } from 'react'

/** Characters `<input type="number">` accepts besides digits: exponent (e/E), signs and decimal separators. */
const NON_DIGIT_KEYS = new Set(['e', 'E', '+', '-', '.', ','])
const DECIMAL_KEYS = new Set(['.', ','])

/** Does this `step` allow fractions (`0.5`, `any`)? Without one, a number field takes whole numbers only. */
export function allowsDecimals(step: string | number | undefined): boolean {
  if (step === undefined) return false
  return step === 'any' || !Number.isInteger(Number(step))
}

/** Blocks the keys that make no sense in a whole-number field (the browser lets «e» through, e.g. «1e5»). */
export function blockNonNumericKey(event: KeyboardEvent<HTMLInputElement>, decimals: boolean) {
  if (event.ctrlKey || event.metaKey || event.altKey) return
  if (!NON_DIGIT_KEYS.has(event.key)) return
  if (decimals && DECIMAL_KEYS.has(event.key)) return
  event.preventDefault()
}

/** Keeps only the digits (and one decimal point, if allowed) of a text; the sign and exponent are dropped. */
export function sanitizeNumeric(text: string, decimals: boolean): string {
  if (!decimals) return text.replace(/\D/g, '')
  const cleaned = text.replace(/,/g, '.').replace(/[^\d.]/g, '')
  const [whole, ...rest] = cleaned.split('.')
  return rest.length ? `${whole}.${rest.join('')}` : whole
}

/** Pasting «1e5» or «-3» inserts only its digits instead of letting the browser keep the letter. */
export function sanitizePaste(event: ClipboardEvent<HTMLInputElement>, decimals: boolean) {
  const text = event.clipboardData.getData('text')
  const clean = sanitizeNumeric(text, decimals)
  if (clean === text) return
  event.preventDefault()
  const input = event.currentTarget
  // type=number inputs do not support selection ranges; execCommand keeps undo and the change events working.
  if (clean) document.execCommand('insertText', false, clean)
  else input.dispatchEvent(new Event('input', { bubbles: true }))
}

/** Text dropped into a number field is ignored (it would bypass the key and paste filters). */
export function blockDrop(event: DragEvent<HTMLInputElement>) {
  event.preventDefault()
}
