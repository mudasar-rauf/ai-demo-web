# Technical Plan: #1 Scaffold the Tasks web app: TanStack Start, Astryx, the contract's client, and every screen wired

**Ticket:** #1   **Spec:** [docs/specs/1-scaffold-tasks-web-app.md](../specs/1-scaffold-tasks-web-app.md)   **Status:** Draft

## 1. Summary

The repository today holds only the factory's workflow and a placeholder CI job. This issue creates the Tasks web app: a TanStack Start (React, Vite) app styled entirely with Astryx, a verbatim copy of the API contract from `mudasar-rauf/ai-demo-api`, a typed `fetch` client with one function per endpoint, and an in-memory mock of the API that the client can be pointed at in tests. The three routes are wired inside an Astryx app shell with a top navigation and each renders a "Not built yet" placeholder behind its own feature flag. CI replaces the spike job with lint, typecheck, test and build. Every dependency the three screen issues will need is installed now.

## 2. Requirements

### User story

See the spec. In short: the developers of the three screen issues need a working shell, a client and a mock they can trust, and CI, so that each screen issue touches only `src/screens/<screen>/`.

### Acceptance criteria

| ID | Criterion | Source |
|---|---|---|
| AC1 | `docs/contracts/api.md` is byte for byte the file in `ai-demo-api`; the PR names the commit and SHA-256 | ticket |
| AC2 | `src/api/client.ts`: one typed function per endpoint, types in `src/api/types.ts`, base URL from `VITE_API_URL`, default `http://localhost:8000` | ticket |
| AC3 | `src/api/mock.ts`: in-memory mock answering every endpoint as the contract says, errors included, with its own tests | ticket |
| AC4 | Routes `/`, `/tasks/$id`, `/summary` wired, each "Not built yet"; a nav bar links Tasks and Summary | ticket |
| AC5 | Every component from Astryx, `@astryxdesign/core` and `@astryxdesign/theme-neutral` pinned as in `ai-todo-trial-1` | ticket |
| AC6 | `package.json` and lock file hold every dependency the three issues need | ticket |
| AC7 | `.github/workflows/ci.yml` runs ESLint, `tsc --noEmit`, Vitest, production build on PRs into `main`; replaces `spike-ci.yml` | ticket |
| AC8 | Tests show each screen renders "Not built yet" inside the navigation; README covers install, run against a local API, test | ticket |
| AC9 | Per-screen feature flags `VITE_FF_TASKS`, `VITE_FF_TASK`, `VITE_FF_SUMMARY`, off by default | derived (factory rule: every feature behind a flag) |
| AC10 | Dev server on `http://localhost:3000` (the contract's only CORS origin) | derived (contract, "CORS") |

### Non-functional requirements

- **Contract fidelity.** Types in `src/api/types.ts` match the contract's TypeScript column field for field. The mock enforces the contract's validation rules, so screen tests catch payloads the real API would reject.
- **Accessibility.** The navigation is a landmark (`nav`) with real links; screens render inside the shell's `main` region. Tests query by role.
- **No network in tests.** Vitest never reaches a real API (spec, "Not in scope").

### Out of scope

Any screen's real content; tests against the real API; end-to-end (Playwright) tests — `ai-todo-trial-1` has them, this issue's CI list does not.

### Assumptions

- **A1.** "Pinned as in `ai-todo-trial-1`" means the exact versions in its `package.json` on `main`: `@astryxdesign/core` `0.7.17` and `@astryxdesign/theme-neutral` `0.7.17` (exact, no caret), with `@stylexjs/stylex` `^0.19.2` alongside as there. Verified by reading that file.
- **A2.** The contract to copy is `docs/contracts/api.md` on `ai-demo-api`'s `main`. When this plan was written: repository commit `0e5036a3db07b0b37aa3ecad28a35b4ae2d8f0ae`, last commit touching the file `e2485c4f512aa0a9ca157b04ffa5b178817f8db9`, SHA-256 `f465dec99fcb27cf5fe2a2b62e8c56c4bc979977aec6fa4d4a0d4aaaf6216ce2`. The developer re-fetches at implementation time and, if it has changed, uses the new commit and hash.
- **A3.** The mock implements the contract's *finished* behaviour (not the API's current 501 stubs), because the screens are built against the finished contract. It can be told to answer 501 for chosen endpoints, so a screen can test its "not built yet on the server" path.
- **A4.** Tooling follows `ai-todo-trial-1` where the issue does not say otherwise: npm, Node 24 in CI (`engines` `>=22.12`), Vitest with jsdom, flat ESLint config with `typescript-eslint`, `react-hooks`.
- **A5.** "Every dependency the three issues need" (AC6) is met by: TanStack Start and Router, React and React DOM, Astryx and StyleX; dev: Vite, `@vitejs/plugin-react`, Vitest, jsdom, Testing Library (`react`, `dom`, `jest-dom`, `user-event`), ESLint and its plugins, TypeScript, `@types/*`. Screens use Astryx form components and the client; nothing else (no date library, no data-fetching library — route loaders cover fetching).

