import { describe, expect, it } from 'vitest';
import type { Task } from '../../api/types';
import { TITLE_MAX, changedFields, toDraft, validateTitle } from './taskDraft';

const saved: Task = {
  id: '0b6a2a52-3c55-4f0e-9a0d-1f2a3b4c5d6e',
  title: 'Buy milk',
  notes: 'Semi-skimmed',
  due: '2026-12-01',
  done: false,
  created_at: '2026-11-22T09:30:00.123456Z',
  done_at: null,
};

describe('toDraft', () => {
  it('copies the editable fields, with no due date as ""', () => {
    expect(toDraft(saved)).toEqual({ title: 'Buy milk', notes: 'Semi-skimmed', due: '2026-12-01', done: false });
    expect(toDraft({ ...saved, due: null }).due).toBe('');
  });
});

describe('changedFields', () => {
  it('is empty when nothing changed', () => {
    expect(changedFields(saved, toDraft(saved))).toEqual({});
  });

  it.each([
    ['title', { title: 'Buy oat milk' }, { title: 'Buy oat milk' }],
    ['notes', { notes: '' }, { notes: '' }],
    ['due', { due: '2026-12-24' }, { due: '2026-12-24' }],
    ['done', { done: true }, { done: true }],
  ])('holds only %s when only it changed', (_field, edit, expected) => {
    expect(changedFields(saved, { ...toDraft(saved), ...edit })).toEqual(expected);
  });

  it('sends due: null when the due date is cleared', () => {
    expect(changedFields(saved, { ...toDraft(saved), due: '' })).toEqual({ due: null });
  });

  it('sends a due date set on a task that had none', () => {
    const noDue = { ...saved, due: null };
    expect(changedFields(noDue, { ...toDraft(noDue), due: '2027-01-02' })).toEqual({ due: '2027-01-02' });
  });

  it('treats a title changed only by surrounding spaces as unchanged', () => {
    expect(changedFields(saved, { ...toDraft(saved), title: '  Buy milk ' })).toEqual({});
  });

  it('sends the title trimmed', () => {
    expect(changedFields(saved, { ...toDraft(saved), title: '  Buy bread  ' })).toEqual({ title: 'Buy bread' });
  });

  it('sends notes as typed', () => {
    expect(changedFields(saved, { ...toDraft(saved), notes: ' Oat ' })).toEqual({ notes: ' Oat ' });
  });
});

describe('validateTitle', () => {
  it.each(['', '   '])('asks for a title when it is %j', (title) => {
    expect(validateTitle(title)).toBe('Enter a title');
  });

  it(`refuses more than ${TITLE_MAX} characters`, () => {
    expect(validateTitle('x'.repeat(TITLE_MAX + 1))).toBe('The title can be at most 200 characters');
  });

  it(`accepts ${TITLE_MAX} characters, counted after trimming`, () => {
    expect(validateTitle('x'.repeat(TITLE_MAX))).toBeUndefined();
    expect(validateTitle(` ${'x'.repeat(TITLE_MAX)} `)).toBeUndefined();
  });
});
