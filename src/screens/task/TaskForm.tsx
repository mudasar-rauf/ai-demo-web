import { AlertDialog } from '@astryxdesign/core/AlertDialog';
import { Banner } from '@astryxdesign/core/Banner';
import { Button } from '@astryxdesign/core/Button';
import { CheckboxInput } from '@astryxdesign/core/CheckboxInput';
import { DateInput } from '@astryxdesign/core/DateInput';
import { HStack } from '@astryxdesign/core/HStack';
import { TextArea } from '@astryxdesign/core/TextArea';
import { TextInput } from '@astryxdesign/core/TextInput';
import { VStack } from '@astryxdesign/core/VStack';
import { useNavigate } from '@tanstack/react-router';
import { useState, type ComponentProps } from 'react';
import { useApiClient } from '../../api/ApiProvider';
import { ApiError } from '../../api/client';
import type { Task, ValidationErrorBody } from '../../api/types';
import { ErrorState } from '../../components/ErrorState';
import { changedFields, toDraft, validateTitle, type TaskDraft } from './taskDraft';

type Field = keyof TaskDraft;
type FieldErrors = Partial<Record<Field, string>>;
type DateValue = ComponentProps<typeof DateInput>['value'];

const FIELDS: readonly Field[] = ['title', 'notes', 'due', 'done'];

export type TaskFormProps = {
  /** The task as loaded; the form keeps its own copy of the saved task from then on. */
  task: Task;
};

/** The Task screen's form: the four fields, Save, and Delete with its confirm dialog. */
export function TaskForm({ task }: TaskFormProps) {
  const client = useApiClient();
  const navigate = useNavigate();
  const [saved, setSaved] = useState(task);
  const [draft, setDraft] = useState(() => toDraft(task));
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [error, setError] = useState<unknown>();
  const [busy, setBusy] = useState<'saving' | 'deleting'>();
  const [justSaved, setJustSaved] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);

  const changes = changedFields(saved, draft);
  const hasChanges = Object.keys(changes).length > 0;
  const isBusy = busy !== undefined;

  function edit<K extends Field>(field: K, value: TaskDraft[K]) {
    setDraft((current) => ({ ...current, [field]: value }));
    setFieldErrors(({ [field]: _cleared, ...rest }) => rest);
    setJustSaved(false);
  }

  async function save() {
    const titleError = validateTitle(draft.title);
    if (titleError) {
      setFieldErrors((current) => ({ ...current, title: titleError }));
      return;
    }
    setBusy('saving');
    setError(undefined);
    setJustSaved(false);
    try {
      const updated = await client.updateTask(saved.id, changes);
      setSaved(updated);
      setDraft(toDraft(updated));
      setFieldErrors({});
      setJustSaved(true);
    } catch (e) {
      const { byField, isFullyPlaced } = placeValidationErrors(e);
      setFieldErrors(byField);
      if (!isFullyPlaced) setError(e);
    } finally {
      setBusy(undefined);
    }
  }

  async function remove() {
    setBusy('deleting');
    setError(undefined);
    try {
      await client.deleteTask(saved.id);
    } catch (e) {
      // Already gone: the person wanted it gone, so that is success.
      if (!(e instanceof ApiError && e.status === 404)) {
        setIsConfirming(false);
        setBusy(undefined);
        setError(e);
        return;
      }
    }
    await navigate({ to: '/' });
  }

  return (
    <VStack gap={4}>
      {justSaved && <Banner status="success" title="Saved" />}
      {error !== undefined && <ErrorState error={error} />}
      <TextInput
        label="Title"
        value={draft.title}
        onChange={(value) => edit('title', value)}
        isDisabled={isBusy}
        status={errorStatus(fieldErrors.title)}
      />
      <TextArea
        label="Notes"
        value={draft.notes}
        onChange={(value) => edit('notes', value)}
        isDisabled={isBusy}
        status={errorStatus(fieldErrors.notes)}
      />
      <DateInput
        label="Due date"
        value={(draft.due || undefined) as DateValue}
        onChange={(value) => edit('due', value ?? '')}
        hasClear
        isDisabled={isBusy}
        status={errorStatus(fieldErrors.due)}
      />
      <CheckboxInput
        label="Done"
        value={draft.done}
        onChange={(checked) => edit('done', checked)}
        isDisabled={isBusy}
        status={errorStatus(fieldErrors.done)}
      />
      <HStack gap={2}>
        <Button label="Save" onClick={save} isDisabled={!hasChanges || isBusy} isLoading={busy === 'saving'} />
        <Button label="Delete" variant="destructive" onClick={() => setIsConfirming(true)} isDisabled={isBusy} />
      </HStack>
      <AlertDialog
        isOpen={isConfirming}
        onOpenChange={(isOpen) => {
          if (busy !== 'deleting') setIsConfirming(isOpen);
        }}
        title="Delete this task?"
        description={`"${saved.title}" will be deleted. This cannot be undone.`}
        actionLabel="Delete task"
        isActionLoading={busy === 'deleting'}
        onAction={remove}
      />
    </VStack>
  );
}

function errorStatus(message: string | undefined) {
  return message === undefined ? undefined : ({ type: 'error', message } as const);
}

/**
 * Puts a 422's messages on the fields their `loc` names (["body", "title"] → Title).
 * `isFullyPlaced` is false for any other error, or a 422 with a message no field can show.
 */
function placeValidationErrors(error: unknown): { byField: FieldErrors; isFullyPlaced: boolean } {
  const byField: FieldErrors = {};
  if (!(error instanceof ApiError && error.status === 422)) return { byField, isFullyPlaced: false };
  const detail = (error.body as Partial<ValidationErrorBody> | undefined)?.detail;
  if (!Array.isArray(detail) || detail.length === 0) return { byField, isFullyPlaced: false };
  let isFullyPlaced = true;
  for (const item of detail) {
    const field = FIELDS.find((name) => item?.loc?.[0] === 'body' && item.loc[1] === name);
    if (field && typeof item.msg === 'string') {
      byField[field] = byField[field] ? `${byField[field]}. ${item.msg}` : item.msg;
    } else {
      isFullyPlaced = false;
    }
  }
  return { byField, isFullyPlaced };
}
