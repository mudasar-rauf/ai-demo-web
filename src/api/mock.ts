// An in-memory mock of the Tasks API for tests, answering as docs/contracts/api.md says,
// its errors included. It is a fetch function: pass `mock.fetch` to createApiClient, so
// tests run the real client against it. It never touches the network.
//
// docs/contracts/api.md, src/api/types.ts and this file change together.

import type { Summary, Task, TaskStatus } from './types';

export type MockEndpoint = 'listTasks' | 'createTask' | 'getSummary' | 'getTask' | 'updateTask' | 'deleteTask';

export type MockApi = {
  /** A fetch function answering as the API; pass it to createApiClient. */
  fetch: typeof fetch;
  /** Replace the store with these tasks (in creation order). */
  seed(tasks: Task[]): void;
  /** A snapshot of the store, for assertions. */
  tasks(): Task[];
  /** Empty the store and build every endpoint again. */
  reset(): void;
  /** These endpoints validate their input first (422), then answer 501, as the API's stubs do. */
  notImplemented(...endpoints: MockEndpoint[]): void;
};

export type MockApiOptions = {
  /** The clock for created_at and done_at. Default: new Date(). */
  now?: () => Date;
  /** The id of a new task. Default: crypto.randomUUID(). */
  newId?: () => string;
};

type Loc = (string | number)[];
type ValidationError = { loc: Loc; msg: string; type: string };
type Body = Record<string, unknown>;

const TASK_STATUSES: readonly TaskStatus[] = ['all', 'open', 'done'];
const TITLE_MAX = 200;
const NOTES_MAX = 2000;
const CREATE_FIELDS = ['title', 'notes', 'due'];
const UPDATE_FIELDS = ['title', 'notes', 'due', 'done'];
const NOT_IMPLEMENTED = { detail: 'Not implemented' };
const TASK_NOT_FOUND = { detail: 'Task not found' };

/** A validation step's result: the parsed input, or the 422's errors. */
type Validated<T> = { ok: true; value: T } | { ok: false; errors: ValidationError[] };

