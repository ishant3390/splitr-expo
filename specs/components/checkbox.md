# Checkbox

- **Category:** Input
- **Status:** Stable
- **Source:** `components/ui/checkbox.tsx`

## Overview

Simple toggle checkbox with checked/unchecked states. Uses the primary teal color when checked with a white checkmark icon.

**When to use:** Multi-select lists (member selection, split participants), boolean settings.
**When not to use:** On/off toggles with immediate effect (use ThemedSwitch).

## Anatomy

1. **Pressable container** -- 20x20px square with 2px border, rounded corners
2. **Check icon** -- Lucide `Check` icon (14px, white, strokeWidth 3) when checked

## Tokens Used

| Token | Usage |
|---|---|
| Primary color | Checked background (`bg-primary`) and border (`border-primary`) |
| Border color | Unchecked border (`border-border`) |
| `palette.white` | Check icon color |
| `opacity.disabled` (0.5) | Disabled state via `opacity-50` |

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `checked` | `boolean` | required | Current state |
| `onCheckedChange` | `(checked: boolean) => void` | required | Toggle callback |
| `disabled` | `boolean` | -- | Prevents interaction, reduces opacity |
| `className` | `string` | -- | Additional container classes |

## States

| State | Appearance |
|---|---|
| Unchecked | Transparent background, `border-border` |
| Checked | `bg-primary`, `border-primary`, white Check icon |
| Disabled | 50% opacity, press handler skipped |

## Accessibility

- `accessibilityRole="checkbox"`
- `accessibilityState={{ checked }}`

## Code Example

```tsx
<Checkbox
  checked={isSelected}
  onCheckedChange={setIsSelected}
/>
```

## Cross-references

- [ThemedSwitch](./themed-switch.md) -- for on/off toggles with immediate effect
