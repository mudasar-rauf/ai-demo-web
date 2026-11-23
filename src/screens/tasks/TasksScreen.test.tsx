import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, type Mock } from 'vitest';
import { createApiClient } from '../../api/client';
import { createMockApi, type MockApi } from '../../api/mock';
import type { Task } from '../../api/types';
import { renderWithRouter } from '../../test/renderWithRouter';

type FetchSpy = Mock<typeof fetch>;

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

function requestedUrls(fetchSpy: FetchSpy): string[] {
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
    expect(within(main).getAllByText(/^Due \d/)).toHaveLength(1);
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

/** The calls that were not GETs, as method, URL and parsed body. */
function writes(fetchSpy: FetchSpy) {
  return fetchSpy.mock.calls
    .map(([input, init]) => ({
      method: init?.method ?? 'GET',
      url: String(input),
      body: init?.body ? JSON.parse(String(init.body)) : undefined,
    }))
    .filter((call) => call.method !== 'GET');
}

describe('TasksScreen: ticking a task done (AC4)', () => {
  it('ticking calls PATCH /tasks/{id} with done, and the row updates; unticking reverses it', async () => {
    const { main, mock, fetchSpy } = await renderTasks();
    const box = (await within(main).findByRole('checkbox', { name: 'Done: Buy milk' })) as HTMLInputElement;

    await userEvent.click(box);
    await waitFor(() => expect(mock.tasks().find((t) => t.id === MILK.id)?.done).toBe(true));
    await waitFor(() => expect(box).toBeEnabled());
    expect(box).toBeChecked();
    expect(writes(fetchSpy)).toEqual([{ method: 'PATCH', url: `http://mock/tasks/${MILK.id}`, body: { done: true } }]);

    await userEvent.click(box);
    await waitFor(() => expect(mock.tasks().find((t) => t.id === MILK.id)?.done).toBe(false));
    await waitFor(() => expect(box).toBeEnabled());
    expect(box).not.toBeChecked();
    expect(writes(fetchSpy).at(-1)).toEqual({ method: 'PATCH', url: `http://mock/tasks/${MILK.id}`, body: { done: false } });
  });

  it('keeps a ticked row on the Open tab, so a mis-click can be undone', async () => {
    const { main } = await renderTasks('/?status=open');
    const box = await within(main).findByRole('checkbox', { name: 'Done: Bake bread' });
    await userEvent.click(box);
    await waitFor(() => expect(box).toBeEnabled());
    expect(box).toBeChecked();
    expect(rowTitles(main)).toEqual(['Bake bread', 'Buy milk']);
  });

  it('when the call fails, the box goes back and an error names the task', async () => {
    const { main, mock } = await renderTasks('/', [MILK, BREAD], (api) => api.notImplemented('updateTask'));
    const box = await within(main).findByRole('checkbox', { name: 'Done: Buy milk' });

    await userEvent.click(box);
    expect(await within(main).findByText('Could not update "Buy milk". Try again.')).toBeInTheDocument();
    expect(box).not.toBeChecked();
    expect(box).toBeEnabled();
    expect(mock.tasks().find((t) => t.id === MILK.id)?.done).toBe(false);
  });

  it('clears the error once a later tick succeeds', async () => {
    let fail = true;
    const mock = createMockApi();
    mock.seed([MILK, BREAD]);
    const fetchSpy = vi.fn<typeof fetch>((input, init) =>
      init?.method === 'PATCH' && fail ? Promise.reject(new TypeError('Failed to fetch')) : mock.fetch(input, init),
    );
    await renderWithRouter('/', { client: createApiClient({ baseUrl: 'http://mock', fetch: fetchSpy }) });
    const main = screen.getByRole('main');

    await userEvent.click(await within(main).findByRole('checkbox', { name: 'Done: Buy milk' }));
    expect(await within(main).findByText('Could not update "Buy milk". Try again.')).toBeInTheDocument();

    fail = false;
    const bread = within(main).getByRole('checkbox', { name: 'Done: Bake bread' });
    await userEvent.click(bread);
    await waitFor(() => expect(within(main).queryByText(/Could not update/)).not.toBeInTheDocument());
    expect(bread).toBeChecked();
  });
});

describe('TasksScreen: adding a task (AC3)', () => {
  it('sits above the tabs, and adding puts the new task at the top without a reload and clears the form', async () => {
    const { main, mock, fetchSpy } = await renderTasks();
    await findRows(main);
    const title = within(main).getByRole('textbox', { name: 'Title' });
    expect(title.compareDocumentPosition(within(main).getByRole('tablist')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    await userEvent.type(title, 'Water the plants');
    await userEvent.click(within(main).getByRole('button', { name: 'Add task' }));

    await waitFor(() => expect(rowTitles(main)[0]).toBe('Water the plants'));
    expect(rowTitles(main)).toHaveLength(4);
    expect(title).toHaveValue('');
    expect(mock.tasks().map((t) => t.title)).toContain('Water the plants');
    expect(writes(fetchSpy)).toEqual([{ method: 'POST', url: 'http://mock/tasks', body: { title: 'Water the plants' } }]);
    // Without a reload: the list was fetched once, on mount.
    expect(fetchSpy.mock.calls.filter(([, init]) => (init?.method ?? 'GET') === 'GET')).toHaveLength(1);
  });

  it('sends the due date when one is given, shows it on the new row, and clears it', async () => {
    const { main, fetchSpy } = await renderTasks();
    await findRows(main);
    const due = within(main).getByRole('combobox', { name: /Due date/ });

    await userEvent.type(within(main).getByRole('textbox', { name: 'Title' }), 'Renew passport');
    await userEvent.type(due, '2026-12-01');
    await userEvent.tab();
    await userEvent.click(within(main).getByRole('button', { name: 'Add task' }));

    await waitFor(() => expect(rowTitles(main)[0]).toBe('Renew passport'));
    expect(writes(fetchSpy)[0].body).toEqual({ title: 'Renew passport', due: '2026-12-01' });
    expect(within(main).getByText('Due 2026-12-01')).toBeInTheDocument();
    expect(due).toHaveValue('');
  });

  it('adds the first task to an empty list, replacing the empty words', async () => {
    const { main } = await renderTasks('/', []);
    await within(main).findByText('No tasks yet');

    await userEvent.type(within(main).getByRole('textbox', { name: 'Title' }), 'First one{Enter}');

    await waitFor(() => expect(rowTitles(main)).toEqual(['First one']));
    expect(within(main).queryByText('No tasks yet')).not.toBeInTheDocument();
  });

  it('shows a 422 beside the title, keeps what was typed, and creates nothing', async () => {
    const { main, mock } = await renderTasks();
    await findRows(main);
    const title = within(main).getByRole('textbox', { name: 'Title' });

    await userEvent.type(title, 'x'.repeat(201));
    await userEvent.click(within(main).getByRole('button', { name: 'Add task' }));

    expect(await within(main).findByText('String should have at most 200 characters')).toBeInTheDocument();
    expect(title).toHaveAccessibleDescription(expect.stringContaining('String should have at most 200 characters'));
    expect(title).toHaveValue('x'.repeat(201));
    expect(rowTitles(main)).toHaveLength(3);
    expect(mock.tasks()).toHaveLength(3);

    await userEvent.clear(title);
    await userEvent.click(within(main).getByRole('button', { name: 'Add task' }));
    expect(await within(main).findByText('String should have at least 1 character')).toBeInTheDocument();
    expect(within(main).queryByText('String should have at most 200 characters')).not.toBeInTheDocument();
    expect(mock.tasks()).toHaveLength(3);
  });

  it('shows a 422 on the due date beside the due date, not the title', async () => {
    const mock = createMockApi();
    const body = { detail: [{ loc: ['body', 'due'], msg: 'Input should be a valid date', type: 'date_parsing' }] };
    const fetchSpy = vi.fn<typeof fetch>((input, init) =>
      init?.method === 'POST' ? Promise.resolve(Response.json(body, { status: 422 })) : mock.fetch(input, init),
    );
    await renderWithRouter('/', { client: createApiClient({ baseUrl: 'http://mock', fetch: fetchSpy }) });
    const main = screen.getByRole('main');
    await within(main).findByText('No tasks yet');

    await userEvent.type(within(main).getByRole('textbox', { name: 'Title' }), 'Dated');
    await userEvent.click(within(main).getByRole('button', { name: 'Add task' }));

    expect(await within(main).findByText('Input should be a valid date')).toBeInTheDocument();
    expect(within(main).getByRole('combobox', { name: /Due date/ })).toHaveAccessibleDescription(
      expect.stringContaining('Input should be a valid date'),
    );
    expect(within(main).getByRole('textbox', { name: 'Title' })).not.toHaveAccessibleDescription(
      expect.stringContaining('Input should be a valid date'),
    );
  });

  it('on the Done tab, creates the task without listing it there', async () => {
    const { main, mock } = await renderTasks('/?status=done');
    await findRows(main);

    await userEvent.type(within(main).getByRole('textbox', { name: 'Title' }), 'Not done yet');
    await userEvent.click(within(main).getByRole('button', { name: 'Add task' }));

    await waitFor(() => expect(mock.tasks().map((t) => t.title)).toContain('Not done yet'));
    await waitFor(() => expect(within(main).getByRole('textbox', { name: 'Title' })).toHaveValue(''));
    expect(rowTitles(main)).toEqual(['File taxes']);
  });

  it('shows the error under the form when adding fails for another reason', async () => {
    const { main } = await renderTasks('/', [MILK], (mock) => mock.notImplemented('createTask'));
    await findRows(main);

    await userEvent.type(within(main).getByRole('textbox', { name: 'Title' }), 'Anything');
    await userEvent.click(within(main).getByRole('button', { name: 'Add task' }));

    expect(await within(main).findByText('Not built yet on the server')).toBeInTheDocument();
    expect(rowTitles(main)).toEqual(['Buy milk']);
  });
});
