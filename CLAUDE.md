# Splitr - Expense Splitting App

## Overview
Splitr is a mobile expense splitting app (Expo/React Native) competing with Splitwise. Users create groups, add expenses, split costs, settle debts, and track balances.

## Tech Stack
- **Framework**: Expo SDK 52, React Native 0.76, Expo Router v4 (file-based routing)
- **Auth**: Clerk (`@clerk/clerk-expo`) — OAuth (Google, Apple, Facebook, Instagram) + email/phone OTP
- **Styling**: NativeWind v4 + Tailwind CSS v3 (class-based, `cn()` utility for merging)
- **Icons**: `lucide-react-native` (primary), custom SVGs in `components/icons/`
- **Fonts**: Inter (4 weights: Regular, Medium, SemiBold, Bold)
- **State**: Local React state + `useFocusEffect` for data refresh on screen focus
- **API**: REST client at `lib/api.ts`, backend at `EXPO_PUBLIC_API_URL`

## Project Structure
```
app/                    # Screens (Expo Router file-based)
  (auth)/               # Unauthenticated routes (sign-in, signup, OTP)
  (tabs)/               # Main tab navigation (Home, Groups, Add, Activity, Profile)
  group/[id].tsx        # Group detail (dynamic route, share/QR modal, name-first add member)
  edit-expense/[id].tsx # Edit expense (dynamic route)
  create-group.tsx      # Create group form (name-only members, post-creation share sheet)
  join/[code].tsx       # Join group via invite code (deep link landing)
  invite/[code].tsx     # Re-export of join screen (matches deep link URL path)
  settle-up.tsx         # Settlement screen (suggestions + history)
  chat.tsx              # AI chat assistant
  receipt-scanner.tsx   # Receipt scanning (OCR endpoint still mocked)
  edit-profile.tsx      # Edit profile
components/
  ui/                   # Reusable UI components (Button, Card, Avatar, Input, etc.)
  icons/                # Custom SVG icons (social auth logos)
lib/
  api.ts                # API client (usersApi, groupsApi, categoriesApi, expensesApi, settlementsApi, inviteApi, contactsApi)
  types.ts              # TypeScript interfaces/DTOs
  utils.ts              # cn(), formatCents(), formatDate(), getInitials(), etc.
```

## Design System
- **Primary**: `#0d9488` (teal-600)
- **Accent**: `#14b8a6` (teal-500)
- **Success**: `#10b981` (emerald-500)
- **Destructive**: `#ef4444` (red-500)
- **Background**: `#f8fafb` / Dark: `#0f172a`
- **Card**: `#ffffff` / Dark: `#1e293b`
- Dark mode supported via NativeWind `useColorScheme()`

## Conventions
- Use NativeWind className for styling (not inline styles)
- Use `cn()` from `lib/utils` for conditional classes
- Use `getToken()` from Clerk for API auth headers
- API responses may be `{ key: T[] }` maps — use `flattenMap()` in api.ts
- Amounts stored in cents (use `amountToCents()` / `formatCents()`)
- Deduplicate member lists (API sometimes returns duplicates)
- Backend category `icon` field returns icon names (e.g. "restaurant"), not emojis — use `getCategoryEmoji()` mapping in add.tsx / edit-expense to convert to emoji
- Groups have `groupType` (trip/home/couple/etc.) and `emoji` fields for display
- When no groups exist, Add Expense auto-creates a "Personal" group
- Default currency for new groups comes from `GET /v1/users/me` → `defaultCurrency`

## Key API Endpoints
- `POST /v1/groups/{groupId}/expenses` — expenses always belong to a group
- `GET /v1/categories` — returns categories with `id`, `name`, `icon` (icon name string)
- `GET /v1/users/me/activity` — user activity feed (details may include categoryName)
- `POST /v1/users/sync` — syncs Clerk user with backend on sign-in
- `GET /v1/groups/{groupId}/settlements/suggestions` — debt simplification suggestions
- `POST /v1/groups/{groupId}/settlements` — record a settlement payment
- `GET /v1/groups/{groupId}/settlements` — list settlement history
- `DELETE /v1/settlements/{settlementId}` — soft-delete a settlement (reverses balances)
- `PUT /v1/settlements/{settlementId}` — update settlement (optimistic locking via `version`)
- `GET /v1/groups/invite/{inviteCode}` — public group preview (no auth, returns GroupInvitePreviewDto)
- `POST /v1/groups/join` — join group via invite code `{ inviteCode }` (handles duplicates, guest-to-user promotion)
- `POST /v1/groups/{groupId}/invite/regenerate` — regenerate invite code (invalidates old link)
- `GET /v1/users/me/contacts` — deduplicated contacts from all user's groups

