# Test Quality Roadmap

> Path to a healthy test suite for saaslens public releases.

## Current State (2026-04-17)

Captured on branch `feature/oss-rebrand`, commit `78a6e4da`.

| Metric                  | Value |
| ----------------------- | ----- |
| Total test files        | 222   |
| Passing tests           | 2,380 |
| Failing tests           | 328   |
| Pass rate               | 88%   |
| OSS rebrand regressions | 0     |

All 328 failures pre-existed in the internal `dev-pre-release` branch and are
not caused by the OSS rebrand (Phases DA-104 through DA-111). Core business
logic (services, utils, API handlers) is fully green.

## Failure Categories

### 1. Missing global `fetch` mock (estimated highest-impact bucket)

`vitest.setup.ts` does not install a global `fetch` mock. Tests that exercise
code paths calling real endpoints therefore fail in non-networked environments.
Impact: likely the dominant contributor to the 328 failures.

### 2. Chrome extension API scope

The root `vitest.setup.ts` does not define a `chrome` global. Chrome extension
tests (`src/extensions/chrome/src/**/*.test.ts`) rely on a local setup file
(`src/extensions/chrome/src/test/setup.ts`) that is only loaded for that scope.
Any extension test accidentally picked up by the root runner fails because
`chrome.*` is undefined.

### 3. Environment-dependent integration tests

Several tests require environment variables to be set:

- `FLEET_E2E_TOKEN` — FleetDM E2E (`describe.skipIf` gracefully handled)
- `RESEND_API_KEY` — set locally in `beforeEach`, expects specific shape
- `ANTHROPIC_API_KEY` — Anthropic SDK usage (mocked via `generateObject`)

Tests without `skipIf` guards fail hard when the variable is missing.

### 4. Database / Prisma dependency

Around 120 test files reference `fetch`, Prisma, or external APIs. The project
does not ship a global Prisma mock or test database bootstrap, so any test
that hits Prisma at runtime may fail.

### 5. Explicit skip markers

Seven `.skip` blocks are currently in the tree:

- `src/extensions/chrome/src/content/detectors/login-status.test.ts` (2)
- `src/lib/services/fleetdm/client.e2e.test.ts` (1 — `describe.skipIf`)
- `src/lib/services/notification/renewalAlert.test.ts` (1)
- `src/lib/services/payment/rematch.test.ts` (1)
- `src/lib/services/payment/subscription-sync.test.ts` (1)
- One additional in the content detectors area

## Roadmap

### v0.1.1 — Foundation (target ≥ 95% pass, ≤ 180 failures)

1. **Global `fetch` mock** — add `vi.stubGlobal('fetch', …)` or adopt MSW in
   `vitest.setup.ts`. Opt-in per-test override via local `vi.spyOn`.
2. **Unified Chrome stub** — merge the extension chrome mock into the root
   setup behind a per-suite opt-in, or document the suite boundary and enforce
   via vitest `projects`.
3. **CI env dummy values** — extend `.github/workflows/ci.yml` env block with
   safe dummy values for all required secrets referenced by tests.
4. **Audit the seven `.skip` markers** — reopen resolvable ones, wrap the
   truly environment-bound ones in `describe.skipIf(!env.X)` with inline
   rationale.

### v0.1.2 — Full suite (target ≥ 98% pass)

5. **Prisma test strategy** — introduce a dedicated test database or use
   `vitest-mock-extended` with a typed Prisma mock. Decide at the start of the
   milestone.
6. **MSW handler library** — consolidate external HTTP mocks (Resend,
   Anthropic, FleetDM) into reusable `msw` handlers under `tests/mocks/`.
7. **Coverage gate in CI** — raise the coverage threshold in
   `vitest.config.mts` progressively toward the 80 / 90 / 100 tiering
   documented in the CLAUDE operational guidelines.

### v1.0.0 — Stable

8. **Flaky-test detector** — integrate a retry-and-report mechanism so
   regressions surface as flake rather than silent pass.
9. **Public CI green requirement** — block merges on a red CI, without the
   current "known-failing" carve-out.

## References

- Audit (Confluence): https://wondermove-official.atlassian.net/wiki/spaces/DA/pages/1301348363
- Jira Epic DA-103, Pre-flight DA-111
- `vitest.config.mts`, `vitest.setup.ts`, `src/extensions/chrome/src/test/setup.ts`
