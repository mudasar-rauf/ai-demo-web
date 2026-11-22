import { afterEach, describe, expect, it, vi } from 'vitest';
import { isSummaryEnabled, isTaskEnabled, isTasksEnabled } from './flags';

describe.each([
  ['VITE_FF_TASKS', isTasksEnabled],
  ['VITE_FF_TASK', isTaskEnabled],
  ['VITE_FF_SUMMARY', isSummaryEnabled],
] as const)('%s', (name, isEnabled) => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('is off when unset', () => {
    vi.stubEnv(name, undefined);
    expect(isEnabled()).toBe(false);
  });

  it.each(['', 'false', 'TRUE', '1', 'yes'])('is off for %j', (value) => {
    vi.stubEnv(name, value);
    expect(isEnabled()).toBe(false);
  });

  it('is on only for "true"', () => {
    vi.stubEnv(name, 'true');
    expect(isEnabled()).toBe(true);
  });
});
