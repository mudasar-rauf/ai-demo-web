import { screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderWithRouter } from '../../test/renderWithRouter';

describe('SummaryScreen at /summary', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it.each([
    ['off', undefined],
    ['on', 'true'],
  ])('renders "Not built yet" inside the navigation with VITE_FF_SUMMARY %s', async (_state, value) => {
    vi.stubEnv('VITE_FF_SUMMARY', value);
    await renderWithRouter('/summary');

    const nav = screen.getByRole('navigation', { name: 'Main navigation' });
    expect(within(nav).getByRole('link', { name: 'Tasks' })).toHaveAttribute('href', '/');
    expect(within(nav).getByRole('link', { name: 'Summary' })).toHaveAttribute('href', '/summary');
    expect(within(screen.getByRole('main')).getByText('Not built yet')).toBeInTheDocument();
  });
});
