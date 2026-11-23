import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { createApiClient } from '../../api/client';
import { createMockApi, type MockApi } from '../../api/mock';
import type { Task } from '../../api/types';
import { renderWithRouter } from '../../test/renderWithRouter';

let ids = 0;
function task(overrides: Partial<Task> = {}): Task {
  ids += 1;
  return {
    id: `00000000-0000-4000-8000-${String(ids).padStart(12, '0')}`,
    title: `Task ${ids}`,
    notes: '',
    due: null,
    done: false,
    created_at: `2026-11-2${ids % 10}T09:00:00.000000Z`,
    done_at: null,
    ...overrides,
  };
}

const MILK = task({ title: 'Buy milk', created_at: '2026-11-20T09:00:00.000000Z', due: '2026-11-23' });
const BREAD = task({ title: 'Bake bread', created_at: '2026-11-21T09:00:00.000000Z' });
const TAX = task({
  title: 'File taxes',
  created_at: '2026-11-22T09:00:00.000000Z',
  done: true,
  done_at: '2026-11-22T10:00:00.000000Z',
});

/** Renders `path` with the screen's client on a mock the test owns, recording every URL fetched. */
async function renderTasks(path = '/', seed: Task[] = [MILK, BREAD, TAX], setup?: (mock: MockApi) => void) {
  const mock = createMockApi();
  mock.seed(seed);
  setup?.(mock);
  const fetchSpy = vi.fn(mock.fetch);
  const result = await renderWithRouter(path, {
    client: createApiClient({ baseUrl: 'http://mock', fetch: fetchSpy }),
  });
  const main = screen.getByRole('main');
  return { ...result, mock, fetchSpy, main };
}

function requestedUrls(fetchSpy: ReturnType<typeof vi.fn>): string[] {
  return fetchSpy.mock.calls.map(([input]) => String(input));
}

async function findRows(main: HTMLElement) {
  return within(main).findAllByRole('checkbox', { name: /^Done: / });
}

/** The rows' titles, in the order the screen shows them: each title is a link in the main region. */
function rowTitles(main: HTMLElement): string[] {
  return within(main)
    .getAllByRole('link')
    .map((link) => link.textContent);
}

describe('TasksScreen: the list (AC1)', () => {
  it('lists the tasks newest first, each with its title, its due date when set, and a done checkbox', async () => {
    const { main } = await renderTasks();
    await findRows(main);

    expect(rowTitles(main)).toEqual(['File taxes', 'Bake bread', 'Buy milk']);
    expect(within(main).getByRole('link', { name: 'Buy milk' })).toBeInTheDocument();
    expect(within(main).getByText('Due 2026-11-23')).toBeInTheDocument();
    expect(within(main).getAllByText(/^Due /)).toHaveLength(1);
    expect(within(main).getByRole('checkbox', { name: 'Done: File taxes' })).toBeChecked();
    expect(within(main).getByRole('checkbox', { name: 'Done: Bake bread' })).not.toBeChecked();
    expect(within(main).getByRole('checkbox', { name: 'Done: Buy milk' })).not.toBeChecked();
  });
});

