import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { createApiClient } from '../../api/client';
import { createMockApi } from '../../api/mock';
import type { Task } from '../../api/types';
import { renderWithRouter } from '../../test/renderWithRouter';

const FIGURES = ['Total tasks', 'Open', 'Done', 'Share done'];

let nextId = 0;

/** A task as the contract has it, with a valid UUID and created_at. */
function task(overrides: Partial<Task> = {}): Task {
  nextId += 1;
  return {
    id: `00000000-0000-4000-8000-${String(nextId).padStart(12, '0')}`,
    title: `Task ${nextId}`,
    notes: '',
    due: null,
    done: false,
    created_at: '2026-11-22T09:30:00.123456Z',
    done_at: null,
    ...overrides,
  };
}

function doneTask(): Task {
  return task({ done: true, done_at: '2026-11-22T10:00:00.000000Z' });
}

/** The value shown next to a figure's label. */
function figure(label: string): HTMLElement {
  const term = within(screen.getByRole('main')).getByText(label).closest('dt');
  const value = term?.nextElementSibling;
  if (!(value instanceof HTMLElement) || value.tagName !== 'DD') throw new Error(`No value next to "${label}"`);
  return value;
}

function expectHeading() {
  expect(screen.getByRole('heading', { level: 1, name: 'Summary' })).toBeInTheDocument();
}

describe('SummaryScreen at /summary', () => {
  it('shows the total, open and done counts and the share done (AC1)', async () => {
    const mock = createMockApi();
    mock.seed([task(), task(), doneTask()]);
    await renderWithRouter('/summary', {
      client: createApiClient({ baseUrl: 'http://mock', fetch: mock.fetch }),
    });

    expectHeading();
    expect(await screen.findByText('Total tasks')).toBeInTheDocument();
    expect(figure('Total tasks')).toHaveTextContent(/^3$/);
    expect(figure('Open')).toHaveTextContent(/^2$/);
    expect(figure('Done')).toHaveTextContent(/^1$/);
    expect(figure('Share done')).toHaveTextContent(/^33%$/);
  });

  it('shows 0 for each count and 0% with no tasks, never a division by zero (AC2)', async () => {
    await renderWithRouter('/summary');

    expectHeading();
    expect(await screen.findByText('Total tasks')).toBeInTheDocument();
    expect(figure('Total tasks')).toHaveTextContent(/^0$/);
    expect(figure('Open')).toHaveTextContent(/^0$/);
    expect(figure('Done')).toHaveTextContent(/^0$/);
    expect(figure('Share done')).toHaveTextContent(/^0%$/);
    const main = screen.getByRole('main');
    expect(main).not.toHaveTextContent('NaN');
    expect(main).not.toHaveTextContent('Infinity');
  });

  it('shows the loading state, and no figures, while the summary loads (AC3)', async () => {
    const pending: typeof fetch = () => new Promise<Response>(() => {});
    await renderWithRouter('/summary', { client: createApiClient({ baseUrl: 'http://mock', fetch: pending }) });

    expectHeading();
    const main = screen.getByRole('main');
    expect(within(main).getByRole('progressbar', { name: 'Loading' })).toBeInTheDocument();
    for (const label of FIGURES) expect(within(main).queryByText(label)).not.toBeInTheDocument();
  });

  it('says it could not reach the API, and Retry loads the summary again (AC3)', async () => {
    const mock = createMockApi();
    mock.seed([task(), doneTask()]);
    let calls = 0;
    const failsOnce: typeof fetch = (input, init) => {
      calls += 1;
      if (calls === 1) return Promise.reject(new TypeError('Failed to fetch'));
      return mock.fetch(input, init);
    };
    await renderWithRouter('/summary', { client: createApiClient({ baseUrl: 'http://mock', fetch: failsOnce }) });

    expectHeading();
    expect(await screen.findByText('Could not reach the API')).toBeInTheDocument();
    expect(screen.queryByText('Total tasks')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));

    expect(await screen.findByText('Total tasks')).toBeInTheDocument();
    expect(figure('Total tasks')).toHaveTextContent(/^2$/);
    expect(figure('Share done')).toHaveTextContent(/^50%$/);
    expect(screen.queryByText('Could not reach the API')).not.toBeInTheDocument();
    expect(calls).toBe(2);
  });

  it('says "Not built yet on the server" while the endpoint answers 501 (AC6)', async () => {
    const mock = createMockApi();
    mock.notImplemented('getSummary');
    await renderWithRouter('/summary', {
      client: createApiClient({ baseUrl: 'http://mock', fetch: mock.fetch }),
    });

    expectHeading();
    expect(await screen.findByText('Not built yet on the server')).toBeInTheDocument();
    expect(screen.queryByText('Total tasks')).not.toBeInTheDocument();
  });
});
