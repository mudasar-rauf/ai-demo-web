import { CheckboxInput } from '@astryxdesign/core/CheckboxInput';
import { HStack } from '@astryxdesign/core/HStack';
import { Link } from '@astryxdesign/core/Link';
import { Text } from '@astryxdesign/core/Text';
import { VStack } from '@astryxdesign/core/VStack';
import type { Task } from '../../api/types';

export type TaskRowProps = {
  task: Task;
  /** Ticks or unticks the task. */
  onDoneChange(task: Task, done: boolean): void;
  /** While its tick is on its way to the API, the box cannot be ticked again. */
  isPending?: boolean;
};

/** One task: its done checkbox, its title linking to its Task screen, and its due date when it has one. */
export function TaskRow({ task, onDoneChange, isPending = false }: TaskRowProps) {
  return (
    <HStack gap={2} align="start">
      <CheckboxInput
        label={`Done: ${task.title}`}
        isLabelHidden
        value={task.done}
        isDisabled={isPending}
        onChange={(checked) => onDoneChange(task, checked)}
      />
      <VStack gap={0.5}>
        <Link href={`/tasks/${encodeURIComponent(task.id)}`}>{task.title}</Link>
        {/* As stored (YYYY-MM-DD): parsing it as a Date would shift it a day west of UTC. */}
        {task.due !== null && <Text color="secondary">{`Due ${task.due}`}</Text>}
      </VStack>
    </HStack>
  );
}
