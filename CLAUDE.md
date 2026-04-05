# Splitr - Expense Splitting App

## Overview
Splitr is a mobile expense splitting app (Expo/React Native) competing with Splitwise. Users create groups, add expenses, split costs, settle debts, and track balances.

## MVP Scope (Day 1)
- **Core features only**: Groups, expenses, splits, settlements, balances
- **Deferred to post-MVP (Day 2)**: AI Chat (`app/chat.tsx`), Receipt Scanning (`app/receipt-scanner.tsx`), 3D Touch Quick Actions for AI features
- Backend AI endpoints are disabled; frontend routes still exist but are not linked from navigation
- The FAB (plus button) in the tab bar is the primary entry point for adding expenses

## Platform Launch Order (IMPORTANT)
**Web → iOS → Android**
- Web is the primary launch platform — all features must work fully on web first
- Never gate features behind `Platform.OS !== "web"` unless they are truly impossible on web (e.g., camera permissions, biometric hardware)
- Prefer always-visible UI controls over gesture-only interactions (e.g., visible 3-dot menus instead of long-press-only)
- Long-press and native gestures are secondary affordances — the primary action path must be click/tap accessible
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
  group/[id].tsx        # Group detail (dynamic route, share/QR modal, name-first add member)
  edit-expense/[id].tsx # Edit expense (dynamic route)
  create-group.tsx      # Create group form (name, type, emoji, currency → post-creation share sheet; members added from group detail only)
  join/[code].tsx       # Join group via invite code (deep link landing)
  invite/[code].tsx     # Re-export of join screen (matches deep link URL path)
  settle-up.tsx         # Settlement screen (suggestions + history + confetti on full settle + payment deep links)
  payment-methods.tsx   # Payment handle settings (Venmo, PayPal, Cash App, Zelle, UPI, Revolut, Monzo)
  chat.tsx              # AI chat assistant (SSE streaming, interactive cards, quota)
  receipt-scanner.tsx   # Receipt scanning (POST /v1/receipts/scan, confidence badges, quota)
  edit-profile.tsx      # Edit profile
  onboarding.tsx        # First-time user walkthrough (4 steps, AsyncStorage gate)
  pending-expenses.tsx  # View/discard offline-queued expenses
  privacy-security.tsx  # Biometric lock toggle, security settings
  group-settings.tsx    # Group settings page (identity, members, preferences, danger zone — via gear icon)
  device-contacts.tsx   # Device contacts matching screen (expo-contacts, batch match API, add/invite per row — native only)
  notification-settings.tsx # Push notification preferences
components/
  ui/                   # Reusable UI components (Button, Card, Avatar, Input, etc.)
  ui/confetti.tsx       # Confetti animation (40 reanimated particles)
  ui/toast.tsx          # Toast system with action buttons + custom durations
  TabBar.tsx            # Custom animated tab bar (Airbnb-style bounce, sliding indicator, FAB with long-press quick-add)
  NetworkProvider.tsx   # Network context, offline banner, auto-sync
  NotificationProvider.tsx # Push notification lifecycle (native-only, web passthrough)
  icons/                # Custom SVG icons (social auth logos, tab bar icons, payment brand logos, splitr-wordmark)
  ui/multi-currency-amount.tsx # Renders CurrencyAmount[] as "£25.00 + $100.00" with accessibility
  ui/payment-links-section.tsx # "Pay Directly" deep link pills for settle-up
  ui/upi-qr-modal.tsx   # UPI QR code modal for web platform
