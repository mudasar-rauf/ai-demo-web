# Spec: #1 Scaffold the Tasks web app

**Issue:** #1   **Plan:** [docs/plans/1-scaffold-tasks-web-app.md](../plans/1-scaffold-tasks-web-app.md)

## User story

As a developer working on the Tasks demo, I want the Tasks web app scaffolded in TypeScript with TanStack Start and Astryx, holding the API's contract, a typed client for it, and a contract-faithful mock of the API, with its three screens wired and CI running on every pull request, so that each of the three screen issues changes only its own screen's folder and adds no dependency.

## Outcome

The Tasks web app exists in TypeScript with TanStack Start and Astryx. It holds the API's contract and a typed client for it, and its tests use a mock of the API that answers as the contract says. The three screens are wired and say "Not built yet" until an issue builds them. CI runs on every pull request.

## Acceptance criteria

From the issue, in its words:

- **AC1.** `docs/contracts/api.md` is byte for byte the file merged in `mudasar-rauf/ai-demo-api`. The pull request names that repository's commit and the file's SHA-256.
- **AC2.** `src/api/client.ts` has one typed function per endpoint of the contract, with its types in `src/api/types.ts`. Its base URL comes from `VITE_API_URL`, `http://localhost:8000` by default.
- **AC3.** `src/api/mock.ts` is an in-memory mock of the API for tests. It answers each endpoint as the contract says, its errors included, and its own tests show it.
- **AC4.** The routes `/` (Tasks), `/tasks/$id` (Task) and `/summary` (Summary) are wired, each showing "Not built yet". A navigation bar links Tasks and Summary.
- **AC5.** Every component comes from Astryx (`@astryxdesign/core` and `@astryxdesign/theme-neutral`, pinned as in `ai-todo-trial-1`).
- **AC6.** `package.json` and its lock file hold every dependency the web app's three issues need: TanStack Start, React, Astryx, and for development Vitest, Testing Library, ESLint and TypeScript. No later issue adds one.
- **AC7.** `.github/workflows/ci.yml` runs ESLint, `tsc --noEmit`, Vitest and the production build on every pull request into `main`, and replaces `spike-ci.yml`.
- **AC8.** Tests show each screen renders "Not built yet" inside the navigation. `README.md` says how to install, run against a local API, and test.

Derived:

- **AC9 (derived).** The three screens sit behind feature flags read from the environment (`VITE_FF_TASKS`, `VITE_FF_TASK`, `VITE_FF_SUMMARY`), off by default. While a flag is off its route shows "Not built yet"; the screen issues build their screen behind its flag.
- **AC10 (derived).** The web app's development server listens on `http://localhost:3000`, the only origin the contract's CORS rule allows.

## Not in scope

Building any screen. Talking to the real API in tests.
