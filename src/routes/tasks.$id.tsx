import { createFileRoute } from '@tanstack/react-router';
import { TaskScreen } from '../screens/task/TaskScreen';

// Frozen: the Task screen's issue changes only src/screens/task/.
export const Route = createFileRoute('/tasks/$id')({
  component: TaskRoute,
});

function TaskRoute() {
  const { id } = Route.useParams();
  return <TaskScreen id={id} />;
}