lib/
  api.ts                # API client (usersApi, groupsApi, categoriesApi, expensesApi, settlementsApi, inviteApi, contactsApi, chatApi)
  types.ts              # TypeScript interfaces/DTOs
  utils.ts              # cn(), formatCents(), formatDate(), formatMemberSince(), getInitials(), etc.
  screen-helpers.ts     # Pure helpers: aggregateByPerson, aggregateByCategory, aggregateByMonth, filterExpenses, sortExpenses, inferCategoryFromDescription, etc.
  hooks.ts              # React Query hooks for all API data (+ useMergedContacts for @mention fallback)
  query.ts              # QueryClient config, query keys, stale times
  errors.ts             # SplitError class, ApiErrorBody type, ERROR_MESSAGES map, parseApiError(), getUserMessage()
  api-interceptor.ts    # handleApiError() — category-level routing (auth redirect, field errors, refetch, toasts)
  idempotency.ts        # Idempotency key generation, AsyncStorage persistence, withIdempotency() retry wrapper
  offline.ts            # AsyncStorage-based offline expense queue
  biometrics.ts         # Biometric lock utilities (expo-local-authentication)
  notifications.ts      # Push notification utilities (foreground handler with per-category filtering, permissions, token, preferences, getNotificationCategory mapping)
  currencies.ts         # Shared currency constants, region-to-currency map, detectDefaultCurrency()
  payment-links.ts      # Payment deep link utilities (URL construction, validation, region mapping, provider info)
  haptics.ts            # Haptic feedback wrappers
  image-utils.ts        # Image upload utilities: validateImage, pickImage, compressImage (expo-image-manipulator), buildImageFormData, sanitizeImageUrl
  device-contacts.ts    # Device contacts utilities: permission, reading, normalization, batch matching (native-only)
  mention-utils.ts      # @/# mention detection, filtering, insertion, wire format, recency merge
  mention-recency.ts    # AsyncStorage-backed recent mention tracking (cap 20)
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
- **Multi-currency display**: Cross-group screens (Home, Activity, Groups summary) use `useUserBalance().totalOwedByCurrency` / `totalOwingByCurrency` arrays. Single-group screens pass `group.defaultCurrency`. Use `MultiCurrencyAmount` component for multi-currency rendering, `formatMultiCurrency()` for string contexts. Use `useGroupCurrencyMap()` hook to resolve per-activity-item currency. Use `getCurrencySymbol(currency)` instead of hardcoded `$`/`£`/`€` ternary chains.
- Deduplicate member lists (API sometimes returns duplicates)
- Backend category `icon` field returns icon names (e.g. "restaurant"), not emojis — use `getCategoryEmoji()` from `lib/screen-helpers` to convert to emoji
- Auto-category inference: `inferCategoryFromDescription(description, categories)` in `lib/screen-helpers` — keyword-maps description to a category id. Used in `add.tsx` + `edit-expense/[id].tsx`. Respects manual overrides via `userPickedCategoryRef`. Does not override on initial load in edit screen (guarded by `initialDescriptionRef`)
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
- **Cache invalidation after direct API calls**: Any screen calling `groupsApi`/`expensesApi` directly (outside React Query `useMutation` hooks) MUST call the matching invalidation helper from `lib/query.ts` (`invalidateAfterGroupChange()`, `invalidateAfterExpenseChange(groupId)`, etc.). Prefer using mutation hooks from `lib/hooks.ts` which handle this automatically.
- **Image uploads**: All image uploads MUST go through `compressImage()` from `lib/image-utils.ts` before network transfer (resizes to 1600px, JPEG 0.7). Max upload size is 10MB. Use `sanitizeImageUrl()` when reading image URLs from backend responses (fixes double `https://` prefix). Upload mutations set query data directly with `?t=` cache-bust (no `invalidateQueries` — expo-image caches by URL). Profile photo uploads also sync to Clerk via `clerkUser.setProfileImage()`.
- **Web focus reliability**: `useFocusEffect` is unreliable on web; screens that need refetch-on-focus should also use `useIsFocused()` from `@react-navigation/native` as a state-based fallback
- **Error handling**: Never use `msg.includes("ERR-xxx")` string matching. Use `parseApiError(err)` from `lib/errors.ts` to extract structured `ApiErrorBody`, then `getUserMessage(apiErr)` for user-facing strings. Pattern: `const apiErr = parseApiError(err); toast.error(apiErr ? getUserMessage(apiErr) : "Fallback message.");`
- **Error types**: `SplitError extends Error` carries parsed backend error body. `request()` in `lib/api.ts` throws `SplitError` for JSON error responses with a `code` field, plain `Error` for non-JSON.
- **Error codes**: 34 codes mapped in `ERROR_MESSAGES` (`lib/errors.ts`). Categories: GENERAL, VALIDATION, AUTHENTICATION, AUTHORIZATION, RESOURCE, BUSINESS_LOGIC, EXTERNAL_SERVICE. See `pipeline/fe/error-handling-spec.md` for full reference.
- **Business logic errors**: Use `toast.info()` (not `toast.error()`) — these are expected states (nudge cooldown, already a member, quota exceeded).
- **Version conflict**: Use `isVersionConflict(err)` from `lib/api.ts` — checks `ERR-302` code specifically, does NOT false-positive on `ERR-409`.
- **Idempotency**: `POST /expenses` and `POST /settlements` automatically include `Idempotency-Key` header (UUID v4) via `withIdempotency()` wrapper in `lib/api.ts`. Keys persisted to AsyncStorage for crash recovery. Retry with exponential backoff on ERR-415 (in-flight) and 5xx. See `lib/idempotency.ts`.
- **Correlation ID**: Every API request includes `X-Correlation-ID` header (UUID v4) via `request()` in `lib/api.ts`. Backend echoes the ID in response. Finance mutations also send via audit context. Enables end-to-end traceability for debugging and user bug reports.
- **429 retry**: `request()` in `lib/api.ts` automatically retries once on 429 for safe requests (GET/HEAD/OPTIONS) and idempotent POSTs (with `Idempotency-Key`). Parses `Retry-After` header for delay (default 5s). E2E `ApiClient` sends `X-RateLimit-Bypass` header for sanity suite.

