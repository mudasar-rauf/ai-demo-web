import { NotBuiltYet } from '../../components/NotBuiltYet';
import { isTaskEnabled } from '../../flags';

export type TaskScreenProps = {
  /** The task's id, from the path /tasks/$id. */
  id: string;
};

/** The Task screen (/tasks/$id). Its issue builds it behind VITE_FF_TASK. */
// The Task screen's issue uses the props; until then they are unused.
export function TaskScreen(_props: TaskScreenProps) {
  if (!isTaskEnabled()) return <NotBuiltYet />;
  // The Task screen's issue replaces this with the screen.
  return <NotBuiltYet />;
}
