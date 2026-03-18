# Skeleton

- **Category:** Feedback
- **Status:** Stable
- **Source:** `components/ui/skeleton.tsx`

## Overview

Animated shimmer placeholder for loading states. Base `Skeleton` component plus pre-composed variants for common layouts (balance card, activity item, group item, list).

**When to use:** Any data-fetching screen while waiting for API responses.
**When not to use:** Empty states after data loads with zero results (use EmptyState).

## Anatomy

1. **Container** -- `View` with configurable dimensions, `backgroundColor: c.border`, `overflow: hidden`
2. **Shimmer** -- `Animated.View` with `LinearGradient` sliding horizontally in a loop

## Tokens Used

| Token | Usage |
|---|---|
| `colors(isDark).border` | Base skeleton background color |
| `GRADIENTS.shimmer` | Shimmer gradient overlay |
| `radius.md` (8) | Default borderRadius |

## Base Component Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `width` | `number \| string` | `"100%"` | Skeleton width |
| `height` | `number` | `16` | Skeleton height |
| `borderRadius` | `number` | `8` | Corner radius |
| `style` | `ViewStyle` | -- | Additional inline styles |

Plus all `ViewProps`.

## Shimmer Animation

- Direction: Left to right
- Duration: 850ms per cycle
- Easing: `Easing.inOut(Easing.ease)`
- Repeats: Infinite, no reverse
- Offset range: -200 to +200 (translateX)

## Pre-composed Variants

### `SkeletonBalanceCard`

Mimics the home screen balance card layout. Teal-tinted background (`bg-primary/80`), padding `p-5`, `rounded-2xl`.

### `SkeletonActivityItem`

Row layout: 40px circle (avatar) + two text lines + right-aligned amount. `p-4 rounded-2xl bg-card`.

### `SkeletonGroupItem`

Row layout: 44px rounded square (group icon) + two text rows with right-aligned secondary info. `p-4 rounded-2xl bg-card`.

### `SkeletonList`

Renders `count` skeleton items of a given `type`.

| Prop | Type | Default | Description |
|---|---|---|---|
| `count` | `number` | `4` | Number of items |
| `type` | `"activity" \| "group"` | `"activity"` | Which variant to render |

## Code Example

```tsx
// Base skeleton
<Skeleton width={120} height={20} borderRadius={6} />

// Pre-composed list
{isLoading && <SkeletonList count={5} type="group" />}

// Balance card
{isLoading && <SkeletonBalanceCard />}
```

## Cross-references

- [EmptyState](./empty-state.md) -- shown when data loads but is empty
- [Card](./card.md) -- skeleton variants match card dimensions and radius
