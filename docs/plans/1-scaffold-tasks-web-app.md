# Technical Plan: #1 Scaffold the Tasks web app: TanStack Start, Astryx, the contract's client, and every screen wired

**Ticket:** #1   **Spec:** [docs/specs/1-scaffold-tasks-web-app.md](../specs/1-scaffold-tasks-web-app.md)   **Status:** Draft (revision 2, after the plan gate)

## 0. Rework: how the plan gate's points are addressed

The plan gate rejected revision 1 so that the three screen issues change only their own screen folder. Each point and where it is handled:

| Point | Change in this plan |
|---|---|
| **M1** — each screen fetches its own data inside `src/screens/<name>/`, through `src/api/client.ts`; no route loaders; route files only render their screen and no screen issue edits them; one way to get the base URL and to handle loading and errors | New §4 "Screen data access" and task **T7**. No route has a `loader`. Each screen fetches in a hook in its own folder (`src/screens/<name>/use<Name>Data.ts`) built on a shared `useApiResource` hook and the `ApiClient` from an `ApiProvider` context. The base URL is resolved once, in `client.ts` (`VITE_API_URL`, default `http://localhost:8000`); screens never read it. Loading and errors render through two shared Astryx-based components, `LoadingState` and `ErrorState`, with fixed rules per status (404, 422, 501, network, other). Route files are frozen after this issue (§4 "Route files"). Decisions table rows "Data fetching" and "How screens get the client" replace revision 1's "route loaders" assumption (A5) and its "decided by the first screen issue" row. |
| **M2** — tests render each screen and the layout with its navigation inside a test router with a memory history, not the TanStack Start document shell; keep a build check of the real route tree in CI | §4 "Layout and the document shell" splits the layout (`AppLayout`: Theme, AppShell, navigation, outlet) from the document shell (`<html>`, `<body>`, `HeadContent`, `Scripts`) in `__root.tsx`. `src/test/renderWithRouter.tsx` builds a **test router** — its own root route rendering `ApiProvider` + `AppLayout`, child routes at the same three paths rendering the same screen components — over `createMemoryHistory`. Nothing in tests imports `__root.tsx` or mounts the shell. The real route tree is checked in CI by `tsc --noEmit` and `npm run build` (T1, T6), plus a non-rendering test of its paths (`src/routes/routeTree.test.ts`, T2). |
| **m1** — a stub validates its input before it answers 501 | The mock's `notImplemented(...)` endpoints run the same validation as the built endpoint first: invalid body, query or non-UUID `id` → 422; only valid input → 501. Tested in T5. |

## 1. Summary

The repository today holds only the factory's workflow and a placeholder CI job. This issue creates the Tasks web app: a TanStack Start (React, Vite) app styled entirely with Astryx, a verbatim copy of the API contract from `mudasar-rauf/ai-demo-api`, a typed `fetch` client with one function per endpoint, and an in-memory mock of the API that the client can be pointed at in tests. The three routes are wired inside an Astryx app shell with a top navigation and each renders a "Not built yet" placeholder behind its own feature flag. The scaffold also fixes how a screen gets its data — a hook in its own folder, through the client from a context, with shared loading and error states — so each screen issue touches only its own folder. CI replaces the spike job with lint, typecheck, test and build. Every dependency the three screen issues will need is installed now.

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
- **A3.** The mock implements the contract's *finished* behaviour (not the API's current 501 stubs), because the screens are built against the finished contract. It can be told to answer 501 for chosen endpoints, so a screen can test its "not built yet on the server" path; like the API's stubs, such an endpoint still validates its input first and answers 422 to invalid input (contract, "Endpoint status").
- **A4.** Tooling follows `ai-todo-trial-1` where the issue does not say otherwise: npm, Node 24 in CI (`engines` `>=22.12`), Vitest with jsdom, flat ESLint config with `typescript-eslint`, `react-hooks`.
- **A5.** "Every dependency the three issues need" (AC6) is met by: TanStack Start and Router, React and React DOM, Astryx and StyleX; dev: Vite, `@vitejs/plugin-react`, Vitest, jsdom, Testing Library (`react`, `dom`, `jest-dom`, `user-event`), ESLint and its plugins, TypeScript, `@types/*`. Screens use Astryx components, the client and the scaffold's `useApiResource` hook; nothing else (no date library, no data-fetching library such as TanStack Query — `useApiResource` is enough for three screens, and no route loaders, per the plan gate).

