import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApiClient } from '../../api/client';
import { createMockApi, type MockApi } from '../../api/mock';
import type { Task } from '../../api/types';
import { renderWithRouter } from '../../test/renderWithRouter';

const ID = '0b6a2a52-3c55-4f0e-9a0d-1f2a3b4c5d6e';
const PATH = `/tasks/${ID}`;

const task: Task = {
  id: ID,
  title: 'Buy milk',
  notes: 'Semi-skimmed',
  due: '2026-12-01',
  done: false,
  created_at: '2026-11-22T09:30:00.123456Z',
  done_at: null,
};

type Sent = { method: string; url: string; body: unknown };

/**
 * Renders the screen over its own mock, behind a fetch that records each request
 * and can hold the PATCH's answer until `release()`.
 */
async function renderTask(options: { seed?: Task[]; holdPatch?: boolean } = {}) {
  const mock: MockApi = createMockApi();
  mock.seed(options.seed ?? [task]);
  const sent: Sent[] = [];
  let release = () => {};
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  const fetch: typeof globalThis.fetch = async (input, init) => {
    const method = init?.method ?? 'GET';
    sent.push({ method, url: String(input), body: init?.body ? JSON.parse(String(init.body)) : undefined });
    if (method === 'PATCH' && options.holdPatch) await held;
    return mock.fetch(input, init);
  };
  const client = createApiClient({ baseUrl: 'http://mock', fetch });
  const result = await renderWithRouter(PATH, { client });
  await screen.findByRole('textbox', { name: 'Title' });
  const patches = () => sent.filter((request) => request.method === 'PATCH');
  const deletes = () => sent.filter((request) => request.method === 'DELETE');
  return { ...result, mock, sent, patches, deletes, release, user: userEvent.setup() };
}

const titleField = () => screen.getByRole('textbox', { name: 'Title' }) as HTMLInputElement;
const notesField = () => screen.getByRole('textbox', { name: 'Notes' }) as HTMLTextAreaElement;
const dueField = () => screen.getByRole('combobox', { name: 'Due date' }) as HTMLInputElement;
const doneField = () => screen.getByRole('checkbox', { name: 'Done' }) as HTMLInputElement;
const saveButton = () => screen.getByRole('button', { name: 'Save' });
const deleteButton = () => screen.getByRole('button', { name: 'Delete' });

/** Astryx disables a control with aria-disabled, so it stays focusable; native controls use disabled. */
const isDisabled = (element: HTMLElement) =>
  element.hasAttribute('disabled') || element.getAttribute('aria-disabled') === 'true';

/** A field's message shows under the field and again in the live region that announces it. */
const findMessage = async (text: string) => (await screen.findAllByText(text))[0];

// jsdom has no <dialog> modal API; Astryx's AlertDialog calls it.
const dialogProto = HTMLDialogElement.prototype;
const { showModal, close } = dialogProto;
beforeAll(() => {
  dialogProto.showModal = function (this: HTMLDialogElement) {
    this.open = true;
  };
  dialogProto.close = function (this: HTMLDialogElement) {
    this.open = false;
    this.dispatchEvent(new Event('close'));
  };
});
afterAll(() => {
  dialogProto.showModal = showModal;
  dialogProto.close = close;
});

