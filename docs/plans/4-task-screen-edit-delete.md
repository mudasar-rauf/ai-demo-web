# Technical Plan: #4 The Task screen: edit, save and delete

**Ticket:** #4   **Spec:** [docs/specs/4-task-screen-edit-delete.md](../specs/4-task-screen-edit-delete.md)   **Status:** Draft

## 1. Summary

Build the Task screen at `/tasks/$id` in `src/screens/task/`, replacing the "on" branch of
`TaskScreen`. A hook, `useTaskData(id)`, loads the task through `useApiResource`. A form holds a
draft of the four editable fields, compares it with the loaded task to build a `TaskUpdate` of only
the changed fields, validates the title locally, and sends it with `useApiClient().updateTask`.
Delete opens a confirm dialog and, on yes, calls `deleteTask` and navigates to `/`. Everything stays
behind the existing `VITE_FF_TASK` flag. No file outside `src/screens/task/` changes.

## 2. Requirements

### Acceptance criteria

| ID | Criterion (short) | Source |
|---|---|---|
| AC1 | Load with `GET /tasks/{id}`; edit title, notes, due, done; unknown id → "Task not found" + link to Tasks | ticket |
| AC2 | Save `PATCH`es only changed fields; cleared due → `due: null`; success shows saved task + "saved" message; Save disabled when unchanged | ticket |
| AC3 | Empty or >200-char title → message, not sent; API 422 → its message | ticket |
| AC4 | Delete confirms; yes → `DELETE` and back to Tasks; no → nothing | ticket |
| AC5 | Tests in `src/screens/task/` cover AC1–AC4 against the mock in the test router; lint, tsc, Vitest, build pass | ticket |
| AC6 | Flag off → "Not built yet" | derived |
| AC7 | Shared loading/error states; Save/Delete errors keep edits | derived |

Full wording in the spec.

### Non-functional requirements

- Accessibility: every field has a visible label (Title, Notes, Due date, Done); the confirm dialog
  is a real dialog (focus moves into it, Escape closes it as "no"); the saved message and errors are
  announced (Astryx `Banner`, which ErrorState already uses).
- Double submit: Save and Delete are disabled while their request is in flight.

### Out of scope

Tasks and Summary screens, `src/routes/`, `src/api/*` (client, mock, types), the contract,
dependencies, `src/test/renderWithRouter.tsx`, `src/flags.ts`, README. Removing the flag is a later
step after the screen ships.

### Assumptions

- **A1. Title comparison and trimming.** The API trims the title (`src/api/mock.ts`, `checkTitle`).
  The screen validates the *trimmed* title (empty → "Enter a title"; more than 200 characters →
  "The title can be at most 200 characters") and sends the trimmed value. A title that differs
  from the saved one only by surrounding whitespace counts as unchanged.
- **A2. Notes** are sent as typed (no trimming); the 2000-character limit is left to the API's 422
  (the issue only asks for local title checks).
- **A3. Due date** uses a date input whose value is `"YYYY-MM-DD"` or `""`; `""` maps to `due: null`.
- **A4. A non-UUID id** (`/tasks/abc`) gets a 422 from `GET /tasks/{id}`. The screen treats a 422 on
  the load like a 404 and shows "Task not found" with the link back — to a person it is the same
  unknown task. (ErrorState would otherwise say "The request was invalid".)
- **A5. After Save** the draft is reset from the task the `PATCH` returned (so `done_at`, the trimmed
  title etc. come from the server), Save becomes disabled again, and a success banner "Saved" shows
  until the next edit. No reload of `GET` is needed: the PATCH response is the saved task.
- **A6. Confirm** uses Astryx's dialog component (or `AlertDialog` if Astryx has one), not
  `window.confirm`, so tests can drive it and the screen stays Astryx-only (README "Components").

## 3. Current state (verified)

- `src/routes/tasks.$id.tsx` renders `<TaskScreen id={id} />`; frozen.
- `src/screens/task/TaskScreen.tsx` returns `<NotBuiltYet />` both when `isTaskEnabled()` is false and
  in the "on" branch to replace. `TaskScreen.test.tsx` asserts "Not built yet" for flag off **and on**
  — the "on" case must change.
- `src/api/useApiResource.ts`: `useApiResource(load, deps)` → `{status: 'loading'|'error'|'ready', data, error, reload}`.
- `src/api/ApiProvider.tsx`: `useApiClient()` for mutations. `src/api/client.ts`: `getTask`,
  `updateTask(id, TaskUpdate)`, `deleteTask(id)`; non-2xx throws `ApiError {status, body}`.
- `src/components/ErrorState.tsx`: 404 → detail ("Task not found" from the API/mock) + "Back to Tasks"
  link to `/`; 422 → "The request was invalid" + each `msg`; 501; otherwise "Could not reach the API" + Retry.
  `LoadingState` is a spinner labelled "Loading".
