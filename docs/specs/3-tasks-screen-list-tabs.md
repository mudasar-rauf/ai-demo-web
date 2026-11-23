# Spec: #3 The Tasks screen: the list, its tabs, and adding a task

**Issue:** #3   **Plan:** [docs/plans/3-tasks-screen-list-tabs.md](../plans/3-tasks-screen-list-tabs.md)

## User story

As a person keeping a list of tasks, I want to see my tasks on the Tasks screen, filter them by All, Open and Done, add a task, and tick one done or not done, so that I can keep track of what is left to do without leaving the screen.

## Outcome

On the Tasks screen, a person sees their tasks, filters them with All, Open and Done tabs, adds a task, and ticks one done or not done.

## Acceptance criteria

From the issue, in its words:

- **AC1.** The screen lists the tasks in the order the API gives them, newest first. Each shows its title, its due date when it has one, and a done checkbox.
- **AC2.** All, Open and Done tabs sit above the list. Choosing one asks the API for `status` `all`, `open` or `done`, and the chosen tab is shown as selected.
- **AC3.** An add form at the top takes a title and an optional due date. Adding calls `POST /tasks`; the new task shows at the top without a reload, and the form clears. A 422 shows its message beside the title.
- **AC4.** Ticking a task's checkbox calls `PATCH /tasks/{id}` with `done`, and the row updates. If the call fails, the box goes back and an error says so.
- **AC5.** Loading, an empty list, and an error each have their own words. The empty words differ by tab: "No tasks yet", "No open tasks", "No done tasks".
- **AC6.** A task's title links to its Task screen, `/tasks/$id`.
- **AC7.** Tests in `src/screens/tasks/` cover AC1 to AC6 against the mock, inside the test router. ESLint, `tsc`, Vitest and the build pass in CI.

Derived:

- **AC8 (derived).** The chosen tab is kept in the URL as `?status=open` or `?status=done` (All is `/` with no query), so it survives going to a Task screen and back. Any other value is treated as All.
- **AC9 (derived).** Only files in `src/screens/tasks/` change, and no dependency is added. Every component comes from Astryx.

## Not in scope

The Task and Summary screens, the route files, the client, the mock, the contract, and any dependency. Deleting or editing a task's title, notes or due date. Any feature flag: the screen ships without one, as the issue says, and merging is the release. `src/flags.ts`, `.env.example` and the README's flag table stay as they are (outside this issue's folder).
