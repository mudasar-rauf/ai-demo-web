import { NotBuiltYet } from '../../components/NotBuiltYet';
import { isTasksEnabled } from '../../flags';

/** The Tasks screen (/). Its issue builds it behind VITE_FF_TASKS. */
export function TasksScreen() {
  if (!isTasksEnabled()) return <NotBuiltYet />;
  // The Tasks screen's issue replaces this with the screen.
  return <NotBuiltYet />;
}
