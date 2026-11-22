import { beforeEach, describe, expect, it } from 'vitest';
import { ApiError, createApiClient, type ApiClient } from './client';
import { createMockApi, type MockApi } from './mock';
import type { Task } from './types';

// The contract's two example tasks.
const BUY_MILK: Task = {
  id: '0b6a2a52-3c55-4f0e-9a0d-1f2a3b4c5d6e',
  title: 'Buy milk',
  notes: '',
  due: '2026-11-23',
  done: true,
  created_at: '2026-11-22T09:30:00.123456Z',
  done_at: '2026-11-22T10:05:12.654321Z',
};
const REPORT: Task = {
  id: '6f1c9d3e-8b2a-4c7d-9e0f-a1b2c3d4e5f6',
  title: 'Write the report',
  notes: 'Section 3 first',
  due: null,
  done: false,
  created_at: '2026-11-22T08:00:00.000000Z',
  done_at: null,
};
const UNKNOWN_ID = '11111111-2222-4333-8444-555555555555';
const DATE_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{6}Z$/;

let clock: Date;
let ids: string[];
let mock: MockApi;
let client: ApiClient;

beforeEach(() => {
  clock = new Date('2026-11-22T12:00:00.000Z');
  ids = ['aaaaaaaa-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000002', 'aaaaaaaa-0000-4000-8000-000000000003'];
  mock = createMockApi({ now: () => clock, newId: () => ids.shift()! });
  client = createApiClient({ baseUrl: 'http://mock', fetch: mock.fetch });
});

async function failure(promise: Promise<unknown>): Promise<ApiError> {
  const error = await promise.then(
    () => undefined,
    (e: unknown) => e,
  );
  expect(error).toBeInstanceOf(ApiError);
  return error as ApiError;
}

/** Asserts a FastAPI-shaped 422 whose errors include one at `loc`. */
async function expect422(promise: Promise<unknown>, loc: (string | number)[]) {
  const error = await failure(promise);
  expect(error.status).toBe(422);
  const body = error.body as { detail: { loc: unknown; msg: unknown; type: unknown }[] };
  expect(Array.isArray(body.detail)).toBe(true);
  expect(body.detail.length).toBeGreaterThan(0);
  for (const item of body.detail) {
    expect(typeof item.msg).toBe('string');
    expect(typeof item.type).toBe('string');
  }
  expect(body.detail.map((item) => item.loc)).toContainEqual(loc);
}

async function expectStatus(promise: Promise<unknown>, status: number, body: unknown) {
  const error = await failure(promise);
  expect(error.status).toBe(status);
  expect(error.body).toEqual(body);
}

