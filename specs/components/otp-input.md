# OTPInput

- **Category:** Input
- **Status:** Stable
- **Source:** `components/ui/otp-input.tsx`

## Overview

Multi-digit verification code input with auto-focus, paste support, and backspace navigation. Each digit gets its own input cell.

**When to use:** Email/phone OTP verification during sign-in/signup.
**When not to use:** General text input, numeric amounts.

## Anatomy

1. **Container** -- `View` with `flex-row gap-2 justify-center`
2. **Digit cells** -- `Pressable` + `TextInput` pairs, one per digit
3. **Active cell** -- Teal border + teal-tinted background when filled

## Tokens Used

| Token | Usage |
|---|---|
| `radius.DEFAULT` (12) | Cell border radius via `rounded-xl` |

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `length` | `number` | `6` | Number of digit cells |
| `value` | `string` | required | Current OTP string |
| `onChange` | `(value: string) => void` | required | Value change callback |
| `className` | `string` | -- | Container classes |

## Cell Dimensions

- Width: 48px (`w-12`)
- Height: 56px (`h-14`)
- Text: `text-xl font-sans-bold`, centered

## States

| State | Appearance |
|---|---|
| Empty | `bg-muted border-2 border-transparent` |
| Filled | `bg-primary/10 border-2 border-primary` |
| Focused | Native TextInput focus ring |

## Behavior

- **Auto-focus:** First empty cell is focused on mount
- **Forward navigation:** Typing a digit moves focus to next cell
- **Backward navigation:** Backspace on empty cell moves focus to previous cell and clears it
- **Paste support:** First cell accepts `maxLength={length}` to handle full OTP paste; remaining cells accept 1 character

## Accessibility

- Each cell has `accessibilityLabel={`Digit ${index + 1} of ${length}`}`
- `keyboardType="number-pad"` for numeric keyboard
- `selectTextOnFocus` for easy correction

## Code Example

```tsx
<OTPInput
  length={6}
  value={otp}
  onChange={setOtp}
/>
```

## Cross-references

- [Input](./input.md) -- standard text input for other form fields