## 3. Current state

- `.factory/workflow.yaml` — the factory's stages; not touched.
- `.github/workflows/spike-ci.yml` — one job that echoes "spike check passed" on PRs into `main`. To be deleted.
- No application code, no `package.json`.

Reference implementation read for patterns (in `mudasar-rauf/ai-todo-trial-1`): `src/App.tsx` wraps the app in `<Theme theme={neutralTheme}>` (from `@astryxdesign/core/theme` and `@astryxdesign/theme-neutral/built`) and an `<AppShell topNav={<TopNav heading={<TopNavHeading …/>} />} mobileNav={false}>`; `vite.config.ts` sets Vitest `environment: 'jsdom'`, `setupFiles: ['./src/test/setup.ts']`, `include: ['src/**/*.test.{ts,tsx}']`; `src/test/setup.ts` imports `@testing-library/jest-dom/vitest` and calls `cleanup()` after each test; flags live in `src/flags.ts` read from `import.meta.env.VITE_FF_*`.

## 4. Proposed design

### Overview

```
src/
  routes/__root.tsx        RootLayout: <Theme> → <AppShell topNav={<AppNav/>}> → <Outlet/>
  routes/index.tsx         /            → <TasksScreen/>
  routes/tasks.$id.tsx     /tasks/$id   → <TaskScreen id/>
  routes/summary.tsx       /summary     → <SummaryScreen/>
  router.tsx               createRouter({ routeTree })   (TanStack Start entry)
  routeTree.gen.ts         generated by the TanStack Router plugin (committed)
  components/AppNav.tsx    Astryx TopNav with links "Tasks" (/) and "Summary" (/summary)
  components/NotBuiltYet.tsx  Astryx text: "Not built yet"
  screens/tasks/TasksScreen.tsx (+ .test.tsx)
  screens/task/TaskScreen.tsx   (+ .test.tsx)
  screens/summary/SummaryScreen.tsx (+ .test.tsx)
  flags.ts                 isTasksEnabled / isTaskEnabled / isSummaryEnabled
  api/types.ts             contract types
  api/client.ts            createApiClient({ baseUrl, fetch }) + default `api`
  api/mock.ts              createMockApi() → { fetch, seed, reset, notImplemented }
  test/setup.ts            jest-dom + cleanup
  test/renderRoute.tsx     renders the real routeTree at a path with memory history
```

Data flow for the future screens: route component → `api.<fn>()` → `fetch(baseUrl + path)`. In tests, `createApiClient({ fetch: mock.fetch })` routes the same calls into the mock, so the client's request-building and response-parsing are exercised too.

Each screen component, in this issue, is:

```tsx
export function TasksScreen() {
  return isTasksEnabled() ? /* screen issue fills this */ <NotBuiltYet /> : <NotBuiltYet />;
}
```

— i.e. the flag check is present and both branches render the placeholder; the screen issue replaces the "on" branch. (Writing it as `if (!isTasksEnabled()) return <NotBuiltYet />; return <NotBuiltYet />;` is fine too; ESLint must not flag it.)

### Changes by component

