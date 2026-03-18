# Input

- **Category:** Input
- **Status:** Stable
- **Source:** `components/ui/input.tsx`

## Overview

Text input field with optional label and error message. Uses semantic colors for placeholder and error states.

**When to use:** Form fields -- expense description, group name, member name, search.
**When not to use:** OTP entry (use OTPInput), multi-line notes (use raw TextInput with custom styling).

## Anatomy

1. **Container** -- `View` wrapping label + input + error
2. **Label** -- Optional `Text` above the input
3. **TextInput** -- Styled native input
4. **Error message** -- Optional `Text` below the input

## Tokens Used

| Token | Usage |
|---|---|
| `colors(isDark).mutedForeground` | `placeholderTextColor` |
| `radius.DEFAULT` (12) | Input border radius via `rounded-xl` |
| `fontSize.base` (13) | Input text size via `text-base` |
| `fontSize.sm` (12) | Label text size |
| `fontSize.xs` (11) | Error text size |

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `label` | `string` | -- | Label text above the input |
| `error` | `string` | -- | Error message below the input; adds red border |
| `containerClassName` | `string` | -- | Classes for the outer View |
| `className` | `string` | -- | Classes for the TextInput |

Plus all `TextInputProps` (placeholder, value, onChangeText, keyboardType, etc.).

## States

| State | Appearance |
|---|---|
| Default | `bg-muted rounded-xl px-4 py-3.5 text-base text-foreground` |
| With label | Label rendered above: `text-sm font-sans-medium text-foreground mb-1.5` |
| Error | Red border added: `border border-destructive`; error text below: `text-xs text-destructive mt-1` |
| Dark mode | Background becomes dark muted; placeholder color adjusts via `colors(isDark)` |

## Code Example

```tsx
<Input
  label="Description"
  placeholder="What was this expense for?"
  value={description}
  onChangeText={setDescription}
  error={errors.description}
/>
```

## Cross-references

- [OTPInput](./otp-input.md) -- specialized input for verification codes
- [BottomSheetModal](./bottom-sheet-modal.md) -- inputs inside bottom sheets use `keyboardAvoiding` prop
