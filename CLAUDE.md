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
  group/[id].tsx        # Group detail (dynamic route)
  edit-expense/[id].tsx # Edit expense (dynamic route)
  create-group.tsx      # Create group form (with type, emoji, currency picker)
  settle-up.tsx         # Settlement screen (suggestions + history)
  chat.tsx              # AI chat assistant
  receipt-scanner.tsx   # Receipt scanning (OCR endpoint still mocked)
  edit-profile.tsx      # Edit profile
components/
  ui/                   # Reusable UI components (Button, Card, Avatar, Input, etc.)
  icons/                # Custom SVG icons (social auth logos)
lib/
  api.ts                # API client (usersApi, groupsApi, categoriesApi, expensesApi, settlementsApi)
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

## Known Gaps (Not Yet Implemented)
- Receipt scanning is fully mocked (no real OCR endpoint)
- Push notifications (no token registration, no expo-notifications)
- Invite link sharing (inviteCode exists on GroupDto but no join endpoint)
- `GET /v1/users/me/balance` aggregate endpoint (home screen does N+1 calls)
- Activity `details.categoryName` — confirm backend populates this for category filtering

## Commands
```bash
npx expo start          # Start dev server
npx expo start --clear  # Start with cache clear
```
