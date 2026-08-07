/**
 * Fold Persian and Arabic-Indic digits to ASCII.
 *
 * A Persian keyboard types ۰۹۹۱۷۱۴۸۳۵۳, not 09917148353 — visually the same
 * number, a completely different string. Anything that parses user input with
 * `\d` or `Number()` silently loses those characters instead of reading them,
 * so the two forms have to be reconciled before parsing, not after.
 *
 * In this app that mattered twice over: the phone number is the login identifier
 * *and* the key the linking rule matches on, so a coach who typed a student's
 * number on a Persian keyboard created a profile that the student could never
 * claim — no error anywhere, the programs simply stayed invisible.
 */
const PERSIAN_ZERO = 0x06f0; // ۰ … ۹
const ARABIC_ZERO = 0x0660; // ٠ … ٩

export function toLatinDigits(input: string): string {
  let out = "";
  for (const char of input) {
    const code = char.codePointAt(0)!;
    if (code >= PERSIAN_ZERO && code <= PERSIAN_ZERO + 9) {
      out += String(code - PERSIAN_ZERO);
    } else if (code >= ARABIC_ZERO && code <= ARABIC_ZERO + 9) {
      out += String(code - ARABIC_ZERO);
    } else {
      out += char;
    }
  }
  return out;
}
