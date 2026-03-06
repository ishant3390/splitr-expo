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

## Open Issues

| # | Issue | Severity | Status | Reported | Details |
|---|-------|----------|--------|----------|---------|
| 21 | Group deletion not appearing in activity feed | Medium | Open - Backend | 2026-03-06 | Backend needs to log `group_deleted` activity type in `GET /v1/users/me/activity` |
| 22 | Receipt scanning is fully mocked | Low | Open | 2026-03-06 | No real OCR endpoint; receipt-scanner.tsx uses mock data |
| 23 | Push notifications not implemented | Medium | Open | 2026-03-06 | No token registration, no expo-notifications setup |
| 24 | Deep link universal links not tested | Low | Open | 2026-03-06 | Requires AASA file hosted on splitr.app domain |
| 25 | Spring-based modal animations | Low | Open | 2026-03-06 | All modals use basic `animationType="slide"`; spring physics would feel more premium |
| 26 | Real-time split validation | Low | Open | 2026-03-06 | Percentage/fixed splits only validate on submit; inline feedback would prevent errors |
| 27 | Some remaining hardcoded colors in edge cases | Low | Open | 2026-03-06 | Contact item "Add" button, helper text in modals still have some hardcoded colors |

## Notes

- All dates are in YYYY-MM-DD format
- Severity levels: Critical (app-breaking), High (major UX issue), Medium (noticeable issue), Low (polish/nice-to-have)
- Status: Fixed, Open, Open - Backend (requires backend changes)
