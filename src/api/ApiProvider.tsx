import { createContext, use, type ReactNode } from 'react';
import { api, type ApiClient } from './client';

const ApiClientContext = createContext<ApiClient>(api);

/** Gives the screens below it their API client: `api` by default, a client bound to the mock in tests. */
export function ApiProvider({ client = api, children }: { client?: ApiClient; children: ReactNode }) {
  return <ApiClientContext value={client}>{children}</ApiClientContext>;
}

/** The API client a screen uses. A screen never builds a URL or reads VITE_API_URL itself. */
// The hook belongs with its provider; Fast Refresh reloads this file in full, which is fine.
// eslint-disable-next-line react-refresh/only-export-components
export function useApiClient(): ApiClient {
  return use(ApiClientContext);
}