describe('TaskScreen: loading the task (AC1, AC6)', () => {
  it('loads the task with GET /tasks/{id} and shows its fields to edit', async () => {
    const { sent } = await renderTask();

    expect(sent[0]).toMatchObject({ method: 'GET', url: `http://mock/tasks/${ID}` });
    expect(titleField().value).toBe('Buy milk');
    expect(notesField().value).toBe('Semi-skimmed');
    expect(dueField().value).toBe('December 1, 2026');
    expect(doneField().checked).toBe(false);
    const nav = screen.getByRole('navigation', { name: 'Main navigation' });
    expect(within(nav).getByRole('link', { name: 'Tasks' })).toHaveAttribute('href', '/');
  });

  it('shows the shared loading state while the task loads', async () => {
    const mock = createMockApi();
    mock.seed([task]);
    let answer = () => {};
    const gate = new Promise<void>((resolve) => {
      answer = resolve;
    });
    const fetch: typeof globalThis.fetch = async (input, init) => {
      await gate;
      return mock.fetch(input, init);
    };
    await renderWithRouter(PATH, { client: createApiClient({ baseUrl: 'http://mock', fetch }) });

    expect(screen.getByLabelText('Loading')).toBeInTheDocument();
    await act(async () => answer());
    expect(await screen.findByRole('textbox', { name: 'Title' })).toHaveValue('Buy milk');
  });

  it.each([
    ['an unknown id', '/tasks/7c9e6679-7425-40de-944b-e07fc1f90ae7'],
    ['an id that is not a UUID', '/tasks/abc'],
  ])('shows "Task not found" with a link back to Tasks for %s', async (_case, path) => {
    await renderWithRouter(path);

    const main = screen.getByRole('main');
    expect(await within(main).findByText('Task not found')).toBeInTheDocument();
    expect(within(main).getByRole('link', { name: 'Back to Tasks' })).toHaveAttribute('href', '/');
    expect(within(main).queryByRole('textbox', { name: 'Title' })).not.toBeInTheDocument();
  });

  it('shows "Not built yet on the server" when GET /tasks/{id} answers 501', async () => {
    const mock = createMockApi();
    mock.notImplemented('getTask');
    await renderWithRouter(PATH, { client: createApiClient({ baseUrl: 'http://mock', fetch: mock.fetch }) });

    expect(await screen.findByText('Not built yet on the server')).toBeInTheDocument();
  });

  it('shows "Could not reach the API" with Retry, which loads again', async () => {
    const mock = createMockApi();
    mock.seed([task]);
    let fail = true;
    const fetch: typeof globalThis.fetch = async (input, init) => {
      if (fail) throw new TypeError('Failed to fetch');
      return mock.fetch(input, init);
    };
    await renderWithRouter(PATH, { client: createApiClient({ baseUrl: 'http://mock', fetch }) });
    expect(await screen.findByText('Could not reach the API')).toBeInTheDocument();

    fail = false;
    await userEvent.setup().click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByRole('textbox', { name: 'Title' })).toHaveValue('Buy milk');
  });
});

describe('TaskScreen: saving (AC2, AC6)', () => {
  it('disables Save while nothing has changed, and again after an edit is undone', async () => {
    const { user } = await renderTask();
    expect(isDisabled(saveButton())).toBe(true);

    await user.type(notesField(), '!');
    expect(isDisabled(saveButton())).toBe(false);
    await user.type(notesField(), '{Backspace}');
    expect(isDisabled(saveButton())).toBe(true);
  });

  it('sends PATCH /tasks/{id} with only the notes when only the notes changed', async () => {
    const { user, patches } = await renderTask();

    await user.clear(notesField());
    await user.type(notesField(), 'Oat milk');
    await user.click(saveButton());

    await screen.findByText('Saved');
    expect(patches()).toEqual([{ method: 'PATCH', url: `http://mock/tasks/${ID}`, body: { notes: 'Oat milk' } }]);
  });

  it('sends due: null when the due date is cleared', async () => {
    const { user, patches, mock } = await renderTask();

    await user.click(screen.getByRole('button', { name: /clear/i }));
    await user.click(saveButton());

    await screen.findByText('Saved');
    expect(patches().map((request) => request.body)).toEqual([{ due: null }]);
    expect(mock.tasks()[0].due).toBeNull();
    expect(dueField().value).toBe('');
  });

  it('sends a new due date as YYYY-MM-DD', async () => {
    const { user, patches } = await renderTask();

    await user.clear(dueField());
    await user.type(dueField(), '12/24/2026{Enter}');
    await user.click(saveButton());

    await screen.findByText('Saved');
    expect(patches().map((request) => request.body)).toEqual([{ due: '2026-12-24' }]);
  });

  it('shows the saved task and says it was saved; Save is disabled again', async () => {
    const { user, patches, mock } = await renderTask();

    await user.click(doneField());
    await user.type(titleField(), ' today  ');
    await user.click(saveButton());

    expect(await screen.findByText('Saved')).toBeInTheDocument();
    expect(patches().map((request) => request.body)).toEqual([{ title: 'Buy milk today', done: true }]);
    expect(titleField().value).toBe('Buy milk today');
    expect(doneField().checked).toBe(true);
    expect(isDisabled(saveButton())).toBe(true);
    expect(mock.tasks()[0]).toMatchObject({ title: 'Buy milk today', done: true });

    await user.type(notesField(), '!');
    expect(screen.queryByText('Saved')).not.toBeInTheDocument();
  });

  it('disables the fields, Save and Delete while the PATCH is in flight', async () => {
    const { user, release } = await renderTask({ holdPatch: true });

    await user.type(notesField(), '!');
    await user.click(saveButton());

    expect(isDisabled(titleField())).toBe(true);
    expect(isDisabled(notesField())).toBe(true);
    expect(isDisabled(doneField())).toBe(true);
    expect(isDisabled(dueField())).toBe(true);
    expect(isDisabled(saveButton())).toBe(true);
    expect(isDisabled(deleteButton())).toBe(true);

    await act(async () => release());
    expect(await screen.findByText('Saved')).toBeInTheDocument();
    expect(isDisabled(titleField())).toBe(false);
  });

  it('keeps the edits and shows the error when the task was deleted elsewhere', async () => {
    const { user, mock } = await renderTask();
    mock.seed([]);

    await user.clear(notesField());
    await user.type(notesField(), 'Oat milk');
    await user.click(saveButton());

    expect(await screen.findByText('Task not found')).toBeInTheDocument();
    expect(notesField().value).toBe('Oat milk');
    expect(screen.queryByText('Saved')).not.toBeInTheDocument();
  });
});

