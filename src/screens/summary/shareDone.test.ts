import { describe, expect, it } from 'vitest';
import { shareDone } from './shareDone';

describe('shareDone', () => {
  it.each([
    [{ total: 3, open: 2, done: 1 }, 33],
    [{ total: 3, open: 1, done: 2 }, 67],
    [{ total: 3, open: 0, done: 3 }, 100],
    [{ total: 2, open: 1, done: 1 }, 50],
    [{ total: 200, open: 1, done: 199 }, 100],
    [{ total: 8, open: 7, done: 1 }, 13],
    [{ total: 40, open: 17, done: 23 }, 58],
  ])('is %o → %i, a whole percentage rounded halves up', (summary, expected) => {
    expect(shareDone(summary)).toBe(expected);
  });

  it('is 0 with no tasks, never a division by zero', () => {
    const share = shareDone({ total: 0, open: 0, done: 0 });

    expect(share).toBe(0);
    expect(Number.isFinite(share)).toBe(true);
  });
});