/** Sends a raw request to the mock, for what the typed client cannot express. */
function raw(method: string, path: string, body?: unknown) {
  return mock.fetch(`http://mock${path}`, {
    method,
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

describe('GET /health', () => {
  it('answers 200 {"status":"ok"}', async () => {
    expect(await client.getHealth()).toEqual({ status: 'ok' });
  });
});

describe('GET /tasks', () => {
  it('answers an empty list from an empty store', async () => {
    expect(await client.listTasks()).toEqual([]);
  });

  it('lists newest first by created_at', async () => {
    mock.seed([REPORT, BUY_MILK]);
    expect(await client.listTasks()).toEqual([BUY_MILK, REPORT]);
  });

  it('breaks created_at ties by creation order, latest first', async () => {
    const first = await client.createTask({ title: 'First' });
    const second = await client.createTask({ title: 'Second' });
    expect(first.created_at).toBe(second.created_at);
    expect((await client.listTasks()).map((t) => t.title)).toEqual(['Second', 'First']);
  });

  it('filters by status', async () => {
    mock.seed([BUY_MILK, REPORT]);
    expect(await client.listTasks('all')).toEqual([BUY_MILK, REPORT]);
    expect(await client.listTasks('open')).toEqual([REPORT]);
    expect(await client.listTasks('done')).toEqual([BUY_MILK]);
  });

  it('answers 422 at ["query","status"] for any other status', async () => {
    await expect422(client.listTasks('later' as never), ['query', 'status']);
  });
});

describe('POST /tasks', () => {
  it('answers 201 with the new task, title trimmed and defaults applied', async () => {
    const response = await raw('POST', '/tasks', { title: '  Buy milk  ', due: '2026-11-23' });
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({
      id: 'aaaaaaaa-0000-4000-8000-000000000001',
      title: 'Buy milk',
      notes: '',
      due: '2026-11-23',
      done: false,
      created_at: '2026-11-22T12:00:00.000000Z',
      done_at: null,
    });
  });

  it('stores the task, with notes kept untrimmed and due defaulting to null', async () => {
    const created = await client.createTask({ title: 'Plan', notes: '  keep  ' });
    expect(created.notes).toBe('  keep  ');
    expect(created.due).toBeNull();
    expect(created.created_at).toMatch(DATE_TIME);
    expect(mock.tasks()).toEqual([created]);
    expect(await client.getTask(created.id)).toEqual(created);
  });

  it('makes a UUID id when no newId is given', async () => {
    const plain = createApiClient({ baseUrl: 'http://mock', fetch: createMockApi().fetch });
    const created = await plain.createTask({ title: 'x' });
    expect(created.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    expect(created.created_at).toMatch(DATE_TIME);
  });

  it('accepts a 200-character title and 2,000-character notes', async () => {
    const created = await client.createTask({ title: 'a'.repeat(200), notes: 'n'.repeat(2000) });
    expect(created.title).toHaveLength(200);
  });

  it.each([
    ['a missing title', {}, ['body', 'title']],
    ['a blank title', { title: '   ' }, ['body', 'title']],
    ['an empty title', { title: '' }, ['body', 'title']],
    ['a 201-character title', { title: 'a'.repeat(201) }, ['body', 'title']],
    ['a null title', { title: null }, ['body', 'title']],
    ['a title that is not a string', { title: 5 }, ['body', 'title']],
    ['2,001-character notes', { title: 'x', notes: 'n'.repeat(2001) }, ['body', 'notes']],
    ['null notes', { title: 'x', notes: null }, ['body', 'notes']],
    ['a due that is not a date', { title: 'x', due: 'tomorrow' }, ['body', 'due']],
    ['a due that is not a calendar date', { title: 'x', due: '2026-02-30' }, ['body', 'due']],
    ['a due with a time', { title: 'x', due: '2026-11-23T10:00:00' }, ['body', 'due']],
    ['an unknown field', { title: 'x', colour: 'red' }, ['body', 'colour']],
    ['the read-only id', { title: 'x', id: UNKNOWN_ID }, ['body', 'id']],
    ['the read-only created_at', { title: 'x', created_at: '2026-11-22T12:00:00.000000Z' }, ['body', 'created_at']],
    ['the read-only done_at', { title: 'x', done_at: null }, ['body', 'done_at']],
    ['done, which a create may not send', { title: 'x', done: true }, ['body', 'done']],
  ])('answers 422 for %s', async (_name, body, loc) => {
    await expect422(client.createTask(body as never), loc);
    expect(mock.tasks()).toEqual([]);
  });

  it('answers 422 at ["body"] for a body that is not a JSON object', async () => {
    await expect422(client.createTask([] as never), ['body']);
    const response = await mock.fetch('http://mock/tasks', { method: 'POST', body: 'not json' });
    expect(response.status).toBe(422);
  });

  it('accepts due: null', async () => {
    expect((await client.createTask({ title: 'x', due: null })).due).toBeNull();
  });
});

describe('GET /tasks/summary', () => {
  it('counts the tasks, total = open + done', async () => {
    expect(await client.getSummary()).toEqual({ total: 0, open: 0, done: 0 });
    mock.seed([BUY_MILK, REPORT, { ...REPORT, id: UNKNOWN_ID }]);
    expect(await client.getSummary()).toEqual({ total: 3, open: 2, done: 1 });
  });

  it('is never read as a task id', async () => {
    const response = await raw('GET', '/tasks/summary');
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ total: 0, open: 0, done: 0 });
  });
});

describe('GET /tasks/{id}', () => {
  it('answers the task', async () => {
    mock.seed([BUY_MILK, REPORT]);
    expect(await client.getTask(REPORT.id)).toEqual(REPORT);
  });

  it('answers 404 {"detail":"Task not found"} for an unknown id', async () => {
    await expectStatus(client.getTask(UNKNOWN_ID), 404, { detail: 'Task not found' });
  });

  it('answers 422 at ["path","id"] for an id that is not a UUID', async () => {
    await expect422(client.getTask('not-a-uuid'), ['path', 'id']);
  });
});

describe('PATCH /tasks/{id}', () => {
  beforeEach(() => {
    mock.seed([BUY_MILK, REPORT]);
  });

  it('changes only the fields sent', async () => {
    const updated = await client.updateTask(REPORT.id, { title: '  Write it  ', notes: 'All of it' });
    expect(updated).toEqual({ ...REPORT, title: 'Write it', notes: 'All of it' });
    expect(await client.getTask(REPORT.id)).toEqual(updated);
  });

  it('accepts an empty body and changes nothing', async () => {
    expect(await client.updateTask(REPORT.id, {})).toEqual(REPORT);
  });

  it('sets due, and due: null clears it', async () => {
    expect((await client.updateTask(REPORT.id, { due: '2026-12-01' })).due).toBe('2026-12-01');
    expect((await client.updateTask(REPORT.id, { due: null })).due).toBeNull();
  });

  it('sets done_at to now when done goes from false to true', async () => {
    clock = new Date('2026-11-22T13:14:15.678Z');
    const updated = await client.updateTask(REPORT.id, { done: true });
    expect(updated.done).toBe(true);
    expect(updated.done_at).toBe('2026-11-22T13:14:15.678000Z');
    expect(updated.done_at).toMatch(DATE_TIME);
  });

  it('clears done_at when done goes from true to false', async () => {
    const updated = await client.updateTask(BUY_MILK.id, { done: false });
    expect(updated.done).toBe(false);
    expect(updated.done_at).toBeNull();
  });

  it('leaves done_at as it is when done is sent with its current value', async () => {
    clock = new Date('2030-01-01T00:00:00.000Z');
    expect((await client.updateTask(BUY_MILK.id, { done: true })).done_at).toBe(BUY_MILK.done_at);
    expect((await client.updateTask(REPORT.id, { done: false })).done_at).toBeNull();
  });

  it.each([
    ['a null title', { title: null }, ['body', 'title']],
    ['a blank title', { title: '  ' }, ['body', 'title']],
    ['a 201-character title', { title: 'a'.repeat(201) }, ['body', 'title']],
    ['null notes', { notes: null }, ['body', 'notes']],
    ['2,001-character notes', { notes: 'n'.repeat(2001) }, ['body', 'notes']],
    ['a null done', { done: null }, ['body', 'done']],
    ['a done that is not a boolean', { done: 'maybe' }, ['body', 'done']],
    ['a due that is not a date', { due: '23/11/2026' }, ['body', 'due']],
    ['an unknown field', { colour: 'red' }, ['body', 'colour']],
    ['the read-only id', { id: UNKNOWN_ID }, ['body', 'id']],
    ['the read-only created_at', { created_at: '2026-11-22T12:00:00.000000Z' }, ['body', 'created_at']],
    ['the read-only done_at', { done_at: null }, ['body', 'done_at']],
  ])('answers 422 for %s and changes nothing', async (_name, body, loc) => {
    await expect422(client.updateTask(REPORT.id, body as never), loc);
    expect(await client.getTask(REPORT.id)).toEqual(REPORT);
  });

  it('answers 404 for an unknown id', async () => {
    await expectStatus(client.updateTask(UNKNOWN_ID, { done: true }), 404, { detail: 'Task not found' });
  });

  it('answers 422 at ["path","id"] for an id that is not a UUID', async () => {
    await expect422(client.updateTask('42', {}), ['path', 'id']);
  });
});

describe('DELETE /tasks/{id}', () => {
  it('answers 204 with no body and removes the task', async () => {
    mock.seed([BUY_MILK, REPORT]);
    const response = await raw('DELETE', `/tasks/${BUY_MILK.id}`);
    expect(response.status).toBe(204);
    expect(await response.text()).toBe('');
    expect(mock.tasks()).toEqual([REPORT]);
    await expectStatus(client.getTask(BUY_MILK.id), 404, { detail: 'Task not found' });
  });

  it('resolves through the client', async () => {
    mock.seed([REPORT]);
    await expect(client.deleteTask(REPORT.id)).resolves.toBeUndefined();
  });

  it('answers 404 for an unknown id', async () => {
    await expectStatus(client.deleteTask(UNKNOWN_ID), 404, { detail: 'Task not found' });
  });

  it('answers 422 at ["path","id"] for an id that is not a UUID', async () => {
    await expect422(client.deleteTask('summary-ish'), ['path', 'id']);
  });
});

describe('unknown routes', () => {
  it.each([['GET', '/nowhere'], ['GET', `/tasks/${REPORT.id}/extra`], ['GET', '/']])(
    '%s %s answers 404 {"detail":"Not Found"}',
    async (method, path) => {
      const response = await raw(method, path);
      expect(response.status).toBe(404);
      expect(await response.json()).toEqual({ detail: 'Not Found' });
    },
  );

  it.each([
    ['PUT', '/tasks'],
    ['POST', `/tasks/${REPORT.id}`],
    ['POST', '/health'],
  ])('%s %s, a known path with another method, answers 405 as FastAPI does', async (method, path) => {
    const response = await raw(method, path);
    expect(response.status).toBe(405);
    expect(await response.json()).toEqual({ detail: 'Method Not Allowed' });
  });

  it('DELETE /tasks/summary is matched by /tasks/{id}, so it answers 422 at ["path","id"]', async () => {
    await expect422(client.deleteTask('summary'), ['path', 'id']);
  });
});

describe('seed, tasks and reset', () => {
  it('seed replaces the store, and tasks() is a snapshot', async () => {
    mock.seed([BUY_MILK]);
    mock.seed([REPORT]);
    const snapshot = mock.tasks();
    snapshot[0].title = 'changed';
    expect(mock.tasks()).toEqual([REPORT]);
  });

  it('reset empties the store and builds every endpoint again', async () => {
    mock.seed([REPORT]);
    mock.notImplemented('listTasks');
    mock.reset();
    expect(await client.listTasks()).toEqual([]);
  });
});

describe('notImplemented', () => {
  const NOT_IMPLEMENTED = { detail: 'Not implemented' };

  beforeEach(() => {
    mock.seed([REPORT]);
    mock.notImplemented('listTasks', 'createTask', 'getSummary', 'getTask', 'updateTask', 'deleteTask');
  });

  it('answers 501 {"detail":"Not implemented"} to valid input on each endpoint', async () => {
    await expectStatus(client.listTasks(), 501, NOT_IMPLEMENTED);
    await expectStatus(client.listTasks('open'), 501, NOT_IMPLEMENTED);
    await expectStatus(client.createTask({ title: 'x' }), 501, NOT_IMPLEMENTED);
    await expectStatus(client.getSummary(), 501, NOT_IMPLEMENTED);
    await expectStatus(client.getTask(REPORT.id), 501, NOT_IMPLEMENTED);
    await expectStatus(client.updateTask(REPORT.id, { done: true }), 501, NOT_IMPLEMENTED);
    await expectStatus(client.deleteTask(REPORT.id), 501, NOT_IMPLEMENTED);
    expect(mock.tasks()).toEqual([REPORT]);
  });

  it('still validates first: 422 for invalid input on each endpoint', async () => {
    await expect422(client.listTasks('later' as never), ['query', 'status']);
    await expect422(client.createTask({ title: '  ' }), ['body', 'title']);
    await expect422(client.getTask('nope'), ['path', 'id']);
    await expect422(client.updateTask('nope', {}), ['path', 'id']);
    await expect422(client.updateTask(REPORT.id, { title: null } as never), ['body', 'title']);
    await expect422(client.deleteTask('nope'), ['path', 'id']);
  });

  it('answers 501, not 404, for an unknown but valid UUID', async () => {
    await expectStatus(client.getTask(UNKNOWN_ID), 501, NOT_IMPLEMENTED);
    await expectStatus(client.updateTask(UNKNOWN_ID, {}), 501, NOT_IMPLEMENTED);
    await expectStatus(client.deleteTask(UNKNOWN_ID), 501, NOT_IMPLEMENTED);
  });

  it('leaves the endpoints not named built', async () => {
    const other = createMockApi();
    other.seed([REPORT]);
    other.notImplemented('getSummary');
    const otherClient = createApiClient({ baseUrl: 'http://mock', fetch: other.fetch });
    expect(await otherClient.listTasks()).toEqual([REPORT]);
    await expectStatus(otherClient.getSummary(), 501, NOT_IMPLEMENTED);
    expect(await otherClient.getHealth()).toEqual({ status: 'ok' });
  });
});
