# ThemedSwitch

- **Category:** Input
- **Status:** Stable
- **Source:** `components/ui/themed-switch.tsx`

## Overview

Theme-aware wrapper around React Native's native `Switch` component. Applies consistent teal track color and white thumb across platforms.

**When to use:** Settings toggles (notifications, biometric lock, dark mode).
**When not to use:** Multi-select scenarios (use Checkbox), binary choices in forms (use radio buttons or segmented control).

## Anatomy

1. **RNSwitch** -- Native `Switch` with themed track and thumb colors

## Tokens Used

| Token | Usage |
|---|---|
| `colors(isDark).border` | False (off) track color + iOS background |
| `#0d9488` (teal600) | True (on) track color |
| `#ffffff` | Thumb color (both states) |

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `checked` | `boolean` | required | Current state |
| `onCheckedChange` | `(value: boolean) => void` | required | Toggle callback |

Plus all `SwitchProps` except `onValueChange` (replaced by `onCheckedChange`).

## States

| State | Track color |
|---|---|
| Off | `colors(isDark).border` -- slate200 (light) / slate700 (dark) |
| On | `#0d9488` (teal600) |

## Code Example

```tsx
<ThemedSwitch
  checked={biometricEnabled}
  onCheckedChange={setBiometricEnabled}
/>
```

## Cross-references

- [Checkbox](./checkbox.md) -- for multi-select scenarios