| Component / file | Change | New or modified |
|---|---|---|
| `docs/contracts/api.md` | Verbatim copy of the API's contract | new |
| `package.json`, `package-lock.json` | Scripts `dev`, `build`, `start`, `typecheck` (`tsc --noEmit`), `lint`, `test` (`vitest run`); dependencies per A1/A5 | new |
| `vite.config.ts` | `tanstackStart()` + `viteReact()` plugins, `server.port: 3000` + `strictPort: true`, Vitest config as in trial-1 | new |
| `tsconfig.json` | strict, `jsx: react-jsx`, `moduleResolution: bundler`, `types: ["vite/client", "vitest/globals"]` | new |
| `eslint.config.js` | as trial-1's, ignoring `dist`, `.output`, `.tanstack`, `src/routeTree.gen.ts` | new |
| `.gitignore` | `node_modules`, `dist`, `.output`, `.tanstack`, `.env*.local` | new |
| `.env.example` | `VITE_API_URL=http://localhost:8000` and the three flags, commented, off | new |
| `src/routes/*`, `src/router.tsx`, `src/routeTree.gen.ts` | as overview | new |
| `src/components/AppNav.tsx`, `NotBuiltYet.tsx` | as overview | new |
| `src/screens/*/` | each screen component and its test | new |
| `src/flags.ts` (+ test) | flag readers | new |
| `src/api/types.ts`, `client.ts`, `mock.ts` (+ tests) | as below | new |
| `README.md` | install, run against local API, test, flags | new |
| `.github/workflows/ci.yml` | lint, typecheck, test, build | new |
| `.github/workflows/spike-ci.yml` | delete | removed |

### APIs and contracts

`src/api/types.ts` — exactly the contract's TypeScript column, exported: `Task`, `TaskCreate`, `TaskUpdate`, `TaskStatus`, `Summary`, `Health`, `ErrorBody`, `ValidationErrorBody`.

`src/api/client.ts`:

```ts
export const DEFAULT_API_URL = "http://localhost:8000";

export class ApiError extends Error {
  readonly status: number;                          // 404, 422, 501, or any other non-2xx
  readonly body: ErrorBody | ValidationErrorBody | unknown;
}

export type ApiClient = {
  getHealth(): Promise<Health>;                       // GET /health
  listTasks(status?: TaskStatus): Promise<Task[]>;    // GET /tasks?status=  (omit query when undefined)
  createTask(body: TaskCreate): Promise<Task>;        // POST /tasks → 201
  getSummary(): Promise<Summary>;                     // GET /tasks/summary
  getTask(id: string): Promise<Task>;                 // GET /tasks/{id}
  updateTask(id: string, body: TaskUpdate): Promise<Task>;  // PATCH /tasks/{id}
  deleteTask(id: string): Promise<void>;              // DELETE /tasks/{id} → 204, no body read
};

export function createApiClient(options?: {
  baseUrl?: string;              // default: import.meta.env.VITE_API_URL ?? DEFAULT_API_URL
  fetch?: typeof fetch;          // default: globalThis.fetch
}): ApiClient;

export const api: ApiClient;     // createApiClient() with defaults
```

Rules: JSON bodies with `Content-Type: application/json`; `id` path segments passed through `encodeURIComponent`; trailing `/` on `baseUrl` tolerated; any non-2xx throws `ApiError` with the parsed JSON body (or `undefined` if the body is not JSON). The client does not validate input — the API (and the mock) do.

`src/api/mock.ts`:

```ts
export type MockApi = {
  fetch: typeof fetch;                    // pass to createApiClient
  seed(tasks: Task[]): void;              // replace the store
  tasks(): Task[];                        // snapshot, for assertions
  reset(): void;                          // empty store, all endpoints built
  notImplemented(...endpoints: MockEndpoint[]): void;  // these answer 501 {"detail":"Not implemented"}
};
export type MockEndpoint = "listTasks" | "createTask" | "getSummary" | "getTask" | "updateTask" | "deleteTask";
export function createMockApi(options?: { now?: () => Date; newId?: () => string }): MockApi;
```

