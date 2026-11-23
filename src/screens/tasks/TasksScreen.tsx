import { Banner } from '@astryxdesign/core/Banner';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { Tab, TabList } from '@astryxdesign/core/TabList';
import { VStack } from '@astryxdesign/core/VStack';
import { useNavigate, useSearch } from '@tanstack/react-router';
import type { TaskStatus } from '../../api/types';
import { ErrorState } from '../../components/ErrorState';
import { LoadingState } from '../../components/LoadingState';
import { TaskRow } from './TaskRow';
import { useTasksData, type TasksData } from './useTasksData';

const TABS: readonly { status: TaskStatus; label: string; empty: string }[] = [
  { status: 'all', label: 'All', empty: 'No tasks yet' },
  { status: 'open', label: 'Open', empty: 'No open tasks' },
  { status: 'done', label: 'Done', empty: 'No done tasks' },
];

const PANEL_ID = 'tasks-panel';

/** The tab the URL names: `?status=open` or `?status=done`; anything else, or nothing, is All. */
function parseStatus(value: unknown): TaskStatus {
  return value === 'open' || value === 'done' ? value : 'all';
}

/** The Tasks screen (/): the add form, the All/Open/Done tabs, and the list. */
export function TasksScreen() {
  const search: Record<string, unknown> = useSearch({ strict: false });
  const status = parseStatus(search.status);
  const navigate = useNavigate();
  const data = useTasksData(status);

  const choose = (next: string) => {
    const tab = parseStatus(next);
    void navigate({ to: '/', search: tab === 'all' ? {} : { status: tab } });
  };

  return (
    <VStack gap={4}>
      <TabList role="tablist" value={status} onChange={choose} hasDivider>
        {TABS.map((tab) => (
          <Tab key={tab.status} value={tab.status} label={tab.label} panelId={PANEL_ID} />
        ))}
      </TabList>
      <VStack gap={3} id={PANEL_ID} role="tabpanel">
        <TaskList status={status} data={data} />
      </VStack>
    </VStack>
  );
}

function TaskList({ status, data }: { status: TaskStatus; data: TasksData }) {
  if (data.status === 'loading') return <LoadingState />;
  if (data.status === 'error') return <ErrorState error={data.error} onRetry={data.reload} />;
  if (data.tasks.length === 0) {
    return <EmptyState title={TABS.find((tab) => tab.status === status)!.empty} />;
  }
  return (
    <>
      {data.rowError && (
        <Banner status="error" title={`Could not update "${data.rowError.title}". Try again.`} />
      )}
      {data.tasks.map((task) => (
        <TaskRow key={task.id} task={task} onDoneChange={data.setDone} isPending={data.pending.has(task.id)} />
      ))}
    </>
  );
}
