# Splitr - Issue Tracker

## Fixed Issues

| # | Issue | Severity | Status | Fixed Date | Details |
|---|-------|----------|--------|------------|---------|
| 1 | Dark mode not working across the app | Critical | Fixed | 2026-03-06 | Changed `darkMode: "class"` to `darkMode: "media"` in tailwind.config.js + `Appearance.setColorScheme()` for native propagation |
| 2 | User not created in backend after Clerk sign-in | Critical | Fixed | 2026-03-06 | Changed from `POST /v1/users/sync` (admin-only) to `GET /v1/users/me` (auto-creates from JWT) |
| 3 | NativeWind navigation context error on auth screen | High | Fixed | 2026-03-06 | Tabs component Pressable with `className` triggered CssInterop `useTheme()` before navigation context; switched to inline `style` |
| 4 | OTP resend timer not visible | Medium | Fixed | 2026-03-06 | Added "Didn't receive a code?" label + countdown timer + dev mode hint |
| 5 | "Member since" blank in profile | Medium | Fixed | 2026-03-06 | Added fallback to Clerk `user.createdAt` |
| 6 | Dark mode toggle in profile does nothing | High | Fixed | 2026-03-06 | Switched to `Appearance.setColorScheme()` + AsyncStorage persistence |
| 7 | ActivityIndicator spinners instead of skeleton loaders | Medium | Fixed | 2026-03-06 | Replaced with `SkeletonList` in Home, Groups, Activity, Group Detail, Settle Up, Add Expense |
| 8 | No tab bar animations | Medium | Fixed | 2026-03-06 | Custom animated TabBar with spring icon scaling, sliding teal indicator, FAB button |
| 9 | Add Expense screen too bland | Medium | Fixed | 2026-03-06 | Added hero amount section with teal tint, staggered FadeInDown entrance animations |
| 10 | No discoverability for long-press group actions | Low | Fixed | 2026-03-06 | Added subtitle hint: "Long press to archive or delete" |
| 11 | Button has no tactile feedback | Medium | Fixed | 2026-03-06 | Added spring scale-on-press (0.97x) to Button component using react-native-reanimated |
| 12 | Hardcoded dark mode colors in modals | High | Fixed | 2026-03-06 | Fixed modals in groups.tsx, group/[id].tsx (Add Member, Share/QR), settle-up.tsx (Record Payment), create-group.tsx (Share Sheet) |
| 13 | Tapping activity item for deleted group shows dead-end screen | Critical | Fixed | 2026-03-06 | "Group not found" now shows EmptyState with back button + "Go Home" action; edit-expense errors redirect to home |
| 14 | Backend balance API response shape changed (FIN-7) | High | Fixed | 2026-03-06 | `GET /v1/users/me/balance` now returns multi-currency arrays; added `UserBalanceRawDto`, hook normalizes to flat totals |
| 15 | Backend expense summary API shape changed (FIN-8) | Low | Fixed | 2026-03-06 | `ExpenseSummary` type updated with `totals: CurrencyAmount[]`; old fields kept as deprecated |
| 16 | Hardcoded icon colors break in dark mode (40+ instances) | High | Fixed | 2026-03-06 | Added `useColorScheme` + `isDark` to: signup-form, otp-verify, chat, receipt-scanner, edit-profile, edit-expense, create-group, notifications, group/[id] |
| 17 | Toast text invisible in dark mode | High | Fixed | 2026-03-06 | Added dark mode backgrounds (deep green/red/teal) and light text color to ToastItem |
| 18 | QR codes invisible in dark mode | Medium | Fixed | 2026-03-06 | QR foreground/background colors now theme-aware in group/[id].tsx and create-group.tsx |
| 19 | TextInput text invisible in dark mode | Medium | Fixed | 2026-03-06 | Fixed hardcoded `color: "#0f172a"` in add.tsx split inputs, group/[id].tsx search, notifications.tsx |
| 20 | No error states when API calls fail | High | Fixed | 2026-03-06 | Added error EmptyState with retry button to Home, Groups, and Activity screens |