## 3. Current state

- `.factory/workflow.yaml` — the factory's stages; not touched.
- `.github/workflows/spike-ci.yml` — one job that echoes "spike check passed" on PRs into `main`. To be deleted.
- No application code, no `package.json`.

Reference implementation read for patterns (in `mudasar-rauf/ai-todo-trial-1`): `src/App.tsx` wraps the app in `<Theme theme={neutralTheme}>` (from `@astryxdesign/core/theme` and `@astryxdesign/theme-neutral/built`) and an `<AppShell topNav={<TopNav heading={<TopNavHeading …/>} />} mobileNav={false}>`; `vite.config.ts` sets Vitest `environment: 'jsdom'`, `setupFiles: ['./src/test/setup.ts']`, `include: ['src/**/*.test.{ts,tsx}']`; `src/test/setup.ts` imports `@testing-library/jest-dom/vitest` and calls `cleanup()` after each test; flags live in `src/flags.ts` read from `import.meta.env.VITE_FF_*`.

## 4. Proposed design

### Overview

```
src/
  routes/__root.tsx        document shell (shellComponent: <html>, <head><HeadContent/>, <body>, <Scripts/>)
                           + component: <ApiProvider> → <AppLayout> → <Outlet/>
  routes/index.tsx         /            → <TasksScreen/>                      (no loader)
  routes/tasks.$id.tsx     /tasks/$id   → <TaskScreen id={Route.useParams().id}/>  (no loader)
  routes/summary.tsx       /summary     → <SummaryScreen/>                    (no loader)
  routes/routeTree.test.ts the generated tree has exactly /, /tasks/$id, /summary (no rendering)
  router.tsx               createRouter({ routeTree })   (TanStack Start entry)
  routeTree.gen.ts         generated by the TanStack Router plugin (committed)
  components/AppLayout.tsx Astryx <Theme> → <AppShell topNav={<AppNav/>}> → {children}
  components/AppNav.tsx    Astryx TopNav with links "Tasks" (/) and "Summary" (/summary)
  components/NotBuiltYet.tsx  Astryx text: "Not built yet"
  components/LoadingState.tsx Astryx loading indicator, accessible name "Loading"
  components/ErrorState.tsx   renders an ApiError / network error per the rules in §4
  screens/tasks/TasksScreen.tsx (+ .test.tsx)
  screens/task/TaskScreen.tsx   (+ .test.tsx)
  screens/summary/SummaryScreen.tsx (+ .test.tsx)
  flags.ts                 isTasksEnabled / isTaskEnabled / isSummaryEnabled
  api/types.ts             contract types
  api/client.ts            createApiClient({ baseUrl, fetch }) + default `api`
  api/ApiProvider.tsx      ApiProvider ({ client? = api }) + useApiClient()
  api/useApiResource.ts    useApiResource(load, deps) → { status, data, error, reload }
  api/mock.ts              createMockApi() → { fetch, seed, reset, notImplemented }
  test/setup.ts            jest-dom + cleanup
  test/renderWithRouter.tsx test router over memory history, with ApiProvider + AppLayout
```

Data flow for the future screens: screen component → its own hook `use<Name>Data()` in `src/screens/<name>/` → `useApiResource` → `useApiClient().<fn>()` → `fetch(baseUrl + path)`. In tests, `ApiProvider` gets `createApiClient({ baseUrl: "http://mock", fetch: mock.fetch })`, so the same calls go into the mock and the client's request-building and response-parsing are exercised too.

Each screen component, in this issue, is:

```tsx
export function TasksScreen() {
  return isTasksEnabled() ? /* screen issue fills this */ <NotBuiltYet /> : <NotBuiltYet />;
}
```

