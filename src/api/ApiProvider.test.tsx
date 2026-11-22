import { renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { ApiProvider, useApiClient } from './ApiProvider';
import { api, createApiClient } from './client';
import { createMockApi } from './mock';

describe('ApiProvider and useApiClient', () => {
  it('give the client passed to the provider', () => {
    const client = createApiClient({ baseUrl: 'http://mock', fetch: createMockApi().fetch });
    const wrapper = ({ children }: { children: ReactNode }) => <ApiProvider client={client}>{children}</ApiProvider>;
    const { result } = renderHook(() => useApiClient(), { wrapper });
    expect(result.current).toBe(client);
  });

  it('give the app client, api, by default', () => {
    const wrapper = ({ children }: { children: ReactNode }) => <ApiProvider>{children}</ApiProvider>;
    const { result } = renderHook(() => useApiClient(), { wrapper });
    expect(result.current).toBe(api);
  });

  it('useApiClient gives api outside any provider', () => {
    const { result } = renderHook(() => useApiClient());
    expect(result.current).toBe(api);
  });
});
