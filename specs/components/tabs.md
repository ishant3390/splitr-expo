# Tabs

- **Category:** Navigation
- **Status:** Stable
- **Source:** `components/ui/tabs.tsx`

## Overview

Segmented control for switching between content sections within a screen. iOS-style pill tabs with a muted background track.

**When to use:** Filtering content on a screen (Active/Archived groups, time periods, categories).
**When not to use:** Top-level app navigation (use TabBar), multi-step forms (use separate screens).

## Anatomy

1. **Track** -- `View` with `bg-muted rounded-xl p-1`
2. **Tab items** -- `Pressable` with flex-1, centered text, conditional active styling
3. **Active indicator** -- Card-colored background with subtle shadow on the active tab

## Tokens Used

| Token | Usage |
|---|---|
| `radius.md` (8) | Individual tab pill border radius |
| `radius.DEFAULT` (12) | Outer track border radius (via `rounded-xl`) |
| `fontSize.md` (14) | Tab label text |
| `fontFamily.medium` | Tab label font |
| `colors(isDark).card` | Active tab background |
| `colors(isDark).foreground` | Active tab text color |
| `colors(isDark).mutedForeground` | Inactive tab text color |

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `tabs` | `{ id: string; label: string }[]` | required | Tab definitions |
| `activeTab` | `string` | required | Currently selected tab id |
| `onTabChange` | `(tabId: string) => void` | required | Selection callback |
| `className` | `string` | -- | Additional container classes |

## States

| State | Behavior |
|---|---|
| Active tab | Card background, foreground text, subtle shadow (elevation 1) |
| Inactive tab | Transparent background, muted foreground text |

## Accessibility

- `accessibilityRole="tab"` on each tab
- `accessibilityState={{ selected: isActive }}` for screen readers

## Code Example

```tsx
<Tabs
  tabs={[
    { id: "active", label: "Active" },
    { id: "archived", label: "Archived" },
  ]}
  activeTab={filter}
  onTabChange={setFilter}
/>
```

## Cross-references

- [TabBar](./tab-bar.md) -- bottom navigation bar (different component)