- `src/api/mock.ts`: `GET` unknown id → 404 `{"detail":"Task not found"}`; `PATCH` validates
  title (trimmed, 1–200), notes ≤ 2000, rejects unknown fields and nulls for title/notes/done → 422
  with `loc` and `msg`; `seed(tasks)`, `tasks()`, `notImplemented(...)`.
- `src/test/renderWithRouter.tsx`: renders layout + screens in a memory-history router with a fresh
  mock; returns `{router, mock}`. `router.state.location.pathname` shows navigation.

## 4. Proposed design

### Components and data flow

```
TaskScreen(id) ── flag off ──> NotBuiltYet
     │ flag on
     ▼
useTaskData(id) = useApiResource(api => api.getTask(id), [id])
     │ loading → LoadingState
     │ error 404/422 → ErrorState with a 404 ApiError ("Task not found" + Back to Tasks)
     │ other error → ErrorState(error, reload)
     ▼ ready(task)
TaskForm(task, key=task.id) ── Save ──> client.updateTask(id, changedFields(task, draft)) ─> setSaved(task')
                            └─ Delete → ConfirmDialog ── yes ─> client.deleteTask(id) ─> navigate({to: '/'})
```

### Changes by component

| File | Change | New / modified |
|---|---|---|
| `src/screens/task/TaskScreen.tsx` | Replace the "on" branch: call `useTaskData`, branch on status, render `TaskForm`. Remove the "props unused" comment. | modified |
| `src/screens/task/useTaskData.ts` | `useTaskData(id: string): Resource<Task>` on `useApiResource`. | new |
| `src/screens/task/taskDraft.ts` | Pure helpers: `type TaskDraft = {title: string; notes: string; due: string; done: boolean}`; `toDraft(task)`; `changedFields(task, draft): TaskUpdate`; `validateTitle(title): string \| undefined`. | new |
| `src/screens/task/TaskForm.tsx` | The form: fields, Save, Delete, confirm dialog, saved and error banners. | new |
| `src/screens/task/taskDraft.test.ts` | Unit tests for the helpers. | new |
| `src/screens/task/TaskScreen.test.tsx` | Keep the flag-off case; replace the flag-on case with the screen tests below. | modified |

A separate `TaskForm` file is the engineer's call; the helper module is required so the "only
changed fields" rule is unit-tested.

### Contracts

```ts
// taskDraft.ts
export const TITLE_MAX = 200;
export function toDraft(task: Task): TaskDraft;              // due: task.due ?? ''
export function changedFields(saved: Task, draft: TaskDraft): TaskUpdate;
//  title: included iff draft.title.trim() !== saved.title, sent trimmed
//  notes: included iff draft.notes !== saved.notes
//  due:   included iff (draft.due || null) !== saved.due, sent as draft.due || null
//  done:  included iff draft.done !== saved.done
export function validateTitle(title: string): string | undefined; // message, or undefined when valid
```

Save is enabled iff `Object.keys(changedFields(saved, draft)).length > 0` and no request is in flight.
Clicking Save with an invalid title shows the message next to the Title field (`TextField`'s error
prop) and sends nothing. (Whether Save is also disabled while the title is invalid is the engineer's
call; the test asserts that no PATCH is sent and the message shows.)

### Error handling

| Case | Shows |
|---|---|
| Load 404 or 422 | `ErrorState` with a 404 → "Task not found", "Back to Tasks" link to `/` (A4) |
| Load other error | `ErrorState error={error} onRetry={reload}` |
| Save 422 | Each 422 `msg` inline on its field by `loc` (`['body','title']` → Title, etc.); any without a known field via `<ErrorState error={e} />` above the form. Edits kept. |
| Save 404 (deleted elsewhere) / network / 501 | `<ErrorState error={e} />` above the form; edits kept. |
| Delete error | `<ErrorState error={e} />`; stays on the screen. |

The saved message clears on the next edit; a Save error clears the saved message.

## 5. Key decisions

| Decision | Choice | Rationale | Alternatives rejected |
|---|---|---|---|
| Where diffing lives | Pure `changedFields` in `taskDraft.ts` | AC2 is about the request body; a pure function tests it directly | Diff inside the component — only testable through the mock's request log |
| Saved state | Hold the PATCH response as the new baseline in `TaskForm` state | The response is the saved task (contract); avoids a second GET and a loading flash | `reload()` after save — flashes the spinner and loses the "Saved" message |
| Reset on id change | `key={task.id}` on `TaskForm` | Fresh draft per task without effects | Syncing draft in an effect |
| Non-UUID id | Show "Task not found" | Same meaning to a person (A4) | "The request was invalid" |
| Confirm | Astryx dialog | Astryx-only rule; testable | `window.confirm` |

No ADR: no shared contract, module boundary or dependency changes.

## 6. Implementation tasks

