import { Button } from '@astryxdesign/core/Button';
import type { ISODateString } from '@astryxdesign/core/Calendar';
import { DateInput } from '@astryxdesign/core/DateInput';
import { HStack } from '@astryxdesign/core/HStack';
import { TextInput } from '@astryxdesign/core/TextInput';
import { VStack } from '@astryxdesign/core/VStack';
import { useState } from 'react';
import { ApiError } from '../../api/client';
import type { TaskCreate, ValidationErrorBody } from '../../api/types';
import { ErrorState } from '../../components/ErrorState';

export type AddTaskFormProps = {
  /** Creates the task; rejects with the API's error. */
  onAdd(input: TaskCreate): Promise<void>;
};

/** What went wrong with the last add: each field's 422 messages, or any other error. */
type Failure = { title?: string; due?: string; other?: unknown };

/** The add form: a title, an optional due date, and "Add task". The API validates; its 422s show by their field. */
export function AddTaskForm({ onAdd }: AddTaskFormProps) {
  const [title, setTitle] = useState('');
  const [due, setDue] = useState<ISODateString | undefined>();
  const [isSubmitting, setSubmitting] = useState(false);
  const [failure, setFailure] = useState<Failure>({});

  async function submit() {
    if (isSubmitting) return;
    setSubmitting(true);
    setFailure({});
    try {
      await onAdd(due === undefined ? { title } : { title, due });
      setTitle('');
      setDue(undefined);
    } catch (error) {
      setFailure(describeFailure(error));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <VStack gap={2}>
      <HStack gap={2} align="start" wrap="wrap">
        <TextInput
          label="Title"
          value={title}
          onChange={setTitle}
          onEnter={() => void submit()}
          status={failure.title === undefined ? undefined : { type: 'error', message: failure.title }}
        />
        <DateInput
          label="Due date"
          isOptional
          value={due}
          onChange={setDue}
          status={failure.due === undefined ? undefined : { type: 'error', message: failure.due }}
        />
        <Button label="Add task" isDisabled={isSubmitting} onClick={() => void submit()} />
      </HStack>
      {failure.other !== undefined && <ErrorState error={failure.other} />}
    </VStack>
  );
}

/** Sorts a 422's messages onto the fields named by their `loc`; anything else shows as an ErrorState. */
function describeFailure(error: unknown): Failure {
  if (!(error instanceof ApiError) || error.status !== 422) return { other: error };
  const detail = (error.body as Partial<ValidationErrorBody> | undefined)?.detail;
  if (!Array.isArray(detail)) return { other: error };

  const messagesFor = (field: string) =>
    detail.filter((item) => item.loc?.[0] === 'body' && item.loc?.[1] === field).map((item) => item.msg);
  const title = messagesFor('title');
  const due = messagesFor('due');
  const unplaced = detail.length - title.length - due.length;
  return {
    title: title.length > 0 ? title.join(' ') : undefined,
    due: due.length > 0 ? due.join(' ') : undefined,
    other: unplaced > 0 ? error : undefined,
  };
}