## Recently Fixed

| # | Issue | Severity | Status | Fixed Date | Details |
|---|-------|----------|--------|------------|---------|
| 21 | Group deletion not appearing in activity feed | Medium | Fixed | 2026-03-06 | Backend now logs `group_deleted` activity type |
| 25 | Spring-based modal animations | Low | Fixed | 2026-03-06 | Created `BottomSheetModal` component with Reanimated `SlideInDown`/`SlideOutDown` spring physics; replaced all 5 Modal instances |
| 26 | Real-time split validation | Low | Fixed | 2026-03-06 | Inline hints below split header show remaining/over amounts in red as users type |
| 27 | Remaining hardcoded dark mode colors | Low | Fixed | 2026-03-06 | Fixed notifications ArrowLeft, edit-expense split input text colors |
| 28 | Swipe-to-delete on expenses | Medium | Fixed | 2026-03-06 | iOS-style SwipeableRow with Edit/Delete actions on expense cards in group detail; ConfirmModal for delete confirmation |
| 29 | AnimatedNumber always animates from 0 | Medium | Fixed | 2026-03-06 | Rewritten to track previous value via useRef and animate between old→new with cubic ease-out |
| 30 | Airbnb-style animated tab bar icons | Medium | Fixed | 2026-03-06 | Custom SVG icons with outline/filled variants, overshoot bounce, crossfade, indicator pill stretch |
| 31 | BE WARN-14: Edit profile validation | Medium | Fixed | 2026-03-06 | Added phone format regex validation in edit-profile.tsx; name/currency already validated |
| 32 | BE ERR-3: Expense request validation | Medium | Fixed | 2026-03-06 | Added description maxLength=255, totalAmount min 1 cent validation to add + edit expense screens |
| 33 | Group avatars with gradients | Medium | Fixed | 2026-03-06 | `GroupAvatar` component with deterministic gradient from group name; integrated in groups list, group detail hero, join preview |

## Open Issues

| # | Issue | Severity | Status | Reported | Details |
|---|-------|----------|--------|----------|---------|
| 22 | ~~Receipt scanning is fully mocked~~ | Low | Fixed | 2026-03-06 | Replaced mock with real `POST /v1/receipts/scan` API. Premium UX: scan line animation, processing dots, confidence badges, error/retry states. 9 tests. |
| 23 | ~~Push notifications — Full integration~~ | Medium | Fixed | 2026-03-06 | **Phase 1 + 2 complete.** Token registration with deviceId/deviceName, notification history from `GET /v1/users/me/notifications`, payload routing (type+groupId→route), global toggle syncs to BE via `PATCH /v1/users/me`, per-group toggle in group detail via `PATCH /v1/groups/{groupId}/members/{memberId}`, notifications screen shows real BE data. BE handles rate limiting (5/hr, 20/day) and coalescing (60s window). |
| 24 | Deep link universal links | Low | FE Done + E2E Tested / BE Pending | 2026-03-12 | FE fully implemented. `app/invite/[code].tsx` + `app/join/[code].tsx` with preview, error states, already-member handling. AuthGate updated to allow unauthenticated access to `/invite/*` and `/join/*` (public preview before sign-up). 7 E2E tests in `e2e/deep-links.spec.ts`. **BE action**: host `well-known/apple-app-site-association` + `well-known/assetlinks.json` at `https://splitr.ai/.well-known/` with `Content-Type: application/json`. |

## IMG.png Bug Report (2026-03-11)

Bugs reported via IMG.png bug tracker. All fixes include integration/unit tests.

