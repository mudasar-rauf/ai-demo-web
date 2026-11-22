import { createFileRoute } from '@tanstack/react-router';
import { TasksScreen } from '../screens/tasks/TasksScreen';

// Frozen: the Tasks screen's issue changes only src/screens/tasks/.
export const Route = createFileRoute('/')({
  component: TasksScreen,
});