describe('TasksScreen: the tabs (AC2, AC8)', () => {
  it('shows All, Open and Done tabs above the list, with All selected and status=all asked for at /', async () => {
    const { main, fetchSpy } = await renderTasks();
    await findRows(main);

    const tablist = within(main).getByRole('tablist');
    const tabs = within(tablist).getAllByRole('tab');
    expect(tabs).toEqual(['All', 'Open', 'Done'].map((name) => within(tablist).getByRole('tab', { name })));
    expect(within(tablist).getByRole('tab', { name: 'All' })).toHaveAttribute('aria-selected', 'true');
    expect(within(tablist).getByRole('tab', { name: 'Open' })).toHaveAttribute('aria-selected', 'false');
    expect(requestedUrls(fetchSpy)).toEqual(['http://mock/tasks?status=all']);
    // Above the list: the tab strip comes before the first row in the document.
    const firstRow = within(main).getAllByRole('checkbox', { name: /^Done: / })[0];
    expect(tablist.compareDocumentPosition(firstRow) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('choosing Open, then Done, then All asks the API for that status, shows its tasks and selects the tab', async () => {
    const { main, fetchSpy, router } = await renderTasks();
    await findRows(main);

    await userEvent.click(within(main).getByRole('tab', { name: 'Open' }));
    await waitFor(() => expect(rowTitles(main)).toEqual(['Bake bread', 'Buy milk']));
    expect(within(main).getByRole('tab', { name: 'Open' })).toHaveAttribute('aria-selected', 'true');
    expect(within(main).getByRole('tab', { name: 'All' })).toHaveAttribute('aria-selected', 'false');
    expect(requestedUrls(fetchSpy).at(-1)).toBe('http://mock/tasks?status=open');
    expect(router.state.location.search).toEqual({ status: 'open' });

    await userEvent.click(within(main).getByRole('tab', { name: 'Done' }));
    await waitFor(() => expect(rowTitles(main)).toEqual(['File taxes']));
    expect(within(main).getByRole('tab', { name: 'Done' })).toHaveAttribute('aria-selected', 'true');
    expect(requestedUrls(fetchSpy).at(-1)).toBe('http://mock/tasks?status=done');
    expect(router.state.location.search).toEqual({ status: 'done' });

    await userEvent.click(within(main).getByRole('tab', { name: 'All' }));
    await waitFor(() => expect(rowTitles(main)).toHaveLength(3));
    expect(requestedUrls(fetchSpy).at(-1)).toBe('http://mock/tasks?status=all');
    expect(router.state.location.search).toEqual({});
  });

  it('starts on the tab the URL names', async () => {
    const { main, fetchSpy } = await renderTasks('/?status=done');
    await findRows(main);
    expect(within(main).getByRole('tab', { name: 'Done' })).toHaveAttribute('aria-selected', 'true');
    expect(rowTitles(main)).toEqual(['File taxes']);
    expect(requestedUrls(fetchSpy)).toEqual(['http://mock/tasks?status=done']);
  });

  it('treats any other status in the URL as All', async () => {
    const { main, fetchSpy } = await renderTasks('/?status=bogus');
    await findRows(main);
    expect(within(main).getByRole('tab', { name: 'All' })).toHaveAttribute('aria-selected', 'true');
    expect(requestedUrls(fetchSpy)).toEqual(['http://mock/tasks?status=all']);
  });
});

describe('TasksScreen: loading, empty and error (AC5)', () => {
  it('says "Loading" until the list arrives', async () => {
    let answer: (response: Response) => void = () => {};
    const pending = new Promise<Response>((resolve) => (answer = resolve));
    await renderWithRouter('/', { client: createApiClient({ baseUrl: 'http://mock', fetch: () => pending }) });
    expect(screen.getByRole('progressbar', { name: 'Loading' })).toBeInTheDocument();
    answer(Response.json([]));
    expect(await screen.findByText('No tasks yet')).toBeInTheDocument();
    expect(screen.queryByRole('progressbar', { name: 'Loading' })).not.toBeInTheDocument();
  });

  it.each([
    ['/', 'No tasks yet'],
    ['/?status=open', 'No open tasks'],
    ['/?status=done', 'No done tasks'],
  ])('at %s an empty list says "%s"', async (path, words) => {
    const { main } = await renderTasks(path, []);
    expect(await within(main).findByText(words)).toBeInTheDocument();
    expect(within(main).queryByRole('checkbox', { name: /^Done: / })).not.toBeInTheDocument();
  });

  it('says which tab is empty when only the other tab has tasks', async () => {
    const { main } = await renderTasks('/?status=done', [MILK]);
    expect(await within(main).findByText('No done tasks')).toBeInTheDocument();
  });

  it('says "Not built yet on the server" when the API answers 501', async () => {
    const { main } = await renderTasks('/', [MILK], (mock) => mock.notImplemented('listTasks'));
    expect(await within(main).findByText('Not built yet on the server')).toBeInTheDocument();
  });

  it('says "Could not reach the API" when the request fails, and Retry loads again', async () => {
    const mock = createMockApi();
    mock.seed([MILK]);
    const fetchSpy = vi.fn<typeof fetch>().mockRejectedValueOnce(new TypeError('Failed to fetch'));
    fetchSpy.mockImplementation(mock.fetch);
    await renderWithRouter('/', { client: createApiClient({ baseUrl: 'http://mock', fetch: fetchSpy }) });
    const main = screen.getByRole('main');

    expect(await within(main).findByText('Could not reach the API')).toBeInTheDocument();
    await userEvent.click(within(main).getByRole('button', { name: 'Retry' }));
    expect(await within(main).findByRole('checkbox', { name: 'Done: Buy milk' })).toBeInTheDocument();
  });
});

describe('TasksScreen: links (AC6)', () => {
  it("links each title to its Task screen, /tasks/$id, and following it opens that screen", async () => {
    const { main, router } = await renderTasks();
    await findRows(main);

    const link = within(main).getByRole('link', { name: 'Buy milk' });
    expect(link).toHaveAttribute('href', `/tasks/${MILK.id}`);
    await userEvent.click(link);
    await waitFor(() => expect(router.state.location.pathname).toBe(`/tasks/${MILK.id}`));
  });
});
