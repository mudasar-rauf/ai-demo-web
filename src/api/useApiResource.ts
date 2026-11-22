import { useCallback, useEffect, useState, type DependencyList } from 'react';
import { useApiClient } from './ApiProvider';
import type { ApiClient } from './client';

export type Resource<T> =
  | { status: 'loading'; data?: undefined; error?: undefined; reload(): void }
  | { status: 'error'; data?: undefined; error: unknown; reload(): void }
  | { status: 'ready'; data: T; error?: undefined; reload(): void };

type State<T> = { status: 'error'; error: unknown } | { status: 'ready'; data: T };

/**
 * Loads data for a screen through the API client from ApiProvider: on mount, when `deps`
 * change, and on `reload()` (after a mutation). A response that arrives after unmount, or
 * after `deps` changed or a reload began, is ignored.
 */
export function useApiResource<T>(load: (client: ApiClient) => Promise<T>, deps: DependencyList): Resource<T> {
  const client = useApiClient();
  const [attempt, setAttempt] = useState(0);
  // One token per request: a new one whenever the client, a reload or `deps` start a new request.
  // `load` is a new function on each render; `deps` say when it means something new.
  // (React's pattern for state derived from props: update it during render when its inputs change.)
  const key = [client, attempt, ...deps];
  const [request, setRequest] = useState(() => ({ key }));
  if (!sameKey(request.key, key)) setRequest({ key });
  // The settled result and the request it answers; any other request is still loading.
  const [settled, setSettled] = useState<{ request: object; state: State<T> } | undefined>();

  useEffect(() => {
    let current = true;
    load(client).then(
      (data) => {
        if (current) setSettled({ request, state: { status: 'ready', data } });
      },
      (error: unknown) => {
        if (current) setSettled({ request, state: { status: 'error', error } });
      },
    );
    return () => {
      current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `request` changes exactly when a new load is due
  }, [request]);

  const reload = useCallback(() => setAttempt((n) => n + 1), []);

  const state = settled?.request === request ? settled.state : undefined;
  if (state === undefined) return { status: 'loading', reload };
  if (state.status === 'error') return { status: 'error', error: state.error, reload };
  return { status: 'ready', data: state.data, reload };
}

function sameKey(a: readonly unknown[], b: readonly unknown[]): boolean {
  return a.length === b.length && a.every((value, index) => Object.is(value, b[index]));
}
