import {
  Outlet,
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  type AnyRouter,
} from '@tanstack/react-router';
import { act, render, type RenderResult } from '@testing-library/react';
import { ApiProvider } from '../api/ApiProvider';
import { createApiClient, type ApiClient } from '../api/client';
import { createMockApi, type MockApi } from '../api/mock';
import { AppLayout } from '../components/AppLayout';
import { SummaryScreen } from '../screens/summary/SummaryScreen';
import { TaskScreen } from '../screens/task/TaskScreen';
import { TasksScreen } from '../screens/tasks/TasksScreen';

export type RenderWithRouterOptions = {
  /** The API client the screens get. Default: a client bound to a fresh createMockApi(), returned as `mock`. */
  client?: ApiClient;
};

export type RenderWithRouterResult = RenderResult & {
  router: AnyRouter;
  /** The mock behind the default client; undefined when a client was passed. */
  mock?: MockApi;
};

/**
 * Renders the app at `path` in a test router: the same layout, navigation and screen
 * components as the real routes, over a memory history, with no document shell.
 * src/routes/routeTree.test.ts checks the real tree has the same paths.
 */
export async function renderWithRouter(
  path: string,
  options: RenderWithRouterOptions = {},
): Promise<RenderWithRouterResult> {
  const mock = options.client ? undefined : createMockApi();
  const client = options.client ?? createApiClient({ baseUrl: 'http://mock', fetch: mock!.fetch });

  const rootRoute = createRootRoute({
    component: () => (
      <ApiProvider client={client}>
        <AppLayout>
          <Outlet />
        </AppLayout>
      </ApiProvider>
    ),
  });
  const tasksRoute = createRoute({ getParentRoute: () => rootRoute, path: '/', component: TasksScreen });
  const taskRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/tasks/$id',
    component: function TaskRoute() {
      const { id } = taskRoute.useParams();
      return <TaskScreen id={id} />;
    },
  });
  const summaryRoute = createRoute({ getParentRoute: () => rootRoute, path: '/summary', component: SummaryScreen });

  const router = createRouter({
    routeTree: rootRoute.addChildren([tasksRoute, taskRoute, summaryRoute]),
    history: createMemoryHistory({ initialEntries: [path] }),
  });

  await act(() => router.load());
  const result = render(<RouterProvider router={router} />);
  await act(async () => {});
  return { ...result, router: router as unknown as AnyRouter, mock };
}