The mock implements, from the contract:
- `GET /health` → 200 `{"status":"ok"}`.
- `GET /tasks` → newest first by `created_at` desc, ties by creation order (latest first); `status` filter; any other `status` value → 422.
- `POST /tasks` → 201; title trimmed, 1–200 chars after trim; `notes` ≤ 2000, default `""`; `due` `YYYY-MM-DD` (a real calendar date) or `null`, default `null`; unknown or read-only fields → 422; `done: false`, `done_at: null`, `created_at` from `now()`.
- `GET /tasks/summary` → `{ total, open, done }`, `total = open + done`. Routed before `/tasks/{id}`.
- `GET|PATCH|DELETE /tasks/{id}` → non-UUID id → 422; unknown → 404 `{"detail":"Task not found"}`.
- `PATCH` → only fields sent change; `{}` valid; `title`/`notes`/`done` `null` → 422; `due: null` clears; `done` false→true sets `done_at = now()`, true→false clears it, same value leaves it; unknown or read-only fields → 422.
- `DELETE` → 204, empty body.
- Date-times formatted as `YYYY-MM-DDTHH:MM:SS.ffffffZ` (six fractional digits; JS gives milliseconds, so pad with `000`).
- 422 bodies are FastAPI-shaped: `{"detail":[{"loc":[...],"msg":"...","type":"..."}]}`, with `loc` pointing at the field (`["body","title"]`, `["query","status"]`, `["path","id"]`). Tests assert status, `loc` and that `msg`/`type` are strings — not FastAPI's exact wording.
- Unknown path or method → 404 `{"detail":"Not Found"}` (FastAPI's default).

It returns real `Response` objects (available in Node 22+ and jsdom via Vitest).

### Error handling and edge cases

- `VITE_API_URL` empty string → treat as unset (default URL).
- `/tasks/summary` must never reach the `{id}` handler (test it).
- An unknown `$id` on the `/tasks/$id` route still renders the placeholder in this issue; not-found handling belongs to the Task screen issue.

### Security, performance, observability

No secrets; `VITE_*` values are public by design and README says so. Nothing else applies.

## 5. Key decisions

| Decision | Choice | Rationale | Alternatives rejected |
|---|---|---|---|
| Client transport | Thin wrapper over injected `fetch` | Zero dependencies; injection lets tests use the mock with no global patching | axios/ky (new dependency); MSW (new dependency, global interception) |
| Mock shape | A `fetch`-compatible function over an in-memory store | Exercises the real client end to end; screens' tests render with a client bound to the mock | A fake `ApiClient` object (would skip URL/JSON code paths, and drift from the contract unnoticed) |
| How screens get the client | Screens import `api` from `src/api/client.ts`; tests mock that module with `vi.mock` to return `createApiClient({ fetch: mock.fetch })` — or the screen issues may add a React context. Decided by the first screen issue | Keeps this issue minimal; no screen uses the client yet | Building a provider now (speculative) |
| Feature flags | `import.meta.env.VITE_FF_<SCREEN> === "true"`, read in `src/flags.ts` | Same pattern as `ai-todo-trial-1`; no flag service is linked | A config file (no benefit for build-time flags) |
| Route tests | Render the real `routeTree` with `createMemoryHistory` in `src/test/renderRoute.tsx` | Proves wiring and that the screen sits inside the nav, not just the component | Rendering screen components alone (does not prove AC4/AC8 "inside the navigation") |
| `routeTree.gen.ts` | Committed | `tsc --noEmit` and ESLint in CI run before any build would generate it | Generate in CI (order-dependent, fragile) |
| SSR | TanStack Start default (SSR on) | Framework default; the spike in T1 confirms Astryx/StyleX render on the server. If they cannot, set the routes to `ssr: false` (SPA mode) and record it in the PR | Plain Vite + TanStack Router (the issue names TanStack Start) |

No decision here is hard to reverse or crosses a module boundary beyond the issue; no ADR proposed.

## 6. Implementation tasks

### T1. Project skeleton and Astryx in TanStack Start (M) — spike first
- Goal: `npm run dev` serves a TanStack Start app on port 3000 with the Astryx `Theme` + `AppShell` + `TopNav` rendered; `npm run build` succeeds.
- Changes: `package.json`, lock file, `vite.config.ts`, `tsconfig.json`, `eslint.config.js`, `.gitignore`, `src/router.tsx`, `src/routes/__root.tsx`, `src/routeTree.gen.ts`, `src/test/setup.ts`.
- Details: install everything from A1/A5 now, at current stable versions, with exact Astryx pins. Time-box 2 hours on the question **"do Astryx 0.7.17 components and StyleX render under TanStack Start's SSR build?"**; if not, fall back to `ssr: false` (see decisions). Follow TanStack Start's current docs for the entry files (`src/router.tsx` exporting `getRouter`/`createRouter`, `__root.tsx` with `shellComponent`/`HeadContent`/`Scripts`) — use whatever the installed version requires.
- Done when: `npm run typecheck`, `npm run lint`, `npm run build` all pass; dev server opens on `http://localhost:3000` (AC10, AC5, AC6).
- Tests: none yet beyond the toolchain running.
- Depends on: none.

### T2. Flags, navigation, placeholder and the three routes (S)
- Goal: AC4, AC8 (tests), AC9.
- Changes: `src/flags.ts` (+ `flags.test.ts`), `src/components/AppNav.tsx`, `src/components/NotBuiltYet.tsx`, `src/routes/index.tsx`, `src/routes/tasks.$id.tsx`, `src/routes/summary.tsx`, `src/screens/{tasks,task,summary}/<Name>Screen.tsx` and `.test.tsx`, `src/test/renderRoute.tsx`.
- Details: `AppNav` uses Astryx `TopNav` with the app name and two links rendered through TanStack Router's `Link` (or Astryx's link component with `href`, whichever Astryx supports for client-side links — no hand-rolled styled elements). Route files only import and render the screen. `TaskScreen` receives `id` from `Route.useParams()` in the route file.
- Done when: visiting each path shows the nav and "Not built yet"; each flag defaults off.
- Tests: per screen folder, render the route at `/`, `/tasks/0b6a2a52-3c55-4f0e-9a0d-1f2a3b4c5d6e`, `/summary`; assert `getByRole('navigation')` holds links "Tasks" → `/` and "Summary" → `/summary`, and `getByRole('main')` contains "Not built yet". `flags.test.ts`: each flag false when unset, true only for `"true"` (use `vi.stubEnv`).
- Depends on: T1.

