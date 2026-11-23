# Technical Plan: #3 The Tasks screen: the list, its tabs, and adding a task

**Ticket:** #3   **Spec:** [docs/specs/3-tasks-screen-list-tabs.md](../specs/3-tasks-screen-list-tabs.md)   **Status:** Draft (rework after the plan gate)

## Rework after the plan gate

The plan gate rejected the first plan for one change, the architect's M1: no feature flag. Addressed as follows; everything else stands.

- The `isTasksEnabled()` check (and its imports) is dropped from `TasksScreen.tsx`: A1, §4, §5, T1, §8.
- The derived criterion about the flag (old AC8) is removed from the spec; the later derived criteria are renumbered: old AC9 (tab in the URL) is now **AC8**, old AC10 (files, dependencies, Astryx) is now **AC9**.
- The flag-off test is removed and no test stubs `VITE_FF_TASKS`: T1, §7.
- `src/flags.ts` is left as it is (outside this issue's files): A1, §10, §12.

## 1. Summary

Build the Tasks screen at `/` inside `src/screens/tasks/`, with no feature flag (the person's decision at the plan gate). A data hook, `useTasksData(status)`, loads `GET /tasks?status=` through the scaffold's `useApiResource`, keeps the loaded list in local state, and applies the two mutations to it in place: `addTask` prepends the created task, `setDone` ticks a row optimistically and puts it back if the PATCH fails. The screen renders an Astryx add form, an Astryx `TabList` (All, Open, Done) bound to the `?status=` search parameter, and the list or its loading, empty or error state. Tests drive it through `renderWithRouter` against the in-memory mock.

## 2. Requirements

### User story

See the [spec](../specs/3-tasks-screen-list-tabs.md#user-story).

### Acceptance criteria

| ID | Criterion | Source |
|---|---|---|
| AC1 | Tasks listed in the API's order (newest first), each with title, due date when set, done checkbox | ticket |
| AC2 | All, Open, Done tabs above the list; choosing one asks the API for `status` `all`/`open`/`done`; chosen tab shown selected | ticket |
| AC3 | Add form at the top: title and optional due date; `POST /tasks`; new task at the top without a reload; form clears; a 422 shows its message beside the title | ticket |
| AC4 | Ticking a checkbox calls `PATCH /tasks/{id}` with `done`; row updates; on failure the box goes back and an error says so | ticket |
| AC5 | Own words for loading, empty and error; empty words by tab: "No tasks yet", "No open tasks", "No done tasks" | ticket |
| AC6 | Title links to `/tasks/$id` | ticket |
| AC7 | Tests in `src/screens/tasks/` cover AC1–AC6 against the mock in the test router; ESLint, `tsc`, Vitest, build pass in CI | ticket |
| AC8 | Chosen tab kept in the URL as `?status=open\|done`; All is no query; unknown values are All | derived |
| AC9 | Only `src/screens/tasks/` changes; no new dependency; Astryx components only | derived |

### Non-functional requirements

- **Accessibility.** Tabs are a real ARIA `tablist` with `aria-selected` (Astryx `TabList`/`Tab` render this — verified in `node_modules/@astryxdesign/core/dist/TabList/Tab.js`). Each checkbox has an accessible label naming its task (label hidden visually), e.g. `Done: Buy milk`. Form inputs have visible labels "Title" and "Due date".
- **No flicker on mutations.** Adding or ticking does not drop the list back to the loading spinner.

### Out of scope

See the [spec](../specs/3-tasks-screen-list-tabs.md#not-in-scope).

### Assumptions

- **A1. No feature flag (decided at the plan gate).** The issue says "No feature flag: until this issue is merged, the scaffold's 'Not built yet' is the off state, and merging it is the release." The first plan kept the scaffold's `VITE_FF_TASKS` check to satisfy the factory's flag rule; at the plan gate the person rejected that (the architect's M1) and decided the demo issues ship no flag. So `TasksScreen.tsx` drops its `isTasksEnabled()` check and its import and always renders the screen. `src/flags.ts` (with `isTasksEnabled()` and its test), `.env.example` and the README flag table are outside this issue's files and stay as they are; `isTasksEnabled()` stays used by `src/flags.test.ts`, so lint has nothing unused to flag.
- **A2. A new task on the Done tab.** A new task is never done, so on the Done tab it is created but not shown in the list (it does not belong to that filter). On All and Open it shows at the top.
- **A3. Ticking on a filtered tab.** On Open, ticking a task done keeps its row (now ticked) in the list until the tab changes or the screen reloads; likewise unticking on Done. That lets a person undo a mis-click, and matches "the row updates".
- **A4. Due date shown as stored.** The due date shows as `Due 2026-11-23`, the contract's `YYYY-MM-DD`, with no formatting. This avoids time-zone shifts from `new Date("2026-11-23")` and needs no date library.
- **A5. No client-side title validation.** An empty or too-long title is sent and the API's 422 is shown beside the title (that is what AC3 tests). The Add button is disabled only while a request is in flight.
- **A6. "Without a reload"** means without reloading the page or refetching the list: the created task from the `201` body is prepended to the list in state.

## 3. Current state

All read in this repository at `main` (`acd90c9`):

- `src/routes/index.tsx` renders `TasksScreen` at `/`; frozen, not edited.
- `src/screens/tasks/TasksScreen.tsx` returns `<NotBuiltYet />` in both branches of `isTasksEnabled()`; this issue removes the check and the import and renders the screen.
- `src/screens/tasks/TasksScreen.test.tsx` asserts "Not built yet" with `VITE_FF_TASKS` off and on; this issue replaces that test with the screen's tests.
- `src/api/useApiResource.ts`: `useApiResource(load, deps)` returns `{status: 'loading'|'error'|'ready', data, error, reload}`; it reloads when `deps` change and ignores stale responses.
- `src/api/ApiProvider.tsx`: `useApiClient()` gives the client for mutations (`createTask`, `updateTask`).
- `src/api/client.ts`: `listTasks(status?)`, `createTask(body)`, `updateTask(id, body)`; non-2xx throws `ApiError(status, body)`.
- `src/components/LoadingState.tsx` (Astryx `Spinner`, label "Loading") and `src/components/ErrorState.tsx` (501 → "Not built yet on the server", 404, 422 list, else "Could not reach the API" + Retry).
- `src/api/mock.ts`: `seed`, `tasks()`, `notImplemented(...endpoints)` (501 after validation); 422 bodies are FastAPI-shaped with `loc: ['body','title']`.
- `src/test/renderWithRouter.tsx`: renders layout + screens in a memory-history router with a client on a fresh mock; returns `{ router, mock }`.
- README "Building a screen" fixes the conventions this plan follows (hook in the folder, `useSearch({ strict: false })`/`useNavigate()` for the URL, Astryx only). Its advice to turn the screen's flag on with `vi.stubEnv` does not apply here: there is no flag to turn on.

## 4. Proposed design

### Overview

```
TasksScreen (no flag check)
 └─ TasksView
     ├─ status ← useSearch({ strict: false }).status → parseStatus()   (AC8)
     ├─ data   ← useTasksData(status)                                   (AC1, AC3, AC4)
     ├─ AddTaskForm  onAdd={data.addTask}                               (AC3)
     ├─ TabList value={status} onChange → navigate({ to: '/', search }) (AC2)
     └─ loading → <LoadingState/> | error → <ErrorState onRetry=reload/>
        | ready & empty → <EmptyState title=EMPTY_WORDS[status]/>
        | ready → TaskRow × n (CheckboxInput, Link to /tasks/$id, due)   (AC1, AC4, AC6)
```

### Changes by component

| File | Change | New / modified |
|---|---|---|
| `src/screens/tasks/TasksScreen.tsx` | Drop the `isTasksEnabled()` check, its import and `NotBuiltYet`; render the screen (form, tabs, list states) | modified |
| `src/screens/tasks/useTasksData.ts` | The data hook | new |
| `src/screens/tasks/AddTaskForm.tsx` | The add form | new |
| `src/screens/tasks/TaskRow.tsx` | One row: checkbox, title link, due date | new |
| `src/screens/tasks/TasksScreen.test.tsx` | Flag tests removed; covers AC1–AC6, AC8 with no env stubbing | modified |
| `src/screens/tasks/useTasksData.test.tsx` | Hook-level tests if the screen tests leave gaps (optional) | new, optional |

Splitting the form and row into their own files is a recommendation for readability; keeping them in `TasksScreen.tsx` is also acceptable.

### Contracts (inside the folder)

```ts
// useTasksData.ts
export type TasksData =
  | { status: 'loading' | 'error'; tasks?: undefined; error?: unknown; reload(): void; addTask: AddTask; setDone: SetDone; rowError?: RowError }
  | { status: 'ready'; tasks: Task[]; reload(): void; addTask: AddTask; setDone: SetDone; rowError?: RowError };
type AddTask = (input: TaskCreate) => Promise<void>;  // rejects with the ApiError so the form can show 422s
type SetDone = (id: string, done: boolean) => void;    // optimistic; reverts and sets rowError on failure
type RowError = { id: string; title: string; error: unknown };
export function useTasksData(status: TaskStatus): TasksData;
```

- Loading: `useApiResource((api) => api.listTasks(status), [status])`.
- Local list: hold `tasks` in state, replaced whenever the resource produces new `data` (React's "adjust state when a prop changes" pattern, as `useApiResource` already uses: compare the `data` reference during render). Mutations change only this local copy.
- `addTask`: `await client.createTask(input)`; if `status !== 'done'`, prepend the returned task (A2). Rejections propagate to the caller.
- `setDone(id, done)`: set that row's `done` in state immediately; call `client.updateTask(id, { done })`; on success replace the row with the response (it carries `done_at`); on failure restore the row's previous `done` and set `rowError`. A later successful toggle clears `rowError`. Ignore responses arriving after `status` changed (the list was replaced).
- Status from the URL: `parseStatus(search.status)` returns `'open'` or `'done'` for those strings, otherwise `'all'`. Tab change: `navigate({ to: '/', search: next === 'all' ? {} : { status: next } })`. Always pass `status` to `listTasks` (so All sends `?status=all`, as AC2 says).

### Words (AC5)

| State | Rendering | Words |
|---|---|---|
| Loading | `<LoadingState />` | accessible name "Loading" |
| Error loading the list | `<ErrorState error onRetry={reload} />` | its words per status, e.g. "Could not reach the API", "Not built yet on the server" |
| Empty, All | Astryx `EmptyState` | "No tasks yet" |
| Empty, Open | Astryx `EmptyState` | "No open tasks" |
| Empty, Done | Astryx `EmptyState` | "No done tasks" |
| Tick failed | Astryx `Banner status="error"` above the list | `Could not update "<title>". Try again.` |

### Add form (AC3)

- Astryx `TextInput` label "Title", `DateInput` label "Due date" (`isOptional`; value `ISODateString | undefined`, sent as `due` only when set), `Button` label "Add task" (`type="submit"`, disabled while submitting). Wrap in a `<form onSubmit>` so Enter submits.
- On success: clear title and due date.
- On `ApiError` 422: messages whose `loc` is `['body','title']` go to the `TextInput`'s `status={{ type: 'error', message }}`; those with `loc` `['body','due']` go to the `DateInput`'s `status`. Keep the typed values. Any other 422 message, and any non-422 error (network, 501), render `<ErrorState error={error} />` under the form. Clear errors on the next submit.

### Row (AC1, AC4, AC6)

- Astryx `CheckboxInput` `value={task.done}`, `label={`Done: ${task.title}`}`, `isLabelHidden`, `onChange={(checked) => setDone(task.id, checked)}`.
- Title: Astryx `Link` `href={`/tasks/${task.id}`}` with the title as its text (Astryx links navigate through the router, per README and `AppNav`).
- Due: Astryx `Text` `Due {task.due}` when `task.due !== null`; nothing otherwise.
- Render as an Astryx `List`/`ListItem` or a `VStack` of rows; the engineer picks whichever lays out a checkbox plus link cleanly, Astryx only.

### Error handling and edge cases

- Switching tabs while a list is loading: `useApiResource` ignores the stale answer.
- PATCH answering after a tab switch: ignored (the row no longer exists in the new list).
- Double-ticking quickly: each tick is its own request; the last response wins. Acceptable at this scale; noted as a risk.
- 404 on PATCH (task deleted elsewhere): treated like any failure: revert and show the error banner.

## 5. Key decisions

| Decision | Choice | Rationale | Alternatives rejected |
|---|---|---|---|
| Where the tab lives | URL `?status=` (AC8) | README's convention for screen state; survives Task screen and back; shareable | Component state: lost on navigation |
| Updating the list after a mutation | Patch a local copy of the list | AC3 "without a reload"; no spinner flash; AC4 needs optimistic revert anyway | `reload()` after each mutation: list flashes to the spinner, and revert-on-failure would need local state regardless |
| Flag | None: drop the `VITE_FF_TASKS` check from `TasksScreen.tsx`; leave `src/flags.ts` untouched | The issue says no flag, and the person decided so at the plan gate (overriding the factory's flag rule for this issue); merging is the release | Keep the check (first plan): rejected at the gate. Delete `isTasksEnabled()` from `src/flags.ts`: outside this issue's files |
| Due-date display | Raw `YYYY-MM-DD` | No date library allowed; avoids TZ bugs | `Intl.DateTimeFormat` on `new Date(due)`: shifts a day west of UTC |
| Client validation | None; rely on API 422 | Contract says the API validates; AC3 tests the 422 path | Duplicate the 1–200 rule client-side |

No decision needs an ADR.

## 6. Implementation tasks

### T1. Data hook and the list, tabs and states (M)
- Goal: `/` shows the list from the API with All/Open/Done tabs, and the loading, empty and error states.
- Changes: `useTasksData.ts` (loading + local list; `addTask`/`setDone` may be stubs until T2/T3), `TasksScreen.tsx`, `TaskRow.tsx` (checkbox can be read-only until T3).
- Details: §4 Contracts, Words, Row. Remove the `if (!isTasksEnabled()) return <NotBuiltYet />` line and the `isTasksEnabled` and `NotBuiltYet` imports.
- Done when: AC1, AC2, AC5, AC6, AC8 tests pass.
- Tests: in `TasksScreen.test.tsx` (see §7). Delete the existing flag-off/flag-on test; no test stubs `VITE_FF_TASKS`.
- Depends on: none.

### T2. Add form (S)
- Goal: AC3.
- Changes: `AddTaskForm.tsx`, `addTask` in `useTasksData.ts`, mount the form above the tabs.
- Done when: AC3 tests pass.
- Depends on: T1.

### T3. Ticking done (S)
- Goal: AC4.
- Changes: `setDone` and `rowError` in `useTasksData.ts`; wire `TaskRow` checkbox; error `Banner`.
- Done when: AC4 tests pass.
- Depends on: T1. Can run in parallel with T2.

### Sequence

T1 → (T2 ∥ T3). Total: one M and two S, about two days. Each task ends with `npm run lint && npm run typecheck && npm test && npm run build` green (AC7).

## 7. Test strategy

All in `src/screens/tasks/TasksScreen.test.tsx`, through `renderWithRouter(path)` (no env stubbing), `mock.seed([...])` and `@testing-library/user-event`. To see which `status` the API was asked for, build the client in the test: `const mock = createMockApi(); const fetchSpy = vi.fn(mock.fetch);` then `renderWithRouter(path, { client: createApiClient({ baseUrl: 'http://mock', fetch: fetchSpy }) })` and assert on the URLs `fetchSpy` was called with. (`renderWithRouter` already accepts `client`; when one is passed it returns no `mock`, so keep the test's own.)

| AC | Tasks | Test | What it verifies |
|---|---|---|---|
| AC1 | T1 | integration | Seed 3 tasks with different `created_at` (one with `due`, one without); rows appear newest first; titles, `Due 2026-11-23` only on the dated one, a checkbox per row, ticked for done ones |
| AC2 | T1 | integration | Three tabs above the list; All selected at `/` (`aria-selected`); clicking Open requests `/tasks?status=open`, shows only open tasks, Open selected; same for Done; back to All requests `status=all` |
| AC8 | T1 | integration | Rendering `/?status=done` selects Done and requests `status=done`; `/?status=bogus` selects All; clicking Open sets `router.state.location.search.status` to `open` |
| AC3 | T2 | integration | Type title + due, click "Add task": new task first in list, `mock.tasks()` contains it, inputs empty; submit blank title → 422 message shown on the Title field (accessible description/error text), list unchanged, nothing created; on Done tab the created task is not listed (A2) |
| AC4 | T3 | integration | Tick an open task: checkbox checked, `mock.tasks()` shows `done: true`; untick reverses; with `mock.notImplemented('updateTask')`, ticking leaves the box unchecked and shows `Could not update "<title>"` |
| AC5 | T1 | integration | Spinner "Loading" before the list resolves; empty words per tab on an empty mock; `mock.notImplemented('listTasks')` shows "Not built yet on the server"; a rejecting `fetch` shows "Could not reach the API" with Retry |
| AC6 | T1 | integration | Title link `href` is `/tasks/<id>`; clicking it moves the router to `/tasks/<id>` |
| AC7 | all | CI | ESLint, `tsc`, Vitest, build pass |

Regression risk: low. Only `src/screens/tasks/` changes; `src/routes/routeTree.test.ts` and other screens' tests are untouched. The existing flag test is removed deliberately: with no flag there is no off state to test. `src/flags.test.ts` still tests `isTasksEnabled()` and is untouched.

## 8. Rollout and rollback

- **Flag:** none, by the person's decision at the plan gate and the issue's words. Until this pull request is merged, `/` shows the scaffold's "Not built yet"; that is the off state. `VITE_FF_TASKS` is no longer read by the screen (setting it has no effect).
- **Release:** merging this pull request and deploying the build.
- **Rollback:** revert the merge commit and redeploy; `/` shows "Not built yet" again. No migrations, no config or contract changes.
- **Compatibility:** needs the API's `GET/POST /tasks` and `PATCH /tasks/{id}` built; while they answer 501 the screen shows "Not built yet on the server" (list) or the error states (form, ticks).

## 9. Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Astryx `DateInput` is awkward to drive in jsdom tests | Medium | AC3 due-date test slow to write | Type into its text field as a user would; if the picker blocks it, assert the due-date path with one test and the title path separately |
| Astryx `Link` with `href` does not route through TanStack Router in the test router | Low | AC6 click test fails | `AppNav` uses `href` with Astryx and its tests pass; if needed, assert `href` and the router location after click |
| Rapid double toggles race | Low | Row briefly shows the wrong state | Last response wins; disable the checkbox while its request is in flight if it shows up in testing |
| CheckboxInput `onChange` vs controlled `value` reverting | Low | Box does not visibly go back | Fully controlled from hook state; the AC4 failure test asserts `not.toBeChecked()` |

## 10. Technical debt

- Taken on: `isTasksEnabled()` in `src/flags.ts`, `VITE_FF_TASKS` in `.env.example`, `src/vite-env.d.ts` and the README flag table become dead once the screen stops reading them (category: code). Left alone because they are outside this issue's files. Follow-up below.

## 11. Open questions

| # | Question | Who can answer | Blocks | Assumption made |
|---|---|---|---|---|
| Q1 | ~~Keep the `VITE_FF_TASKS` check or drop it?~~ Answered at the plan gate: drop it, no flag. | Product owner | — | Resolved (A1) |
| Q2 | Should a task created on the Done tab switch to All, or just stay hidden? | Product owner | No | Stays hidden (A2) |

## 12. Follow-ups

- Remove the now-unused `isTasksEnabled()` and `VITE_FF_TASKS` (edits `src/flags.ts`, `src/flags.test.ts`, `src/vite-env.d.ts`, `.env.example`, README flag table and its `vi.stubEnv` advice).
- Format due dates for people (e.g. "23 Nov") with a time-zone-safe formatter.
