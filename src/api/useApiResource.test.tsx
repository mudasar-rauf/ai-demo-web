import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { ApiProvider } from './ApiProvider';
import { ApiError, createApiClient, type ApiClient } from './client';
import { createMockApi } from './mock';
import type { Task } from './types';
import { useApiResource } from './useApiResource';

const REPORT: Task = {
  id: '6f1c9d3e-8b2a-4c7d-9e0f-a1b2c3d4e5f6',
  title: 'Write the report',
  notes: 'Section 3 first',
  due: null,
  done: false,
  created_at: '2026-11-22T08:00:00.000000Z',
  done_at: null,
};

function setup() {
  const mock = createMockApi();
  const client = createApiClient({ baseUrl: 'http://mock', fetch: mock.fetch });
  const wrapper = ({ children }: { children: ReactNode }) => <ApiProvider client={client}>{children}</ApiProvider>;
  return { mock, client, wrapper };
}

/** A promise the test resolves by hand. */
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => (resolve = r));
  return { promise, resolve };
}

describe('useApiResource', () => {
  it('is loading, then ready with the data', async () => {
    const { mock, wrapper } = setup();
    mock.seed([REPORT]);
    const { result } = renderHook(() => useApiResource((api) => api.listTasks(), []), { wrapper });
    expect(result.current.status).toBe('loading');
    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.data).toEqual([REPORT]);
    expect(result.current.error).toBeUndefined();
  });

  it('is loading, then error with the ApiError', async () => {
    const { wrapper } = setup();
    const { result } = renderHook(() => useApiResource((api) => api.getTask('11111111-2222-4333-8444-555555555555'), []), {
      wrapper,
    });
    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(result.current.error).toBeInstanceOf(ApiError);
    expect((result.current.error as ApiError).status).toBe(404);
    expect(result.current.data).toBeUndefined();
  });

  it('reload() fetches again and sees a change made through the mock', async () => {
    const { mock, wrapper } = setup();
    const { result } = renderHook(() => useApiResource((api) => api.getSummary(), []), { wrapper });
    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.data).toEqual({ total: 0, open: 0, done: 0 });

    mock.seed([REPORT]);
    act(() => result.current.reload());
    await waitFor(() => expect(result.current.data).toEqual({ total: 1, open: 1, done: 0 }));
  });

  it('refetches when deps change, and ignores a late response for the earlier deps', async () => {
    const pending = new Map<string, ReturnType<typeof deferred<string>>>();
    const load = (key: string) => () => {
      const d = deferred<string>();
      pending.set(key, d);
      return d.promise;
    };
    const { wrapper } = setup();
    const { result, rerender } = renderHook(({ key }) => useApiResource(load(key), [key]), {
      wrapper,
      initialProps: { key: 'first' },
    });
    rerender({ key: 'second' });
    expect(result.current.status).toBe('loading');

    await act(async () => pending.get('second')!.resolve('second answer'));
    expect(result.current).toMatchObject({ status: 'ready', data: 'second answer' });

    await act(async () => pending.get('first')!.resolve('first answer'));
    expect(result.current).toMatchObject({ status: 'ready', data: 'second answer' });
  });

  it('sets no state after unmount', async () => {
    const d = deferred<string>();
    const { wrapper } = setup();
    const { result, unmount } = renderHook(() => useApiResource(() => d.promise, []), { wrapper });
    unmount();
    await act(async () => d.resolve('late'));
    expect(result.current.status).toBe('loading');
  });

  it('passes the client from ApiProvider to load', async () => {
    const { client, wrapper } = setup();
    let seen: ApiClient | undefined;
    const { result } = renderHook(
      () =>
        useApiResource(async (api) => {
          seen = api;
          return 1;
        }, []),
      { wrapper },
    );
    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(seen).toBe(client);
  });
});
