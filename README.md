# Splitr

Expense splitting app built with Expo/React Native. Create groups, add expenses, split costs, settle debts, and track balances.

## Tech Stack

- **Framework**: Expo SDK 52, React Native 0.76, Expo Router v4
- **Auth**: Clerk (`@clerk/clerk-expo`) — OAuth + email/phone OTP
- **Styling**: NativeWind v4 + Tailwind CSS v3
- **State**: React Query (`@tanstack/react-query`)
- **API**: REST client at `lib/api.ts`, backend at `EXPO_PUBLIC_API_URL`

## Getting Started

```bash
npm install
npx expo start          # Start dev server
npx expo start --web    # Start web only
npx expo start --clear  # Start with cache clear
```

### Environment Variables

Create `.env.local`:

```env
EXPO_PUBLIC_API_URL=http://localhost:8085/api
CLERK_SECRET_KEY=sk_test_...          # For E2E tests
E2E_CLERK_USER_EMAIL=your@email.com   # For E2E tests
```

## Testing

### Unit / Component Tests (Jest)

```bash
npm test                # Run all tests
npm run test:watch      # Watch mode
npm run test:coverage   # Coverage report
```

- **Framework**: Jest + `@testing-library/react-native` via `jest-expo`
- **Structure**: `__tests__/lib/`, `__tests__/components/`, `__tests__/screens/`, `__tests__/helpers/`
- **Current baseline**: 825 tests, 59 suites

### E2E Smoke Tests (Playwright)

UI presence tests that verify screens render correctly. No backend required.

```bash
npx playwright install chromium  # One-time setup
npm run test:e2e                 # Run smoke tests
npm run test:e2e:ui              # Playwright UI mode
npm run test:e2e:headed          # Headed browser
```

- **117 tests** across 17 spec files in `e2e/*.spec.ts`
- Auth via `@clerk/testing/playwright` (requires `CLERK_SECRET_KEY`)
- Targets Expo web on port 8081

### E2E Integration Tests (Playwright + Backend)

Full CRUD integration tests that run against the live backend at `localhost:8085`. Tests create real data, verify it in the UI, and clean up after themselves.

```bash
npm run test:e2e:integration          # Run integration tests
npm run test:e2e:integration:headed   # Headed browser
npm run test:e2e:all                  # Run both smoke + integration
```

**Prerequisites:**
- Backend running at `http://localhost:8085`
- `CLERK_SECRET_KEY` and `E2E_CLERK_USER_EMAIL` in `.env.local`
- `npx playwright install chromium` (if not already done)

**Architecture:**

```
e2e/integration/
  helpers/
    api-client.ts      # Direct REST client for test setup/teardown
    fixtures.ts        # Test data factories with [E2E] prefix
    cleanup.ts         # Extended Playwright fixture with auto-cleanup
  group-lifecycle.spec.ts       # 5 tests — create, detail, archive, restore, delete
  expense-lifecycle.spec.ts     # 5 tests — UI add, API add, delete, auto-category, split validation
  settlement-flow.spec.ts       # 6 tests — suggestions, record payment, history, balance, delete revert
  member-management.spec.ts     # 5 tests — add guest, API add, count, remove, email member
  home-data.spec.ts             # 5 tests — balance card, owed amounts, activity, category filter, nav
  profile-management.spec.ts    # 3 tests — display data, edit name, change currency
  activity-data.spec.ts         # 5 tests — time grouping, descriptions, settlements, search, pagination
  invite-flow.spec.ts           # 4 tests — share modal, preview, self-join, regenerate code
  search-filter.spec.ts         # 3 tests — match, no-match, clear search
  navigation-data.spec.ts       # 5 tests — group nav, expense edit, back nav, tab state, View All
  settings-screens.spec.ts      # 4 tests — notifications, privacy, help, payment methods
```

**50 integration tests** across 11 spec files.

**Key design decisions:**
- Backend health check runs `beforeAll` — skips suite with clear error if backend is down
- Uses `page.waitForResponse()` instead of `waitForTimeout()` for API-dependent waits
- All test data prefixed with `[E2E]` + timestamp for uniqueness
- Tracked resources auto-cleaned in reverse order (settlements -> expenses -> groups)
- Tests are independent — no ordering dependencies between spec files

**Test data strategy:**
- `api-client.ts` tracks all created resources and deletes them in `cleanup()` called via `afterEach`
- `fixtures.ts` generates unique payloads with `[E2E]` prefix + base36 timestamp
- `cleanup.ts` extends the Playwright test fixture to inject `apiClient` and auto-cleanup

## Project Structure

```
app/                    # Screens (Expo Router file-based routing)
  (auth)/               # Unauthenticated routes
  (tabs)/               # Main tab navigation (Home, Groups, Add, Activity, Profile)
  group/[id].tsx        # Group detail
  edit-expense/[id].tsx # Edit expense
  create-group.tsx      # Create group form
  settle-up.tsx         # Settlement screen
  chat.tsx              # AI chat assistant
  receipt-scanner.tsx   # Receipt scanning
components/
  ui/                   # Reusable UI components
  TabBar.tsx            # Custom animated tab bar
  icons/                # Custom SVG icons
lib/
  api.ts                # REST API client
  types.ts              # TypeScript interfaces
  hooks.ts              # React Query hooks
  utils.ts              # Utility functions
e2e/                    # Playwright E2E tests
  *.spec.ts             # Smoke tests (no backend needed)
  integration/          # Integration tests (backend required)
__tests__/              # Jest unit/component tests
```

## Design System

- **Primary**: `#0d9488` (teal-600)
- **Accent**: `#14b8a6` (teal-500)
- **Success**: `#10b981` (emerald-500)
- **Destructive**: `#ef4444` (red-500)
- Dark mode supported via NativeWind

## Platform Launch Order

**Web -> iOS -> Android** — Web is the primary launch platform.
