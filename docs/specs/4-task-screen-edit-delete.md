# Spec: #4 The Task screen: edit, save and delete

**Ticket:** #4   **Plan:** [docs/plans/4-task-screen-edit-delete.md](../plans/4-task-screen-edit-delete.md)

## User story

As a person keeping a task list, on a task's own screen (`/tasks/$id`) I want to change its title,
notes, due date and done, save the change, or delete the task, so that I can keep one task up to
date without leaving its page.

## Acceptance criteria

From the issue, in its words:

| ID | Criterion |
|---|---|
| AC1 | `/tasks/$id` loads the task with `GET /tasks/{id}` and shows its fields to edit: title, notes, due date and done. An unknown id shows "Task not found", with a link back to Tasks. |
| AC2 | Save sends `PATCH /tasks/{id}` with only the fields changed; clearing the due date sends `due: null`. On success the screen shows the saved task and says it was saved. Save is disabled while nothing has changed. |
| AC3 | A title left empty, or longer than 200 characters, shows a message and is not sent. A 422 from the API shows its message. |
| AC4 | Delete asks to confirm. On yes it calls `DELETE /tasks/{id}` and returns to Tasks; on no, nothing happens. |
| AC5 | Tests in `src/screens/task/` cover AC1 to AC4 against the mock, inside the test router. ESLint, `tsc`, Vitest and the build pass in CI. |

Derived (implied by the issue and the codebase's conventions; not in the issue's text):

| ID | Criterion |
|---|---|
| AC6 (derived) | The screen stays behind `VITE_FF_TASK`: while the flag is off, `/tasks/$id` still shows "Not built yet". |
| AC7 (derived) | While the task loads the screen shows the shared loading state; any error other than a 404 or 422 shows the shared error state (501 "Not built yet on the server"; otherwise "Could not reach the API" with Retry). An error on Save or Delete keeps the person's edits on screen. |

## Scope

In: `src/screens/task/` only — the screen component, its data hook, any form helpers and their tests.

Out (per the issue): the Tasks and Summary screens, the route files, the client, the mock, the
contract, and any dependency.