describe('TaskScreen: title checks and 422s (AC3)', () => {
  it.each([
    ['empty', '{Control>}a{/Control}{Backspace}', 'Enter a title'],
    ['spaces only', '{Control>}a{/Control}{Backspace}   ', 'Enter a title'],
  ])('shows a message for a title that is %s, and sends nothing', async (_case, keys, message) => {
    const { user, patches } = await renderTask();

    await user.click(titleField());
    await user.keyboard(keys);
    await user.click(saveButton());

    expect(await findMessage(message)).toBeInTheDocument();
    expect(patches()).toEqual([]);
  });

  it('shows a message for a title over 200 characters, sends nothing, and clears it on the next edit', async () => {
    const { user, patches } = await renderTask();

    await user.clear(titleField());
    await user.click(titleField());
    await user.paste('x'.repeat(201));
    await user.click(saveButton());

    expect(await findMessage('The title can be at most 200 characters')).toBeInTheDocument();
    expect(titleField()).toHaveAttribute('aria-invalid', 'true');
    expect(titleField()).toHaveAccessibleDescription('The title can be at most 200 characters');
    expect(patches()).toEqual([]);

    await user.type(titleField(), '{Backspace}');
    expect(titleField()).not.toHaveAttribute('aria-invalid');
    expect(titleField()).not.toHaveAccessibleDescription('The title can be at most 200 characters');
    await user.click(saveButton());
    await screen.findByText('Saved');
    expect(patches().map((request) => request.body)).toEqual([{ title: 'x'.repeat(200) }]);
  });

  it("shows a 422's message from the API and keeps the edits", async () => {
    const { user, patches } = await renderTask();
    const notes = 'n'.repeat(2001);

    await user.clear(notesField());
    await user.click(notesField());
    await user.paste(notes);
    await user.click(saveButton());

    expect(await findMessage('String should have at most 2000 characters')).toBeInTheDocument();
    expect(notesField()).toHaveAccessibleDescription('String should have at most 2000 characters');
    expect(patches()).toHaveLength(1);
    expect(notesField().value).toBe(notes);
    expect(screen.queryByText('Saved')).not.toBeInTheDocument();
  });
});

describe('TaskScreen: deleting (AC4)', () => {
  it('asks to confirm, and on no does nothing', async () => {
    const { user, router, mock, deletes } = await renderTask();

    await user.click(deleteButton());
    const dialog = screen.getByRole('alertdialog', { name: 'Delete this task?' });
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(router.state.location.pathname).toBe(PATH);
    expect(mock.tasks()).toHaveLength(1);
    expect(deletes()).toEqual([]);
  });

  it('on yes calls DELETE /tasks/{id} and returns to Tasks', async () => {
    const { user, router, mock, deletes } = await renderTask();

    await user.click(deleteButton());
    const dialog = screen.getByRole('alertdialog', { name: 'Delete this task?' });
    await user.click(within(dialog).getByRole('button', { name: 'Delete task' }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/'));
    expect(deletes()).toEqual([{ method: 'DELETE', url: `http://mock/tasks/${ID}`, body: undefined }]);
    expect(mock.tasks()).toEqual([]);
  });

  it('returns to Tasks when the task was already deleted elsewhere', async () => {
    const { user, router, mock } = await renderTask();
    mock.seed([]);

    await user.click(deleteButton());
    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Delete task' }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/'));
  });

  it('stays on the screen with the edits when DELETE fails', async () => {
    const { user, router, mock } = await renderTask();
    mock.notImplemented('deleteTask');

    await user.type(notesField(), '!');
    await user.click(deleteButton());
    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Delete task' }));

    expect(await screen.findByText('Not built yet on the server')).toBeInTheDocument();
    expect(router.state.location.pathname).toBe(PATH);
    expect(notesField().value).toBe('Semi-skimmed!');
  });
});