export function createMockApi(options: MockApiOptions = {}): MockApi {
  const now = options.now ?? (() => new Date());
  const newId = options.newId ?? (() => crypto.randomUUID());

  // Each task with its creation sequence, which breaks created_at ties.
  let store: { task: Task; seq: number }[] = [];
  let nextSeq = 0;
  let stubbed = new Set<MockEndpoint>();

  const find = (id: string) => store.find((entry) => entry.task.id === id);

  /** Runs an endpoint as the API does: validate (422), then 501 if stubbed, then handle. */
  function endpoint<T>(name: MockEndpoint, validated: Validated<T>, handle: (input: T) => Response): Response {
    if (!validated.ok) return json(422, { detail: validated.errors });
    if (stubbed.has(name)) return json(501, NOT_IMPLEMENTED);
    return handle(validated.value);
  }

  function listTasks(query: URLSearchParams): Response {
    return endpoint('listTasks', validateStatus(query), (status) => {
      const tasks = [...store]
        .sort((a, b) => compare(b.task.created_at, a.task.created_at) || b.seq - a.seq)
        .map((entry) => entry.task)
        .filter((task) => status === 'all' || task.done === (status === 'done'));
      return json(200, tasks);
    });
  }

  function createTask(body: unknown): Response {
    return endpoint('createTask', validateCreate(body), (input) => {
      const task: Task = {
        id: newId(),
        title: input.title,
        notes: input.notes ?? '',
        due: input.due ?? null,
        done: false,
        created_at: formatDateTime(now()),
        done_at: null,
      };
      store.push({ task, seq: nextSeq++ });
      return json(201, task);
    });
  }

  function getSummary(): Response {
    return endpoint('getSummary', { ok: true, value: undefined }, () => {
      const done = store.filter((entry) => entry.task.done).length;
      const summary: Summary = { total: store.length, open: store.length - done, done };
      return json(200, summary);
    });
  }

  function getTask(rawId: string): Response {
    return endpoint('getTask', validateId(rawId), (id) => {
      const entry = find(id);
      return entry ? json(200, entry.task) : json(404, TASK_NOT_FOUND);
    });
  }

  function updateTask(rawId: string, body: unknown): Response {
    return endpoint('updateTask', both(validateId(rawId), validateUpdate(body)), ([id, changes]) => {
      const entry = find(id);
      if (!entry) return json(404, TASK_NOT_FOUND);
      const task = { ...entry.task };
      if (changes.title !== undefined) task.title = changes.title;
      if (changes.notes !== undefined) task.notes = changes.notes;
      if ('due' in changes) task.due = changes.due ?? null;
      if (changes.done !== undefined && changes.done !== task.done) {
        task.done = changes.done;
        task.done_at = changes.done ? formatDateTime(now()) : null;
      }
      entry.task = task;
      return json(200, task);
    });
  }

  function deleteTask(rawId: string): Response {
    return endpoint('deleteTask', validateId(rawId), (id) => {
      if (!find(id)) return json(404, TASK_NOT_FOUND);
      store = store.filter((entry) => entry.task.id !== id);
      return new Response(null, { status: 204 });
    });
  }

  /** The API's routing: /tasks/summary before /tasks/{id}; a known path with another method is a 405. */
  function route(method: string, url: URL, body: unknown): Response {
    const path = url.pathname.replace(/\/+$/, '') || '/';
    const methods = (handlers: Record<string, () => Response>) =>
      handlers[method]?.() ?? json(405, { detail: 'Method Not Allowed' });

    if (path === '/health') return methods({ GET: () => json(200, { status: 'ok' }) });
    if (path === '/tasks') {
      return methods({ GET: () => listTasks(url.searchParams), POST: () => createTask(body) });
    }
    // FastAPI tries /tasks/summary first, and falls through to /tasks/{id} when the method differs.
    if (path === '/tasks/summary' && method === 'GET') return getSummary();
    const match = /^\/tasks\/([^/]+)$/.exec(path);
    if (match) {
      const id = decodeURIComponent(match[1]);
      return methods({
        GET: () => getTask(id),
        PATCH: () => updateTask(id, body),
        DELETE: () => deleteTask(id),
      });
    }
    return json(404, { detail: 'Not Found' });
  }

  const mockFetch: typeof fetch = async (input, init) => {
    const request = input instanceof Request ? input : undefined;
    const url = new URL(request ? request.url : String(input));
    const method = (init?.method ?? request?.method ?? 'GET').toUpperCase();
    const text = init?.body != null ? String(init.body) : request ? await request.text() : '';
    const body = text === '' ? undefined : parseJson(text);
    return route(method, url, body);
  };

  return {
    fetch: mockFetch,
    seed(tasks) {
      store = tasks.map((task) => ({ task: { ...task }, seq: nextSeq++ }));
    },
    tasks() {
      return store.map((entry) => ({ ...entry.task }));
    },
    reset() {
      store = [];
      stubbed = new Set();
    },
    notImplemented(...endpoints) {
      for (const name of endpoints) stubbed.add(name);
    },
  };
}

// ---- Validation, FastAPI-shaped: each error has loc, msg and type. ----

const INVALID_JSON = Symbol('invalid JSON');

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return INVALID_JSON;
  }
}

function validateStatus(query: URLSearchParams): Validated<TaskStatus> {
  const status = query.get('status') ?? 'all';
  if ((TASK_STATUSES as readonly string[]).includes(status)) return { ok: true, value: status as TaskStatus };
  return fail(['query', 'status'], "Input should be 'all', 'open' or 'done'", 'enum');
}

const UUID_PATTERN = /^[0-9a-f]{32}$/;

/** A UUID in any of the forms Pydantic accepts with or without hyphens, normalised to the canonical form. */
function validateId(raw: string): Validated<string> {
  const hex = raw.toLowerCase().replace(/-/g, '');
  if (!UUID_PATTERN.test(hex)) {
    return fail(['path', 'id'], 'Input should be a valid UUID', 'uuid_parsing');
  }
  const id = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  return { ok: true, value: id };
}

type CreateInput = { title: string; notes?: string; due?: string | null };
type UpdateInput = { title?: string; notes?: string; due?: string | null; done?: boolean };

function validateCreate(body: unknown): Validated<CreateInput> {
  const object = validateObject(body);
  if (!object.ok) return object;
  const fields = object.value;
  const errors = extraFields(fields, CREATE_FIELDS);
  const title = 'title' in fields ? checkTitle(fields.title, errors) : missing('title', errors);
  const notes = 'notes' in fields ? checkNotes(fields.notes, errors) : undefined;
  const due = 'due' in fields ? checkDue(fields.due, errors) : undefined;
  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, value: { title: title!, notes, due } };
}

