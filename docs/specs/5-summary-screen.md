# Spec: #5 The Summary screen

**Issue:** #5   **Plan:** [docs/plans/5-summary-screen.md](../plans/5-summary-screen.md)

## User story

As a person using the Tasks app, I want a Summary screen that tells me how many tasks I have, how many are open and how many are done, and what share of them is done, so that I can see my progress at a glance.

## Outcome

On the Summary screen, a person sees how many tasks they have, how many are open and done, and the share done.

## Acceptance criteria

From the issue, in its words:

- **AC1.** `/summary` loads `GET /tasks/summary` and shows the total, open and done counts, and the share done as a whole percentage.
- **AC2.** With no tasks it shows 0 for each count and the share done as 0%, never as a division by zero.
- **AC3.** Loading and an error each have their own words, and an error offers to try again.
- **AC4.** Tests in `src/screens/summary/` cover AC1 to AC3 against the mock, inside the test router. ESLint, `tsc`, Vitest and the build pass in CI.

Derived:

- **AC5 (derived).** The screen ships behind the existing flag `VITE_FF_SUMMARY`, off by default. While it is off, `/summary` still shows "Not built yet", as today.
- **AC6 (derived).** The share done is `done / total × 100` rounded to the nearest whole number (halves up), shown with a `%` sign, for example 1 of 3 done → `33%`, 2 of 3 → `67%`, 3 of 3 → `100%`.
- **AC7 (derived).** While the API's summary endpoint is not built (it answers 501), the screen says "Not built yet on the server", as every screen does through the shared `ErrorState`. That message has no Retry: the shared rule treats 501 as "this endpoint is not deployed yet", not as a failure that retrying fixes. Every other error from `GET /tasks/summary` (a network error, a 500, a 503) says "Could not reach the API" and offers Retry, which is how AC3's "offers to try again" is met. (The plan records this reading as assumption A2 and open question Q1.)

## Not in scope

The Tasks and Task screens, the route files, the client, the mock, the contract, and any dependency. Shared components (`LoadingState`, `ErrorState`, `AppLayout`) are used as they are, not changed.