### T3. Contract copy and types (S)
- Goal: AC1, types half of AC2.
- Changes: `docs/contracts/api.md`, `src/api/types.ts`.
- Details: fetch the raw file (`gh api -H "Accept: application/vnd.github.raw" repos/mudasar-rauf/ai-demo-api/contents/docs/contracts/api.md`), record the repo commit and `sha256sum` for the PR body; compare with A2.
- Done when: `sha256sum docs/contracts/api.md` equals the hash in the PR body; types match the contract's TypeScript column.
- Tests: none (types are checked by `tsc` through T4/T5's use).
- Depends on: none (parallel with T1).

### T4. Typed client (S)
- Goal: AC2.
- Changes: `src/api/client.ts`, `src/api/client.test.ts`.
- Done when: seven functions exist with the signatures in §4; base URL resolution as specified.
- Tests: with a stub `fetch` (`vi.fn`) — each function's method, URL, query, headers and body; `VITE_API_URL` used when set (`vi.stubEnv`), default otherwise, empty string → default; non-2xx → `ApiError` with status and body; 204 → `undefined` without reading JSON.
- Depends on: T3.

### T5. In-memory mock (M)
- Goal: AC3.
- Changes: `src/api/mock.ts`, `src/api/mock.test.ts`.
- Done when: every rule listed in §4 "The mock implements" holds.
- Tests: drive the mock **through the real client** (`createApiClient({ baseUrl: "http://mock", fetch: mock.fetch })`), one `describe` per endpoint: success shape and status; each 422 rule (title missing/blank/201 chars, notes 2001 chars, bad `due`, extra field, read-only field, `null` title/notes/done in PATCH, bad `status`, non-UUID id); 404 for unknown id on GET/PATCH/DELETE; ordering and ties; `done_at` transitions; `{}` PATCH; `due: null` clears; summary counts and `/tasks/summary` not read as an id; date-time format regex `^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{6}Z$`; `notImplemented()` → 501 `{"detail":"Not implemented"}`; `reset()`. Use injected `now`/`newId` for deterministic assertions.
- Depends on: T4.

### T6. CI, README, env example (S)
- Goal: AC7, README half of AC8.
- Changes: `.github/workflows/ci.yml` (new), `.github/workflows/spike-ci.yml` (delete), `README.md`, `.env.example`.
- Details: `on: pull_request: branches: [main]` (adding `push: branches: [main]` is fine); `permissions: contents: read`; `ubuntu-24.04`; `actions/checkout` and `actions/setup-node` pinned by SHA as in trial-1 (`node-version: 24`, `cache: npm`); steps `npm ci`, `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`. README: prerequisites (Node ≥ 22.12), `npm ci`, run the API locally (link to `ai-demo-api`, it serves `http://localhost:8000`), `npm run dev` → `http://localhost:3000`, `VITE_API_URL` override, the three flags, `npm test` / `lint` / `typecheck` / `build`.
- Done when: the PR's checks show the `ci` job running and passing, and no `spike-ci` job.
- Tests: CI itself.
- Depends on: T1 (scripts exist). **See open question Q1 — the push may be refused.**

### Sequence

T1 ∥ T3 → T2 (after T1), T4 (after T3) → T5 → T6. Total: 2 M + 4 S ≈ 3.5 days of nominal size; in practice one developer session.

## 7. Test strategy

| AC | Tasks | Test type | What it verifies |
|---|---|---|---|
| AC1 | T3 | manual check in PR | `sha256sum` matches the hash and commit named in the PR body |
| AC2 | T3, T4 | unit (`client.test.ts`) | requests built per endpoint; base URL from env/default; errors typed |
| AC3 | T5 | integration of client + mock (`mock.test.ts`) | every endpoint, success and error, per contract |
| AC4 | T2 | component, real router (`screens/*/*.test.tsx`) | each path renders its screen; nav links Tasks and Summary |
| AC5 | T1, T2 | review + lint | only Astryx components imported for UI; exact pins `0.7.17` in `package.json` |
| AC6 | T1 | review | dependency list per A5 present in `package.json` and lock file |
| AC7 | T6 | CI run | the PR shows `ci` running lint, typecheck, test, build |
| AC8 | T2, T6 | component + review | "Not built yet" inside `main` with `navigation` present; README sections |
| AC9 | T2 | unit (`flags.test.ts`) | flags off by default, on only for `"true"` |
| AC10 | T1 | review | `server.port: 3000`, `strictPort: true` in `vite.config.ts` |

Regression risk: none — no existing code. Test data: the contract's two example tasks, reused as fixtures.

## 8. Rollout and rollback

- **Feature flags:** `VITE_FF_TASKS`, `VITE_FF_TASK`, `VITE_FF_SUMMARY` — environment variables read at build time, off by default (unset or anything but `"true"`). In this issue both states render "Not built yet"; each screen issue builds its screen behind its own flag.
- No migrations, no infrastructure. Rollback: revert the PR (restores `spike-ci.yml`).

## 9. Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| The factory's GitHub App lacks the `workflows` permission, so pushing `.github/workflows/*` is refused (trial-1's `ci.yml` says exactly this about its App) | High | AC7 cannot be met by the agent | Q1: developer tries; if refused, puts the exact `ci.yml` content in the PR body and asks a person to commit it and delete `spike-ci.yml` |
| Astryx/StyleX do not render under TanStack Start SSR | Medium | Build or hydration failures | T1 spike, fallback `ssr: false` |
| TanStack Start's entry-file API differs between versions | Medium | Time lost | Follow the installed version's docs; generated route tree committed |
| Mock drifts from the real API's 422 wording | Low | Screens assert on wording that differs live | Mock tests and screen tests assert `loc`/status, not `msg` text |
| A later issue needs a package not foreseen (AC6) | Low | Violates "no later issue adds one" | A5 list reviewed by the architect; screens restricted to Astryx + client |

## 10. Technical debt

None encountered (empty repository). Taken on: none intended. The mock re-implements validation rules by hand — documentation debt if the contract changes; the README notes that `docs/contracts/api.md`, `types.ts` and `mock.ts` change together.

## 11. Open questions

| # | Question | Who can answer | Blocks | Assumption made |
|---|---|---|---|---|
| Q1 | Can the factory's GitHub App push files under `.github/workflows/`? | Repository owner | T6 (AC7) partly | Developer tries; if refused, a person commits the `ci.yml` given in the PR body and removes `spike-ci.yml` |
| Q2 | Should the mock default to the finished contract (as planned) or to the API's current 501 stubs? | Product owner / architect | No | Finished contract; `notImplemented()` available (A3) |

## 12. Follow-ups

- Playwright end-to-end tests against the running API, as `ai-todo-trial-1` has.
- A contract-drift check in CI comparing `docs/contracts/api.md` with the API repository's copy.
