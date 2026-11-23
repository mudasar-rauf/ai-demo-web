import type { Resource } from '../../api/useApiResource';
import { useApiResource } from '../../api/useApiResource';
import type { Task } from '../../api/types';

/** The Task screen's data: the task, loaded with GET /tasks/{id}. */
export function useTaskData(id: string): Resource<Task> {
  return useApiResource((client) => client.getTask(id), [id]);
}
