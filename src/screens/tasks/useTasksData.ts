import { useCallback, useState } from 'react';
import { useApiClient } from '../../api/ApiProvider';
import { useApiResource } from '../../api/useApiResource';
import type { Task, TaskCreate, TaskStatus } from '../../api/types';

/** A tick that the API refused: the row went back, and the screen says so. */
export type RowError = { id: string; title: string; error: unknown };

type Mutations = {
  /** Loads the list again (Retry). */
  reload(): void;
  /** POST /tasks, then puts the new task at the top when it belongs on this tab. Rejects with the API's error. */
  addTask(input: TaskCreate): Promise<void>;
  /** PATCH /tasks/{id} with `done`: the row changes at once, and goes back if the call fails. */
  setDone(task: Task, done: boolean): void;
  /** The ids of tasks whose tick is still on its way to the API. */
  pending: ReadonlySet<string>;
  /** The last tick that failed, until a later tick succeeds. */
  rowError?: RowError;
};

export type TasksData =
  | ({ status: 'loading'; tasks?: undefined; error?: undefined } & Mutations)
  | ({ status: 'error'; tasks?: undefined; error: unknown } & Mutations)
  | ({ status: 'ready'; tasks: Task[]; error?: undefined } & Mutations);

/** The loaded list (`source`, as the API gave it) and this screen's copy of it, with its mutations applied. */
type LocalList = { source: Task[]; tasks: Task[] };

/**
 * The Tasks screen's data: GET /tasks?status= through useApiResource, and a local copy of the
 * list that adding and ticking change in place, so the list never drops back to "Loading".
 */
export function useTasksData(status: TaskStatus): TasksData {
  const client = useApiClient();
  const resource = useApiResource((api) => api.listTasks(status), [status]);
  const [local, setLocal] = useState<LocalList | undefined>();
  const [pending, setPending] = useState<ReadonlySet<string>>(() => new Set());
  const [rowError, setRowError] = useState<RowError | undefined>();

  // A newly loaded list replaces the local copy (React's pattern for state derived from props).
  const loaded = resource.status === 'ready' ? resource.data : undefined;
  if (loaded !== undefined && local?.source !== loaded) setLocal({ source: loaded, tasks: loaded });
  const tasks = loaded === undefined ? undefined : local?.source === loaded ? local.tasks : loaded;

  /** Changes the local copy, unless a newer list (another tab, a reload) has replaced it meanwhile. */
  const update = useCallback((source: Task[] | undefined, change: (tasks: Task[]) => Task[]) => {
    setLocal((current) =>
      current !== undefined && current.source === source ? { ...current, tasks: change(current.tasks) } : current,
    );
  }, []);

  const addTask = useCallback(
    async (input: TaskCreate) => {
      const created = await client.createTask(input);
      // A new task is never done, so it does not belong on the Done tab.
      if (status !== 'done') update(loaded, (list) => [created, ...list]);
    },
    [client, status, loaded, update],
  );

  const setDone = useCallback(
    (task: Task, done: boolean) => {
      const replace = (next: Task) => (list: Task[]) => list.map((item) => (item.id === next.id ? next : item));
      update(loaded, replace({ ...task, done }));
      setPending((ids) => new Set(ids).add(task.id));
      client.updateTask(task.id, { done }).then(
        (saved) => {
          update(loaded, replace(saved));
          setRowError(undefined);
        },
        (error: unknown) => {
          update(loaded, replace(task));
          setRowError({ id: task.id, title: task.title, error });
        },
      ).finally(() => {
        setPending((ids) => {
          const next = new Set(ids);
          next.delete(task.id);
          return next;
        });
      });
    },
    [client, loaded, update],
  );

  const mutations: Mutations = { reload: resource.reload, addTask, setDone, pending, rowError };
  if (resource.status === 'loading') return { status: 'loading', ...mutations };
  if (resource.status === 'error') return { status: 'error', error: resource.error, ...mutations };
  return { status: 'ready', tasks: tasks!, ...mutations };
}