| # | Type | Screen | Title | Description | Priority | Status | Fixed Date | Notes |
|---|------|--------|-------|-------------|----------|--------|------------|-------|
| IMG-1 | Defect | New Group | Unable to add members while creating a new group | Creating a new group should allow adding members the same way as an existing group | Medium | **FIXED** | 2026-03-11 | Added name+email member form to `create-group.tsx`; calls `groupsApi.addGuestMember()` post-creation with optional email |
| IMG-2 | Enhancement | New Expense / Edit Expense | Unable to change the date while adding/editing the expense | Users need the ability to change the expense date; currently defaults to today | Low | **FIXED** | 2026-03-11 | Added `DateTimePicker` to `edit-expense/[id].tsx`; initialised from `expenseData.date` on load. `add.tsx` already had it |
| IMG-3 | Question | New Expense | Photo and Gallery options are showing the same thing | What's the expected behavior difference between Photo and Gallery on the Add Expense screen? | Low | **FIXED** | 2026-03-12 | Photo button now visible on all platforms (removed `Platform.OS !== "web"` guard). `launchCameraAsync` wrapped in try-catch — shows toast "Camera unavailable. Use Gallery to pick an image." on failure (web without camera permission, simulator, denied). Gallery always works. |
| IMG-4 | New Feature | New Expense / Edit Expense | Auto-select icon/category based on expense description | App should automatically select an appropriate category when the user types a description | Low | **FIXED** | 2026-03-11 | Added `inferCategoryFromDescription()` in `lib/screen-helpers.ts`; wired into `add.tsx` + `edit-expense/[id].tsx`. 27 unit tests |
| IMG-5 | Defect | Edit Expense | Update expense is not working | App throws error while trying to update the expense | High | **FIXED** | 2026-03-11 | `edit-expense/[id].tsx` was fetching from `listExpenses` (ignores payers/splits); switched to `expensesApi.get(id)` which returns full expense with `version` |
| IMG-6 | Defect | New Expense | Percentage and Fixed share options not working | App ignores user-entered percentages/fixed amounts and always splits equally | High | **FIXED** | 2026-03-11 | Fixed rounding: last member absorbs cent remainder for percentage splits; same for fixed splits. Prevents backend sum-validation rejection |
| IMG-7 | Defect | Settle Up | Settlement recalculation is wrong | After recording a payment, balances should decrease but instead they increase | High | **FIXED** | 2026-03-11 | `BalanceCalculationService.java`: settlement signs were inverted — payer (debtor) was being debited instead of credited. 6 regression integration tests added |
| IMG-8 | Enhancement | Existing Group | No delete/archive option in group detail screen | Delete and archive are only available via long-press on the Groups list, not inside the group | Low | **FIXED** | 2026-03-11 | Added `⋮` menu in `group/[id].tsx` header with Archive/Unarchive and Delete actions + confirmation modals |
| IMG-9 | Defect | Group List | Delete group feature not working | App throws error when trying to delete a group that has outstanding balances — no user-friendly message | Medium | **FIXED** | 2026-03-11 | FE: parses `OUTSTANDING_BALANCES` error code and shows clear message. BE already throws correctly. 2 regression integration tests |
| IMG-10 | Enhancement | Group List | Archive group should ask for confirmation | Show confirmation dialog explaining what archiving does and check for open balances | Medium | **FIXED** | 2026-03-11 | Added `ConfirmModal` in `groups.tsx` with message explaining archive. Also added same in new `group/[id].tsx` actions |

## Backlog