## Invite / Join Flow
- Groups auto-generate an `inviteCode` on creation
- Invite URL format: `https://splitr.app/invite/{inviteCode}`
- Share modal shows link first, QR code behind "Show QR Code" toggle
- Deep links: iOS `associatedDomains` + Android `intentFilters` configured in `app.json`
- Join screen handles error codes: ERR-301 (already member), ERR-300 (not found), ERR-401 (expired), ERR-402 (archived)
- Guest-to-user promotion is automatic on backend when emails match
- Members can be added by name only (no email required) — `AddGuestMemberRequest.email` is optional

## Known Gaps (Not Yet Implemented)
- Receipt scanning is fully mocked (no real OCR endpoint)
- Push notifications (no token registration, no expo-notifications)
- `GET /v1/users/me/balance` aggregate endpoint (home screen does N+1 calls)
- Activity `details.categoryName` — confirm backend populates this for category filtering
- Deep link testing: universal links require AASA file hosted on splitr.app domain

## Testing

### Setup
- **Unit/Component**: Jest + `@testing-library/react-native` via `jest-expo` preset
- **Config**: `jest.config.js`, setup file at `__tests__/setup.ts`
- **Structure**: `__tests__/lib/`, `__tests__/components/`, `__tests__/screens/`, `__tests__/helpers/`

### Testing Rules (MANDATORY)
- **Every new feature or bug fix MUST include tests** before it is considered complete
- Pure utility functions: unit test in `__tests__/lib/`
- UI components: render + interaction tests in `__tests__/components/`
- Screen-level logic helpers: test in `__tests__/helpers/`
- API client changes: mock fetch and verify request/response in `__tests__/lib/api.test.ts`
- Run `npm test` before committing to ensure no regressions

### Test Conventions
- Mock external deps (Clerk, expo-router, expo-haptics, etc.) in `__tests__/setup.ts`
- Use `@testing-library/react-native` for component tests (render, screen, fireEvent)
- Use `jest.useFakeTimers()` for time-dependent tests
- Test file naming: `<module>.test.ts` or `<Component>.test.tsx`
- For screen helpers (e.g., notification formatters), extract pure functions and test separately

### Coverage Targets
- `lib/` (utils, api): 90%+
- `components/ui/`: 80%+
- Screen helpers: 80%+

### E2E Testing (Playwright)
- **Framework**: Playwright targeting Expo web (`react-native-web`)
- **Config**: `playwright.config.ts` — runs Expo web server on port 8081
- **Structure**: `e2e/` directory with `auth.setup.ts` + `*.spec.ts` files
- **Auth**: `@clerk/testing/playwright` injects Clerk session via `setupClerkTestingToken()`
- **Requires**: `CLERK_SECRET_KEY` in `.env.local` for authenticated tests
- **Auth setup**: `e2e/auth.setup.ts` extends base test fixture with Clerk token injection
- **Unauthenticated tests**: Use `@playwright/test` directly (e.g., `e2e/auth.spec.ts`)
- Run `npx playwright install chromium` once before first run

### E2E Test Conventions
- Import `{ test, expect }` from `./auth.setup` for authenticated tests
- Import from `@playwright/test` directly for unauthenticated tests
- Use resilient selectors: `getByText()`, `getByRole()`, `getByTestId()`
- Handle conditional UI (empty states vs data) with `.isVisible().catch(() => false)`
- Keep tests independent — each test navigates from `/` fresh

## Commands
```bash
npx expo start          # Start dev server
npx expo start --clear  # Start with cache clear
npm test                # Run all tests
npm run test:watch      # Run tests in watch mode
npm run test:coverage   # Run tests with coverage report
npm run test:e2e        # Run Playwright E2E tests
npm run test:e2e:ui     # Run E2E with Playwright UI
npm run test:e2e:headed # Run E2E in headed browser
```
