import { toLatinDigits } from './digits';
import { normalizeIdentifier, normalizePhone } from './identifier';

describe('toLatinDigits', () => {
  it('folds Persian digits', () => {
    expect(toLatinDigits('۰۹۹۱۷۱۴۸۳۵۳')).toBe('09917148353');
  });

  it('folds Arabic-Indic digits', () => {
    expect(toLatinDigits('٠٩٩١٧١٤٨٣٥٣')).toBe('09917148353');
  });

  it('leaves everything else untouched', () => {
    expect(toLatinDigits('ali+۲۳@example.com')).toBe('ali+23@example.com');
    expect(toLatinDigits('پرس سینه')).toBe('پرس سینه');
    expect(toLatinDigits('')).toBe('');
  });
});

describe('phone normalization across keyboards', () => {
  // The bug: `\D` strips anything that is not an ASCII digit, so a Persian
  // number was erased entirely and normalized to a bare "+".
  it('gives the same E.164 value whichever keyboard typed it', () => {
    const latin = normalizePhone('09917148353');
    expect(latin).toBe('+989917148353');
    expect(normalizePhone('۰۹۹۱۷۱۴۸۳۵۳')).toBe(latin);
    expect(normalizePhone('٠٩٩١٧١٤٨٣٥٣')).toBe(latin);
  });

  it('handles the other Iranian formats in Persian digits too', () => {
    expect(normalizePhone('+۹۸۹۹۱۷۱۴۸۳۵۳')).toBe('+989917148353');
    expect(normalizePhone('۹۹۱۷۱۴۸۳۵۳')).toBe('+989917148353');
    expect(normalizePhone('۰۰۹۸۹۹۱۷۱۴۸۳۵۳')).toBe('+989917148353');
  });

  it('no longer collapses a Persian number to a bare plus', () => {
    expect(normalizePhone('۰۹۹۱۷۱۴۸۳۵۳')).not.toBe('+');
  });

  /**
   * The reason this matters beyond login: a coach typing a student's number on a
   * Persian keyboard has to produce the same key the student later registers
   * with, or the programs written for them never link.
   */
  it('keeps the linking rule intact across keyboards', () => {
    const coachTyped = normalizeIdentifier('۰۹۹۱۷۱۴۸۳۵۳');
    const studentTyped = normalizeIdentifier('09917148353');
    expect(coachTyped).toEqual(studentTyped);
    expect(coachTyped.channel).toBe('SMS');
  });

  it('still routes emails to the email channel after folding', () => {
    const { channel, value } = normalizeIdentifier('  Ali۱۲۳@Example.COM ');
    expect(channel).toBe('EMAIL');
    expect(value).toBe('ali123@example.com');
  });
});
