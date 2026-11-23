import type { Summary } from '../../api/types';

/**
 * The share of tasks done, as a whole percentage (0–100), rounded halves up. 0 when there are no tasks.
 * Multiplying first keeps the numerator an integer, so exact halves round up: 23 of 40 is 58, not 57.
 */
export function shareDone({ total, done }: Summary): number {
  if (total <= 0) return 0;
  return Math.round((done * 100) / total);
}
