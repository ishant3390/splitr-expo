# Card

- **Category:** Layout
- **Status:** Stable
- **Source:** `components/ui/card.tsx`

## Overview

Container for grouped content with consistent background, radius, and elevation. Adapts between light mode (shadow) and dark mode (subtle border).

**When to use:** Grouping related content -- expense items, group summaries, settings sections, balance displays.
**When not to use:** Full-width screen sections without visual separation; use plain View instead.

## Anatomy

1. **Container** -- `View` with `bg-card`, `rounded-2xl`, and conditional shadow/border

## Tokens Used

| Token | Usage |
|---|---|
| `SHADOWS.card` | Default variant shadow (light mode only) |
| `SHADOWS.elevated` | Elevated variant shadow (light mode only) |
| `radius.lg` (16) | Applied via `rounded-2xl` class |
| `borderSubtle` | Dark mode uses `border-white/[0.06]` instead of shadow |

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `variant` | `"default" \| "elevated"` | `"default"` | Controls shadow intensity |
| `className` | `string` | -- | Additional NativeWind classes |
| `children` | `ReactNode` | required | Card content |
| `style` | `ViewStyle` | -- | Additional inline styles |

Plus all `ViewProps`.

## States

| State | Light mode | Dark mode |
|---|---|---|
| Default | `bg-card` (#fff) + `SHADOWS.card` | `bg-card` (#1e293b) + `border-white/[0.06]` |
| Elevated | `bg-card` + `SHADOWS.elevated` | Same border treatment |

## Dark Mode Behavior

- Shadow is skipped entirely in dark mode (shadows are invisible on dark backgrounds)
- A thin `border border-white/[0.06]` provides subtle edge definition instead
- Uses `borderCurve: "continuous"` for smooth squircle corners on iOS

## Code Example

```tsx
<Card className="p-4">
  <Text className="text-foreground">Group balance</Text>
</Card>

<Card variant="elevated" className="p-5 mx-4">
  <BalanceDisplay />
</Card>
```

## Cross-references

- [Button](./button.md) -- commonly placed inside cards
- [Skeleton](./skeleton.md) -- skeleton variants mirror card layout
- Elevation spec: [elevation.md](../elevation.md)
