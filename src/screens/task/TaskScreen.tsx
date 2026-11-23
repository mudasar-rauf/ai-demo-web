import { ApiError } from '../../api/client';
import { ErrorState } from '../../components/ErrorState';
import { LoadingState } from '../../components/LoadingState';
import { TaskForm } from './TaskForm';
import { useTaskData } from './useTaskData';

export type TaskScreenProps = {
  /** The task's id, from the path /tasks/$id. */
  id: string;
};

/** To a person, an id that is not a UUID (a 422 on the load) is a task that does not exist. */
const TASK_NOT_FOUND = new ApiError(404, { detail: 'Task not found' });

/** The Task screen (/tasks/$id): edit a task's fields, save them, or delete the task. */
export function TaskScreen({ id }: TaskScreenProps) {
  const task = useTaskData(id);

  if (task.status === 'loading') return <LoadingState />;
  if (task.status === 'error') {
    if (task.error instanceof ApiError && task.error.status === 422) return <ErrorState error={TASK_NOT_FOUND} />;
    return <ErrorState error={task.error} onRetry={task.reload} />;
  }
  // A new task gets a fresh form, with no draft carried over.
  return <TaskForm key={task.data.id} task={task.data} />;
}