— i.e. the flag check is present and both branches render the placeholder; the screen issue replaces the "on" branch. (Writing it as `if (!isTasksEnabled()) return <NotBuiltYet />; return <NotBuiltYet />;` is fine too; ESLint must not flag it.) No screen fetches in this issue.

### Route files (frozen after this issue)

Each file under `src/routes/` only renders its screen: `createFileRoute(path)({ component })`, no `loader`, no `beforeLoad`, no `validateSearch`, no data. `tasks.$id.tsx` passes the path parameter as a prop, so `TaskScreen` does not depend on the route tree. `__root.tsx` holds the document shell and wraps the outlet in `ApiProvider` and `AppLayout`. The screen issues do not edit `src/routes/`, `src/components/`, `src/api/` or `src/test/`; if a screen needs search parameters or anything else from the URL, it reads them in its own folder with TanStack Router's hooks (`useSearch({ strict: false })`, `useNavigate()`), which work in both the real and the test router.

### Layout and the document shell

TanStack Start's root route has two parts, kept apart on purpose:

- `shellComponent` — the document: `<html>`, `<head><HeadContent/></head>`, `<body>{children}<Scripts/></body>`. Used only by the real app and the production build. **No test renders it**: it may not mount in jsdom.
- `component` — `<ApiProvider><AppLayout><Outlet/></AppLayout></ApiProvider>`. `AppLayout` (Theme, AppShell, AppNav, `{children}` in the shell's `main`) is a plain component, so tests render it directly.

`src/test/renderWithRouter.tsx`:

```ts
export function renderWithRouter(
  path: string,                       // e.g. "/tasks/0b6a…"
  options?: { client?: ApiClient },   // default: a client bound to a fresh createMockApi()
): RenderResult & { router: AnyRouter; mock?: MockApi };
```

It builds a **test router** with `createRootRoute({ component: () => <ApiProvider client={…}><AppLayout><Outlet/></AppLayout></ApiProvider> })` and three child routes (`createRoute`) at `/`, `/tasks/$id` and `/summary` rendering `TasksScreen`, `TaskScreen` (with the `id` param) and `SummaryScreen` — the same components the real route files render — over `createMemoryHistory({ initialEntries: [path] })`, renders `<RouterProvider router={router}/>`, and awaits `router.load()`. Screen tests and layout tests use only this helper. The real route tree is checked without rendering: by `tsc --noEmit`, `npm run build` in CI, and `routeTree.test.ts`, which imports `routeTree` from `routeTree.gen.ts` and asserts its child routes' `fullPath`s are exactly `/`, `/tasks/$id`, `/summary`.

### Screen data access (the convention the screen issues follow)

- **Getting the client and its base URL.** A screen never builds a URL or reads `import.meta.env`. It calls `useApiClient()` (from `src/api/ApiProvider.tsx`), which returns the client from context; the app's `ApiProvider` defaults to `api` from `client.ts`, whose base URL is `VITE_API_URL` or `http://localhost:8000`. Tests pass a client bound to the mock.
- **Fetching.** Each screen has its own hook in its own folder, e.g. `src/screens/tasks/useTasksData.ts`, built on:

  ```ts
  export type Resource<T> =
    | { status: "loading"; data?: undefined; error?: undefined; reload(): void }
    | { status: "error"; data?: undefined; error: unknown; reload(): void }
    | { status: "ready"; data: T; error?: undefined; reload(): void };

  export function useApiResource<T>(
    load: (client: ApiClient) => Promise<T>,
    deps: React.DependencyList,       // e.g. [id], [statusFilter]
  ): Resource<T>;
  ```

  It runs `load` in an effect on mount and when `deps` change, ignores a response that arrives after unmount or after `deps` changed, and `reload()` runs it again (used after a mutation). Mutations (`createTask`, `updateTask`, `deleteTask`) are called directly with `useApiClient()` from the screen's event handlers, then `reload()`.
- **Loading.** While `status === "loading"`, the screen renders `<LoadingState/>` (an Astryx loading indicator with accessible name "Loading").
- **Errors.** While `status === "error"`, the screen renders `<ErrorState error={error} onRetry={reload}/>`, which shows:
  - `ApiError` 501 → "Not built yet on the server" (no retry);
  - `ApiError` 404 → `detail` ("Task not found"), with a link to Tasks;
  - `ApiError` 422 → "The request was invalid", listing each `msg` (screens show field errors of a form submission inline themselves, from the 422 `loc`);
  - any other `ApiError` or a network error (`TypeError` from `fetch`) → "Could not reach the API" with a Retry button.

  A mutation's error is shown by the screen next to the control that caused it, using the same `ErrorState` or the 422 `loc` for a field.
- **Server rendering.** `useApiResource` fetches in an effect, so the server render shows `LoadingState` and the browser fetches; nothing reaches the API from the server. This avoids loaders (plan gate) and SSR data hydration in a demo app.

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
| `src/routes/*`, `src/router.tsx`, `src/routeTree.gen.ts` | as overview; no loaders | new |
| `src/routes/routeTree.test.ts` | real route tree's paths, without rendering | new |
| `src/components/AppLayout.tsx`, `AppNav.tsx`, `NotBuiltYet.tsx`, `LoadingState.tsx`, `ErrorState.tsx` (+ tests for `ErrorState`) | as overview | new |
| `src/api/ApiProvider.tsx`, `src/api/useApiResource.ts` (+ tests) | screen data access, §4 | new |
| `src/test/renderWithRouter.tsx` | test router, §4 | new |
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
  notImplemented(...endpoints: MockEndpoint[]): void;  // these validate first (422), then answer 501 {"detail":"Not implemented"}
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
- An endpoint marked `notImplemented` behaves like the API's stub: it runs the same body, query and path validation as when built (non-UUID `id`, bad `status`, invalid `POST`/`PATCH` body → 422), and only then answers 501 `{"detail":"Not implemented"}`. It never looks up the store, so an unknown but valid UUID gets 501, not 404. Implement validation and handling as two steps per endpoint, so both modes share the validation.

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
| How screens get the client | `ApiProvider` context in `src/api/`, defaulting to `api`; screens call `useApiClient()`; tests pass a client bound to the mock | One convention fixed now, so no screen issue edits shared files (plan gate, M1); no module mocking | `vi.mock` of `client.ts` (each screen test re-does it, module-level state); leaving it to the first screen issue (it would edit shared files) |
| Data fetching | A hook per screen in its own folder, on the shared `useApiResource`; no route loaders | Each screen issue changes only its folder (plan gate, M1); loading and error handling are identical across screens | Route loaders (edit `src/routes/`, and run on the server); TanStack Query (a dependency and a provider for three small screens) |
| Loading and error display | Shared `LoadingState` and `ErrorState` with fixed rules per status | The three screens look and behave the same | Each screen deciding (inconsistent, repeated) |
| Feature flags | `import.meta.env.VITE_FF_<SCREEN> === "true"`, read in `src/flags.ts` | Same pattern as `ai-todo-trial-1`; no flag service is linked | A config file (no benefit for build-time flags) |
| Route and screen tests | A test router (own root route with `ApiProvider` + `AppLayout`, same three paths and screen components) over `createMemoryHistory`, in `src/test/renderWithRouter.tsx`; the real tree is checked by `tsc`, the build and a non-rendering paths test | The Start document shell (`<html>`, `<body>`, `Scripts`) may not mount in jsdom (plan gate, M2); the test router still proves each screen renders inside the navigation | Rendering the real `routeTree` (mounts the shell); rendering screens alone (does not prove "inside the navigation") |
| `routeTree.gen.ts` | Committed | `tsc --noEmit` and ESLint in CI run before any build would generate it | Generate in CI (order-dependent, fragile) |
| SSR | TanStack Start default (SSR on) | Framework default; the spike in T1 confirms Astryx/StyleX render on the server. If they cannot, set the routes to `ssr: false` (SPA mode) and record it in the PR | Plain Vite + TanStack Router (the issue names TanStack Start) |

No decision here is hard to reverse or crosses a module boundary beyond the issue; no ADR proposed.

## 6. Implementation tasks

### T1. Project skeleton and Astryx in TanStack Start (M) — spike first
- Goal: `npm run dev` serves a TanStack Start app on port 3000 with the Astryx `Theme` + `AppShell` + `TopNav` rendered; `npm run build` succeeds.
- Changes: `package.json`, lock file, `vite.config.ts`, `tsconfig.json`, `eslint.config.js`, `.gitignore`, `src/router.tsx`, `src/routes/__root.tsx` (document shell in `shellComponent`, layout in `component`, §4), `src/components/AppLayout.tsx`, `src/routeTree.gen.ts`, `src/test/setup.ts`.
- Details: install everything from A1/A5 now, at current stable versions, with exact Astryx pins. Time-box 2 hours on the question **"do Astryx 0.7.17 components and StyleX render under TanStack Start's SSR build?"**; if not, fall back to `ssr: false` (see decisions). Follow TanStack Start's current docs for the entry files (`src/router.tsx` exporting `getRouter`/`createRouter`, `__root.tsx` with `shellComponent`/`HeadContent`/`Scripts`) — use whatever the installed version requires.
- Done when: `npm run typecheck`, `npm run lint`, `npm run build` all pass; dev server opens on `http://localhost:3000` (AC10, AC5, AC6).
- Tests: none yet beyond the toolchain running.
- Depends on: none.

### T2. Flags, navigation, placeholder and the three routes (S)
- Goal: AC4, AC8 (tests), AC9.
- Changes: `src/flags.ts` (+ `flags.test.ts`), `src/components/AppNav.tsx`, `src/components/NotBuiltYet.tsx`, `src/routes/index.tsx`, `src/routes/tasks.$id.tsx`, `src/routes/summary.tsx`, `src/routes/routeTree.test.ts`, `src/screens/{tasks,task,summary}/<Name>Screen.tsx` and `.test.tsx`, `src/test/renderWithRouter.tsx` (§4; without `ApiProvider` until T7 adds it).
- Details: `AppNav` uses Astryx `TopNav` with the app name and two links rendered through TanStack Router's `Link` (or Astryx's link component with `href`, whichever Astryx supports for client-side links — no hand-rolled styled elements). Route files only render the screen, with no loader (§4 "Route files"). `TaskScreen` receives `id` as a prop from `Route.useParams()` in the route file.
- Done when: visiting each path shows the nav and "Not built yet"; each flag defaults off; no test imports `src/routes/__root.tsx` or renders the document shell.
- Tests: per screen folder, `renderWithRouter` at `/`, `/tasks/0b6a2a52-3c55-4f0e-9a0d-1f2a3b4c5d6e`, `/summary`; assert `getByRole('navigation')` holds links "Tasks" → `/` and "Summary" → `/summary`, and `getByRole('main')` contains "Not built yet". One layout test: clicking "Summary" in the navigation moves the test router to `/summary`. `routeTree.test.ts`: the real tree's paths are exactly `/`, `/tasks/$id`, `/summary` (no rendering). `flags.test.ts`: each flag false when unset, true only for `"true"` (use `vi.stubEnv`).
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
- Tests: drive the mock **through the real client** (`createApiClient({ baseUrl: "http://mock", fetch: mock.fetch })`), one `describe` per endpoint: success shape and status; each 422 rule (title missing/blank/201 chars, notes 2001 chars, bad `due`, extra field, read-only field, `null` title/notes/done in PATCH, bad `status`, non-UUID id); 404 for unknown id on GET/PATCH/DELETE; ordering and ties; `done_at` transitions; `{}` PATCH; `due: null` clears; summary counts and `/tasks/summary` not read as an id; date-time format regex `^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{6}Z$`; `notImplemented()` → 501 `{"detail":"Not implemented"}` for valid input, and still 422 for invalid input on each endpoint (non-UUID id on GET/PATCH/DELETE `/tasks/{id}`, bad `status` on `GET /tasks`, blank title on `POST`, `null` title on `PATCH`), and 501 rather than 404 for an unknown valid UUID; `reset()`. Use injected `now`/`newId` for deterministic assertions.
- Depends on: T4.

