// The contract's TypeScript types, field for field: docs/contracts/api.md, "Types".
// docs/contracts/api.md, this file and src/api/mock.ts change together.

export type Task = {
  id: string; // UUID
  title: string;
  notes: string;
  due: string | null; // "YYYY-MM-DD"
  done: boolean;
  created_at: string; // "2026-11-22T09:30:00.123456Z"
  done_at: string | null; // same format
};

export type TaskCreate = {
  title: string;
  notes?: string;
  due?: string | null;
};

export type TaskUpdate = {
  title?: string; // null is a 422
  notes?: string; // null is a 422
  due?: string | null; // null clears the date
  done?: boolean; // null is a 422
};

export type TaskStatus = 'all' | 'open' | 'done';

export type Summary = {
  total: number;
  open: number;
  done: number;
};

export type Health = { status: 'ok' };

export type ErrorBody = { detail: string }; // 404, 501

export type ValidationErrorBody = {
  // 422
  detail: { loc: (string | number)[]; msg: string; type: string }[];
};
