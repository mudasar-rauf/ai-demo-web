import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { renderWithRouter } from '../test/renderWithRouter';

describe('AppLayout', () => {
  it('moves to /summary when Summary is clicked, and back to / with Tasks', async () => {
    const { router } = await renderWithRouter('/');
    const nav = screen.getByRole('navigation', { name: 'Main navigation' });

    await userEvent.click(within(nav).getByRole('link', { name: 'Summary' }));
    expect(router.state.location.pathname).toBe('/summary');
    expect(within(screen.getByRole('main')).getByText('Not built yet')).toBeInTheDocument();

    await userEvent.click(within(nav).getByRole('link', { name: 'Tasks' }));
    expect(router.state.location.pathname).toBe('/');
  });

  it('marks the current page in the navigation', async () => {
    await renderWithRouter('/summary');
    const nav = screen.getByRole('navigation', { name: 'Main navigation' });
    expect(within(nav).getByRole('link', { name: 'Summary' })).toHaveAttribute('aria-current', 'page');
    expect(within(nav).getByRole('link', { name: 'Tasks' })).not.toHaveAttribute('aria-current', 'page');
  });
});
