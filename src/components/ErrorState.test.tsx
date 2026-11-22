import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ApiError } from '../api/client';
import { ErrorState } from './ErrorState';

async function renderError(error: unknown, onRetry = vi.fn()) {
  render(
    <main>
      <ErrorState error={error} onRetry={onRetry} />
    </main>,
  );
  return { onRetry, region: screen.getByRole('main') };
}

describe('ErrorState', () => {
  it('501: "Not built yet on the server", with no retry', async () => {
    const { region } = await renderError(new ApiError(501, { detail: 'Not implemented' }));
    expect(within(region).getByText('Not built yet on the server')).toBeInTheDocument();
    expect(within(region).queryByRole('button', { name: 'Retry' })).not.toBeInTheDocument();
  });

  it('404: the detail, with a link to Tasks', async () => {
    const { region } = await renderError(new ApiError(404, { detail: 'Task not found' }));
    expect(within(region).getByText('Task not found')).toBeInTheDocument();
    expect(within(region).getByRole('link', { name: 'Back to Tasks' })).toHaveAttribute('href', '/');
  });

  it('422: "The request was invalid", listing each msg', async () => {
    const { region } = await renderError(
      new ApiError(422, {
        detail: [
          { loc: ['body', 'title'], msg: 'String should have at least 1 character', type: 'string_too_short' },
          { loc: ['body', 'due'], msg: 'Input should be a valid date', type: 'date_parsing' },
        ],
      }),
    );
    expect(within(region).getByText('The request was invalid')).toBeInTheDocument();
    expect(within(region).getByText('String should have at least 1 character')).toBeInTheDocument();
    expect(within(region).getByText('Input should be a valid date')).toBeInTheDocument();
  });

  it.each([
    ['another ApiError', new ApiError(500, { detail: 'Internal Server Error' })],
    ['a network error', new TypeError('Failed to fetch')],
  ])('%s: "Could not reach the API", and Retry calls onRetry', async (_name, error) => {
    const { region, onRetry } = await renderError(error);
    expect(within(region).getByText('Could not reach the API')).toBeInTheDocument();
    await userEvent.click(within(region).getByRole('button', { name: 'Retry' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
