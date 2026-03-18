# EmptyState

- **Category:** Display
- **Status:** Stable
- **Source:** `components/ui/empty-state.tsx`

## Overview

Centered placeholder shown when a list or section has no data. Features a decorative icon with double-ring background, title, optional subtitle, and optional action button.

**When to use:** Empty group lists, no expenses yet, no activity, no search results.
**When not to use:** Loading states (use Skeleton), error states (use Toast or inline error).

## Anatomy

1. **Container** -- Centered `View` with vertical padding
2. **Icon decoration** -- Two concentric rounded-square backgrounds (outer ring at 8% opacity, inner at 15% opacity) with a Lucide icon
3. **Title** -- `text-base font-sans-semibold text-foreground`
4. **Subtitle** -- Optional `text-sm text-muted-foreground`
5. **Action button** -- Optional `Button` (default variant, sm size)

## Tokens Used

| Token | Usage |
|---|---|
| `radius["2xl"]` (24) | Icon background border radius |
| Default icon color | `#94a3b8` (slate400) |

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `icon` | `LucideIcon` | required | Icon component to display |
| `iconColor` | `string` | `"#94a3b8"` | Icon and ring tint color |
| `title` | `string` | required | Primary message |
| `subtitle` | `string` | -- | Secondary explanatory text |
| `actionLabel` | `string` | -- | Button text (requires `onAction`) |
| `onAction` | `() => void` | -- | Button callback (requires `actionLabel`) |

## Layout

- Container: `py-12 px-6`, centered
- Icon outer ring: 84x84px, `radius["2xl"]`, `iconColor` at 8% opacity
- Icon inner square: 72x72px, `radius["2xl"]`, `iconColor` at 15% opacity
- Icon size: 30px
- Title: `mb-1`
- Subtitle: `mb-4`, `leading-5`

## Code Example

```tsx
import { Users } from "lucide-react-native";

<EmptyState
  icon={Users}
  title="No groups yet"
  subtitle="Create a group to start splitting expenses with friends"
  actionLabel="Create Group"
  onAction={() => router.push("/create-group")}
/>
```

## Cross-references

- [Button](./button.md) -- used for the action CTA
- [Skeleton](./skeleton.md) -- used instead of EmptyState during loading
