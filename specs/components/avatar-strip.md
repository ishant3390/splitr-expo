# AvatarStrip

- **Category:** Display
- **Status:** Stable
- **Source:** `components/ui/avatar-strip.tsx`

## Overview

Horizontal row of overlapping avatars showing group members, with an overflow pill for additional members.

**When to use:** Group cards, expense summaries, anywhere showing "who's in this group" compactly.
**When not to use:** Single user display (use Avatar), full member lists (use a scrollable list).

## Anatomy

1. **Container** -- `View` with `flex-row items-center`
2. **Avatars** -- Up to `maxVisible` Avatar components, overlapping via negative margin
3. **Overflow pill** -- Circular `+N` indicator when members exceed `maxVisible`
4. **Optional Pressable wrapper** -- When `onPress` is provided

## Tokens Used

| Token | Usage |
|---|---|
| `palette.white` (`#ffffff`) | 2px border between overlapping avatars |
| Muted background | Overflow pill background (`bg-muted`) |
| `fontFamily.semibold` | Overflow count text |

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `members` | `GroupMemberDto[]` | required | Member list to display |
| `maxVisible` | `number` | `5` | Maximum avatars before overflow pill |
| `onPress` | `() => void` | -- | Makes the strip tappable |
| `size` | `"sm" \| "md"` | `"md"` | Controls text size of overflow pill |

## Layout

- Overlap: `-8px` margin between avatars
- Z-index: Decreasing left to right (first avatar on top)
- Avatar size: Always `"sm"` (32px) regardless of strip size prop
- Overflow pill: `w-8 h-8` (32px), `rounded-full`, `bg-muted`

## States

| State | Behavior |
|---|---|
| <= maxVisible members | All avatars shown, no overflow pill |
| > maxVisible members | First N shown + `+X` pill |
| With onPress | Entire strip wrapped in Pressable with accessibility label |
| Without onPress | Plain View, not interactive |

## Code Example

```tsx
<AvatarStrip
  members={group.members}
  maxVisible={4}
  onPress={() => openMemberList()}
/>
```

## Cross-references

- [Avatar](./avatar.md) -- individual avatar component used internally
- `GroupMemberDto` from `lib/types.ts` -- expected member shape
- `getInitials()` from `lib/utils.ts` -- used for avatar fallback text
