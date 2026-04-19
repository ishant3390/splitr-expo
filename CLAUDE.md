# Splitr - Expense Splitting App

## Overview
Splitr is a mobile expense splitting app (Expo/React Native) competing with Splitwise. Users create groups, add expenses, split costs, settle debts, and track balances.

## MVP Scope (Day 1)
- **Core features only**: Groups, expenses, splits, settlements, balances
- **Deferred to post-MVP (Day 2)**: AI Chat (`app/chat.tsx`), Receipt Scanning (`app/receipt-scanner.tsx`), 3D Touch Quick Actions — see `docs/ai-features.md`
- Backend AI endpoints are disabled; frontend routes still exist but are not linked from navigation
- The FAB (plus button) in the tab bar is the primary entry point for adding expenses

## Platform Launch Order (IMPORTANT)
**Web → iOS → Android**
- Web is the primary launch platform — all features must work fully on web first. All the features should work everywhere.
- Never gate features behind `Platform.OS !== "web"` unless they are truly impossible on web (e.g., camera permissions, biometric hardware)
- Prefer always-visible UI controls over gesture-only interactions (e.g., visible 3-dot menus instead of long-press-only)
- Long-press and native gestures are secondary affordances — the primary action path must be click/tap accessible on web
- When testing, run Playwright E2E against Expo web before native tests

## Tech Stack
- **Framework**: Expo SDK 52, React Native 0.76, Expo Router v4 (file-based routing)
- **Auth**: Clerk (`@clerk/clerk-expo` + `@clerk/clerk-react`) — OAuth (Google, Apple) + email/phone OTP. Web uses redirect-based OAuth (`signIn.authenticateWithRedirect`), native uses popup via `useOAuth`. SSO callback at `app/sso-callback.tsx`.
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
  group/[id].tsx        # Group detail (share/QR modal, gear → group-settings)
  edit-expense/[id].tsx # Edit expense
  create-group.tsx      # Create group form (name, type, emoji, currency)
  join/[code].tsx       # Join group via invite code
  invite/[code].tsx     # Re-export of join screen
  settle-up.tsx         # Settlement screen (suggestions + history + confetti)
  payment-methods.tsx   # Payment handle settings
  chat.tsx              # AI chat (Day 2)
  receipt-scanner.tsx   # Receipt scanning (Day 2)
  edit-profile.tsx, onboarding.tsx, pending-expenses.tsx
  privacy-security.tsx, group-settings.tsx, device-contacts.tsx
  notification-settings.tsx
components/
  ui/                   # Reusable UI (Button, Card, Avatar, Input, Toast, Confetti, etc.)
  ui/multi-currency-amount.tsx  # Renders CurrencyAmount[] with accessibility
  ui/payment-links-section.tsx  # "Pay Directly" deep link pills
  ui/upi-qr-modal.tsx           # UPI QR modal (web only)
  TabBar.tsx            # Custom animated tab bar with FAB + long-press quick-add
  NetworkProvider.tsx   # Network context, offline banner, auto-sync
  NotificationProvider.tsx # Push notification lifecycle (native-only, web passthrough)
  icons/                # Custom SVGs (auth logos, tab icons, payment brands, wordmark)
