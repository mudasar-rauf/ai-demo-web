import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, DEFAULT_API_URL, createApiClient, resolveBaseUrl } from './client';
import type { Task } from './types';

const TASK: Task = {
  id: '0b6a2a52-3c55-4f0e-9a0d-1f2a3b4c5d6e',
  title: 'Buy milk',
  notes: '',
  due: '2026-11-23',
  done: false,
  created_at: '2026-11-22T09:30:00.123456Z',
  done_at: null,
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function stubFetch(response: Response) {
  return vi.fn<typeof fetch>().mockResolvedValue(response);
}

function lastRequest(fetchMock: ReturnType<typeof vi.fn<typeof fetch>>) {
  const [url, init] = fetchMock.mock.calls.at(-1)!;
  return { url: String(url), init: init ?? {} };
}

describe('resolveBaseUrl', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('defaults to http://localhost:8000', () => {
    vi.stubEnv('VITE_API_URL', undefined);
    expect(resolveBaseUrl()).toBe('http://localhost:8000');
    expect(DEFAULT_API_URL).toBe('http://localhost:8000');
  });

  it('uses VITE_API_URL when set', () => {
    vi.stubEnv('VITE_API_URL', 'https://api.example.test');
    expect(resolveBaseUrl()).toBe('https://api.example.test');
  });

  it('treats an empty VITE_API_URL as unset', () => {
    vi.stubEnv('VITE_API_URL', '');
    expect(resolveBaseUrl()).toBe(DEFAULT_API_URL);
  });
});

