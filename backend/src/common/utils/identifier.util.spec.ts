import { isEmail, normalizeEmail, normalizeIdentifier, normalizePhone } from './identifier.util';

describe('identifier.util', () => {
  describe('isEmail', () => {
    it('detects emails', () => {
      expect(isEmail('a@b.com')).toBe(true);
      expect(isEmail('coach@example.co')).toBe(true);
    });
    it('rejects non-emails', () => {
      expect(isEmail('+989120000000')).toBe(false);
      expect(isEmail('09120000000')).toBe(false);
    });
  });

  describe('normalizeEmail', () => {
    it('trims and lowercases', () => {
      expect(normalizeEmail('  Coach@Example.COM ')).toBe('coach@example.com');
    });
  });

  describe('normalizePhone (Iran-aware E.164)', () => {
    it.each([
      ['09120000000', '+989120000000'],
      ['9120000000', '+989120000000'],
      ['+989120000000', '+989120000000'],
      ['00989120000000', '+989120000000'],
      ['0912 000 0000', '+989120000000'],
      ['0912-000-0000', '+989120000000'],
    ])('normalizes %s -> %s', (input, expected) => {
      expect(normalizePhone(input)).toBe(expected);
    });
  });

  describe('normalizeIdentifier', () => {
    it('routes emails to EMAIL channel', () => {
      expect(normalizeIdentifier('Coach@Example.com')).toEqual({
        channel: 'EMAIL',
        value: 'coach@example.com',
      });
    });
    it('routes phones to SMS channel', () => {
      expect(normalizeIdentifier('09120000000')).toEqual({
        channel: 'SMS',
        value: '+989120000000',
      });
    });
    it('produces identical output for equivalent phone formats (linking key stability)', () => {
      const a = normalizeIdentifier('09120000000').value;
      const b = normalizeIdentifier('+98 912 000 0000').value;
      expect(a).toBe(b);
    });
  });
});
