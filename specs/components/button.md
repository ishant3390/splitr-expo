# Button

- **Category:** Input
- **Status:** Stable
- **Source:** `components/ui/button.tsx`

## Overview

Primary interactive element for user actions. The default variant uses a gradient background with a teal glow shadow for emphasis.

**When to use:** Form submissions, primary CTAs, destructive confirmations, secondary actions.
**When not to use:** Navigation links (use Pressable or Link), icon-only toggles without label context.

## Anatomy

1. **Outer wrapper** -- `Animated.View` with scale animation and optional `SHADOWS.glowTeal`
2. **Pressable container** -- Handles press events, applies variant/size classes
3. **Gradient overlay** -- `LinearGradient` (default variant only), covers full button area
4. **Content** -- Loading spinner (ActivityIndicator) + children (string auto-wrapped in Text, or custom ReactNode)

## Tokens Used

| Token | Usage |
|---|---|
| `SHADOWS.glowTeal` | Default variant outer shadow |
| `GRADIENTS.primaryButton` | Default variant gradient fill |
| `opacity.disabled` (0.5) | Disabled state via `opacity-50` class |

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `variant` | `"default" \| "outline" \| "ghost" \| "destructive" \| "accent"` | `"default"` | Visual style |
| `size` | `"sm" \| "md" \| "lg" \| "icon"` | `"md"` | Dimensions and padding |
| `loading` | `boolean` | `false` | Shows spinner, disables interaction |
| `disabled` | `boolean` | `false` | Reduces opacity, disables interaction |
| `className` | `string` | -- | Outer container classes (supports `flex-1`) |
| `textClassName` | `string` | -- | Additional text classes when children is string |
| `children` | `ReactNode` | required | String auto-wraps in styled Text; custom nodes render as-is |

Plus all `PressableProps` (onPress, accessibilityLabel, etc.).

## Variants

| Variant | Background | Text color | Border | Shadow |
|---|---|---|---|---|
| `default` | Gradient (teal) | `text-primary-foreground` (white) | None | `SHADOWS.glowTeal` |
| `outline` | Transparent | `text-foreground` | `border-border` | None |
| `ghost` | Transparent | `text-foreground` | None | None |
| `destructive` | `bg-destructive` (red) | `text-destructive-foreground` (white) | None | None |
| `accent` | `bg-accent` (teal-500) | `text-accent-foreground` (white) | None | None |

## Sizes

| Size | Padding | Border radius | Font size |
|---|---|---|---|
| `sm` | `px-3 py-2` | `rounded-lg` (8) | `text-sm` (12) |
| `md` | `px-4 py-3` | `rounded-xl` (12) | `text-base` (13) |
| `lg` | `px-6 py-4` | `rounded-xl` (12) | `text-lg` (15) |
| `icon` | 40x40 | `rounded-xl` (12) | `text-base` (13) |

## States

| State | Behavior |
|---|---|
| Default | Normal appearance |
| Pressed | Scale animates to 0.97 (spring: damping 10, stiffness 200); active variant styles applied |
| Released | Scale springs back to 1 (damping 8, stiffness 150) |
| Loading | ActivityIndicator shown left of content; press disabled |
| Disabled | `opacity: 0.5`; press disabled |

## Code Example

```tsx
<Button onPress={handleSave}>Save Changes</Button>

<Button variant="outline" size="sm" loading={isPending}>
  Cancel
</Button>

<Button variant="destructive" onPress={handleDelete}>
  Delete Expense
</Button>
```

## Cross-references

- [Card](./card.md) -- often contains buttons
- [ConfirmModal](./confirm-modal.md) -- uses inline Pressable buttons, not this component
- [EmptyState](./empty-state.md) -- uses Button for the action CTA
