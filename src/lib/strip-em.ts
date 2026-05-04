/**
 * Strip em-dashes and en-dashes from AI-generated text.
 * Hard rule: no em dashes anywhere in app or AI output.
 */
export function stripEmDashes(s: string): string {
  if (!s) return s
  return s
    .replace(/\s*[\u2014\u2013]\s*/g, ', ')
    .replace(/,\s*,/g, ',')
}
