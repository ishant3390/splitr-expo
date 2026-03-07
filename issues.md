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
| 24 | Deep link universal links not tested | Low | Open | 2026-03-06 | Requires AASA file hosted on splitr.app domain |

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
| B26 | Chat — Message timestamps | Low | No timestamps on chat messages. Add `createdAt` to ChatMessage and display time on messages. |
| B27 | Chat — Typing indicator animation | Low | Replace static "Thinking..." ActivityIndicator with animated dots (bouncing ellipsis). |
| B28 | Chat — Copy message | Low | Long-press to copy AI-generated text (balance summaries, explanations). |
| B29 | Chat — Suggested follow-ups | Low | Show contextual follow-up suggestions after actions (e.g., after expense: "Add another", "Check balance", "View group"). |
| B30 | Chat — Conversation persistence | Low | Persist messages to AsyncStorage so conversations survive navigation. Currently lost on unmount. |
| B31 | Chat — Bubble grouping | Low | Group consecutive same-role messages, only show bot avatar on last message in sequence. |
| B32 | Chat — Accessibility | Medium | Add accessibilityLabels to send button, back button, action cards, group selection cards. Screen reader support. |
| B33 | Chat — FlatList performance | Medium | Add `React.memo` on message renderer, `getItemLayout` for fixed-height items to reduce re-renders during streaming. |

| B34 | Receipt → Chat auto-fill | High | Scan receipt → "Split via Chat" button → opens chat pre-filled with scanned amount/merchant/date → group selection → confirm. Chains receipt scan + chat. Small FE effort. |
| B35 | Natural language balance queries | High | "How much does Sarah owe me across all groups?" BE needs `getCrossGroupBalances` tool. No new FE UI — chat text responses handle it. Small effort, high value. |
| B36 | Smart split suggestions | Low | LLM suggests split ratios based on description (e.g., "hotel 2 nights" → split by nights). Niche use case. |
| B37 | Recurring expense detection | Low | "You split dinner with Sarah last week too. Create recurring?" Needs historical analysis on BE. Medium effort. |
| B38 | Expense auto-categorization | Low | LLM infers category from description during chat expense creation. Already partially possible. Low incremental value. |
| B39 | Settlement nudge reminders | Low | "Mike has owed you $45 for 2 weeks. Send a reminder?" Ties into push notifications. Medium effort. |

## Notes

- All dates are in YYYY-MM-DD format
- Severity levels: Critical (app-breaking), High (major UX issue), Medium (noticeable issue), Low (polish/nice-to-have)
- Status: Fixed, Open, Open - Backend (requires backend changes)