lib/
  api.ts                # REST client (usersApi, groupsApi, expensesApi, settlementsApi, etc.)
  types.ts              # TypeScript interfaces/DTOs
  utils.ts              # cn(), formatCents(), formatDate(), getInitials(), etc.
  screen-helpers.ts     # aggregateByPerson/Category/Month, filterExpenses, inferCategory, etc.
  hooks.ts              # React Query hooks for all API data
  query.ts              # QueryClient config, query keys, stale times
  errors.ts             # SplitError, ERROR_MESSAGES, parseApiError(), getUserMessage()
  api-interceptor.ts    # handleApiError() — category-level routing
  idempotency.ts        # Idempotency key generation + AsyncStorage + retry wrapper
  offline.ts            # AsyncStorage-based offline expense queue
  currencies.ts         # Currency constants, region map, detectDefaultCurrency()
  payment-links.ts      # Payment deep link utilities (URL, validation, region mapping)
  tokens.ts             # Design token source of truth
  biometrics.ts, notifications.ts, haptics.ts, image-utils.ts
  device-contacts.ts, mention-utils.ts, mention-recency.ts
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
- Amounts stored in cents (use `amountToCents()` / `formatCents(cents, currency)`)
- **Amount input sanitization**: Use `sanitizeAmountInput()` for currency fields, `sanitizePercentInput()` for percentage fields (caps at 100). All amount TextInputs must have `inputMode="decimal"` for web keyboard support alongside `keyboardType="decimal-pad"` for native.
- **Multi-currency display**: Cross-group screens use `useUserBalance().totalOwedByCurrency` / `totalOwingByCurrency` arrays. Single-group screens pass `group.defaultCurrency`. Use `MultiCurrencyAmount` component for multi-currency rendering, `formatMultiCurrency()` for string contexts. Use `useGroupCurrencyMap()` hook to resolve per-activity-item currency. Use `getCurrencySymbol(currency)` instead of hardcoded `$`/`£`/`€` ternary chains.
- Deduplicate member lists (API sometimes returns duplicates)
- Backend category `icon` field returns icon names (e.g. "restaurant"), not emojis — use `getCategoryEmoji()` from `lib/screen-helpers` to convert to emoji
- Auto-category inference: `inferCategoryFromDescription(description, categories)` in `lib/screen-helpers` — keyword-maps description to a category id. Respects manual overrides via `userPickedCategoryRef`. Does not override on initial load in edit screen (guarded by `initialDescriptionRef`)
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
- **Cache invalidation after direct API calls**: Any screen calling APIs directly (outside React Query `useMutation` hooks) MUST call the matching invalidation helper from `lib/query.ts`. Prefer mutation hooks from `lib/hooks.ts` which handle this automatically.
- **Image uploads**: All image uploads MUST go through `compressImage()` from `lib/image-utils.ts` before network transfer (resizes to 1600px, JPEG 0.7). Max upload size is 10MB. Use `sanitizeImageUrl()` when reading image URLs from backend responses. Upload mutations set query data directly with `?t=` cache-bust. Profile photo uploads also sync to Clerk via `clerkUser.setProfileImage()`.
- **Web focus reliability**: `useFocusEffect` is unreliable on web; screens that need refetch-on-focus should also use `useIsFocused()` from `@react-navigation/native` as a state-based fallback
- **Error handling**: Never use `msg.includes("ERR-xxx")` string matching. Use `parseApiError(err)` from `lib/errors.ts` to extract structured `ApiErrorBody`, then `getUserMessage(apiErr)` for user-facing strings. Pattern: `const apiErr = parseApiError(err); toast.error(apiErr ? getUserMessage(apiErr) : "Fallback message.");`
- **Error types**: `SplitError extends Error` carries parsed backend error body. `request()` in `lib/api.ts` throws `SplitError` for JSON error responses with a `code` field, plain `Error` for non-JSON.
- **Error codes**: 34 codes mapped in `ERROR_MESSAGES` (`lib/errors.ts`). Categories: GENERAL, VALIDATION, AUTHENTICATION, AUTHORIZATION, RESOURCE, BUSINESS_LOGIC, EXTERNAL_SERVICE. See `pipeline/fe/error-handling-spec.md` for full reference.
- **Business logic errors**: Use `toast.info()` (not `toast.error()`) — these are expected states (nudge cooldown, already a member, quota exceeded).
- **Version conflict**: Use `isVersionConflict(err)` from `lib/api.ts` — checks `ERR-302` code specifically, does NOT false-positive on `ERR-409`.
- **Idempotency**: `POST /expenses` and `POST /settlements` automatically include `Idempotency-Key` header (UUID v4) via `withIdempotency()` wrapper. Keys persisted to AsyncStorage for crash recovery. Retry with exponential backoff on ERR-415 (in-flight) and 5xx.
- **Correlation ID**: Every API request includes `X-Correlation-ID` header (UUID v4) via `request()`. Backend echoes the ID in response. Enables end-to-end traceability.
- **429 retry**: `request()` automatically retries once on 429 for safe requests (GET/HEAD/OPTIONS) and idempotent POSTs (with `Idempotency-Key`). Parses `Retry-After` header for delay (default 5s).

