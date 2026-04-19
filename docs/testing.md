# Testing Guide

## Setup
- **Unit/Component**: Jest + `@testing-library/react-native` via `jest-expo` preset
- **Config**: `jest.config.js`, setup file at `__tests__/setup.ts`
- **Structure**: `__tests__/lib/`, `__tests__/components/`, `__tests__/screens/`, `__tests__/helpers/`

## Test Conventions
- Mock external deps (Clerk, expo-router, expo-haptics, etc.) in `__tests__/setup.ts`
- Use `@testing-library/react-native` for component tests (render, screen, fireEvent)
- Use `jest.useFakeTimers()` for time-dependent tests
- Test file naming: `<module>.test.ts` or `<Component>.test.tsx`
- For screen helpers (e.g., notification formatters), extract pure functions and test separately

## Test Quality Standards
- **Test behavior, not implementation** — assert what the user sees, not internal state
- **One assertion theme per test** — each test should verify one logical behavior
- **Descriptive test names** — read like a specification: "shows error toast when API returns 429"
- **No snapshot tests** — they rot fast and catch nothing meaningful
- **Mock at boundaries** — mock APIs, native modules, navigation; never mock the component under test
- **Edge cases matter** — empty states, error states, loading states, boundary values, offline
- **Async tests use waitFor** — never use arbitrary delays or fake timers in screen tests with data loading
- **Tests must be deterministic** — no reliance on timing, order, or external state

## E2E Smoke Tests (Playwright)
- **Framework**: Playwright targeting Expo web (`react-native-web`)
- **Config**: `playwright.config.ts` — `chromium` project for smoke, `integration` project for backend tests
- **Structure**: `e2e/*.spec.ts` (smoke) + `e2e/integration/*.spec.ts` (integration)
- **Auth**: `@clerk/testing/playwright` injects Clerk session via `setupClerkTestingToken()`
- **Requires**: `CLERK_SECRET_KEY` in `.env.local` for authenticated tests
- **Auth setup**: `e2e/auth.setup.ts` extends base test fixture with Clerk token injection
- **Unauthenticated tests**: Use `@playwright/test` directly (e.g., `e2e/auth.spec.ts`)
- **Count**: 129 smoke tests across 19 spec files
- Run `npx playwright install chromium` once before first run

## E2E Integration Tests (Playwright + Backend)
- **Purpose**: Full CRUD integration tests against live backend at `localhost:8085`
- **Structure**: `e2e/integration/` with 14 spec files (70 tests total)
- **Helpers**: `e2e/integration/helpers/` — `api-client.ts` (REST client), `fixtures.ts` (data factories), `cleanup.ts` (auto-cleanup fixture)
- **Auth fixture**: `cleanup.ts` extends Playwright test with `apiClient` injected + auto-cleanup via `afterEach`
- **Data strategy**: All test data prefixed with `[E2E]` + timestamp; tracked resources auto-deleted in reverse order
- **Backend health**: Every spec runs `ApiClient.isBackendHealthy()` in `beforeAll` — skips with clear message if backend is down
- **Timing**: Uses `page.waitForResponse()` instead of `waitForTimeout()` for API-dependent waits
- **Spec files**: 14 specs covering group/expense/settlement lifecycle, member management, home/activity data, invite flow, search, navigation, settings, payment handles, profile images, group banners

## Dev Sanity Tests (Playwright + Live Dev)
- **Purpose**: Sanity check against live `dev.splitr.ai` before promoting to prod
- **Structure**: `e2e/dev-sanity/` with 12 spec files (49 tests total)
- **Multi-user**: User A (browser + API), User B (API-only via temporary browser context token)
- **Helpers**: `e2e/dev-sanity/helpers/` — `sanity-auth.ts` (multi-user fixture), `sanity-fixtures.ts` (`[SANITY]` prefixed data)
- **Env vars**: `E2E_SANITY_USER_A_EMAIL`, `E2E_SANITY_USER_B_EMAIL` in `.env.local`
- **Data strategy**: All data prefixed with `[SANITY]` + timestamp; auto-cleaned via `ApiClient.cleanup()`
- **Config**: `playwright.config.ts` — `dev-sanity` project with `baseURL: "https://dev.splitr.ai"`, no webServer, 90s timeout, serial (1 worker)
- **429 handling**: `ApiClient.fetchWithRetry()` retries 429s with exponential backoff

## E2E Test Conventions
- **Smoke tests**: Import `{ test, expect }` from `./auth.setup`
- **Integration tests**: Import `{ test, expect }` from `./helpers/cleanup` (provides `apiClient`)
- **Dev sanity tests**: Import `{ test, expect }` from `./helpers/sanity-auth` (provides `userAClient`, `userBClient`)
- Import from `@playwright/test` directly for unauthenticated tests
- Use resilient selectors: `getByText()`, `getByRole()`, `getByTestId()`
- Handle conditional UI (empty states vs data) with `.isVisible().catch(() => false)`
- Keep tests independent — each test navigates from `/` fresh
- Integration tests must not leave stale `[E2E]` data — always use `apiClient` for setup/teardown
