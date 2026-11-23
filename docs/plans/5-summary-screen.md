# Technical Plan: #5 The Summary screen

**Ticket:** #5   **Spec:** [docs/specs/5-summary-screen.md](../specs/5-summary-screen.md)   **Status:** Draft

## 1. Summary

Build the Summary screen at `/summary`: it loads `GET /tasks/summary` through the existing typed client and shows four figures — total, open, done, and the share done as a whole percentage (0% when there are no tasks). It follows the pattern the scaffold (#1) fixed for every screen: a data hook in the screen's own folder on `useApiResource`, the shared `LoadingState` and `ErrorState`, Astryx components only, behind the existing `VITE_FF_SUMMARY` flag. Every change is inside `src/screens/summary/`. Three small tasks, about one day in total.

## 2. Requirements

### User story

As a person using the Tasks app, I want a Summary screen that tells me how many tasks I have, how many are open and done, and what share is done, so that I can see my progress at a glance.

### Acceptance criteria

| ID | Criterion | Source |
|---|---|---|
| AC1 | `/summary` loads `GET /tasks/summary` and shows the total, open and done counts, and the share done as a whole percentage | ticket |
| AC2 | With no tasks: 0 for each count and the share done as 0%, never a division by zero | ticket |
| AC3 | Loading and an error each have their own words, and an error offers to try again | ticket |
| AC4 | Tests in `src/screens/summary/` cover AC1–AC3 against the mock, inside the test router; ESLint, `tsc`, Vitest and the build pass in CI | ticket |
| AC5 | Behind `VITE_FF_SUMMARY`, off by default; off still shows "Not built yet" | derived (factory rule: every feature behind a flag) |
| AC6 | Share done = `Math.round(done / total * 100)`, shown as `<n>%` | derived (makes "whole percentage" testable) |
| AC7 | A 501 from the endpoint says "Not built yet on the server" (shared rule, no Retry) | derived (the API stubs this endpoint with 501 today, `docs/contracts/api.md` line 16) |

### Non-functional requirements

- **Accessibility.** Each figure has a visible text label next to its value, so a screen reader reads "Total tasks 3", not a bare "3". The page has a heading "Summary".
- **Consistency.** Loading and errors look exactly as on the other screens: the shared components, unchanged.

### Out of scope

The Tasks and Task screens, `src/routes/`, `src/api/` (client, mock, types, `useApiResource`), `src/components/`, the contract, `package.json`. Live refresh of the figures (the screen loads on mount and on Retry only).

### Assumptions

- **A1.** "Whole percentage" means rounded to the nearest integer with `Math.round` (halves up). So 199 of 200 done shows `100%` and 1 of 300 shows `0%`; this is accepted as normal rounding. If the product wants "never 100% until all done", only `shareDone` changes (Q2).
- **A2.** AC3's "an error offers to try again" is met by the shared `ErrorState`: every error that retrying can fix ("Could not reach the API": network errors and non-501 server errors) shows a Retry button that reloads. A 501 shows "Not built yet on the server" without Retry, as on every screen (AC7). `GET /tasks/summary` takes no input, so 404 and 422 cannot happen for it. (Q1)
- **A3.** "Loading … has its own words" is met by the shared `LoadingState`, an Astryx `Spinner` whose accessible name is "Loading" (`src/components/LoadingState.tsx`). The screen adds no second loading text.

## 3. Current state

Verified by reading the code at `acd90c9`:

- `src/routes/summary.tsx` renders `SummaryScreen` and is frozen ("the Summary screen's issue changes only src/screens/summary/").
- `src/screens/summary/SummaryScreen.tsx` returns `<NotBuiltYet />` in both flag states; the "on" branch is the one to replace. Its test, `SummaryScreen.test.tsx`, asserts "Not built yet" with the flag off **and** on.
- `src/flags.ts` has `isSummaryEnabled()` (`VITE_FF_SUMMARY === "true"`).
- `src/api/client.ts` has `getSummary(): Promise<Summary>` → `GET /tasks/summary`; `Summary` is `{ total, open, done }` (`src/api/types.ts`).
- `src/api/useApiResource.ts`: `useApiResource(load, deps)` returns `{ status: "loading" | "error" | "ready", data, error, reload }`, using the client from `ApiProvider`.
- `src/components/LoadingState.tsx` (Spinner, name "Loading") and `src/components/ErrorState.tsx` (501 → "Not built yet on the server", no Retry; 404; 422; anything else → "Could not reach the API" + Retry calling `onRetry`).
- `src/api/mock.ts`: `getSummary` counts the store (`total`, `open = total − done`, `done`); `seed(tasks)`, `notImplemented("getSummary")`.
- `src/test/renderWithRouter.tsx`: renders the layout and the real `SummaryScreen` at a path in a test router; takes an optional `client` (then `mock` is undefined), otherwise binds a fresh mock and returns it.
- `README.md` "Building a screen" fixes the conventions this plan follows.

## 4. Proposed design

### Overview

```
/summary ─▶ SummaryScreen
              ├─ flag off ─▶ <NotBuiltYet/>                       (unchanged)
              └─ flag on  ─▶ useSummaryData() = useApiResource(api => api.getSummary(), [])
                              ├─ loading ─▶ <LoadingState/>
                              ├─ error   ─▶ <ErrorState error onRetry={reload}/>
                              └─ ready   ─▶ <SummaryFigures summary={data}/>
                                             Total tasks · Open · Done · Share done (shareDone(summary) + "%")
```

### Changes by component

| File | Change | New / modified |
|---|---|---|
| `src/screens/summary/shareDone.ts` | `export function shareDone(summary: Summary): number` — `0` when `total <= 0`, else `Math.round((done / total) * 100)` | new |
| `src/screens/summary/shareDone.test.ts` | unit tests (§7) | new |
| `src/screens/summary/useSummaryData.ts` | `export function useSummaryData(): Resource<Summary>` — `useApiResource((api) => api.getSummary(), [])` | new |
| `src/screens/summary/SummaryScreen.tsx` | the "on" branch: heading, loading, error, figures | modified |
| `src/screens/summary/SummaryScreen.test.tsx` | keep the flag-off case; replace the flag-on case with AC1–AC3 tests (§7) | modified |

A small `SummaryFigures` component may live in `SummaryScreen.tsx` or its own file in the folder; the engineer's choice.

### Contracts

```ts
// shareDone.ts
import type { Summary } from '../../api/types';
/** The share of tasks done, as a whole percentage (0–100). 0 when there are no tasks. */
export function shareDone(summary: Summary): number;

// useSummaryData.ts
import type { Resource } from '../../api/useApiResource';
export function useSummaryData(): Resource<Summary>;
```

### What the screen shows (flag on, ready)

- A heading "Summary" (Astryx heading/`Text` with a heading element, level 1 or as the layout's other pages do).
- Four labelled figures, labels exactly: **"Total tasks"**, **"Open"**, **"Done"**, **"Share done"**; values are the counts as integers and `${shareDone(summary)}%`.
- Use Astryx components only (README "Components"). Pick the Astryx component that best shows a label and a value (a stat/metric component if `@astryxdesign/core` has one; otherwise `List`/`ListItem` with `label` and a value, or `Text` pairs in a grid). Each label and its value must be adjacent in the DOM so tests can find a value by its label (for example, label and value inside one list item, or a description list term/definition). Pick the markup so that `within(<the item for "Open">).getByText("2")` works; the tests depend on that, not on the component.

### Error handling and edge cases

- Loading: `<LoadingState />` only (heading may show above it).
- Error: `<ErrorState error={error} onRetry={reload} />`; `reload` from `useApiResource` loads again and the screen goes back to loading, then ready or error.
- `total === 0` → share 0, never `NaN`/`Infinity`. Guard on `total <= 0` so a malformed body cannot divide by zero either.
- The counts are shown as the API sends them; the screen does not recompute `open` from `total − done`.

### Security, performance, observability

None beyond the existing client: one GET on mount, no user input.

## 5. Key decisions

| Decision | Choice | Rationale | Alternatives rejected |
|---|---|---|---|
| Where the percentage is computed | Pure `shareDone()` in the screen folder | Unit-testable without rendering; the zero guard lives in one place | Inline in JSX (harder to test edge cases); in `src/api/` (out of scope, shared files) |
| Rounding | `Math.round` | The usual meaning of "whole percentage"; A1 | `Math.floor` (shows 99% for 199/200 but 0% for 1/300 too); clamping rules (complexity with no stated need) |
| Data access | `useSummaryData` on `useApiResource` | The convention #1 fixed (README "Building a screen"); same loading/error/reload behaviour as the other screens | Calling `useApiClient()` with a hand-rolled effect (duplicates `useApiResource`) |
| Errors and retry | Shared `ErrorState` unchanged | Same messages on every screen; changing it is out of scope; A2 | A screen-specific Retry for 501 (diverges from the other screens) |

No significant decisions; no ADR.

## 6. Implementation tasks

### T1. `shareDone` (S)

- Goal: the share-done rule, tested.
- Changes: `src/screens/summary/shareDone.ts`, `shareDone.test.ts`.
- Done when: the function and contract in §4; tests in §7 pass.
- Depends on: none.

### T2. `useSummaryData` and the screen (S)

- Goal: `/summary` with the flag on shows the figures, the loading state and the errors.
- Changes: `src/screens/summary/useSummaryData.ts`, `SummaryScreen.tsx`.
- Details: keep `if (!isSummaryEnabled()) return <NotBuiltYet />;` first. Hooks may not run after an early return, so put the "on" screen in its own component (e.g. `SummaryContent`) that calls `useSummaryData()`, and render it after the flag check; ESLint's rules-of-hooks then passes. Switch on `status` as §4 says. Remove the "replaces this" comment.
- Done when: AC1, AC2, AC3, AC5 and AC7 hold in T3's tests; `npm run lint` and `npm run typecheck` pass.
- Depends on: T1.

### T3. Screen tests (M)

- Goal: AC4.
- Changes: `src/screens/summary/SummaryScreen.test.tsx`.
- Details: see §7. Use `renderWithRouter('/summary')` and its `mock`; `vi.stubEnv('VITE_FF_SUMMARY', 'true')` for the on cases; `vi.unstubAllEnvs()` after each. A local `task(overrides)` helper builds `Task` objects for `mock.seed` (valid UUIDs, `created_at` in the contract format). For loading and retry, pass `renderWithRouter` a `client` built with `createApiClient({ baseUrl: 'http://mock', fetch })`, where `fetch` is a test function (never resolves; or rejects with `TypeError('Failed to fetch')` on the first call and delegates to a `createMockApi().fetch` after).
- Done when: all tests pass under `npm test`, and CI (lint, typecheck, test, build) is green on the pull request.
- Depends on: T2 (can be written first, test-first).

### Sequence

T1 → T2 → T3, with T3's tests written alongside T2 (test-first). About one day in total.

## 7. Test strategy

| AC | Task | Test type | What the test verifies |
|---|---|---|---|
| AC1, AC6 | T1 | unit (`shareDone.test.ts`) | `{3,2,1}` → 33; `{3,1,2}` → 67; `{3,0,3}` → 100; `{2,1,1}` → 50; `{200,1,199}` → 100 (rounding, A1); `{8,7,1}` → 13 (12.5 rounds up) |
| AC2 | T1 | unit | `{0,0,0}` → 0, and the result is a finite number |
| AC1 | T3 | component in the test router | seed 3 tasks, 1 done; flag on; heading "Summary"; "Total tasks" 3, "Open" 2, "Done" 1, "Share done" 33% |
| AC2 | T3 | component | empty mock; flag on; each count 0 and "Share done" 0%; no "NaN" or "Infinity" in `main` |
| AC3 (loading) | T3 | component | client whose fetch never resolves: `getByRole('progressbar', { name: 'Loading' })` in `main`, no figures |
| AC3 (error + retry) | T3 | component | fetch rejects once, then answers from a seeded mock: "Could not reach the API" shown; click "Retry"; the figures appear and the error is gone |
| AC7 | T3 | component | `mock.notImplemented('getSummary')`: "Not built yet on the server" |
| AC5 | T3 | component | flag unset: "Not built yet" inside the navigation (keep the existing test's off case) |
| AC4 | all | CI | `.github/workflows/ci.yml` runs lint, `tsc --noEmit`, Vitest and the build on the pull request |

Regression risk: `src/components/AppLayout.test.tsx` and `src/routes/routeTree.test.ts` touch `/summary`; they run with the flag unset, where behaviour does not change. Run the whole suite.

## 8. Rollout and rollback

- **Feature flag:** `VITE_FF_SUMMARY`, an existing build-time environment variable (`src/flags.ts`), off unless exactly `"true"`. With it off, `/summary` shows "Not built yet", as today. Turn it on by setting `VITE_FF_SUMMARY=true` in the build environment (or `.env.local`) and rebuilding.
- No migrations, configuration or dependency changes. Plain code deploy.
- Rollback: unset the flag and rebuild, or revert the pull request.
- Removing the flag, once the screen has shipped, is a follow-up (README "Feature flags").

## 9. Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| The real API still answers 501 for `/tasks/summary` | High today | The screen says "Not built yet on the server" | Expected (AC7); the flag stays off until the API's summary issue lands |
| The chosen Astryx component does not keep label and value together in the DOM | Low | Tests cannot find a value by its label | §4 fixes the requirement, not the component; the engineer checks it with the tests |
| Retry test is flaky with a stateful fetch | Low | Flaky CI | Use a call counter in the fake fetch and `findBy*` queries; no timers |

## 10. Technical debt

None encountered or taken on. `VITE_FF_SUMMARY` and its check are debt to remove once the screen ships (follow-up).

## 11. Open questions

| # | Question | Who can answer | Blocks | Assumption made |
|---|---|---|---|---|
| Q1 | Should a 501 on the Summary screen also offer to try again? | Product owner | No | No: the shared `ErrorState` rule stands (A2) |
| Q2 | Is plain rounding right for the share done (199/200 → 100%)? | Product owner | No | Yes, `Math.round` (A1) |

## 12. Follow-ups

- Remove `VITE_FF_SUMMARY`, its check and its tests once the screen has shipped and the API's endpoint is live.
