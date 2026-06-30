import { generateUniqueHandle, slugifyHandle, HANDLE_REGEX } from './handle.util';

describe('handle.util', () => {
  it('slugifies names to valid handle characters', () => {
    expect(slugifyHandle('Ali Trainer')).toBe('ali-trainer');
    expect(slugifyHandle('  Coach  FIT!! ')).toBe('coach-fit');
    expect(slugifyHandle('علی')).toBe(''); // non-ascii drops to empty → caller falls back
  });

  it('falls back to coach-<rand> when the name has no usable ascii', async () => {
    const handle = await generateUniqueHandle('علی', async () => false);
    expect(handle.startsWith('coach-')).toBe(true);
    expect(HANDLE_REGEX.test(handle)).toBe(true);
  });

  it('returns the base slug when free', async () => {
    expect(await generateUniqueHandle('Ali Trainer', async () => false)).toBe('ali-trainer');
  });

  it('appends a numeric suffix on collision', async () => {
    const taken = new Set(['ali-trainer', 'ali-trainer-2', 'ali-trainer-3']);
    const handle = await generateUniqueHandle('Ali Trainer', async (h) => taken.has(h));
    expect(handle).toBe('ali-trainer-4');
    expect(HANDLE_REGEX.test(handle)).toBe(true);
  });
});
