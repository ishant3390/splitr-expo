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
| 22 | Receipt scanning is fully mocked | Low | Open | 2026-03-06 | No real OCR endpoint; receipt-scanner.tsx uses mock data |
| 23 | Push notifications — Phase 2 (Backend) pending | Medium | Open - Backend | 2026-03-06 | Phase 1 (frontend) done: `lib/notifications.ts`, `NotificationProvider`, notification-settings screen, tests (24). Awaiting BE: push_tokens table, EPNS integration, domain event listeners, rate limiting, receipt polling |
| 24 | Deep link universal links not tested | Low | Open | 2026-03-06 | Requires AASA file hosted on splitr.app domain |

## Backlog

| # | Feature | Priority | Details |
|---|---------|----------|---------|
| B1 | Onboarding walkthrough | Medium | First-time user tour highlighting key features (add expense, create group, settle up) |
| B2 | Smart expense suggestions | Low | AI-powered auto-fill based on past expenses (description, category, split) |
| B3 | Group avatars with gradients | Low | Auto-generated gradient avatars based on group name/type instead of plain initials |
| B4 | Real receipt scanning (OCR) | Medium | Replace mock with actual OCR endpoint; extract amount, description, date from photo |
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
| B15 | Biometric app lock | Medium | `expo-local-authentication` Face ID / fingerprint on app open. Toggle in Profile > Privacy & Security. |
| B16 | Success micro-animation | Medium | Brief checkmark animation (Reanimated) after adding expense before navigating back. |
| B17 | Group balance visualization | Medium | Bar chart or visual breakdown of who owes whom in group detail, not just a text list. |
| B18 | Receipt photo attachment | Medium | Attach a photo (camera/gallery) to an expense via `expo-image-picker`. Simpler than full OCR. |
| B19 | Quick add from Home | Medium | Long-press Add button for quick-entry sheet (amount + description, auto-selects last group). |
| B20 | Group spending insights | Low | Monthly breakdown, top categories, spending trends. Good for trip recaps. |
| B21 | Keyboard done button | Low | Toolbar above decimal keyboard with "Done" button to dismiss. Standard iOS pattern. |
| B22 | 3D Touch quick actions | Low | Home screen shortcuts via `expo-quick-actions`: Add Expense, Scan Receipt, View Groups. |
| B23 | Animated tab bar transitions | Low | Subtle scale/bounce on tab switch for extra polish. |
| B24 | Confetti on full settlement | Low | When a group reaches $0 balance (all settled), trigger brief confetti animation. |

## Notes

- All dates are in YYYY-MM-DD format
- Severity levels: Critical (app-breaking), High (major UX issue), Medium (noticeable issue), Low (polish/nice-to-have)
- Status: Fixed, Open, Open - Backend (requires backend changes)