### T1. Draft helpers (S)
- Goal: `taskDraft.ts` with `toDraft`, `changedFields`, `validateTitle`, `TITLE_MAX`.
- Done when: unit tests pass for: no change → `{}`; each field alone; due cleared → `{due: null}`;
  due set from null; title with only surrounding spaces changed → `{}`; title trimmed when sent;
  empty/whitespace title and 201 characters → message; 200 characters → valid. (AC2, AC3)
- Depends on: none.

### T2. Load and show the task (S)
- Goal: `useTaskData` and the "on" branch of `TaskScreen`: loading, errors, and a form pre-filled
  with title, notes, due date and done (read-only Save/Delete wiring may come in T3/T4).
- Done when: screen tests for AC1 (fields show the seeded values; unknown UUID → "Task not found"
  and a "Back to Tasks" link to `/`; non-UUID id → same), AC6 (flag off), AC7 (loading spinner;
  `mock.notImplemented('getTask')` → "Not built yet on the server").
- Depends on: none (parallel with T1).

### T3. Save (M)
- Goal: editing, Save via `updateTask`, saved message, local title validation, 422 display.
- Done when: tests — Save disabled on load and after reverting an edit; edit notes only → mock
  receives PATCH with body exactly `{notes: …}` (assert via a wrapped fetch: pass
  `renderWithRouter(path, {client: createApiClient({baseUrl:'http://mock', fetch: spy})})` where
  `spy` records the request and forwards to a `createMockApi().fetch`); clear due → body `{due: null}`;
  toggle done → screen shows the saved task and "Saved", and `mock.tasks()` reflects it; empty title
  and 201-char title → message, no PATCH; a server 422 (e.g. notes of 2001 characters) → its `msg`
  shown, edits kept. (AC2, AC3, AC7)
- Depends on: T1, T2.

### T4. Delete (S)
- Goal: Delete button, confirm dialog, `deleteTask`, `navigate({ to: '/' })`.
- Done when: tests — Delete opens a dialog; "Cancel"/no → dialog closes, still on `/tasks/$id`,
  `mock.tasks()` still has the task, no DELETE sent; yes → `mock.tasks()` no longer has it and
  `router.state.location.pathname === '/'`. (AC4)
- Depends on: T2.

### Sequence
T1 ∥ T2 → T3 ∥ T4. Total: 3×S + 1×M ≈ 2 days. One PR.

## 7. Test strategy

| AC | Tasks | Test type | Verifies |
|---|---|---|---|
| AC1 | T2 | screen (Vitest + RTL, `renderWithRouter`, mock) | `GET` used, fields pre-filled; unknown id → "Task not found" + link |
| AC2 | T1, T3 | unit + screen | only changed fields in the PATCH body; `due: null`; saved task + "Saved"; Save disabled when unchanged |
| AC3 | T1, T3 | unit + screen | local title messages, nothing sent; API 422 `msg` shown |
| AC4 | T4 | screen | confirm; yes deletes and navigates to `/`; no does nothing |
| AC5 | all | CI | `npm run lint`, `typecheck`, `test`, `build` |
| AC6 | T2 | screen | flag off → "Not built yet" |
| AC7 | T2, T3 | screen | spinner; 501; edits kept on error |

Each test calls `vi.stubEnv('VITE_FF_TASK', 'true')` and `vi.unstubAllEnvs()` after, seeds with
`mock.seed([...])`, and uses `@testing-library/user-event`. Regression risk: `src/routes/routeTree.test.ts`
and the other screens' tests are untouched; run the full suite.

## 8. Rollout and rollback

- **Feature flag:** `VITE_FF_TASK` (build-time env var, `src/flags.ts` `isTaskEnabled()`), off by
  default; already exists, no new flag. With it off, `/tasks/$id` shows "Not built yet" exactly as today.
- Turn on by setting `VITE_FF_TASK=true` in the build environment; roll back by unsetting it and
  rebuilding. No migrations, no config or infrastructure changes.

## 9. Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Astryx component names/props (TextField, TextArea, date input, Checkbox/Switch, Dialog) differ from what this plan assumes; `node_modules` was not available to the planner | Medium | Low | Engineer checks `@astryxdesign/core` exports first; any Astryx equivalent is fine |
| Astryx date input does not give `YYYY-MM-DD` | Low | Medium | Convert in `toDraft`/`changedFields`; covered by unit tests |
| Dialog portals outside `main` break queries | Low | Low | Query by role `dialog` from `screen` |

## 10. Technical debt

None taken on. `VITE_FF_TASK` is removed in a follow-up once the screen ships (README "Feature flags").

## 11. Open questions

None blocking. A1–A6 record the assumptions made.

## 12. Follow-ups

- Remove `VITE_FF_TASK` after release.
- Link task rows on the Tasks screen to `/tasks/$id` if that issue does not already.
