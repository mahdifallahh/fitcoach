import { externalUrl } from './url';

const url = externalUrl();

describe('externalUrl', () => {
  it('accepts absolute http(s) links unchanged', () => {
    expect(url.parse('https://instagram.com/coach')).toBe('https://instagram.com/coach');
    expect(url.parse('http://example.ir/a?b=1#c')).toBe('http://example.ir/a?b=1#c');
  });

  it('assumes https for the scheme-less link a coach actually types', () => {
    expect(url.parse('instagram.com/coach')).toBe('https://instagram.com/coach');
    expect(url.parse('//instagram.com/coach')).toBe('https://instagram.com/coach');
    expect(url.parse('  t.me/coach  ')).toBe('https://t.me/coach');
  });

  // The reason this validator exists: these run in the *reader's* session on a
  // public page, and anyone can sign up as a coach.
  it.each([
    'javascript:alert(document.cookie)',
    'JavaScript:alert(1)',
    'data:text/html,<script>alert(1)</script>',
    'vbscript:msgbox(1)',
    'file:///etc/passwd',
  ])('rejects the %s scheme', (hostile) => {
    expect(url.safeParse(hostile).success).toBe(false);
  });

  it('rejects empty input', () => {
    expect(url.safeParse('').success).toBe(false);
    expect(url.safeParse('   ').success).toBe(false);
  });
});