## Key API Endpoints
- `POST /v1/groups/{groupId}/expenses` — expenses always belong to a group
- `GET /v1/categories` — returns categories with `id`, `name`, `icon` (icon name string)
- `GET /v1/users/me/activity` — user activity feed (details may include categoryName)
- `GET /v1/users/me/balance` — multi-currency: `{ totalOwed: CurrencyAmount[], totalOwing: CurrencyAmount[] }`; FE normalizes via `sumAmounts()` in `useUserBalance` hook
- `GET /v1/users/me` — returns current user (auto-creates from JWT claims if user doesn't exist); call on app startup after login
- `POST /v1/users/sync` — **admin-only** bulk endpoint; do NOT call from frontend
- `GET /v1/groups/{groupId}/settlements/suggestions` — debt simplification suggestions
- `POST /v1/groups/{groupId}/settlements` — record a settlement payment
- `GET /v1/groups/{groupId}/settlements` — list settlement history
- `DELETE /v1/settlements/{settlementId}` — soft-delete a settlement (reverses balances)
- `PUT /v1/settlements/{settlementId}` — update settlement (optimistic locking via `version` — **mandatory**, 400 without)
- `PUT /v1/expenses/{expenseId}` — update expense (optimistic locking via `version` — **mandatory**, 400 without)
- `PATCH /v1/groups/{groupId}` — update group (version optional but recommended)
- `PATCH /v1/users/me` — update user profile/preferences/paymentHandles (no version needed)
- `PATCH /v1/groups/{groupId}/members/{memberId}` — update member (no version needed)
- `GET /v1/groups/invite/{inviteCode}` — public group preview (no auth, returns GroupInvitePreviewDto)
- `POST /v1/groups/join` — join group via invite code `{ inviteCode }` (handles duplicates, guest-to-user promotion)
- `POST /v1/groups/{groupId}/invite/regenerate` — regenerate invite code (invalidates old link)
- `GET /v1/users/me/contacts` — deduplicated contacts from all user's groups
- `POST /v1/groups/{groupId}/nudge` — send settlement reminder to debtor (`{ targetUserId }`); ERR-407 = cooldown
- `GET /v1/groups?status=active|archived` — filter groups by lifecycle status

## Invite / Join Flow
- Groups auto-generate an `inviteCode` on creation
- Invite URL format: `https://splitr.ai/invite/{inviteCode}`
- Share modal shows link first, QR code behind "Show QR Code" toggle
- Deep links: iOS `associatedDomains` + Android `intentFilters` configured in `app.json`
- Join screen handles error codes: ERR-301 (already member), ERR-300 (not found), ERR-401 (expired), ERR-402 (archived)
- Guest-to-user promotion is automatic on backend when emails match
- Add Member modal: name (required) + email (optional); email provided → `POST /members/invite` (sends invite email); name only → `addGuestMember`
- Email invite endpoint: `POST /v1/groups/{groupId}/members/invite { email, name? }` — handles known users, unknown (guest with provided name), and already-member (ERR-409)
- Self-add prevention: FE compares entered email against `clerkUser.primaryEmailAddress` before calling invite API. Shows `toast.info("You're already a member of this group.")`
- Universal link files: `well-known/apple-app-site-association` + `well-known/assetlinks.json` — BE must host at `https://splitr.ai/.well-known/`

## Push Notifications
- Token registration: `POST /v1/users/me/push-tokens` — `{ token, deviceId, deviceName, platform }`
- Global toggle: `PATCH /v1/users/me` — `{ preferences: { notifications: true/false } }`
- Per-group toggle: `PATCH /v1/groups/{groupId}/members/{memberId}` — `{ notificationsEnabled: true/false }`
- Payload routing: `expense_*` → `/group/{groupId}`, `settlement_created` → `/settle-up?groupId={groupId}`
- Foreground filtering: `configureForegroundHandler()` reads per-category prefs, suppresses via `getNotificationCategory()`
- Web platform: passthrough — no expo-notifications on web
- See `docs/push-notifications.md` for full spec

## Onboarding
- **Screen**: `app/onboarding.tsx` — 5-step walkthrough (Welcome, Your Currency, Create Group, Add Expenses, Settle Up)
- **Currency step**: Pre-selects detected currency from device locale; user can change. Saves to backend on complete via `usersApi.updateMe()`
- **Gate**: `AuthGate` in `_layout.tsx` checks `@splitr/onboarding_complete` AsyncStorage key
- First-time signed-in users redirect to `/onboarding` instead of `/(tabs)`
- **Auto-detect fallback**: `_layout.tsx` auto-detects currency for existing users who have no `defaultCurrency` set (skips if `needsOnboarding` to avoid race condition)

## AI Chat & Receipt Scanning (Day 2 — Deferred)
Routes exist but are unlinked. See `docs/ai-features.md` for full spec including SSE events, interactive cards, @mention system, quota, and receipt flow.

## Group Lifecycle
- **Archive/Unarchive**: `PATCH /v1/groups/{id}` with `{ isArchived: true/false, version }` — long-press action sheet in Groups screen
- **Filtering**: `GET /v1/groups?status=active|archived` — Active/Archived tab toggle in Groups screen
- **Hook**: `useArchiveGroup()` mutation in `lib/hooks.ts`

## Settlement Nudges
- **API**: `POST /v1/groups/{id}/nudge` with `{ targetUserId }` — nudge button in settle-up suggestions
- **Cooldown**: ERR-407 / 429 → "Already reminded recently, try again later"
- **UI**: `settle-up.tsx` tracks nudging/nudged state per user
- **Display gate**: Nudge card shows only after 30+ days of unsettled debt (BE-16, user-configurable via `nudgeGraceDays`)

## Payment Deep Links
- Users configure handles (Venmo, PayPal, Cash App, Zelle, UPI, Revolut, Monzo) in `app/payment-methods.tsx`
- `lib/payment-links.ts` — URL construction, validation, region mapping; `components/icons/payment-icons.tsx` — brand SVGs
- Region mapping: USD (venmo/paypal/cashapp/zelle), INR (upi/paypal), GBP (paypal/revolut/monzo), EUR (paypal/revolut)
- Pay Directly pills in settle-up: gated by current user is debtor AND creditor has `toUserPaymentHandles`
- Post-payment: user explicitly confirms → records settlement with provider as `paymentMethod` (plain String, no enum)
- Special cases: Zelle = clipboard copy, Cash App = no amount pre-fill, UPI on web = QR modal
- Trust principle: never claim payment succeeded — deep links hand off, user explicitly confirms
- Privacy: `paymentHandles` only exposed via `toUserPaymentHandles` in settlement suggestions, NOT on `UserSummaryDto`

## Optimistic Locking
- **Mandatory**: `PUT /v1/expenses/{id}` and `PUT /v1/settlements/{id}` — 400 without `version`
- **Optional**: `PATCH /v1/groups/{id}` — recommended but won't 400
- **Not needed**: `PATCH /v1/users/me`, `PATCH /v1/groups/{id}/members/{id}`

## Currency System
- **Shared constants**: `lib/currencies.ts` — 7 supported currencies (USD, EUR, GBP, INR, CAD, AUD, JPY). `detectDefaultCurrency()` uses `expo-localization`
- **User preference**: `defaultCurrency` on `UserDto`, set during onboarding or via profile edit
- **Group currency**: Each group has `defaultCurrency`, inherited from user's preference on creation

## Multi-Currency Net Balance (BE-17)
- `GET /v1/users/me/balance` returns `netBalanceConverted: { amount, currency, isEstimate, ratesAsOf }` — FX-converted net in user's `defaultCurrency`
- **Frontend display priority**:
  1. `netBalanceConverted` exists → show converted amount with "Estimated in {currency}" label
  2. Multi-currency, no conversion → show per-currency net breakdown (e.g., `+£2.00  -$50.00`)
  3. Single currency → show exact net with `AnimatedNumber`
- FX ownership: backend only (BE-10 contract). FE never calls FX providers

## Wordmark Logo
- **Component**: `components/icons/splitr-wordmark.tsx` — SVG with `dark` and `light` variants
- **Usage**: Home screen header (`app/(tabs)/index.tsx`)

## Known Gaps
- Activity `details.categoryName` — confirm backend populates this for category filtering
- Deep link universal links — FE fully configured; BE must host `well-known/` files at `https://splitr.ai/.well-known/`

## Testing

### Mandatory Rules
- **Every new feature or bug fix MUST include tests** before it is considered complete
- Pure utility functions: unit test in `__tests__/lib/`
- UI components: render + interaction tests in `__tests__/components/`
- Screen-level logic helpers: test in `__tests__/helpers/`
- API client changes: mock fetch and verify request/response in `__tests__/lib/api.test.ts`
- Run `npm test` before committing to ensure no regressions
- **Wide-impact changes (10+ files)**: MUST also run `npm run test:e2e` before considering complete

### Coverage Targets — 100% (MANDATORY)
- Target 100% statement coverage on ALL files — lib/, components/ui/, screens, helpers
- Every new file MUST ship with tests covering all branches and edge cases
- Every bug fix MUST include a regression test
- Use `npm run test:coverage` to verify before committing; flag any file below 95%
- **Current baseline** (2331 unit / 86 suites, 124 smoke, 96 integration, 57 dev-sanity): 95.39% statements, 82.76% branches, 96.72% lines

See `docs/testing.md` for full setup, E2E config, integration + dev-sanity guide, and test conventions.

## Deployment
| Env | Frontend | Backend |
|-----|----------|---------|
| **Local** | `localhost:8081` | `localhost:8085` |
| **Dev** | `https://dev.splitr.ai` | `https://api-dev.splitr.ai/api` |
| **Prod** | `https://splitr.ai` | TBD |

- **Frontend**: Cloudflare Pages — auto-deploys on push to `main`, `npm run build:web`
- **Backend**: Railway at `api-dev.splitr.ai`
- See `docs/deployment.md` for full CF Pages config, env vars, and known constraints.

## Commands
```bash
npx expo start                        # Start dev server
npx expo start --clear                # Start with cache clear
npm test                              # Run all unit/component tests
npm run test:watch                    # Run tests in watch mode
npm run test:coverage                 # Run tests with coverage report
npm run test:e2e                      # Run Playwright smoke tests (no backend needed)
npm run test:e2e:ui                   # Smoke tests with Playwright UI
npm run test:e2e:headed               # Smoke tests in headed browser
npm run test:e2e:integration          # Run integration tests (backend at :8085 required)
npm run test:e2e:integration:headed   # Integration tests in headed browser
npm run test:e2e:all                  # Run both smoke + integration suites
npm run test:e2e:dev-sanity           # Run dev sanity tests against dev.splitr.ai
npm run test:e2e:dev-sanity:headed    # Dev sanity tests in headed browser
npm run build:web                     # Build Expo web for production (outputs dist/)
npm run build:web:dev                 # Build with dev API URL baked in
npm run serve:web                     # Serve built dist/ locally (SPA mode)
```

## Design Context
**Brand**: Friendly. Clear. Effortless. Clean fintech meets warm social app. Teal primary — trust without coldness. References: Revolut/Wise (data), Venmo (casual), Airbnb (warmth). Anti-reference: Splitwise (dated/cluttered).
See `docs/design-context.md` for brand personality, aesthetic direction, and design principles.

## Design Token Usage
- **Token source of truth**: `lib/tokens.ts` — all colors, spacing, typography, radii, z-index, durations
- **Spec files**: `specs/` — read before writing/modifying UI code
- **Audit**: Run `npm run audit:tokens` before committing UI changes. Zero errors required.
- **Rule**: Never hardcode hex colors, font sizes, border radii, or font families. Use `tokens.*` for inline styles and Tailwind classes for `className`.
- **Dark mode**: Use `const c = useThemeColors()` for inline styles. Use NativeWind semantic classes (`text-foreground`, `bg-card`, etc.) for className.
- **Import pattern**: `import { colors, fontSize as fs, fontFamily as ff, radius, palette } from "@/lib/tokens"` — alias `fontSize`/`fontFamily` to avoid name collisions.
- **Scope**: Each component/function that uses `c.*` must define `const c = colors(isDark)` in its own scope.

## External Pipeline
- **Location**: `../pipeline/` (one level above this repo)
- **FE tasks**: `pipeline-fe.md` — read for pending work, update status when picking/completing
- **BE requests**: `pipeline-be.md` — write here when FE needs something from backend
- **Workflow**: Check pipeline → read spec in `fe/` → plan → get approval → implement → mark `done`

## Mandatory Engineering Workflow
- **Always plan first** for any non-trivial task.
- Planning must include **research first**:
  - codebase investigation,
  - internet/library research when dependencies or versions are involved,
  - latest compatible versions and migration notes where relevant.
- After plan creation, **show the plan to the user and wait for approval**.
- **Do not implement until explicit user approval** (`go`, `start`, `implement`, etc.).
- After implementation, run a **critical review loop**:
  - start sub-agents/code-review agents,
  - fix findings,
  - re-review until no high-impact issues remain.
- Then run verification:
  - targeted regression tests for changed areas,
  - required broader tests (including E2E where applicable).
- At task end, run a short **learning pass**:
  - capture mistakes/lessons from session,
  - update instructions/memory so the same issue is prevented.