function validateUpdate(body: unknown): Validated<UpdateInput> {
  const object = validateObject(body);
  if (!object.ok) return object;
  const fields = object.value;
  const errors = extraFields(fields, UPDATE_FIELDS);
  const value: UpdateInput = {};
  if ('title' in fields) value.title = checkTitle(fields.title, errors);
  if ('notes' in fields) value.notes = checkNotes(fields.notes, errors);
  if ('due' in fields) value.due = checkDue(fields.due, errors);
  if ('done' in fields) value.done = checkDone(fields.done, errors);
  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, value };
}

function validateObject(body: unknown): Validated<Body> {
  if (body === INVALID_JSON) return fail(['body', 0], 'JSON decode error', 'json_invalid');
  if (body === undefined) return fail(['body'], 'Field required', 'missing');
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return fail(['body'], 'Input should be a valid dictionary or object to extract fields from', 'model_attributes_type');
  }
  return { ok: true, value: body as Body };
}

function extraFields(fields: Body, allowed: string[]): ValidationError[] {
  return Object.keys(fields)
    .filter((key) => !allowed.includes(key))
    .map((key) => ({ loc: ['body', key], msg: 'Extra inputs are not permitted', type: 'extra_forbidden' }));
}

function missing(field: string, errors: ValidationError[]): undefined {
  errors.push({ loc: ['body', field], msg: 'Field required', type: 'missing' });
  return undefined;
}

function checkTitle(value: unknown, errors: ValidationError[]): string | undefined {
  if (typeof value !== 'string') return notAString('title', errors);
  const title = value.trim();
  if (title.length < 1) {
    errors.push({ loc: ['body', 'title'], msg: 'String should have at least 1 character', type: 'string_too_short' });
  } else if (title.length > TITLE_MAX) {
    errors.push({ loc: ['body', 'title'], msg: `String should have at most ${TITLE_MAX} characters`, type: 'string_too_long' });
  }
  return title;
}

function checkNotes(value: unknown, errors: ValidationError[]): string | undefined {
  if (typeof value !== 'string') return notAString('notes', errors);
  if (value.length > NOTES_MAX) {
    errors.push({ loc: ['body', 'notes'], msg: `String should have at most ${NOTES_MAX} characters`, type: 'string_too_long' });
  }
  return value;
}

function checkDue(value: unknown, errors: ValidationError[]): string | null | undefined {
  if (value === null) return null;
  if (typeof value === 'string' && isCalendarDate(value)) return value;
  errors.push({ loc: ['body', 'due'], msg: 'Input should be a valid date', type: 'date_from_datetime_parsing' });
  return undefined;
}

function checkDone(value: unknown, errors: ValidationError[]): boolean | undefined {
  if (typeof value === 'boolean') return value;
  errors.push({ loc: ['body', 'done'], msg: 'Input should be a valid boolean', type: 'bool_type' });
  return undefined;
}

function notAString(field: string, errors: ValidationError[]): undefined {
  errors.push({ loc: ['body', field], msg: 'Input should be a valid string', type: 'string_type' });
  return undefined;
}

/** A real YYYY-MM-DD calendar date: 2026-02-30 is not one. */
function isCalendarDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const [year, month, day] = match.slice(1).map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function fail(loc: Loc, msg: string, type: string): { ok: false; errors: ValidationError[] } {
  return { ok: false, errors: [{ loc, msg, type }] };
}

/** Both validations, with the errors of both when either fails (FastAPI reports path and body together). */
function both<A, B>(a: Validated<A>, b: Validated<B>): Validated<[A, B]> {
  if (a.ok && b.ok) return { ok: true, value: [a.value, b.value] };
  return { ok: false, errors: [...(a.ok ? [] : a.errors), ...(b.ok ? [] : b.errors)] };
}

// ---- Formatting ----

/** The contract's date-time: ISO 8601 UTC with exactly six fractional digits and a Z. */
function formatDateTime(date: Date): string {
  return date.toISOString().replace(/\.(\d{3})Z$/, '.$1000Z');
}

function compare(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
