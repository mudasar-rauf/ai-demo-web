// The typed client for the Tasks API: one function per endpoint of docs/contracts/api.md.
// The client does not validate input; the API (and src/api/mock.ts in tests) does.

import type { ErrorBody, Health, Summary, Task, TaskCreate, TaskStatus, TaskUpdate, ValidationErrorBody } from './types';

export const DEFAULT_API_URL = 'http://localhost:8000';

/** A non-2xx answer from the API, with its parsed JSON body (undefined if it was not JSON). */
export class ApiError extends Error {
  readonly status: number;
  readonly body: ErrorBody | ValidationErrorBody | unknown;

  constructor(status: number, body: unknown) {
    super(`The API answered ${status}`);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

export type ApiClient = {
  /** GET /health */
  getHealth(): Promise<Health>;
  /** GET /tasks?status= (no query when status is undefined) */
  listTasks(status?: TaskStatus): Promise<Task[]>;
  /** POST /tasks, 201 */
  createTask(body: TaskCreate): Promise<Task>;
  /** GET /tasks/summary */
  getSummary(): Promise<Summary>;
  /** GET /tasks/{id} */
  getTask(id: string): Promise<Task>;
  /** PATCH /tasks/{id} */
  updateTask(id: string, body: TaskUpdate): Promise<Task>;
  /** DELETE /tasks/{id}, 204 */
  deleteTask(id: string): Promise<void>;
};

export type ApiClientOptions = {
  /** Default: VITE_API_URL, or http://localhost:8000 when it is unset or empty. */
  baseUrl?: string;
  /** Default: globalThis.fetch, looked up on each call. */
  fetch?: typeof fetch;
};

/** The API's base URL: VITE_API_URL, or http://localhost:8000 when it is unset or empty. */
export function resolveBaseUrl(): string {
  return import.meta.env.VITE_API_URL || DEFAULT_API_URL;
}

export function createApiClient(options: ApiClientOptions = {}): ApiClient {
  const baseUrl = (options.baseUrl ?? resolveBaseUrl()).replace(/\/+$/, '');
  const doFetch: typeof fetch = options.fetch ?? ((input, init) => globalThis.fetch(input, init));

  async function send(method: string, path: string, body?: unknown): Promise<Response> {
    const init: RequestInit = { method };
    if (body !== undefined) {
      init.headers = { 'Content-Type': 'application/json' };
      init.body = JSON.stringify(body);
    }
    const response = await doFetch(`${baseUrl}${path}`, init);
    if (!response.ok) throw new ApiError(response.status, await readJson(response));
    return response;
  }

  async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const response = await send(method, path, body);
    return (await response.json()) as T;
  }

  const taskPath = (id: string) => `/tasks/${encodeURIComponent(id)}`;

  return {
    getHealth: () => request<Health>('GET', '/health'),
    listTasks: (status) =>
      request<Task[]>('GET', status === undefined ? '/tasks' : `/tasks?${new URLSearchParams({ status })}`),
    createTask: (body) => request<Task>('POST', '/tasks', body),
    getSummary: () => request<Summary>('GET', '/tasks/summary'),
    getTask: (id) => request<Task>('GET', taskPath(id)),
    updateTask: (id, body) => request<Task>('PATCH', taskPath(id), body),
    deleteTask: async (id) => {
      await send('DELETE', taskPath(id));
    },
  };
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return undefined;
  }
}

/** The app's client, with the default base URL and the global fetch. */
export const api: ApiClient = createApiClient();
