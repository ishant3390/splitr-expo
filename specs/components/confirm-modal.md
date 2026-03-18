# ConfirmModal

- **Category:** Feedback
- **Status:** Stable
- **Source:** `components/ui/confirm-modal.tsx`

## Overview

Centered confirmation dialog for destructive or important actions. Two-button layout with cancel/confirm.

**When to use:** Delete confirmations, irreversible actions, leave group, archive group.
**When not to use:** Informational alerts (use Toast), complex forms (use BottomSheetModal).

## Anatomy

1. **Modal** -- Native `Modal` with `transparent` and `fade` animation
2. **Backdrop** -- Pressable overlay (`rgba(0,0,0,0.4)`), dismisses on tap
3. **Dialog card** -- Centered card with max-width 340, `radius.xl` (20)
4. **Title** -- Bold heading text
5. **Message** -- Muted body text with line height 20
6. **Button row** -- Two flex-1 buttons side by side with 12px gap

## Tokens Used

| Token | Usage |
|---|---|
| `radius.xl` (20) | Dialog border radius |
| `radius.md` (8) | Button border radius |
| `fontSize.xl` (17) | Title |
| `fontSize.md` (14) | Message and button text |
| `fontFamily.bold` | Title |
| `fontFamily.regular` | Message |
| `fontFamily.semibold` | Button labels |
| `colors(isDark).card` | Dialog background |
| `colors(isDark).foreground` | Title color |
| `colors(isDark).mutedForeground` | Message and cancel button color |
| `colors(isDark).muted` | Cancel button background |
| `colors(isDark).primary` | Confirm button background (non-destructive) |
| `colors(isDark).destructive` | Confirm button background (destructive) |
| `palette.white` | Confirm button text color |

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `visible` | `boolean` | required | Controls visibility |
| `title` | `string` | required | Dialog heading |
| `message` | `string` | required | Explanatory text |
| `confirmLabel` | `string` | `"Confirm"` | Confirm button text |
| `cancelLabel` | `string` | `"Cancel"` | Cancel button text |
| `destructive` | `boolean` | `false` | Uses red confirm button instead of teal |
| `onConfirm` | `() => void` | required | Confirm callback |
| `onCancel` | `() => void` | required | Cancel callback (also called on backdrop tap) |

## States

| State | Behavior |
|---|---|
| Default | Teal confirm button |
| Destructive | Red confirm button |
| Backdrop tap | Calls `onCancel` |
| Android back | Calls `onCancel` via `onRequestClose` |

## Code Example

```tsx
<ConfirmModal
  visible={showDelete}
  title="Delete Expense?"
  message="This action cannot be undone. The expense and all splits will be permanently removed."
  confirmLabel="Delete"
  destructive
  onConfirm={handleDelete}
  onCancel={() => setShowDelete(false)}
/>
```

## Cross-references

- [BottomSheetModal](./bottom-sheet-modal.md) -- for more complex interactions
- [Toast](./toast.md) -- for post-action feedback after confirmation
- [Button](./button.md) -- ConfirmModal uses inline Pressable, not the Button component