| # | Feature | Priority | Details |
|---|---------|----------|---------|
| B1 | ~~Onboarding walkthrough~~ | ~~Medium~~ | **Done**: `app/onboarding.tsx` — 4-step walkthrough (Welcome, Create Group, Add Expenses, Settle Up) with Reanimated animations, Skip/Next/Get Started, dots indicator. `AuthGate` checks `@splitr/onboarding_complete` AsyncStorage key. 7 tests. |
| B2 | Smart expense suggestions | Low | AI-powered auto-fill based on past expenses (description, category, split) |
| B3 | Group avatars with gradients | Low | Auto-generated gradient avatars based on group name/type instead of plain initials |
| B4 | ~~Real receipt scanning (OCR)~~ | ~~Medium~~ | **Done (FE)**. `POST /v1/receipts/scan` sends base64 image, returns `ReceiptScanResultDto` (merchant, date, currency, line items, totals, confidence scores). Premium UX: scan line animation, processing dots, confidence badges, error/retry. BE needs GPT-4o Vision integration. |
| B5 | ~~Push notifications~~ | ~~Medium~~ | **Phase 1 Done**: `lib/notifications.ts` (foreground handler, permissions, token registration, preferences), `NotificationProvider` (token lifecycle, badge clear, tap handling, cold start), `notification-settings.tsx` (privacy/detailed toggle, per-category toggles), 24 tests. **Phase 2 (BE) pending**: push_tokens table, EPNS, domain events, rate limiting, coalescing. |
| B6 | Activity feed for group deletions | Low | Backend: log group_deleted events so they appear in activity feed |
| B7 | Expense attachments/photos | Low | Attach receipt photos to expenses for record-keeping |
| B8 | Recurring expenses | Low | Auto-create monthly/weekly expenses (rent, subscriptions) |
| B9 | ~~Pagination support~~ | ~~Medium~~ | **Done**: Infinite scroll on Activity (useInfiniteQuery + onEndReached), "Load More" on group expenses (cursor-based) and settlement history (page-based). API methods accept pagination params. |
| B10 | ~~Search on Groups & Activity~~ | ~~High~~ | **Done**: Search bar with instant filtering on groups list (name/description) and activity feed (actor, group, description, type). Toggle via search icon in header. |
| B11 | ~~Smart defaults on Add Expense~~ | ~~High~~ | **Done**: Last-used groupId and categoryId saved to AsyncStorage on successful submit. Restored on next Add Expense open. |
| B12 | ~~Expense date picker~~ | ~~High~~ | **Done**: Date picker (`@react-native-community/datetimepicker`) on Add Expense. Shows current date with "Today" badge, max date = today. |
| B13 | ~~Settle-up nudge on Home~~ | ~~High~~ | **Done**: "Settle up $X.XX" CTA button on balance card when `totalOwesCents > 0`, links to groups tab. |
| B14 | ~~Undo toast for destructive actions~~ | ~~High~~ | **Done**: Toast system supports `action` button with callback + custom `duration`. Expense deletion (group detail, swipe) and settlement deletion (settle-up) use 5-second undo toast with deferred API call. |
| B15 | ~~Biometric app lock~~ | ~~Medium~~ | **Done**: Added `expo-local-authentication` app lock gate on app open/foreground resume with unlock overlay in `app/_layout.tsx` + toggle in Privacy & Security (`app/privacy-security.tsx`) persisted via `@splitr/biometric_lock`. |
| B16 | ~~Success micro-animation~~ | ~~Medium~~ | **Done**: Full-screen teal overlay with animated checkmark + "Expense Added!" text, 800ms display before navigating back. Uses FadeIn + FadeInDown spring. |
| B17 | ~~Group balance visualization~~ | ~~Medium~~ | **Done (existing)**: Group detail already has INSIGHTS section with by-person spending bars and by-category stacked bar + legend. Member cards show individual balance with color coding. |
| B18 | ~~Receipt photo attachment~~ | ~~Medium~~ | **Done**: Camera + gallery buttons below description field on Add Expense. Uses `expo-image-picker`. Photo preview with remove button. URI stored locally (BE attachment endpoint pending). |
| B19 | ~~Quick add from Home~~ | ~~Medium~~ | **Done**: Long-press FAB opens quick-add mode (amount + description + group only, equal split, no category/date/payer sections). Navigates via `?quick=true` param. |
| B20 | ~~Group spending insights~~ | ~~Low~~ | **Done**: Monthly spending bar chart added to group INSIGHTS section. Shows last 6 months with proportional bars. Uses `aggregateByMonth()` helper. |
| B21 | ~~Keyboard done button~~ | ~~Low~~ | **Done**: iOS `InputAccessoryView` with "Done" button on the amount decimal pad in Add Expense. |
| B22 | ~~3D Touch quick actions~~ | ~~Low~~ | **Done**: `expo-quick-actions` v6. 3 actions (Add Expense, Scan Receipt, View Groups) registered in `_layout.tsx`, routing via `useQuickActionRouting()` in `(tabs)/_layout.tsx`. |
| B23 | ~~Animated tab bar transitions~~ | ~~Low~~ | **Done (existing)**: Custom `TabBar.tsx` with Airbnb-style overshoot bounce (1->1.3->1.1), outline/filled icon crossfade, sliding teal indicator pill with stretch, label opacity/scale animations, FAB spring press. |
| B24 | ~~Confetti on full settlement~~ | ~~Low~~ | **Done**: `Confetti` component with 40 animated particles (reanimated). Triggers on settle-up screen when suggestions list is empty (all debts settled). |
| B25 | ~~AI Chat — Core implementation~~ | ~~High~~ | **Done (FE)**: `app/chat.tsx` — SSE streaming chat with interactive cards (group selection, expense confirmation, create group). `POST /v1/chat` with conversationId. Quota system (`GET /v1/chat/quota`), unmount cleanup, double-send prevention, smart scroll, cache invalidation, offline awareness, stop generation, retry on failure. 17 tests. **BE pending**: endpoint implementation. |
| B26 | Chat — Message timestamps | Low | **Done**: Timestamps with `formatMessageTime()` + smart grouping via `shouldShowTimestamp()` (5-min gap). Animated with `FadeIn.duration(200)`. |
| B27 | ~~Chat — Typing indicator animation~~ | ~~Low~~ | **Done**: `TypingDotsIndicator` with 3 bouncing dots using Reanimated `withRepeat`/`withSequence`/`withTiming`. Staggered delays (0/150/300ms). |
| B28 | ~~Chat — Copy message~~ | ~~Low~~ | **Done**: Long-press assistant messages → copies to clipboard, haptic + toast. Already implemented in `app/chat.tsx`. |
| B29 | ~~Chat — Suggested follow-ups~~ | ~~Low~~ | **Done**: Follow-up pill buttons appear after expense creation ("Add another expense", "Check my balance", "View {group}") and after group creation ("Add expense to {group}", "Invite members", "Check my balance"). Tapping sends the text as a follow-up message. |
| B30 | ~~Chat — Conversation persistence~~ | ~~Low~~ | **Done**: Messages + conversationId persisted to AsyncStorage with debounced save (500ms). New Chat button clears storage. Loaded on mount. |
| B31 | ~~Chat — Bubble grouping~~ | ~~Low~~ | **Done**: `getBubblePosition()` detects consecutive same-role messages. Reduced vertical padding for middle bubbles. Bot avatar only on last/only. Border radius adjusted per position. |
| B32 | ~~Chat — Accessibility~~ | ~~Medium~~ | **Done**: 14 interactive elements have `accessibilityLabel` + `accessibilityRole`. Added in this session: message bubble (`accessibilityHint="Long press to copy"`), image remove button, reply cancel button, quota "Add Expense Manually" button. `MentionDropdown` ContactRow/GroupRow also labeled (`Mention {name}`, `Mention group {name}`). |
| B33 | ~~Chat — FlatList performance~~ | ~~Medium~~ | **Done**: `MessageItem` wrapped in `React.memo` with custom comparator (role, index, dark mode, loading, adjacent roles). Memoized `keyExtractor`. FlatList tuned: `removeClippedSubviews`, `maxToRenderPerBatch=10`, `windowSize=10`, `initialNumToRender=20`. |
| B34 | ~~Receipt → Chat auto-fill~~ | ~~High~~ | **Done (FE)**: "Split via Chat" button on receipt results → navigates to chat with natural language message (merchant, amount, date, line items). Chat auto-sends on mount via `receiptMessage` param. BE handles group selection + expense creation. 2 tests. |
| B35 | ~~Natural language balance queries~~ | ~~High~~ | **Done (FE + BE)**: "Who owes me money?" suggested prompt + chat renders markdown responses. BE has 4 LLM tools: `get_user_balance`, `get_balance_with_user`, `get_cross_group_balances`, `get_group_balance` — returns SSE `text` events with markdown. |
| B36 | Smart split suggestions | Low | LLM suggests split ratios based on description (e.g., "hotel 2 nights" → split by nights). Niche use case. |
| B37 | Recurring expense detection | Low | "You split dinner with Sarah last week too. Create recurring?" Needs historical analysis on BE. Medium effort. |
| B38 | Expense auto-categorization | Low | LLM infers category from description during chat expense creation. Already partially possible. Low incremental value. |
| B39 | Settlement nudge reminders | Low | "Mike has owed you $45 for 2 weeks. Send a reminder?" Ties into push notifications. Medium effort. |
| B40 | ~~Chat — Message entrance animations~~ | ~~Medium~~ | **Done**: Messages slide in from right (user) or left (assistant) with `FadeInRight`/`FadeInLeft` spring physics (damping 18, stiffness 140). |
| B41 | ~~Chat — Send button animation~~ | ~~Low~~ | **Done**: `SendButton` component with spring pop on enable/disable state change and on press via `withSequence`/`withSpring`. |
| B42 | ~~Chat — MentionDropdown animation~~ | ~~Low~~ | **Done**: `FadeIn.duration(150)` entering + `FadeOut.duration(100)` exiting on both empty state and list views. |
| B43 | ~~Chat — Smooth keyboard~~ | ~~Medium~~ | **Done**: Replaced RN `KeyboardAvoidingView` with `react-native-keyboard-controller` (`KeyboardProvider` + `KBCKeyboardAvoidingView`) for 60fps keyboard-synced animations on native. Web fallback to plain View. |
| B44 | ~~Chat — Haptic feedback on actions~~ | ~~Low~~ | **Done**: `hapticLight()` on group select + edit expense; `hapticSuccess()` on confirm expense + confirm create group. |
| B45 | ~~Chat — Swipe to reply~~ | ~~Medium~~ | **Done**: Pan gesture (react-native-gesture-handler) on messages — swipe right >50px triggers reply. Reply icon animates behind message during swipe. Reply preview bar above input shows quoted content with dismiss button. Quoted messages shown inline with teal left border. |
| B46 | Chat — Message reactions | Low | Long-press message → emoji reaction picker (👍 ✅ ❓). Visual feedback only, not persisted. Low priority. |
| B47 | ~~Chat — Scroll-to-bottom FAB~~ | ~~Low~~ | **Done**: Floating ChevronDown button appears when scrolled >300px from bottom. FadeIn/FadeOut animation, haptic on tap, scrolls to end. Positioned absolute bottom-right above input. 1 test. |
| B48 | Chat — Image preview modal | Low | Tap attached image to open full-screen preview with pinch-to-zoom. Currently images are inline-only. |
| B49 | ~~Chat — Markdown rendering~~ | ~~Medium~~ | **Done**: Custom lightweight `ChatMarkdown` component — no external dependency. Supports **bold**, *italic*, `inline code`, ```code blocks```, bullet lists (- / *), numbered lists. Conditional rendering: only activates when markdown formatting detected in AI responses. 10 tests. |
| B50 | Chat — Voice input | Low | Microphone button for speech-to-text input. Uses `expo-speech` or platform speech recognition. "Add $20 for lunch with Sarah" via voice. |
| B-IMG3 | ~~Clarify Photo vs Gallery behavior on Add Expense~~ | ~~Low~~ | **Done**: Photo button now always visible on all platforms. `launchCameraAsync` wrapped in try-catch; on failure shows toast "Camera unavailable. Use Gallery to pick an image." Gallery (`launchImageLibraryAsync`) always works. Resolves confusion on web and simulator. |

## Notes

- All dates are in YYYY-MM-DD format
- Severity levels: Critical (app-breaking), High (major UX issue), Medium (noticeable issue), Low (polish/nice-to-have)
- Status: Fixed, Open, Open - Backend (requires backend changes)
