# Splitr Design System Specs (Phase 2)

Single source of truth for all visual tokens, patterns, and component APIs.

## Convention

Before writing UI code, read the relevant spec. Use only tokens from `lib/tokens.ts`. Run `npm run audit:tokens` before committing.

## Index

### Foundation Tokens

| File | Description |
|---|---|
| [colors.md](./colors.md) | Palette primitives + semantic light/dark mapping |
| [typography.md](./typography.md) | Font scale, weight-to-family mapping, line heights |
| [spacing.md](./spacing.md) | Spacing scale (multiples of 4) |
| [radius.md](./radius.md) | Border radius scale + component mapping |
| [elevation.md](./elevation.md) | Shadow presets from `lib/shadows.ts` |
| [motion.md](./motion.md) | Duration scale, spring presets, reduced motion |
| [token-reference.md](./token-reference.md) | Master map of every exported constant from `tokens.ts` |

### Component Specs

| File | Component | Category |
|---|---|---|
| [components/button.md](./components/button.md) | Button | Input |
| [components/card.md](./components/card.md) | Card | Layout |
| [components/input.md](./components/input.md) | Input | Input |
| [components/avatar.md](./components/avatar.md) | Avatar | Display |
| [components/avatar-strip.md](./components/avatar-strip.md) | AvatarStrip | Display |
| [components/toast.md](./components/toast.md) | Toast | Feedback |
| [components/bottom-sheet-modal.md](./components/bottom-sheet-modal.md) | BottomSheetModal | Layout |
| [components/confirm-modal.md](./components/confirm-modal.md) | ConfirmModal | Feedback |
| [components/empty-state.md](./components/empty-state.md) | EmptyState | Display |
| [components/tabs.md](./components/tabs.md) | Tabs | Navigation |
| [components/otp-input.md](./components/otp-input.md) | OTPInput | Input |
| [components/checkbox.md](./components/checkbox.md) | Checkbox | Input |
| [components/themed-switch.md](./components/themed-switch.md) | ThemedSwitch | Input |
| [components/swipeable-row.md](./components/swipeable-row.md) | SwipeableRow | Navigation |
| [components/skeleton.md](./components/skeleton.md) | Skeleton | Feedback |
| [components/tab-bar.md](./components/tab-bar.md) | TabBar | Navigation |
