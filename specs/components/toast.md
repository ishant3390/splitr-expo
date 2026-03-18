# Toast

- **Category:** Feedback
- **Status:** Stable
- **Source:** `components/ui/toast.tsx`

## Overview

Non-modal notification system for success, error, and info messages. Supports action buttons and custom durations. Rendered via context provider at the app root.

**When to use:** Post-action feedback (expense saved, error occurred), undo prompts, status confirmations.
**When not to use:** Critical blocking errors (use ConfirmModal), persistent warnings (use inline banners).

## Anatomy

1. **ToastProvider** -- Context provider wrapping the app, renders toast stack
2. **Toast stack** -- Absolutely positioned View at top of screen (top: 60, z-index: 9999)
3. **ToastItem** -- Individual toast with:
   - Left accent border (3px, color matches type)
   - Icon (CheckCircle2 / AlertTriangle / Info)
   - Message text (up to 3 lines)
   - Optional action button
   - Dismiss X button

## Tokens Used

| Token | Usage |
|---|---|
| `fontSize.md` (14) | Message text |
| `fontSize.base` (13) | Action button text |
| `fontFamily.medium` | Message text |
| `fontFamily.semibold` | Action button text |
| `radius.lg` (16) | Toast border radius |
| `colors(isDark).foreground` | Message text color (dark mode) |
| `colors(isDark).secondaryForeground` | Message text color (light mode) |
| `colors(isDark).mutedForeground` | Dismiss icon color |

## API (via `useToast` hook)

| Method | Signature | Description |
|---|---|---|
| `success` | `(message, options?) => void` | Green toast |
| `error` | `(message, options?) => void` | Red toast |
| `info` | `(message, options?) => void` | Teal toast |

Options: `{ action?: { label: string; onPress: () => void }; duration?: number }`

## Type Colors

| Type | Icon | Icon color | Light BG | Dark BG | Border |
|---|---|---|---|---|---|
| `success` | CheckCircle2 | `#10b981` | `#ecfdf5` | `#064e3b` | `#10b981` |
| `error` | AlertTriangle | `#ef4444` | `#fef2f2` | `#450a0a` | `#ef4444` |
| `info` | Info | `#0d9488` | `#f0fdfa` | `#042f2e` | `#0d9488` |

## States

| State | Behavior |
|---|---|
| Enter | Fade in + slide down (250ms, ease-out cubic) |
| Visible | Stays for `duration` ms (default: 3500) |
| Exit | Fade out + slide up (180ms, ease-out cubic), then removed from state |
| With action | Action button shown with color-tinted background |
| Dismissed | X button triggers immediate exit animation |

## Code Example

```tsx
const { success, error } = useToast();

success("Expense saved!");
error("Failed to delete", {
  action: { label: "Retry", onPress: handleRetry },
  duration: 5000,
});
```

## Cross-references

- [ConfirmModal](./confirm-modal.md) -- for destructive actions that need explicit confirmation
- `zIndex.toast` (100) -- toast renders above all other content
