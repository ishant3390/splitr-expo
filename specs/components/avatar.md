# Avatar

- **Category:** Display
- **Status:** Stable
- **Source:** `components/ui/avatar.tsx`

## Overview

Circular user avatar with image support and initials fallback. Handles image load errors gracefully.

**When to use:** User profile display, member lists, expense payer indicators.
**When not to use:** Group icons (use emoji-based GroupAvatar), app logos.

## Anatomy

1. **Container** -- `View` with `rounded-full`, `bg-primary/10`, size classes
2. **Image** -- `expo-image` Image with circular crop, white border, `contentFit="cover"`
3. **Fallback** -- `Text` with initials, shown when no `src` or image fails to load

## Tokens Used

| Token | Usage |
|---|---|
| `radius.full` (9999) | Circular shape via `rounded-full` |
| `palette.white` (`#ffffff`) | Image border color (2px) |
| Primary/10 | Background tint for fallback state |

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `src` | `string` | -- | Image URL |
| `fallback` | `string` | required | Initials text (displayed when no image) |
| `size` | `"sm" \| "md" \| "lg"` | `"md"` | Avatar dimensions |
| `className` | `string` | -- | Additional container classes |

## Sizes

| Size | Container | Image (px) | Text size |
|---|---|---|---|
| `sm` | `w-8 h-8` (32) | 32 | `text-xs` (11) |
| `md` | `w-10 h-10` (40) | 40 | `text-sm` (12) |
| `lg` | `w-14 h-14` (56) | 56 | `text-lg` (15) |

## States

| State | Behavior |
|---|---|
| Image loaded | Shows circular image with 2px white border |
| Image error | Falls back to initials display |
| No src | Shows initials immediately |

## Code Example

```tsx
<Avatar
  src={user.avatarUrl}
  fallback={getInitials(user.name)}
  size="md"
/>
```

## Cross-references

- [AvatarStrip](./avatar-strip.md) -- uses Avatar internally for overlapping member display
- `getInitials()` from `lib/utils.ts` -- standard helper for generating fallback text