## Key API Endpoints
- `POST /v1/groups/{groupId}/expenses` — expenses always belong to a group
- `GET /v1/categories` — returns categories with `id`, `name`, `icon` (icon name string)
- `GET /v1/users/me/activity` — user activity feed (details may include categoryName)
- `GET /v1/users/me/balance` — multi-currency: `{ totalOwed: CurrencyAmount[], totalOwing: CurrencyAmount[] }`; FE normalizes via `sumAmounts()` in `useUserBalance` hook
- `GET /v1/users/me` — returns current user (auto-creates from JWT claims if user doesn't exist); call on app startup after login
- `POST /v1/users/sync` — **admin-only** bulk endpoint that syncs ALL users from Clerk API; do NOT call from frontend
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
- Email invite endpoint: `POST /v1/groups/{groupId}/members/invite { email, name? }` — handles known users, unknown (guest with provided name), and already-member (ERR-409). FE sends user-entered name to avoid email-prefix derivation.
- Self-add prevention: FE compares entered email against `clerkUser.primaryEmailAddress` before calling invite API. Shows `toast.info("You're already a member of this group.")`
- Universal link files: `well-known/apple-app-site-association` + `well-known/assetlinks.json` — BE must host at `https://splitr.ai/.well-known/` (fill in APPLE_TEAM_ID + Android SHA256 fingerprint)

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
- **Foreground filtering**: `configureForegroundHandler()` reads per-category prefs from AsyncStorage and suppresses display for disabled categories via `getNotificationCategory()` mapping

## Onboarding
- **Screen**: `app/onboarding.tsx` — 5-step walkthrough (Welcome, Your Currency, Create Group, Add Expenses, Settle Up)
- **Currency step**: Pre-selects detected currency from device locale (`expo-localization`); user can change. Saves to backend on complete via `usersApi.updateMe()`
- **Gate**: `AuthGate` in `_layout.tsx` checks `@splitr/onboarding_complete` AsyncStorage key
- First-time signed-in users redirect to `/onboarding` instead of `/(tabs)`
- Skip button on all steps except last; "Get Started" on final step
- Key protected from cache clear in `privacy-security.tsx`
- **Auto-detect fallback**: `_layout.tsx` auto-detects currency for existing users who have no `defaultCurrency` set (skips if `needsOnboarding` to avoid race condition with onboarding)

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
- **Split via Chat (B34)**: "Split via Chat" button on results → navigates to `/chat` with `receiptMessage` param containing natural language summary (merchant, amount, date, up to 5 line items). Chat auto-sends on mount.
- **Backend**: Gemini 2.0 Flash for OCR (not GPT-4o — 100x cheaper)

## AI Chat (Expense via Natural Language)
- **Screen**: `app/chat.tsx` — SSE streaming chat with interactive action cards
- **API**: `POST /v1/chat` with `{ conversationId: string|null, message: string, deterministic?: boolean }` — SSE response
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
- **Deterministic**: Confirm/Select sends `{ deterministic: true }` (skips LLM + quota)
- **@mention system**: `lib/mention-utils.ts` + `lib/mention-recency.ts` + `components/ui/mention-dropdown.tsx`
  - `@` triggers contact autocomplete, `#` triggers group autocomplete
  - Wire format: `@[Name](userId:id)`, `#[Group](groupId:id)`
  - Fallback: When contacts API empty, aggregates members from all groups via `useMergedContacts()`
  - Recency: AsyncStorage tracks last 20 mentioned people, shown first in dropdown
- **Polish**: Timestamps, typing indicator, long-press copy, follow-up pills, AsyncStorage persistence, bubble grouping, a11y labels, FlatList optimization, scroll-to-bottom FAB
- **Receipt → Chat**: `receiptMessage` route param auto-sends on mount (B34)
- **Balance queries**: Natural language via 4 LLM tools (`get_user_balance`, `get_balance_with_user`, `get_cross_group_balances`, `get_group_balance`)

## Group Lifecycle
- **Archive/Unarchive**: `PATCH /v1/groups/{id}` with `{ isArchived: true/false, version }` — long-press action sheet in Groups screen
- **Filtering**: `GET /v1/groups?status=active|archived` — Active/Archived tab toggle in Groups screen
- **Hook**: `useArchiveGroup()` mutation in `lib/hooks.ts`

## Settlement Nudges
- **API**: `POST /v1/groups/{id}/nudge` with `{ targetUserId }` — nudge button in settle-up suggestions
- **Cooldown**: ERR-407 / 429 → "Already reminded recently, try again later"
- **UI**: `settle-up.tsx` tracks nudging/nudged state per user

## Payment Deep Links
- **Settings**: `app/payment-methods.tsx` — users configure handles (Venmo, PayPal, Cash App, Zelle, UPI, Revolut, Monzo)
- **Utility**: `lib/payment-links.ts` — URL construction, validation, normalization, region mapping
- **Icons**: `components/icons/payment-icons.tsx` — brand logo SVGs (Simple Icons) for all 7 providers
- **Region mapping**: `CURRENCY_PROVIDERS` — USD (venmo/paypal/cashapp/zelle), INR (upi/paypal), GBP (paypal/revolut/monzo), EUR (paypal/revolut)
- **Provider display**: Region providers shown first in settle-up, then "Your other methods" for non-region configured providers
- **Method selector**: Shows only configured providers when creditor has handles; falls back to all region providers when none configured
- **Pay Directly**: `components/ui/payment-links-section.tsx` — deep link pills in settle-up modal, gated by: current user is debtor AND creditor has `toUserPaymentHandles`
- **Post-payment flow**: "Did you complete the payment via {provider}?" → Yes records settlement with provider as paymentMethod
- **Creditor nudge**: When current user is creditor with no handles, dismissible card links to `/payment-methods` (AsyncStorage TTL, 7 days)
- **Special cases**: Zelle = clipboard copy (no deep link), Cash App = no amount pre-fill, UPI on web = QR modal
- **Venmo fallback**: Native URL → web fallback via pre-built `webFallbackUrl`
- **Backend**: `paymentHandles` JSONB on users table, `toUserPaymentHandles` on settlement suggestions. `paymentMethod` is a plain String (no enum) — accepts any value
- **Privacy**: Payment handles only exposed via `toUserPaymentHandles` in settlement suggestions, NOT on `UserSummaryDto`
- **Trust principle**: Never claim payment succeeded — deep links hand off to payment app, user explicitly confirms

## Optimistic Locking (version field)
- **Mandatory**: `PUT /v1/expenses/{id}` and `PUT /v1/settlements/{id}` — 400 without `version`
- **Optional**: `PATCH /v1/groups/{id}` — recommended but won't 400
- **Not needed**: `PATCH /v1/users/me`, `PATCH /v1/groups/{id}/members/{id}`
- Edit expense passes `expense.version` in `edit-expense/[id].tsx`

## Currency System
- **Shared constants**: `lib/currencies.ts` — 7 supported currencies (USD, EUR, GBP, INR, CAD, AUD, JPY) with code, symbol, flag. `REGION_TO_CURRENCY` map for locale detection. `detectDefaultCurrency()` uses `expo-localization`
- **Auto-detection**: Device locale → region code → currency. Fallback: USD
- **User preference**: `defaultCurrency` on `UserDto`, set during onboarding or via profile edit
- **Group currency**: Each group has `defaultCurrency`, inherited from user's preference on creation
- **Multi-currency display**: Cross-group screens use `totalOwedByCurrency` / `totalOwingByCurrency` arrays. Single-group screens use `group.defaultCurrency`

## Multi-Currency Net Balance (BE-17)
- **Problem solved**: Naive cross-currency subtraction (£30 - $50 = -$48) produced meaningless numbers
- **Backend**: `GET /v1/users/me/balance` returns `netBalanceConverted: { amount, currency, isEstimate, ratesAsOf }` — FX-converted net in user's `defaultCurrency`
- **Frontend display priority**:
  1. `netBalanceConverted` exists → show converted amount with "Estimated in {currency}" label
  2. Multi-currency, no conversion → show per-currency net breakdown (e.g., `+£2.00  -$50.00`)
  3. Single currency → show exact net with `AnimatedNumber`
- **FX ownership**: Backend only (BE-10 contract). FE never calls FX providers
- **`netBalanceCents`**: Legacy field, still sent by backend. Used for zero-checks and single-currency fallback. NOT used for multi-currency display

## Wordmark Logo
- **Component**: `components/icons/splitr-wordmark.tsx` — SVG component with `dark` and `light` variants
- **Design**: Inter Extra Bold, teal dot on "i" and period after "r". Dark text for light mode, white text for dark mode
- **Usage**: Home screen header (`app/(tabs)/index.tsx`)

## Known Gaps (Not Yet Implemented)
- Activity `details.categoryName` — confirm backend populates this for category filtering
- Deep link universal links — FE fully configured; BE must host `well-known/` files at `https://splitr.ai/.well-known/` (see `well-known/` directory in repo)

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
- **Wide-impact changes (10+ files)**: MUST also run `npm run test:e2e` (Playwright smoke tests) before considering the change complete. Animation, styling, layout, and component refactors can cause visual regressions that unit tests miss.

### Test Conventions
- Mock external deps (Clerk, expo-router, expo-haptics, etc.) in `__tests__/setup.ts`
- Use `@testing-library/react-native` for component tests (render, screen, fireEvent)
- Use `jest.useFakeTimers()` for time-dependent tests
- Test file naming: `<module>.test.ts` or `<Component>.test.tsx`
- For screen helpers (e.g., notification formatters), extract pure functions and test separately

### Coverage Targets — 100% (MANDATORY)
- **Target 100% statement coverage on ALL files** — lib/, components/ui/, screens, helpers
- Every new file MUST ship with tests that cover all branches and edge cases
- Every bug fix MUST include a regression test that would have caught the bug
- Coverage regressions are treated as test failures — never merge code that lowers coverage
- Use `npm run test:coverage` to verify before committing; flag any file below 95%
- **Current baseline (2331 unit tests, 86 suites; 124 smoke; 96 integration; 57 dev-sanity)**: 95.39% statements, 82.76% branches, 96.72% lines. `lib/` at 99%, `components/ui/` at 99%, screens at 93%+

### Test Quality Standards
- **Test behavior, not implementation** — assert what the user sees, not internal state
- **One assertion theme per test** — each test should verify one logical behavior
- **Descriptive test names** — read like a specification: "shows error toast when API returns 429"
- **No snapshot tests** — they rot fast and catch nothing meaningful
- **Mock at boundaries** — mock APIs, native modules, navigation; never mock the component under test
- **Edge cases matter** — empty states, error states, loading states, boundary values, offline
- **Async tests use waitFor** — never use arbitrary delays or fake timers in screen tests with data loading
- **Tests must be deterministic** — no reliance on timing, order, or external state

### E2E Smoke Tests (Playwright)
- **Framework**: Playwright targeting Expo web (`react-native-web`)
- **Config**: `playwright.config.ts` — `chromium` project for smoke, `integration` project for backend tests
- **Structure**: `e2e/*.spec.ts` (smoke) + `e2e/integration/*.spec.ts` (integration)
- **Auth**: `@clerk/testing/playwright` injects Clerk session via `setupClerkTestingToken()`
- **Requires**: `CLERK_SECRET_KEY` in `.env.local` for authenticated tests
- **Auth setup**: `e2e/auth.setup.ts` extends base test fixture with Clerk token injection
- **Unauthenticated tests**: Use `@playwright/test` directly (e.g., `e2e/auth.spec.ts`)
- **Count**: 129 smoke tests across 19 spec files
- Run `npx playwright install chromium` once before first run

### E2E Integration Tests (Playwright + Backend)
- **Purpose**: Full CRUD integration tests against live backend at `localhost:8085`
- **Structure**: `e2e/integration/` with 14 spec files (70 tests total)
- **Helpers**: `e2e/integration/helpers/` — `api-client.ts` (REST client), `fixtures.ts` (data factories), `cleanup.ts` (auto-cleanup fixture)
- **Auth fixture**: `cleanup.ts` extends Playwright test with `apiClient` injected + auto-cleanup via `afterEach`
- **Data strategy**: All test data prefixed with `[E2E]` + timestamp; tracked resources auto-deleted in reverse order
- **Backend health**: Every spec runs `ApiClient.isBackendHealthy()` in `beforeAll` — skips with clear message if backend is down
- **Timing**: Uses `page.waitForResponse()` instead of `waitForTimeout()` for API-dependent waits
- **Spec files**: 14 specs covering group/expense/settlement lifecycle, member management, home/activity data, invite flow, search, navigation, settings, payment handles, profile images, group banners

### Dev Sanity Tests (Playwright + Live Dev Environment)
- **Purpose**: Sanity check against live `dev.splitr.ai` before promoting to prod
- **Structure**: `e2e/dev-sanity/` with 12 spec files (49 tests total)
- **Multi-user**: User A (browser + API), User B (API-only via temporary browser context token)
- **Helpers**: `e2e/dev-sanity/helpers/` — `sanity-auth.ts` (multi-user fixture), `sanity-fixtures.ts` (`[SANITY]` prefixed data)
- **Env vars**: `E2E_SANITY_USER_A_EMAIL`, `E2E_SANITY_USER_B_EMAIL` in `.env.local`
- **Data strategy**: All data prefixed with `[SANITY]` + timestamp; auto-cleaned via `ApiClient.cleanup()`
- **Config**: `playwright.config.ts` — `dev-sanity` project with `baseURL: "https://dev.splitr.ai"`, no webServer, 90s timeout, serial (1 worker)
- **429 handling**: `ApiClient.fetchWithRetry()` retries 429s with exponential backoff
- **Run**: `npm run test:e2e:dev-sanity` (headless) or `npm run test:e2e:dev-sanity:headed`
- **Specs**: 12 specs covering smoke, group/expense/settlement lifecycle, invite/join, balance accuracy, member management, profile/settings, unequal splits, multi-member groups, activity completeness

### E2E Test Conventions
- **Smoke tests**: Import `{ test, expect }` from `./auth.setup`
- **Integration tests**: Import `{ test, expect }` from `./helpers/cleanup` (provides `apiClient`)
- **Dev sanity tests**: Import `{ test, expect }` from `./helpers/sanity-auth` (provides `userAClient`, `userBClient`)
- Import from `@playwright/test` directly for unauthenticated tests
- Use resilient selectors: `getByText()`, `getByRole()`, `getByTestId()`
- Handle conditional UI (empty states vs data) with `.isVisible().catch(() => false)`
- Keep tests independent — each test navigates from `/` fresh
- Integration tests must not leave stale `[E2E]` data — always use `apiClient` for setup/teardown

## Deployment

### Environments
| Env | Frontend | Backend | Auth |
|-----|----------|---------|------|
| **Local** | `localhost:8081` | `localhost:8085` | Clerk dev key (`.env.local`) |
| **Dev** | `https://dev.splitr.ai` | `https://api-dev.splitr.ai/api` | Clerk dev key (CF Pages env vars) |
| **Prod** | `https://splitr.ai` (future) | TBD | Clerk prod key |

### Cloudflare Pages (Frontend)
- **Repo**: `splitr-ai/splitr-expo` (GitHub org)
- **Build**: `npm run build:web` → Expo export + `scripts/post-export.sh` (404.html SPA fallback + font flattening)
- **Output**: `dist/`
- **Auto-deploys**: on push to `main`
- **Env vars** (set in CF Pages dashboard, not committed): `NODE_VERSION`, `EXPO_PUBLIC_API_URL`, `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`, `EXPO_PUBLIC_INVITE_BASE_URL`
- **Invite link env (required per environment)**:
  - Dev deploys: `EXPO_PUBLIC_INVITE_BASE_URL=https://dev.splitr.ai`
  - Prod deploys: `EXPO_PUBLIC_INVITE_BASE_URL=https://splitr.ai`
  - This ensures share/copy/email invite links point to the correct frontend domain.
- **Known constraint**: Cloudflare Pages cannot serve files with `@` in directory paths — post-export script flattens `@expo-google-fonts` to `/assets/fonts/`

### Landing Page
- Separate Vite+React app in `/landing/` directory
- Deployed independently to Cloudflare Pages at `splitr.ai`
- Has its own `package.json`, build system, and wrangler config

### Railway (Backend)
- Spring Boot API at `api-dev.splitr.ai`
- CORS: configured via `CORS_ALLOWED_ORIGINS` env var (includes `dev.splitr.ai` + localhost)

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

### Users
Broad audience — anyone who shares expenses with others. Covers young adults splitting dinners and trips, couples managing household bills, roommates tracking rent, and travel groups. Users open the app in social/financial moments where clarity and speed matter. They want to log expenses fast and never feel awkward about money.

### Brand Personality
**Friendly, approachable, trustworthy.** Splitr makes money stuff feel easy and non-awkward. The tone is warm and human — never corporate, never preachy. It should feel like a helpful friend who's good with numbers.

- **3 words:** Friendly. Clear. Effortless.
- **Emotional goals:** Confidence (money is handled), relief (no awkwardness), delight (small moments of joy)

### Aesthetic Direction
- **Visual tone:** Clean fintech meets warm social app — data-rich but never overwhelming
- **References:** Revolut/Wise (clean, trustworthy data presentation), Venmo/Cash App (social, casual money feel), Airbnb/Duolingo (warm animations, friendly onboarding)
- **Anti-references:** Splitwise (dated, cluttered, cramped), corporate/enterprise dashboards (gray, data-heavy, boring), over-gamified apps (no badges, streaks, leaderboards)
- **Theme:** Light mode primary, dark mode supported. Teal (#0d9488) as primary — signals trust and freshness without being cold
- **Motion:** Purposeful spring animations, confetti on settlements, skeleton loaders. Movement should feel alive but never distracting

### Design Principles
1. **Clarity over cleverness** — Every screen should be instantly understandable. Prefer explicit labels, visible controls, and obvious actions over hidden gestures or clever shortcuts.
2. **Speed of use** — Minimize taps to complete core tasks (add expense, settle up). Smart defaults, quick-add mode, and auto-category inference exist to save time.
3. **Money without awkwardness** — The UI should make financial interactions feel natural and lightweight. Use friendly language, avoid aggressive collection vibes, celebrate settlements.
4. **Warmth with restraint** — Delightful touches (confetti, spring animations, haptics) add personality, but never at the cost of usability. Every animation must serve a purpose.
5. **Inclusive by default** — Accessible first (WCAG AA), web-first launch, visible controls over gesture-only. Works for everyone regardless of device, ability, or technical comfort.

## Design Token Usage
- **Token source of truth**: `lib/tokens.ts` — all colors, spacing, typography, radii, z-index, durations
- **Spec files**: `specs/` — read before writing/modifying UI code
- **Audit**: Run `npm run audit:tokens` before committing UI changes. Zero errors required.
- **Rule**: Never hardcode hex colors, font sizes, border radii, or font families in component files. Use `tokens.*` for inline styles and Tailwind classes for `className`.
- **Dark mode**: Use `const c = useThemeColors()` for inline styles. Use NativeWind semantic classes (`text-foreground`, `bg-card`, etc.) for className.
- **Import pattern**: `import { colors, fontSize as fs, fontFamily as ff, radius, palette } from "@/lib/tokens"` — alias `fontSize`/`fontFamily` to avoid name collisions with style props.
- **Scope**: Each component/function that uses `c.*` must define `const c = colors(isDark)` in its own scope (not inherited from parent).

## External Pipeline
- **Location**: `../pipeline/` (one level above this repo)
- **Purpose**: External task queue from product owners, backend team, and stakeholders
- **FE tasks**: `pipeline-fe.md` — read for pending work, update status when picking/completing
- **BE requests**: `pipeline-be.md` — write here when FE needs something from backend
- **Workflow**: Check pipeline → read spec in `fe/` → plan → get approval → implement → mark `done`

## Mandatory Engineering Workflow (User Preference)
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