describe('createApiClient', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('uses VITE_API_URL as the base URL when none is given', async () => {
    vi.stubEnv('VITE_API_URL', 'https://api.example.test');
    const fetchMock = stubFetch(jsonResponse({ status: 'ok' }));
    await createApiClient({ fetch: fetchMock }).getHealth();
    expect(lastRequest(fetchMock).url).toBe('https://api.example.test/health');
  });

  it('tolerates a trailing slash on the base URL', async () => {
    const fetchMock = stubFetch(jsonResponse({ status: 'ok' }));
    await createApiClient({ baseUrl: 'http://api.test/', fetch: fetchMock }).getHealth();
    expect(lastRequest(fetchMock).url).toBe('http://api.test/health');
  });

  it('getHealth: GET /health', async () => {
    const fetchMock = stubFetch(jsonResponse({ status: 'ok' }));
    const result = await createApiClient({ baseUrl: 'http://api.test', fetch: fetchMock }).getHealth();
    expect(result).toEqual({ status: 'ok' });
    const { url, init } = lastRequest(fetchMock);
    expect(url).toBe('http://api.test/health');
    expect(init.method).toBe('GET');
  });

  it('listTasks: GET /tasks without a query when no status is given', async () => {
    const fetchMock = stubFetch(jsonResponse([TASK]));
    const result = await createApiClient({ baseUrl: 'http://api.test', fetch: fetchMock }).listTasks();
    expect(result).toEqual([TASK]);
    expect(lastRequest(fetchMock).url).toBe('http://api.test/tasks');
    expect(lastRequest(fetchMock).init.method).toBe('GET');
  });

  it('listTasks: GET /tasks?status= with the status', async () => {
    const fetchMock = stubFetch(jsonResponse([]));
    await createApiClient({ baseUrl: 'http://api.test', fetch: fetchMock }).listTasks('open');
    expect(lastRequest(fetchMock).url).toBe('http://api.test/tasks?status=open');
  });

  it('createTask: POST /tasks with a JSON body', async () => {
    const fetchMock = stubFetch(jsonResponse(TASK, 201));
    const result = await createApiClient({ baseUrl: 'http://api.test', fetch: fetchMock }).createTask({
      title: '  Buy milk  ',
      due: '2026-11-23',
    });
    expect(result).toEqual(TASK);
    const { url, init } = lastRequest(fetchMock);
    expect(url).toBe('http://api.test/tasks');
    expect(init.method).toBe('POST');
    expect(new Headers(init.headers).get('Content-Type')).toBe('application/json');
    expect(JSON.parse(String(init.body))).toEqual({ title: '  Buy milk  ', due: '2026-11-23' });
  });

  it('getSummary: GET /tasks/summary', async () => {
    const fetchMock = stubFetch(jsonResponse({ total: 2, open: 1, done: 1 }));
    const result = await createApiClient({ baseUrl: 'http://api.test', fetch: fetchMock }).getSummary();
    expect(result).toEqual({ total: 2, open: 1, done: 1 });
    expect(lastRequest(fetchMock).url).toBe('http://api.test/tasks/summary');
    expect(lastRequest(fetchMock).init.method).toBe('GET');
  });

  it('getTask: GET /tasks/{id}, with the id encoded', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockImplementation(async () => jsonResponse(TASK));
    const client = createApiClient({ baseUrl: 'http://api.test', fetch: fetchMock });
    expect(await client.getTask(TASK.id)).toEqual(TASK);
    expect(lastRequest(fetchMock).url).toBe(`http://api.test/tasks/${TASK.id}`);
    await client.getTask('a/b?c');
    expect(lastRequest(fetchMock).url).toBe('http://api.test/tasks/a%2Fb%3Fc');
  });

  it('updateTask: PATCH /tasks/{id} with a JSON body', async () => {
    const fetchMock = stubFetch(jsonResponse({ ...TASK, done: true }));
    const result = await createApiClient({ baseUrl: 'http://api.test', fetch: fetchMock }).updateTask(TASK.id, {
      done: true,
      due: null,
    });
    expect(result.done).toBe(true);
    const { url, init } = lastRequest(fetchMock);
    expect(url).toBe(`http://api.test/tasks/${TASK.id}`);
    expect(init.method).toBe('PATCH');
    expect(new Headers(init.headers).get('Content-Type')).toBe('application/json');
    expect(JSON.parse(String(init.body))).toEqual({ done: true, due: null });
  });

  it('deleteTask: DELETE /tasks/{id}, 204 resolves to undefined without reading a body', async () => {
    const response = new Response(null, { status: 204 });
    const json = vi.spyOn(response, 'json');
    const fetchMock = stubFetch(response);
    const result = await createApiClient({ baseUrl: 'http://api.test', fetch: fetchMock }).deleteTask(TASK.id);
    expect(result).toBeUndefined();
    expect(json).not.toHaveBeenCalled();
    expect(lastRequest(fetchMock).url).toBe(`http://api.test/tasks/${TASK.id}`);
    expect(lastRequest(fetchMock).init.method).toBe('DELETE');
  });

  it.each([
    [404, { detail: 'Task not found' }],
    [422, { detail: [{ loc: ['path', 'id'], msg: 'Input should be a valid UUID', type: 'uuid_parsing' }] }],
    [501, { detail: 'Not implemented' }],
    [500, { detail: 'Internal Server Error' }],
  ])('a %i answer throws an ApiError with the status and the parsed body', async (status, body) => {
    const fetchMock = stubFetch(jsonResponse(body, status));
    const error = await createApiClient({ baseUrl: 'http://api.test', fetch: fetchMock })
      .getTask(TASK.id)
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status, body });
  });

  it('a non-JSON error body gives an ApiError with an undefined body', async () => {
    const fetchMock = stubFetch(new Response('Bad gateway', { status: 502 }));
    const error = await createApiClient({ baseUrl: 'http://api.test', fetch: fetchMock })
      .getHealth()
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 502, body: undefined });
  });

  it('a network failure rejects with the fetch error, not an ApiError', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockRejectedValue(new TypeError('Failed to fetch'));
    const error = await createApiClient({ baseUrl: 'http://api.test', fetch: fetchMock })
      .getHealth()
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(TypeError);
  });
});