### T6. CI, README, env example (S)
- Goal: AC7, README half of AC8.
- Changes: `.github/workflows/ci.yml` (new), `.github/workflows/spike-ci.yml` (delete), `README.md`, `.env.example`.
- Details: `on: pull_request: branches: [main]` (adding `push: branches: [main]` is fine); `permissions: contents: read`; `ubuntu-24.04`; `actions/checkout` and `actions/setup-node` pinned by SHA as in trial-1 (`node-version: 24`, `cache: npm`); steps `npm ci`, `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`. README: prerequisites (Node ≥ 22.12), `npm ci`, run the API locally (link to `ai-demo-api`, it serves `http://localhost:8000`), `npm run dev` → `http://localhost:3000`, `VITE_API_URL` override, the three flags, `npm test` / `lint` / `typecheck` / `build`.
- Done when: the PR's checks show the `ci` job running and passing, and no `spike-ci` job.
- Tests: CI itself.
- Depends on: T1 (scripts exist). **See open question Q1 — the push may be refused.**

### T7. Screen data access: provider, hook, loading and error states (S)
- Goal: the M1 convention in §4 "Screen data access", ready for the screen issues; supports AC2/AC4.
- Changes: `src/api/ApiProvider.tsx` (+ test), `src/api/useApiResource.ts` (+ test), `src/components/LoadingState.tsx`, `src/components/ErrorState.tsx` (+ test), `src/routes/__root.tsx` (wrap the layout in `ApiProvider`), `src/test/renderWithRouter.tsx` (wrap in `ApiProvider`; `client` option, default bound to a fresh `createMockApi()`, returned as `mock`).
- Details: signatures as in §4. `useApiResource` must not set state after unmount or for a stale `deps` value. `ErrorState` uses Astryx components only. Add a short "Building a screen" section to `README.md` describing the convention (hook in the screen's folder, `useApiClient`, `LoadingState`/`ErrorState`, tests through `renderWithRouter` with the mock, no edits outside the folder).
- Done when: the hook, provider and states exist with tests; screens still render "Not built yet" (they do not fetch yet).
- Tests: `useApiResource` (with `renderHook` and a client on the mock): loading → ready with data; loading → error with the `ApiError`; `reload()` fetches again and sees a change made through the mock; changing `deps` refetches and a late earlier response is ignored. `ApiProvider`: `useApiClient()` returns the given client, and `api` by default. `ErrorState`: the four message rules, Retry calls `onRetry`.
- Depends on: T2, T5.

### Sequence

T1 ∥ T3 → T2 (after T1), T4 (after T3) → T5 → T7 (after T2 and T5) → T6. Total: 2 M + 5 S ≈ 4 days of nominal size; in practice one developer session.

## 7. Test strategy

| AC | Tasks | Test type | What it verifies |
|---|---|---|---|
| AC1 | T3 | manual check in PR | `sha256sum` matches the hash and commit named in the PR body |
| AC2 | T3, T4 | unit (`client.test.ts`) | requests built per endpoint; base URL from env/default; errors typed |
| AC3 | T5 | integration of client + mock (`mock.test.ts`) | every endpoint, success and error, per contract; a 501 stub validates first |
| (M1 convention) | T7 | unit (`useApiResource`, `ApiProvider`, `ErrorState` tests) | loading, ready, error, reload, stale responses; error messages per status |
| AC4 | T2, T6 | component in the test router (`screens/*/*.test.tsx`); route-tree paths test; CI build | each path renders its screen; nav links Tasks and Summary; the real route tree has the three paths and builds |
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
| The test router drifts from the real route tree (a path renamed in one only) | Low | Screen tests pass while the app is miswired | `routeTree.test.ts` pins the real tree's paths; both trees render the same screen components; route files are frozen after this issue |
| A screen needs something from its route that the frozen route file does not give (search params, a loader) | Low | The screen issue would edit `src/routes/` | Screens read search params with router hooks in their own folder; data comes from their hook, never a loader |
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
