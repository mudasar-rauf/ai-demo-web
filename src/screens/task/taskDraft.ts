// The Task screen's form logic, kept pure so the PATCH body rule is tested on its own.
import type { Task, TaskUpdate } from '../../api/types';

/** The API's limit on a title, counted after trimming (docs/contracts/api.md). */
export const TITLE_MAX = 200;

/** What the form edits. `due` is the date input's value: "YYYY-MM-DD", or "" for no date. */
export type TaskDraft = {
  title: string;
  notes: string;
  due: string;
  done: boolean;
};

export function toDraft(task: Task): TaskDraft {
  return { title: task.title, notes: task.notes, due: task.due ?? '', done: task.done };
}

/**
 * The PATCH body for `draft`: only the fields that differ from `saved`.
 * The title is compared and sent trimmed, as the API stores it; a cleared due date is `null`.
 */
export function changedFields(saved: Task, draft: TaskDraft): TaskUpdate {
  const update: TaskUpdate = {};
  const title = draft.title.trim();
  if (title !== saved.title) update.title = title;
  if (draft.notes !== saved.notes) update.notes = draft.notes;
  const due = draft.due || null;
  if (due !== saved.due) update.due = due;
  if (draft.done !== saved.done) update.done = draft.done;
  return update;
}

/** The message for a title the API would refuse, or undefined when it is valid. */
export function validateTitle(title: string): string | undefined {
  const trimmed = title.trim();
  if (trimmed === '') return 'Enter a title';
  if (trimmed.length > TITLE_MAX) return `The title can be at most ${TITLE_MAX} characters`;
  return undefined;
}
