# Splitr - Expense Splitting App

## Overview
Splitr is a mobile expense splitting app (Expo/React Native) competing with Splitwise. Users create groups, add expenses, split costs, settle debts, and track balances.

## Tech Stack
- **Framework**: Expo SDK 52, React Native 0.76, Expo Router v4 (file-based routing)
- **Auth**: Clerk (`@clerk/clerk-expo`) — OAuth (Google, Apple, Facebook, Instagram) + email/phone OTP
- **Styling**: NativeWind v4 + Tailwind CSS v3 (class-based, `cn()` utility for merging)
- **Icons**: `lucide-react-native` (primary), custom SVGs in `components/icons/`
- **Fonts**: Inter (4 weights: Regular, Medium, SemiBold, Bold)
- **State**: React Query (`@tanstack/react-query`) for server state caching + `useFocusEffect` for refetch on screen focus
- **Hooks**: `lib/hooks.ts` — custom React Query hooks for all API data (useGroups, useUserBalance, etc.)
- **Query Config**: `lib/query.ts` — QueryClient, query keys, stale times, invalidation helpers
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
  settle-up.tsx         # Settlement screen (suggestions + history + confetti on full settle)
  chat.tsx              # AI chat assistant (SSE streaming, interactive cards, quota)
  receipt-scanner.tsx   # Receipt scanning (POST /v1/receipts/scan, confidence badges, quota)
  edit-profile.tsx      # Edit profile
  onboarding.tsx        # First-time user walkthrough (4 steps, AsyncStorage gate)
  pending-expenses.tsx  # View/discard offline-queued expenses
  privacy-security.tsx  # Biometric lock toggle, security settings
  notification-settings.tsx # Push notification preferences
components/
  ui/                   # Reusable UI components (Button, Card, Avatar, Input, etc.)
  ui/confetti.tsx       # Confetti animation (40 reanimated particles)
  ui/toast.tsx          # Toast system with action buttons + custom durations
  TabBar.tsx            # Custom animated tab bar (Airbnb-style bounce, sliding indicator, FAB with long-press quick-add)
  NetworkProvider.tsx   # Network context, offline banner, auto-sync
  NotificationProvider.tsx # Push notification lifecycle (native-only, web passthrough)
  icons/                # Custom SVG icons (social auth logos, tab bar icons)
lib/
  api.ts                # API client (usersApi, groupsApi, categoriesApi, expensesApi, settlementsApi, inviteApi, contactsApi)
  types.ts              # TypeScript interfaces/DTOs
  utils.ts              # cn(), formatCents(), formatDate(), getInitials(), etc.
  screen-helpers.ts     # Pure helpers: aggregateByPerson, aggregateByCategory, aggregateByMonth, filterExpenses, sortExpenses, etc.
  hooks.ts              # React Query hooks for all API data
  query.ts              # QueryClient config, query keys, stale times
  offline.ts            # AsyncStorage-based offline expense queue
  biometrics.ts         # Biometric lock utilities (expo-local-authentication)
  notifications.ts      # Push notification utilities (foreground handler, permissions, token, preferences)
  haptics.ts            # Haptic feedback wrappers
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
- Backend category `icon` field returns icon names (e.g. "restaurant"), not emojis — use `getCategoryEmoji()` from `lib/screen-helpers` to convert to emoji
- Groups have `groupType` (trip/home/couple/etc.) and `emoji` fields for display
- When no groups exist, Add Expense auto-creates a "Personal" group
- Default currency for new groups comes from `GET /v1/users/me` → `defaultCurrency`
- Add Expense supports quick mode via `?quick=true` param (long-press FAB) — shows simplified UI with equal split
- Smart defaults: last groupId + categoryId saved to AsyncStorage key `@splitr/add_expense_defaults`
- Destructive actions (expense/settlement delete) use deferred deletion with 5s undo toast
- Offline expenses queued in AsyncStorage, synced on reconnect via `NetworkProvider`
- Biometric lock gate in `_layout.tsx` wraps `AuthGate`, checks on app open + foreground resume
- Notifications: web platform renders passthrough (no expo-notifications on web)
- Per-group notification toggle in group detail: reads `member.notificationsEnabled`, toggles via `PATCH /v1/groups/{groupId}/members/{memberId}`

## Key API Endpoints
- `POST /v1/groups/{groupId}/expenses` — expenses always belong to a group
- `GET /v1/categories` — returns categories with `id`, `name`, `icon` (icon name string)
- `GET /v1/users/me/activity` — user activity feed (details may include categoryName)
- `GET /v1/users/me/balance` — aggregate balance (totalOwedCents, totalOwesCents, netBalanceCents); home screen falls back to N+1 if unavailable
- `GET /v1/users/me` — returns current user (auto-creates from JWT claims if user doesn't exist); call on app startup after login
- `POST /v1/users/sync` — **admin-only** bulk endpoint that syncs ALL users from Clerk API; do NOT call from frontend
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

## Push Notification Integration
- **Token registration**: `POST /v1/users/me/push-tokens` with `{ token, deviceId, deviceName, platform }`
- **Token deletion**: `DELETE /v1/users/me/push-tokens/{tokenId}`
- **Notification history**: `GET /v1/users/me/notifications?page=0&limit=20` — paginated, returns `NotificationDto[]`
- **Global toggle**: `PATCH /v1/users/me` with `{ preferences: { notifications: true/false } }` — server-side filtering
- **Per-group toggle**: `PATCH /v1/groups/{groupId}/members/{memberId}` with `{ notificationsEnabled: true/false }`
- **Payload format**: `data: { type, groupId }` — no `url` field, FE constructs routes:
  - `expense_created/updated/deleted/coalesced_expenses` → `/group/{groupId}`
  - `settlement_created` → `/settle-up?groupId={groupId}`
  - `member_joined_via_invite` → `/group/{groupId}`
- **Rate limiting**: BE-handled (5/hr, 15/day expenses; 20/day total)
- **Coalescing**: BE-handled (first immediate, subsequent batched in 60s window)

## Onboarding
- **Screen**: `app/onboarding.tsx` — 4-step walkthrough (Welcome, Create Group, Add Expenses, Settle Up)
- **Gate**: `AuthGate` in `_layout.tsx` checks `@splitr/onboarding_complete` AsyncStorage key
- First-time signed-in users redirect to `/onboarding` instead of `/(tabs)`
- Skip button on all steps except last; "Get Started" on final step
- Key protected from cache clear in `privacy-security.tsx`

## 3D Touch Quick Actions
- **Package**: `expo-quick-actions` — registered in `_layout.tsx` `RootLayout`
- **Actions**: Add Expense (`/(tabs)/add`), Scan Receipt (`/receipt-scanner`), View Groups (`/(tabs)/groups`)
- **Router**: `useQuickActionRouting()` in `app/(tabs)/_layout.tsx` handles navigation

## Receipt Scanning
- **Screen**: `app/receipt-scanner.tsx` — camera/gallery capture, sends base64 to backend
- **API**: `POST /v1/receipts/scan` with `{ image: base64String }` — returns `ReceiptScanResponseDto` (wrapper with quota)
- **Response**: `{ receipt: ReceiptScanResultDto, dailyScansUsed, dailyScanLimit }` — merchant, date, currency, subtotalCents, taxCents, tipCents, totalCents, lineItems[], confidence scores
- **UX**: Scan line animation, processing dots, confidence badges (Verify) for <0.9 fields, error/retry, quota display ("X of Y free scans used today")
- **Flow**: Scan -> results with line items + totals -> "Create Expense" pre-fills Add Expense form (amount, description, date)
- **Backend**: Gemini 2.0 Flash for OCR (not GPT-4o — 100x cheaper)

## AI Chat (Expense via Natural Language)
- **Screen**: `app/chat.tsx` — SSE streaming chat with interactive action cards
- **API**: `POST /v1/chat` with `{ conversationId: string|null, message: string }` — SSE response
- **Quota**: `GET /v1/chat/quota` — returns `ChatQuotaDto { dailyUsed, dailyLimit, resetsAt, tier }`
- **SSE Event Types**: `text`, `action_required`, `expense_created`, `quota`, `quota_exceeded`, `error`
- **Interactive Cards**:
  - `select_group` — tappable group cards with emoji, members, last activity
  - `confirm_expense` — full breakdown (description, total, splits, payer) with Confirm + Edit buttons
  - `confirm_create_group` — group name + members with Create button
- **Edit button**: Opens `/(tabs)/add` pre-filled with parsed data (amount, description, date, groupId, currency)
- **Quota UX**: Header shows remaining count when ≤5; input disabled + upgrade card when 0
- **Safety**: Unmount cleanup (abort + mountedRef), null token handling, double-send prevention (sendingRef), smart scroll (only auto-scroll when near bottom), React Query invalidation on expense creation
- **Cache invalidation**: `expense_created` → `invalidateAfterExpenseChange(groupId)`
- **Offline**: Detects via `useNetwork()`, disables input + shows offline banner
- **Stop generation**: Abort button shown during active streaming
- **Retry**: Failed messages show "Tap to retry" with stored original text
- **Tests**: 17 tests in `__tests__/screens/ChatScreen.test.tsx`

## Known Gaps (Not Yet Implemented)
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
